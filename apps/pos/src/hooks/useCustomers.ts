import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type CustomerRow = Database['public']['Tables']['customers']['Row'];

export function useCustomers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    setCustomers((data as CustomerRow[]) ?? []);
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
    setCustomers((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
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
    setCustomers((prev) => prev.map((c) => (c.id === id ? row : c)));
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
