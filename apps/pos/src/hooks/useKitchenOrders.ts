import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusinessLine } from '@/contexts/BusinessLineContext';
import { effectiveUnitPrice } from '@/lib/pricing';

export interface KitchenOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  notes: string | null;
  subtotal: number;
  sent_to_kitchen_at: string | null;
  product: { name: string };
  modifiers: { id: string; modifierId: string; modifier_name: string; group_name: string | null }[];
}

export interface KitchenOrder {
  id: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  customer_name: string | null;
  daily_order_number: number | null;
  order_type: 'dine_in' | 'takeout' | 'delivery';
  business_line_id: string;
  pickup_at: string | null;
  created_at: string;
  table_name: string | null;
  business_line_name: string | null;
  /** Nombre del cajero que tomó la orden (orders.created_by → profiles). */
  cashier_name: string | null;
  order_items: KitchenOrderItem[];
}

export type OrderPhase = 'pending' | 'preparing' | 'ready' | 'done';

const statusRank: Record<string, number> = {
  pending: 0,
  preparing: 1,
  ready: 2,
  delivered: 3,
};

/** Determine the overall phase of an order based on its active items. */
export function getOrderPhase(order: KitchenOrder): OrderPhase {
  const active = order.order_items.filter((i) => i.status !== 'cancelled');
  if (active.length === 0) return 'done';

  const minRank = Math.min(...active.map((i) => statusRank[i.status] ?? 0));
  if (minRank === 0) return 'pending';
  if (minRank === 1) return 'preparing';
  if (minRank === 2) return 'ready';
  return 'done';
}

/** True si el pedido contiene productos "por kilo" (nombre con "kilo"). */
export function orderHasKiloItems(order: KitchenOrder): boolean {
  return order.order_items.some(
    (i) => i.status !== 'cancelled' && i.product.name.toLowerCase().includes('kilo'),
  );
}

/** Total actual del pedido (suma de subtotales de items no cancelados). */
export function orderCurrentTotal(order: KitchenOrder): number {
  const sum = order.order_items
    .filter((i) => i.status !== 'cancelled')
    .reduce((s, i) => s + (i.subtotal ?? 0), 0);
  return Math.round(sum * 100) / 100;
}

function playNewOrderSound() {
  try {
    const audio = new Audio('/sounds/new-order.wav');
    audio.volume = 0.7;
    audio.play().catch(() => {
      // Browser may block autoplay until user interaction
    });
  } catch {
    // Ignore audio errors
  }
}

