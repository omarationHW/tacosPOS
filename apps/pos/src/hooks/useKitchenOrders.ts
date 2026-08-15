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
  /** Nombre de la categoría del producto (para detectar pedidos "por monto"). */
  category_name: string | null;
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

/**
 * Items cuyo precio real se define hasta que se despacha el pedido:
 * - por kilo: el precio depende del peso (nombre con "kilo").
 * - por monto: el cliente pide "$X de carnitas" y al servir el monto cambia
 *   un poco (categoría "Por monto").
 */
export function isKiloItem(item: KitchenOrderItem): boolean {
  return item.product.name.toLowerCase().includes('kilo');
}

export function isMontoItem(item: KitchenOrderItem): boolean {
  return (item.category_name ?? '').toLowerCase().includes('monto');
}

/** Tipo de captura de precio final que necesita el pedido (o null si ninguno). */
export type FinalTotalKind = 'kilo' | 'monto';

export function orderFinalTotalKind(order: KitchenOrder): FinalTotalKind | null {
  const active = order.order_items.filter((i) => i.status !== 'cancelled');
  if (active.some(isKiloItem)) return 'kilo';
  if (active.some(isMontoItem)) return 'monto';
  return null;
}

/**
 * Subtotal de los items del pedido que NO son de precio variable (bebidas,
 * tacos, etc.). Sirve para avisar en el modal que el total a capturar incluye
 * también esos productos.
 */
export function orderFixedSubtotal(order: KitchenOrder): number {
  const kind = orderFinalTotalKind(order);
  if (!kind) return orderCurrentTotal(order);
  const isVariable = kind === 'kilo' ? isKiloItem : isMontoItem;
  const sum = order.order_items
    .filter((i) => i.status !== 'cancelled' && !isVariable(i))
    .reduce((s, i) => s + (i.subtotal ?? 0), 0);
  return Math.round(sum * 100) / 100;
}

/** Total actual del pedido (suma de subtotales de items no cancelados). */
export function orderCurrentTotal(order: KitchenOrder): number {
  const sum = order.order_items
    .filter((i) => i.status !== 'cancelled')
    .reduce((s, i) => s + (i.subtotal ?? 0), 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Reescribe el monto dentro de la nota de un item por monto
 * ("$150 de carnitas" → "$165 de carnitas"). Si la nota no tiene ese formato,
 * la deja igual.
 */
function rewriteMontoNote(notes: string | null, newAmount: number): string | null {
  if (!notes) return notes;
  const label = `$${newAmount % 1 === 0 ? newAmount : newAmount.toFixed(2)}`;
  const rewritten = notes.replace(/^\$\s*[\d.,]+/, label);
  return rewritten === notes ? notes : rewritten;
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
          product:products ( name, category:categories ( name ) ),
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
      order_items: (order.order_items ?? []).map((item: any) => {
        const product = Array.isArray(item.product) ? item.product[0] : item.product;
        const categoryRel = product?.category;
        const category = Array.isArray(categoryRel) ? categoryRel[0] : categoryRel;
        return {
          ...item,
          product,
          category_name: category?.name ?? null,
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
        };
      }),
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
   * Entrega un pedido de precio variable (por kilo o por monto) capturando el
   * total real: el de kilo depende del peso y el de monto de lo que realmente
   * se sirvió. Ajusta el/los item(s) variables (subtotal + unit_price) y el
   * subtotal/total del pedido, luego lo entrega. El total se aplica vía
   * `subtotal` porque el trigger enforce_no_iva deriva orders.total del
   * subtotal en pedidos no pagados.
   * Requiere rol admin/cashier (RLS de orders). Lanza en error.
   */
  async function deliverWithFinalTotal(order: KitchenOrder, finalTotal: number) {
    const active = order.order_items.filter((i) => i.status !== 'cancelled');
    // Solo se ajusta el tipo de item que hace variar el precio: si el pedido
    // trae items de kilo, el ajuste va a esos; si no, a los de monto.
    const kind = orderFinalTotalKind(order);
    const isVariable = (i: KitchenOrderItem) =>
      kind === 'kilo' ? isKiloItem(i) : kind === 'monto' ? isMontoItem(i) : false;
    const variableItems = active.filter(isVariable);
    if (variableItems.length === 0) throw new Error('El pedido no tiene items de precio variable');

    const fixedSubtotal = active
      .filter((i) => !isVariable(i))
      .reduce((s, i) => s + i.subtotal, 0);
    const variableTarget = Math.max(0, Math.round((finalTotal - fixedSubtotal) * 100) / 100);
    const currentVariableSum = variableItems.reduce((s, i) => s + i.subtotal, 0);

    // Repartir el precio final entre los items variables (proporcional; el
    // último absorbe el redondeo restante para que la suma cuadre con finalTotal).
    let assigned = 0;
    for (let idx = 0; idx < variableItems.length; idx++) {
      const ki = variableItems[idx];
      let newSubtotal: number;
      if (idx === variableItems.length - 1) {
        newSubtotal = Math.round((variableTarget - assigned) * 100) / 100;
      } else {
        const share =
          currentVariableSum > 0 ? ki.subtotal / currentVariableSum : 1 / variableItems.length;
        newSubtotal = Math.round(variableTarget * share * 100) / 100;
        assigned += newSubtotal;
      }
      const newUnit =
        ki.quantity > 0 ? Math.round((newSubtotal / ki.quantity) * 100) / 100 : newSubtotal;
      const { error } = await supabase
        .from('order_items')
        .update({
          subtotal: newSubtotal,
          unit_price: newUnit,
          // El monto va escrito en la nota ("$150 de carnitas"): se reescribe
          // con el monto real para que cocina, ticket y cuenta digan lo mismo.
          ...(kind === 'monto' ? { notes: rewriteMontoNote(ki.notes, newUnit) } : {}),
        })
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
   * Cambia el tipo de pedido (comer aquí / llevar / domicilio) ya en cocina:
   * pasa seguido que el cliente decide llevárselo cuando ya se está preparando.
   */
  async function updateOrderType(orderId: string, orderType: KitchenOrder['order_type']) {
    const { error } = await supabase
      .from('orders')
      .update({ order_type: orderType })
      .eq('id', orderId);
    if (error) throw error;
    await fetchOrders();
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

    // Si era el último item vivo, el pedido queda vacío: sin items activos
    // getOrderPhase() lo marca 'done' y la tarjeta se queda sin botón de
    // avanzar, así que seguiría en Cocina para siempre. Se cierra aquí.
    const { data: rest } = await supabase
      .from('order_items')
      .select('id')
      .eq('order_id', orderId)
      .neq('status', 'cancelled');
    if ((rest ?? []).length === 0) {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    }

    await fetchOrders();
  }

  /**
   * Cancela el pedido completo: marca todos los items vivos como cancelados y
   * cierra la orden. Es la salida para pedidos que quedaron atorados (mal
   * capturados, de prueba, o vacíos) y que si no se quedan en Cocina
   * indefinidamente. Requiere rol admin/cashier (RLS de orders).
   */
  async function cancelOrder(orderId: string) {
    const { error: itemsErr } = await supabase
      .from('order_items')
      .update({ status: 'cancelled' })
      .eq('order_id', orderId)
      .neq('status', 'cancelled');
    if (itemsErr) throw itemsErr;

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', subtotal: 0, tax: 0, total: 0 })
      .eq('id', orderId);
    if (error) throw error;

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
    updateOrderType,
    adjustItemQuantity,
    cancelItem,
    cancelOrder,
    updateItemModifiers,
    refetch: fetchOrders,
  };
}
