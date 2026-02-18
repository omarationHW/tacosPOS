import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface TabItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OpenTab {
  mesa: string;
  orderIds: string[];
  items: TabItem[];
  subtotal: number;
  tax: number;
  total: number;
  oldestOrder: string; // created_at of first order
}

export function useOpenTabs() {
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTabs = useCallback(async () => {
    // Get all unpaid, non-cancelled orders that have a mesa note
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        notes,
        subtotal,
        tax,
        total,
        created_at,
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
      .not('notes', 'is', null)
      .order('created_at', { ascending: true });

    if (error) {
      setLoading(false);
      return;
    }

    // Group by mesa (notes field)
    const mesaMap = new Map<string, {
      orderIds: string[];
      items: TabItem[];
      subtotal: number;
      tax: number;
      total: number;
      oldestOrder: string;
    }>();

    for (const order of orders ?? []) {
      const mesa = order.notes!;
      const existing = mesaMap.get(mesa) ?? {
        orderIds: [],
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        oldestOrder: order.created_at,
      };

      existing.orderIds.push(order.id);
      existing.subtotal += order.subtotal;
      existing.tax += order.tax;
      existing.total += order.total;

      for (const item of order.order_items ?? []) {
        if (item.status === 'cancelled') continue;
        const product = Array.isArray(item.product) ? item.product[0] : item.product;
        const name = (product as any)?.name ?? 'Producto';

        // Merge same product into one line
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

      mesaMap.set(mesa, existing);
    }

    const result: OpenTab[] = Array.from(mesaMap.entries()).map(([mesa, data]) => ({
      mesa,
      ...data,
    }));

    setTabs(result);
    setLoading(false);
  }, []);

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

  async function closeTab(tab: OpenTab, paymentMethod: 'cash' | 'card') {
    const { error } = await supabase
      .from('orders')
      .update({ payment_method: paymentMethod })
      .in('id', tab.orderIds);

    if (error) throw error;

    await fetchTabs();
  }

  return { tabs, loading, closeTab, refetch: fetchTabs };
}
