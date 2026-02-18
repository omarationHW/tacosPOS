import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface PopularProduct {
  name: string;
  totalQty: number;
}

export type DashboardPeriod = 'today' | 'week' | 'month';

interface DashboardStats {
  ordersCount: number;
  revenue: number;
  popularProducts: PopularProduct[];
  loading: boolean;
}

function getPeriodStart(period: DashboardPeriod): string {
  const d = new Date();
  if (period === 'today') {
    d.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setMonth(d.getMonth() - 1);
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

export function useDashboardStats(period: DashboardPeriod = 'today'): DashboardStats {
  const [ordersCount, setOrdersCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      const sinceISO = getPeriodStart(period);

      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('id, total')
        .neq('status', 'cancelled')
        .gte('created_at', sinceISO);

      if (ordersErr) {
        setLoading(false);
        return;
      }

      const orders = ordersData ?? [];
      setOrdersCount(orders.length);
      setRevenue(
        orders.reduce((sum, o) => sum + (typeof o.total === 'number' ? o.total : 0), 0),
      );

      if (orders.length > 0) {
        const orderIds = orders.map((o) => o.id);

        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select('quantity, product:products ( name )')
          .in('order_id', orderIds)
          .neq('status', 'cancelled');

        if (!itemsErr) {
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
      } else {
        setPopularProducts([]);
      }

      setLoading(false);
    }

    fetchStats();
  }, [period]);

  return { ordersCount, revenue, popularProducts, loading };
}
