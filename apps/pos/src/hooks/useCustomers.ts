import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];

export interface CustomerWithStats extends CustomerRow {
  visits: number;
  totalSpent: number;
  lastVisit: string | null;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const { data: rawCustomers } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    const baseCustomers = (rawCustomers as CustomerRow[]) ?? [];

    // Aggregate order stats per customer. Only paid, non-cancelled orders count.
    const ids = baseCustomers.map((c) => c.id);
    const statsMap = new Map<string, { visits: number; totalSpent: number; lastVisit: string | null }>();

    if (ids.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select('customer_id, total, created_at')
        .in('customer_id', ids)
        .neq('status', 'cancelled')
        .not('payment_method', 'is', null);

      for (const o of (orders ?? []) as Array<{ customer_id: string; total: number; created_at: string }>) {
        const existing = statsMap.get(o.customer_id) ?? { visits: 0, totalSpent: 0, lastVisit: null };
        existing.visits += 1;
        existing.totalSpent += o.total;
        if (!existing.lastVisit || o.created_at > existing.lastVisit) {
          existing.lastVisit = o.created_at;
        }
        statsMap.set(o.customer_id, existing);
      }
    }

    const withStats: CustomerWithStats[] = baseCustomers.map((c) => ({
      ...c,
      visits: statsMap.get(c.id)?.visits ?? 0,
      totalSpent: Math.round((statsMap.get(c.id)?.totalSpent ?? 0) * 100) / 100,
      lastVisit: statsMap.get(c.id)?.lastVisit ?? null,
    }));

    setCustomers(withStats);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const searchByPhone = async (phone: string): Promise<CustomerRow | null> => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    return (data as CustomerRow) ?? null;
  };

  const searchByName = async (name: string): Promise<CustomerRow[]> => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .ilike('name', `%${name}%`)
      .limit(10);

    return (data as CustomerRow[]) ?? [];
  };

  const createCustomer = async (customer: {
    name: string;
    phone?: string | null;
    birthday?: string | null;
    address?: string | null;
    notes?: string | null;
  }) => {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer as Database['public']['Tables']['customers']['Insert'])
      .select()
      .single();

    if (error) throw error;
    const row = data as CustomerRow;
    const withStats: CustomerWithStats = { ...row, visits: 0, totalSpent: 0, lastVisit: null };
    setCustomers((prev) => [...prev, withStats].sort((a, b) => a.name.localeCompare(b.name)));
    return row;
  };

  const updateCustomer = async (id: string, updates: Partial<CustomerRow>) => {
    const { data, error } = await supabase
      .from('customers')
      .update(updates as Database['public']['Tables']['customers']['Update'])
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const row = data as CustomerRow;
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...row } : c)),
    );
    return row;
  };

  const deleteCustomer = async (id: string) => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  return {
    customers,
    loading,
    fetchCustomers,
    searchByPhone,
    searchByName,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
