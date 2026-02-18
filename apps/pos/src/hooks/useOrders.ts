import { supabase } from '@/lib/supabase';
import type { CartItem } from '@/components/pos/OrderPanel';

const TAX_RATE = 0.16;

interface CreateOrderParams {
  items: CartItem[];
  createdBy: string;
  notes?: string;
}

interface CreateOrderResult {
  orderId: string;
  appended: boolean; // true = items added to existing order
}

export function useOrders() {
  /**
   * Create a new order OR append items to an existing open order for the same mesa.
   * If `notes` matches an open/in_progress order, items are added there.
   */
  async function createOrder({ items, createdBy, notes }: CreateOrderParams): Promise<CreateOrderResult> {
    if (items.length === 0) throw new Error('No hay items en el pedido');

    // Check for existing open order for this mesa
    if (notes) {
      const { data: existing } = await supabase
        .from('orders')
        .select('id, subtotal, tax, total')
        .eq('notes', notes)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        return await appendToOrder(existing, items);
      }
    }

    return await insertNewOrder({ items, createdBy, notes });
  }

  async function insertNewOrder({ items, createdBy, notes }: CreateOrderParams): Promise<CreateOrderResult> {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        created_by: createdBy,
        status: 'open',
        subtotal,
        tax,
        total,
        notes: notes || null,
      })
      .select('id')
      .single();

    if (orderError) throw orderError;

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: Math.round(item.price * item.quantity * 100) / 100,
      status: 'pending' as const,
      sent_to_kitchen_at: new Date().toISOString(),
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return { orderId: order.id, appended: false };
  }

  async function appendToOrder(
    existing: { id: string; subtotal: number; tax: number; total: number },
    items: CartItem[],
  ): Promise<CreateOrderResult> {
    // Insert new items
    const orderItems = items.map((item) => ({
      order_id: existing.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: Math.round(item.price * item.quantity * 100) / 100,
      status: 'pending' as const,
      sent_to_kitchen_at: new Date().toISOString(),
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Recalculate totals
    const addedSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
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

  async function updateOrderStatus(orderId: string, status: 'open' | 'in_progress' | 'completed' | 'cancelled') {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) throw error;
  }

  return { createOrder, updateOrderStatus };
}
