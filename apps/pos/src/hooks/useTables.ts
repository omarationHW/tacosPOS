import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  is_active: boolean;
}

export function useTables() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTables = useCallback(async () => {
    const { data, error } = await supabase
      .from('tables')
      .select('id, name, capacity, status, is_active')
      .eq('is_active', true)
      .order('name');

    if (!error) {
      setTables((data ?? []) as Table[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTables();

    const channel = supabase
      .channel('tables-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => fetchTables(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTables]);

  return { tables, loading, refetch: fetchTables };
}
