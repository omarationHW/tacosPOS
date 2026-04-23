import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface DailySales {
  date: string;
  total: number;
  orderCount: number;
  cash: number;
  card: number;
  transfer: number;
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

export interface StaffSales {
  profileId: string;
  name: string;
  role: string;
  totalSales: number;
  orderCount: number;
  avgTicket: number;
}

export function useReports() {
  const getSalesByPeriod = useCallback(async (startDate: string, endDate: string, businessLineId?: string | null): Promise<DailySales[]> => {
    let query = supabase
      .from('orders')
      .select('id, total, payment_method, created_at')
      .neq('status', 'cancelled')
      .not('payment_method', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (businessLineId) {
      query = query.eq('business_line_id', businessLineId);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    const dayMap = new Map<string, { total: number; orderCount: number; cash: number; card: number; transfer: number }>();
    for (const order of data) {
      const day = order.created_at.slice(0, 10);
      const existing = dayMap.get(day) ?? { total: 0, orderCount: 0, cash: 0, card: 0, transfer: 0 };
      existing.total += order.total;
      existing.orderCount += 1;
      if (order.payment_method === 'cash') existing.cash += order.total;
      else if (order.payment_method === 'card') existing.card += order.total;
      else if (order.payment_method === 'transfer') existing.transfer += order.total;
      dayMap.set(day, existing);
    }

    return Array.from(dayMap.entries()).map(([date, v]) => ({
      date,
      total: Math.round(v.total * 100) / 100,
      orderCount: v.orderCount,
      cash: Math.round(v.cash * 100) / 100,
      card: Math.round(v.card * 100) / 100,
      transfer: Math.round(v.transfer * 100) / 100,
    }));
  }, []);

  const getTopProducts = useCallback(async (startDate: string, endDate: string, businessLineId?: string | null): Promise<ProductSales[]> => {
    let query = supabase
      .from('orders')
      .select('id')
      .neq('status', 'cancelled')
      .not('payment_method', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (businessLineId) {
      query = query.eq('business_line_id', businessLineId);
    }

    const { data: orders } = await query;

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

  const getAverageTicket = useCallback(async (startDate: string, endDate: string, businessLineId?: string | null): Promise<number> => {
    let query = supabase
      .from('orders')
      .select('total')
      .neq('status', 'cancelled')
      .not('payment_method', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (businessLineId) {
      query = query.eq('business_line_id', businessLineId);
    }

    const { data } = await query;

    if (!data || data.length === 0) return 0;
    const sum = data.reduce((s, o) => s + o.total, 0);
    return Math.round(sum / data.length * 100) / 100;
  }, []);

  const getSalesByPaymentMethod = useCallback(async (startDate: string, endDate: string, businessLineId?: string | null): Promise<PaymentMethodSales[]> => {
    let query = supabase
      .from('orders')
      .select('payment_method, total')
      .neq('status', 'cancelled')
      .not('payment_method', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (businessLineId) {
      query = query.eq('business_line_id', businessLineId);
    }

    const { data } = await query;

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
      method: method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : method === 'transfer' ? 'Transferencia' : method,
      ...v,
    }));
  }, []);

  const getSalesByHour = useCallback(async (startDate: string, endDate: string, businessLineId?: string | null): Promise<HourlySales[]> => {
    let query = supabase
      .from('orders')
      .select('total, created_at')
      .neq('status', 'cancelled')
      .not('payment_method', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (businessLineId) {
      query = query.eq('business_line_id', businessLineId);
    }

    const { data } = await query;

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

  const getCashCutHistory = useCallback(async (businessLineId?: string | null): Promise<CashCutSummary[]> => {
    let query = supabase
      .from('cash_register_sessions')
      .select('*, opener:profiles!cash_register_sessions_opened_by_fkey(full_name)')
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false })
      .limit(50);

    if (businessLineId) {
      query = query.eq('business_line_id', businessLineId);
    }

    const { data } = await query;

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

  const getSalesByStaff = useCallback(async (startDate: string, endDate: string, businessLineId?: string | null): Promise<StaffSales[]> => {
    let query = supabase
      .from('orders')
      .select('total, created_by, creator:profiles!orders_created_by_fkey(full_name, email, role)')
      .neq('status', 'cancelled')
      .not('payment_method', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (businessLineId) {
      query = query.eq('business_line_id', businessLineId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    const map = new Map<string, { name: string; role: string; totalSales: number; orderCount: number }>();
    for (const row of data as Array<{ total: number; created_by: string; creator: { full_name: string | null; email: string | null; role: string } | { full_name: string | null; email: string | null; role: string }[] | null }>) {
      const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator;
      const name = creator?.full_name?.trim() || creator?.email || 'Sin asignar';
      const role = creator?.role ?? '';
      const existing = map.get(row.created_by) ?? { name, role, totalSales: 0, orderCount: 0 };
      existing.totalSales += row.total;
      existing.orderCount += 1;
      map.set(row.created_by, existing);
    }

    return Array.from(map.entries())
      .map(([profileId, v]) => ({
        profileId,
        name: v.name,
        role: v.role,
        totalSales: Math.round(v.totalSales * 100) / 100,
        orderCount: v.orderCount,
        avgTicket: v.orderCount === 0 ? 0 : Math.round((v.totalSales / v.orderCount) * 100) / 100,
      }))
      .sort((a, b) => b.totalSales - a.totalSales);
  }, []);

  return {
    getSalesByPeriod,
    getTopProducts,
    getAverageTicket,
    getSalesByPaymentMethod,
    getSalesByHour,
    getCashCutHistory,
    getSalesByStaff,
  };
}
