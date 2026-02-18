import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface PopularProduct {
  name: string;
  totalQty: number;
}

interface DashboardStats {
  ordersToday: number;
  revenueToday: number;
  popularProducts: PopularProduct[];
  loading: boolean;
}

export function useDashboardStats(): DashboardStats {
  const [ordersToday, setOrdersToday] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      // Fetch today's non-cancelled orders
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('id, total')
        .neq('status', 'cancelled')
        .gte('created_at', todayISO);

      if (ordersErr) {
        setLoading(false);
        return;
      }

      const orders = ordersData ?? [];
      setOrdersToday(orders.length);
      setRevenueToday(
        orders.reduce((sum, o) => sum + (typeof o.total === 'number' ? o.total : 0), 0),
      );

      // Fetch today's order items with product names for popular products
      if (orders.length > 0) {
        const orderIds = orders.map((o) => o.id);

        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select('quantity, product:products ( name )')
          .in('order_id', orderIds)
          .neq('status', 'cancelled');

        if (!itemsErr) {
          // Aggregate by product name
          const productMap = new Map<string, number>();
          for (const item of itemsData ?? []) {
            const product = Array.isArray(item.product) ? item.product[0] : item.product;
            const name = (product as any)?.name ?? 'Desconocido';
            productMap.set(name, (productMap.get(name) ?? 0) + item.quantity);
          }

          const sorted = Array.from(productMap.entries())
            .map(([name, totalQty]) => ({ name, totalQty }))
            .sort((a, b) => b.totalQty - a.totalQty)
            .slice(0, 5);

          setPopularProducts(sorted);
        }
      }

      setLoading(false);
    }

    fetchStats();
  }, []);

  return { ordersToday, revenueToday, popularProducts, loading };
}
