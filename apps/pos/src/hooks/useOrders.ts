import { supabase } from '@/lib/supabase';
import type { CartItem, OrderType } from '@/components/pos/OrderPanel';

const TAX_RATE = 0.16;

interface CreateOrderParams {
  items: CartItem[];
  createdBy: string;
  customerName: string;
  businessLineId: string;
  tableId?: string | null;
  orderType?: OrderType;
  notes?: string;
}

interface CreateOrderResult {
  orderId: string;
  appended: boolean;
  /** Sequential daily number assigned by the DB trigger (carnitas only). */
  dailyOrderNumber: number | null;
}

function getItemUnitPrice(item: CartItem): number {
  return item.price + item.modifiers.reduce((s, m) => s + m.priceOverride, 0);
}

/**
 * Find a customer by case-insensitive exact name, or create one.
 * Returns the customer id, or null if the name is blank.
 * Non-fatal: on error returns null so the order flow isn't blocked.
 */
async function upsertCustomerByName(customerName: string): Promise<string | null> {
  const name = customerName.trim();
  if (!name) return null;

  try {
    // ilike with no wildcards is a case-insensitive exact match.
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .ilike('name', name)
      .limit(1)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data: created, error } = await supabase
      .from('customers')
      .insert({ name })
      .select('id')
      .single();

    if (error || !created) return null;
    return created.id;
  } catch {
    return null;
  }
}

export function useOrders() {
  async function createOrder({ items, createdBy, customerName, businessLineId, tableId, orderType, notes }: CreateOrderParams): Promise<CreateOrderResult> {
    if (items.length === 0) throw new Error('No hay items en el pedido');

    // Carnitas orders use auto-numbering; never coalesce them by name.
    const trimmedName = customerName.trim();

    // Check for existing open order for the same customer + business line.
    // Skip the lookup entirely when there's no name (carnitas auto-numbered).
    if (trimmedName) {
      const { data: existing } = await supabase
        .from('orders')
        .select('id, subtotal, tax, total, daily_order_number')
        .eq('customer_name', trimmedName)
        .eq('business_line_id', businessLineId)
        .in('status', ['open', 'in_progress'])
        .is('payment_method', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        return await appendToOrder(existing, items);
      }
    }

    return await insertNewOrder({ items, createdBy, customerName: trimmedName, businessLineId, tableId, orderType, notes });
  }

  async function insertNewOrder({ items, createdBy, customerName, businessLineId, tableId, orderType, notes }: CreateOrderParams): Promise<CreateOrderResult> {
    const subtotal = items.reduce((sum, item) => sum + getItemUnitPrice(item) * item.quantity, 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const customerId = customerName ? await upsertCustomerByName(customerName) : null;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        created_by: createdBy,
        table_id: tableId || null,
        customer_name: customerName || null,
        customer_id: customerId,
        business_line_id: businessLineId,
        order_type: orderType || 'dine_in',
        status: 'open',
        subtotal,
        tax,
        total,
        notes: notes || null,
      })
      .select('id, daily_order_number')
      .single();

    if (orderError) throw orderError;

    await insertOrderItems(order.id, items);

    return { orderId: order.id, appended: false, dailyOrderNumber: order.daily_order_number ?? null };
  }

  async function appendItemsToOrder(orderId: string, items: CartItem[]): Promise<CreateOrderResult> {
    if (items.length === 0) throw new Error('No hay items para agregar');

    const { data: existing, error } = await supabase
      .from('orders')
      .select('id, subtotal, tax, total, daily_order_number, status')
      .eq('id', orderId)
      .single();

    if (error || !existing) throw new Error('No se encontró el pedido');
    if (existing.status === 'completed' || existing.status === 'cancelled') {
      throw new Error('No se pueden agregar items a un pedido cerrado');
    }

    return appendToOrder(existing, items);
  }

  async function appendToOrder(
    existing: { id: string; subtotal: number; tax: number; total: number; daily_order_number: number | null },
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

    return { orderId: existing.id, appended: true, dailyOrderNumber: existing.daily_order_number ?? null };
  }

  async function insertOrderItems(orderId: string, items: CartItem[]) {
    const orderItems = items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: getItemUnitPrice(item),
      subtotal: Math.round(getItemUnitPrice(item) * item.quantity * 100) / 100,
      status: 'pending' as const,
      notes: item.notes?.trim() || null,
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

  return { createOrder, updateOrderStatus, appendItemsToOrder };
}
