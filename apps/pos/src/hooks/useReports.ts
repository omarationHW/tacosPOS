import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface DailySales {
  date: string;
  total: number;
  orderCount: number;
}

export interface ProductSales {
  name: string;
  totalQty: number;
  totalRevenue: number;
}

export interface PaymentMethodSales {
  method: string;
  total: number;
  count: number;
}

export interface HourlySales {
  hour: number;
  total: number;
  count: number;
}

export interface CashCutSummary {
  id: string;
  openedAt: string;
  closedAt: string;
  openingAmount: number;
  closingAmount: number;
  expected: number;
  difference: number;
  openerName: string;
}

export function useReports() {
  const getSalesByPeriod = useCallback(async (startDate: string, endDate: string): Promise<DailySales[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, total, created_at')
      .neq('status', 'cancelled')
      .not('payment_method', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    const dayMap = new Map<string, { total: number; orderCount: number }>();
    for (const order of data) {
      const day = order.created_at.slice(0, 10);
      const existing = dayMap.get(day) ?? { total: 0, orderCount: 0 };
      existing.total += order.total;
      existing.orderCount += 1;
      dayMap.set(day, existing);
    }

    return Array.from(dayMap.entries()).map(([date, v]) => ({
      date,
      total: Math.round(v.total * 100) / 100,
      orderCount: v.orderCount,
    }));
  }, []);

  const getTopProducts = useCallback(async (startDate: string, endDate: string): Promise<ProductSales[]> => {
    // Get order IDs in range
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .neq('status', 'cancelled')
      .not('payment_method', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (!orders || orders.length === 0) {
      return [];
    }

    const orderIds = orders.map((o) => o.id);

    const { data: items, error } = await supabase
      .from('order_items')
      .select('quantity, unit_price, subtotal, product:products(name)')
      .in('order_id', orderIds)
      .neq('status', 'cancelled');

    if (error || !items) return [];

    const productMap = new Map<string, { totalQty: number; totalRevenue: number }>();
    for (const item of items) {
      const product = Array.isArray(item.product) ? item.product[0] : item.product;
      const name = (product as any)?.name ?? 'Desconocido';
      const existing = productMap.get(name) ?? { totalQty: 0, totalRevenue: 0 };
      existing.totalQty += item.quantity;
      existing.totalRevenue += item.subtotal;
      productMap.set(name, existing);
    }

    return Array.from(productMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 20);
  }, []);

  const getAverageTicket = useCallback(async (startDate: string, endDate: string): Promise<number> => {
    const { data } = await supabase
      .from('orders')
      .select('total')
      .neq('status', 'cancelled')
      .not('payment_method', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (!data || data.length === 0) return 0;
    const sum = data.reduce((s, o) => s + o.total, 0);
    return Math.round(sum / data.length * 100) / 100;
  }, []);

  const getSalesByPaymentMethod = useCallback(async (startDate: string, endDate: string): Promise<PaymentMethodSales[]> => {
    const { data } = await supabase
      .from('orders')
      .select('payment_method, total')
      .neq('status', 'cancelled')
      .not('payment_method', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (!data) return [];

    const methodMap = new Map<string, { total: number; count: number }>();
    for (const order of data) {
      const method = order.payment_method ?? 'unknown';
      const existing = methodMap.get(method) ?? { total: 0, count: 0 };
      existing.total += order.total;
      existing.count += 1;
      methodMap.set(method, existing);
    }

    return Array.from(methodMap.entries()).map(([method, v]) => ({
      method: method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : method,
      ...v,
    }));
  }, []);

  const getSalesByHour = useCallback(async (startDate: string, endDate: string): Promise<HourlySales[]> => {
    const { data } = await supabase
      .from('orders')
      .select('total, created_at')
      .neq('status', 'cancelled')
      .not('payment_method', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (!data) return [];

    const hourMap = new Map<number, { total: number; count: number }>();
    for (const order of data) {
      const hour = new Date(order.created_at).getHours();
      const existing = hourMap.get(hour) ?? { total: 0, count: 0 };
      existing.total += order.total;
      existing.count += 1;
      hourMap.set(hour, existing);
    }

    return Array.from(hourMap.entries())
      .map(([hour, v]) => ({ hour, ...v }))
      .sort((a, b) => a.hour - b.hour);
  }, []);

  const getCashCutHistory = useCallback(async (): Promise<CashCutSummary[]> => {
    const { data } = await supabase
      .from('cash_register_sessions')
      .select('*, opener:profiles!cash_register_sessions_opened_by_fkey(full_name)')
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false })
      .limit(50);

    if (!data) return [];

    return data.map((s: any) => {
      const opener = Array.isArray(s.opener) ? s.opener[0] : s.opener;
      return {
        id: s.id,
        openedAt: s.opened_at,
        closedAt: s.closed_at,
        openingAmount: s.opening_amount,
        closingAmount: s.closing_amount ?? 0,
        expected: s.expected_amount ?? 0,
        difference: s.difference ?? 0,
        openerName: opener?.full_name ?? '',
      };
    });
  }, []);

  return {
    getSalesByPeriod,
    getTopProducts,
    getAverageTicket,
    getSalesByPaymentMethod,
    getSalesByHour,
    getCashCutHistory,
  };
}