export function useKitchenOrders() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);
  const { activeBusinessLine } = useBusinessLine();

  const fetchOrders = useCallback(async () => {
    let query = supabase
      .from('orders')
      .select(`
        id,
        status,
        notes,
        customer_name,
        daily_order_number,
        order_type,
        pickup_at,
        created_at,
        business_line_id,
        table:tables ( name ),
        business_line:business_lines ( name ),
        cashier:profiles!orders_created_by_fkey ( full_name ),
        order_items (
          id,
          product_id,
          quantity,
          status,
          notes,
          subtotal,
          sent_to_kitchen_at,
          product:products ( name ),
          modifiers:order_item_modifiers (
            id,
            modifier_id,
            modifier_name,
            modifier:modifiers (
              modifier_group:modifier_groups ( name )
            )
          )
        )
      `)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: true });

    if (activeBusinessLine) {
      query = query.eq('business_line_id', activeBusinessLine.id);
    }

    const { data, error } = await query;

    if (error) return;

    const normalized = (data ?? []).map((order: any) => ({
      ...order,
      table_name: (Array.isArray(order.table) ? order.table[0] : order.table)?.name ?? null,
      business_line_name:
        (Array.isArray(order.business_line) ? order.business_line[0] : order.business_line)?.name ??
        null,
      cashier_name:
        (Array.isArray(order.cashier) ? order.cashier[0] : order.cashier)?.full_name ?? null,
      order_items: (order.order_items ?? []).map((item: any) => ({
        ...item,
        product: Array.isArray(item.product) ? item.product[0] : item.product,
        modifiers: (item.modifiers ?? []).map((m: any) => {
          const modRel = Array.isArray(m.modifier) ? m.modifier[0] : m.modifier;
          const groupRel = modRel?.modifier_group;
          const group = Array.isArray(groupRel) ? groupRel[0] : groupRel;
          return {
            id: m.id,
            modifierId: m.modifier_id,
            modifier_name: m.modifier_name,
            group_name: group?.name ?? null,
          };
        }),
      })),
    })) as KitchenOrder[];

    // Detect new orders and play sound
    const currentIds = new Set(normalized.map((o) => o.id));
    if (initialLoadDoneRef.current) {
      for (const id of currentIds) {
        if (!prevOrderIdsRef.current.has(id)) {
          playNewOrderSound();
          break;
        }
      }
    }
    prevOrderIdsRef.current = currentIds;
    initialLoadDoneRef.current = true;

    setOrders(normalized);
    setLoading(false);
  }, [activeBusinessLine]);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchOrders(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => fetchOrders(),
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [fetchOrders]);

  /** Advance ALL active items in an order to the next status. */
  async function advanceOrder(order: KitchenOrder) {
    const phase = getOrderPhase(order);
    const active = order.order_items.filter((i) => i.status !== 'cancelled');

    if (phase === 'pending') {
      const ids = active.filter((i) => i.status === 'pending').map((i) => i.id);
      if (ids.length > 0) {
        const { error } = await supabase
          .from('order_items')
          .update({ status: 'preparing' })
          .in('id', ids);
        if (error) throw error;
      }
    } else if (phase === 'preparing') {
      const ids = active.filter((i) => i.status === 'preparing').map((i) => i.id);
      if (ids.length > 0) {
        const { error } = await supabase
          .from('order_items')
          .update({ status: 'ready' })
          .in('id', ids);
        if (error) throw error;
      }
    } else if (phase === 'ready') {
      const ids = active.filter((i) => i.status === 'ready').map((i) => i.id);
      if (ids.length > 0) {
        const { error } = await supabase
          .from('order_items')
          .update({ status: 'delivered' })
          .in('id', ids);
        if (error) throw error;
      }
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', order.id);
      if (error) throw error;
    }

    await fetchOrders();
  }

  /**
   * Entrega un pedido "por kilo" capturando el precio final real (por peso).
   * Ajusta el/los item(s) de kilo (subtotal + unit_price) y el subtotal/total
   * del pedido, luego lo entrega. El total se aplica vía `subtotal` porque el
   * trigger enforce_no_iva deriva orders.total del subtotal en pedidos no pagados.
   * Requiere rol admin/cashier (RLS de orders). Lanza en error.
   */
  async function deliverWithFinalTotal(order: KitchenOrder, finalTotal: number) {
    const active = order.order_items.filter((i) => i.status !== 'cancelled');
    const isKilo = (i: KitchenOrderItem) => i.product.name.toLowerCase().includes('kilo');
    const kiloItems = active.filter(isKilo);
    const nonKiloSubtotal = active
      .filter((i) => !isKilo(i))
      .reduce((s, i) => s + i.subtotal, 0);
    const kiloTarget = Math.max(0, Math.round((finalTotal - nonKiloSubtotal) * 100) / 100);
    const currentKiloSum = kiloItems.reduce((s, i) => s + i.subtotal, 0);

    // Repartir el precio final entre los items de kilo (proporcional; el último
    // absorbe el redondeo restante para que la suma cuadre con finalTotal).
    let assigned = 0;
    for (let idx = 0; idx < kiloItems.length; idx++) {
      const ki = kiloItems[idx];
      let newSubtotal: number;
      if (idx === kiloItems.length - 1) {
        newSubtotal = Math.round((kiloTarget - assigned) * 100) / 100;
      } else {
        const share = currentKiloSum > 0 ? ki.subtotal / currentKiloSum : 1 / kiloItems.length;
        newSubtotal = Math.round(kiloTarget * share * 100) / 100;
        assigned += newSubtotal;
      }
      const newUnit =
        ki.quantity > 0 ? Math.round((newSubtotal / ki.quantity) * 100) / 100 : newSubtotal;
      const { error } = await supabase
        .from('order_items')
        .update({ subtotal: newSubtotal, unit_price: newUnit })
        .eq('id', ki.id);
      if (error) throw error;
    }

    // Subtotal/total del pedido (el trigger deriva total de subtotal si no pagado).
    const { error: oErr } = await supabase
      .from('orders')
      .update({ subtotal: finalTotal, tax: 0, total: finalTotal })
      .eq('id', order.id);
    if (oErr) throw oErr;

    // Entregar (items -> delivered, orden -> completed) + refetch.
    await advanceOrder(order);
  }

  /**
   * Recalcula subtotal/total de un pedido sumando solo los items no cancelados.
   * El trigger orders_enforce_no_iva fuerza tax=0 y total=subtotal automáticamente.
   */
  async function recalcOrderTotals(orderId: string) {
    const { data: items } = await supabase
      .from('order_items')
      .select('subtotal, status')
      .eq('order_id', orderId);

    const subtotal = (items ?? [])
      .filter((i) => i.status !== 'cancelled')
      .reduce((s, i) => s + Number(i.subtotal), 0);

    await supabase
      .from('orders')
      .update({ subtotal, tax: 0, total: subtotal })
      .eq('id', orderId);
  }

  /** Cambia la cantidad de un item. Si quantity <= 0, lo cancela. */
  async function adjustItemQuantity(orderItemId: string, orderId: string, newQuantity: number) {
    if (newQuantity <= 0) {
      return cancelItem(orderItemId, orderId);
    }

    const { data: item } = await supabase
      .from('order_items')
      .select('unit_price')
      .eq('id', orderItemId)
      .maybeSingle();

    if (!item) throw new Error('Item no encontrado');

    const newSubtotal = Math.round(Number(item.unit_price) * newQuantity * 100) / 100;
    // Al editar en cocina el item vuelve a 'pending' para que se re-prepare.
    const { error } = await supabase
      .from('order_items')
      .update({ quantity: newQuantity, subtotal: newSubtotal, status: 'pending' })
      .eq('id', orderItemId);

    if (error) throw error;
    await recalcOrderTotals(orderId);
    await fetchOrders();
  }

  /** Marca un item como cancelado (no se borra para preservar histórico). */
  async function cancelItem(orderItemId: string, orderId: string) {
    const { error } = await supabase
      .from('order_items')
      .update({ status: 'cancelled' })
      .eq('id', orderItemId);

    if (error) throw error;
    await recalcOrderTotals(orderId);
    await fetchOrders();
  }

  /**
   * Reemplaza los modifiers del item con la lista nueva, recalcula
   * unit_price (precio base + suma de price_override) y subtotal,
   * y refresca los totales de la orden.
   */
  async function updateItemModifiers(
    orderItemId: string,
    orderId: string,
    productBasePrice: number,
    newModifiers: { modifierId: string; name: string; priceOverride: number; group?: string | null }[],
  ) {
    const { error: delErr } = await supabase
      .from('order_item_modifiers')
      .delete()
      .eq('order_item_id', orderItemId);
    if (delErr) throw delErr;

    if (newModifiers.length > 0) {
      const rows = newModifiers.map((m) => ({
        order_item_id: orderItemId,
        modifier_id: m.modifierId,
        modifier_name: m.name,
        price_override: m.priceOverride,
      }));
      const { error: insErr } = await supabase
        .from('order_item_modifiers')
        .insert(rows);
      if (insErr) throw insErr;
    }

    const { data: itemRow } = await supabase
      .from('order_items')
      .select('quantity')
      .eq('id', orderItemId)
      .maybeSingle();
    if (!itemRow) throw new Error('Item no encontrado');

    const newUnit = Math.round(
      effectiveUnitPrice({ price: productBasePrice, modifiers: newModifiers }) * 100,
    ) / 100;
    const newSubtotal = Math.round(newUnit * itemRow.quantity * 100) / 100;

    const { error: updErr } = await supabase
      .from('order_items')
      .update({ unit_price: newUnit, subtotal: newSubtotal, status: 'pending' })
      .eq('id', orderItemId);
    if (updErr) throw updErr;

    await recalcOrderTotals(orderId);
    await fetchOrders();
  }

  return {
    orders,
    loading,
    advanceOrder,
    deliverWithFinalTotal,
    adjustItemQuantity,
    cancelItem,
    updateItemModifiers,
    refetch: fetchOrders,
  };
}
