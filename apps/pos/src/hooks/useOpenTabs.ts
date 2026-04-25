import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusinessLine } from '@/contexts/BusinessLineContext';

export interface TabItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
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
          quantity,
          unit_price,
          subtotal,
          status,
          product:products ( name )
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

        const existingItem = existing.items.find((i) => i.productName === name && i.unitPrice === item.unit_price);
        if (existingItem) {
          existingItem.quantity += item.quantity;
          existingItem.subtotal += item.subtotal;
        } else {
          existing.items.push({
            productName: name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            subtotal: item.subtotal,
          });
        }
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

  return { tabs, loading, closeTab, refetch: fetchTabs };
}
