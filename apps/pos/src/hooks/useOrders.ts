import { supabase } from '@/lib/supabase';
import type { CartItem, OrderType } from '@/components/pos/OrderPanel';

const TAX_RATE = 0.16;

interface CreateOrderParams {
  items: CartItem[];
  createdBy: string;
  tableId?: string | null;
  orderType?: OrderType;
  notes?: string;
}

interface CreateOrderResult {
  orderId: string;
  appended: boolean;
}

function getItemUnitPrice(item: CartItem): number {
  return item.price + item.modifiers.reduce((s, m) => s + m.priceOverride, 0);
}

export function useOrders() {
  async function createOrder({ items, createdBy, tableId, orderType, notes }: CreateOrderParams): Promise<CreateOrderResult> {
    if (items.length === 0) throw new Error('No hay items en el pedido');

    // Check for existing open order for the same table (dine-in) or notes match
    if (tableId) {
      const { data: existing } = await supabase
        .from('orders')
        .select('id, subtotal, tax, total')
        .eq('table_id', tableId)
        .in('status', ['open', 'in_progress'])
        .is('payment_method', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        return await appendToOrder(existing, items);
      }
    }

    return await insertNewOrder({ items, createdBy, tableId, orderType, notes });
  }

  async function insertNewOrder({ items, createdBy, tableId, orderType, notes }: CreateOrderParams): Promise<CreateOrderResult> {
    const subtotal = items.reduce((sum, item) => sum + getItemUnitPrice(item) * item.quantity, 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        created_by: createdBy,
        table_id: tableId || null,
        order_type: orderType || 'dine_in',
        status: 'open',
        subtotal,
        tax,
        total,
        notes: notes || null,
      })
      .select('id')
      .single();

    if (orderError) throw orderError;

    await insertOrderItems(order.id, items);

    return { orderId: order.id, appended: false };
  }

  async function appendToOrder(
    existing: { id: string; subtotal: number; tax: number; total: number },
    items: CartItem[],
  ): Promise<CreateOrderResult> {
    await insertOrderItems(existing.id, items);

    const addedSubtotal = items.reduce((sum, item) => sum + getItemUnitPrice(item) * item.quantity, 0);
    const newSubtotal = Math.round((existing.subtotal + addedSubtotal) * 100) / 100;
    const newTax = Math.round(newSubtotal * TAX_RATE * 100) / 100;
    const newTotal = Math.round((newSubtotal + newTax) * 100) / 100;

    const { error: updateError } = await supabase
      .from('orders')
      .update({ subtotal: newSubtotal, tax: newTax, total: newTotal })
      .eq('id', existing.id);

    if (updateError) throw updateError;

    return { orderId: existing.id, appended: true };
  }

  async function insertOrderItems(orderId: string, items: CartItem[]) {
    const orderItems = items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: getItemUnitPrice(item),
      subtotal: Math.round(getItemUnitPrice(item) * item.quantity * 100) / 100,
      status: 'pending' as const,
      sent_to_kitchen_at: new Date().toISOString(),
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select('id');

    if (itemsError) throw itemsError;

    // Insert modifiers for each order item
    const modifierRows: {
      order_item_id: string;
      modifier_id: string;
      modifier_name: string;
      price_override: number;
    }[] = [];

    items.forEach((item, idx) => {
      if (item.modifiers.length > 0 && insertedItems?.[idx]) {
        for (const mod of item.modifiers) {
          modifierRows.push({
            order_item_id: insertedItems[idx].id,
            modifier_id: mod.modifierId,
            modifier_name: mod.name,
            price_override: mod.priceOverride,
          });
        }
      }
    });

    if (modifierRows.length > 0) {
      const { error: modError } = await supabase
        .from('order_item_modifiers')
        .insert(modifierRows);
      if (modError) throw modError;
    }
  }

  async function updateOrderStatus(orderId: string, status: 'open' | 'in_progress' | 'completed' | 'cancelled') {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) throw error;
  }

  return { createOrder, updateOrderStatus };
}
