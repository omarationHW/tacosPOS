import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface KitchenOrderItem {
  id: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  notes: string | null;
  sent_to_kitchen_at: string | null;
  product: { name: string };
}

export interface KitchenOrder {
  id: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
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

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        notes,
        created_at,
        order_items (
          id,
          quantity,
          status,
          notes,
          sent_to_kitchen_at,
          product:products ( name )
        )
      `)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: true });

    if (error) return;

    const normalized = (data ?? []).map((order) => ({
      ...order,
      order_items: (order.order_items ?? []).map((item: any) => ({
        ...item,
        product: Array.isArray(item.product) ? item.product[0] : item.product,
      })),
    })) as KitchenOrder[];

    // Detect new orders and play sound
    const currentIds = new Set(normalized.map((o) => o.id));
    if (initialLoadDoneRef.current) {
      for (const id of currentIds) {
        if (!prevOrderIdsRef.current.has(id)) {
          playNewOrderSound();
          break; // One sound is enough even if multiple new orders
        }
      }
    }
    prevOrderIdsRef.current = currentIds;
    initialLoadDoneRef.current = true;

    setOrders(normalized);
    setLoading(false);
  }, []);

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

  return { orders, loading, advanceOrder, refetch: fetchOrders };
}
