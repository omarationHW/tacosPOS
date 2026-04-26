import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusinessLine } from '@/contexts/BusinessLineContext';

export interface TabItem {
  /** order_items.id — necesario para editar/cancelar este item específico. */
  orderItemId: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
  /** Cada modifier conserva el modifier_id original para poder hacer diffs. */
  modifiers: { id: string; modifierId: string; name: string; priceOverride: number }[];
}

export interface OpenTab {
  /** Display name: customer name or "Para Llevar #XXXX" */
  mesa: string;
  tableId: string | null;
  customerName: string | null;
  orderType: 'dine_in' | 'takeout' | 'delivery';
  orderIds: string[];
  items: TabItem[];
  subtotal: number;
  tax: number;
  total: number;
  oldestOrder: string;
}

export function useOpenTabs() {
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeBusinessLine } = useBusinessLine();

  const fetchTabs = useCallback(async () => {
    let query = supabase
      .from('orders')
      .select(`
        id,
        table_id,
        customer_name,
        daily_order_number,
        order_type,
        notes,
        subtotal,
        tax,
        total,
        created_at,
        business_line_id,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          subtotal,
          notes,
          status,
          product:products ( name ),
          modifiers:order_item_modifiers ( id, modifier_id, modifier_name, price_override )
        )
      `)
      .is('payment_method', null)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });

    if (activeBusinessLine) {
      query = query.eq('business_line_id', activeBusinessLine.id);
    }

    const { data, error } = await query;

    if (error) {
      setLoading(false);
      return;
    }

    const orders = (data ?? []) as any[];

    // Group by customer_name for dine-in, or individual orders for takeout
    const tabMap = new Map<string, OpenTab>();

    for (const order of orders) {
      const orderType = order.order_type ?? 'dine_in';
      const customerName = order.customer_name as string | null;
      const dailyNumber = order.daily_order_number as number | null;

      let key: string;
      let mesa: string;

      if (dailyNumber != null) {
        // Carnitas: cada orden tiene su propio número, no se agrupa por nombre.
        key = `order-${order.id}`;
        const typeLabel = orderType === 'takeout' ? ' · Llevar' : orderType === 'delivery' ? ' · Domicilio' : '';
        mesa = `Pedido #${dailyNumber}${typeLabel}`;
      } else if (orderType === 'takeout' || orderType === 'delivery' || !customerName) {
        const prefix = orderType === 'delivery' ? 'delivery' : 'takeout';
        const label = orderType === 'delivery' ? 'A Domicilio' : 'Para Llevar';
        key = `${prefix}-${order.id}`;
        const shortId = order.id.slice(0, 6).toUpperCase();
        mesa = customerName
          ? `${customerName} (${label})`
          : (order.notes || `${label} #${shortId}`);
      } else {
        key = `customer-${customerName.toLowerCase()}`;
        mesa = customerName;
      }

      const existing = tabMap.get(key) ?? {
        tableId: order.table_id as string | null,
        customerName,
        orderType: orderType as 'dine_in' | 'takeout' | 'delivery',
        mesa,
        orderIds: [] as string[],
        items: [] as TabItem[],
        subtotal: 0,
        tax: 0,
        total: 0,
        oldestOrder: order.created_at as string,
      };

      existing.orderIds.push(order.id);
      existing.subtotal += order.subtotal;
      existing.tax += order.tax;
      existing.total += order.total;

      for (const item of order.order_items ?? []) {
        if (item.status === 'cancelled') continue;
        const product = Array.isArray(item.product) ? item.product[0] : item.product;
        const name = (product as any)?.name ?? 'Producto';
        const modifiers = (item.modifiers ?? []).map((m: any) => ({
          id: m.id,
          modifierId: m.modifier_id,
          name: m.modifier_name,
          priceOverride: Number(m.price_override) || 0,
        }));

        existing.items.push({
          orderItemId: item.id,
          orderId: order.id,
          productId: item.product_id,
          productName: name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          subtotal: item.subtotal,
          notes: item.notes ?? null,
          modifiers,
        });
      }

      tabMap.set(key, existing);
    }

    const result: OpenTab[] = Array.from(tabMap.values());
    setTabs(result);
    setLoading(false);
  }, [activeBusinessLine]);

  useEffect(() => {
    fetchTabs();

    const channel = supabase
      .channel('open-tabs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchTabs(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => fetchTabs(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTabs]);

  async function closeTab(
    tab: OpenTab,
    paymentMethod: 'cash' | 'card' | 'transfer',
    options?: { discount?: number; tip?: number },
  ) {
    const discount = options?.discount ?? 0;
    const tip = options?.tip ?? 0;

    // Update all orders in the tab
    const { error } = await supabase
      .from('orders')
      .update({
        payment_method: paymentMethod,
        discount,
        tip,
      })
      .in('id', tab.orderIds);

    if (error) throw error;

    // If dine-in with table, set table back to available
    if (tab.tableId) {
      await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', tab.tableId);
    }

    // Register tip as cash movement if there's an active session and tip > 0
    if (tip > 0) {
      const { data: session } = await supabase
        .from('cash_register_sessions')
        .select('id')
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('cash_register_movements').insert({
            session_id: session.id,
            type: 'tip',
            amount: tip,
            description: `Propina - ${tab.mesa}`,
            created_by: user.id,
          });
        }
      }
    }

    // Register sale movement if there's an active session
    if (paymentMethod === 'cash') {
      const { data: session } = await supabase
        .from('cash_register_sessions')
        .select('id')
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        const { data: { user } } = await supabase.auth.getUser();
        const saleAmount = tab.total - discount + tip;
        if (user && saleAmount > 0) {
          await supabase.from('cash_register_movements').insert({
            session_id: session.id,
            type: 'sale',
            amount: saleAmount,
            description: `Venta - ${tab.mesa}`,
            order_id: tab.orderIds[0],
            created_by: user.id,
          });
        }
      }
    }

    await fetchTabs();
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
    const { error } = await supabase
      .from('order_items')
      .update({ quantity: newQuantity, subtotal: newSubtotal, status: 'pending' })
      .eq('id', orderItemId);

    if (error) throw error;
    await recalcOrderTotals(orderId);
    await fetchTabs();
  }

  /** Marca un item como cancelado (no se borra para preservar histórico). */
  async function cancelItem(orderItemId: string, orderId: string) {
    const { error } = await supabase
      .from('order_items')
      .update({ status: 'cancelled' })
      .eq('id', orderItemId);

    if (error) throw error;
    await recalcOrderTotals(orderId);
    await fetchTabs();
  }

  /** Actualiza la nota libre del item. */
  async function updateItemNotes(orderItemId: string, notes: string) {
    const trimmed = notes.trim();
    const { error } = await supabase
      .from('order_items')
      .update({ notes: trimmed || null })
      .eq('id', orderItemId);

    if (error) throw error;
    await fetchTabs();
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
    newModifiers: { modifierId: string; name: string; priceOverride: number }[],
  ) {
    // 1. Borrar los modifiers actuales del item
    const { error: delErr } = await supabase
      .from('order_item_modifiers')
      .delete()
      .eq('order_item_id', orderItemId);
    if (delErr) throw delErr;

    // 2. Insertar los nuevos (si hay)
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

    // 3. Recalcular unit_price + subtotal del item
    const { data: itemRow } = await supabase
      .from('order_items')
      .select('quantity')
      .eq('id', orderItemId)
      .maybeSingle();
    if (!itemRow) throw new Error('Item no encontrado');

    const modSum = newModifiers.reduce((s, m) => s + m.priceOverride, 0);
    const newUnit = Math.round((productBasePrice + modSum) * 100) / 100;
    const newSubtotal = Math.round(newUnit * itemRow.quantity * 100) / 100;

    const { error: updErr } = await supabase
      .from('order_items')
      .update({ unit_price: newUnit, subtotal: newSubtotal })
      .eq('id', orderItemId);
    if (updErr) throw updErr;

    await recalcOrderTotals(orderId);
    await fetchTabs();
  }

  return {
    tabs,
    loading,
    closeTab,
    refetch: fetchTabs,
    adjustItemQuantity,
    cancelItem,
    updateItemNotes,
    updateItemModifiers,
  };
}
