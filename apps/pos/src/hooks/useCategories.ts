import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type CategoryRow = Database['public']['Tables']['categories']['Row'];

export function useCategories() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');

    if (err) {
      setError(err.message);
    } else {
      setCategories((data as CategoryRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (category: {
    name: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    sort_order?: number;
    is_active?: boolean;
  }) => {
    const { data, error: err } = await supabase
      .from('categories')
      .insert(category as Database['public']['Tables']['categories']['Insert'])
      .select()
      .single();

    if (err) throw err;
    const row = data as CategoryRow;
    setCategories((prev) => [...prev, row]);
    return row;
  };

  const updateCategory = async (id: string, updates: Partial<CategoryRow>) => {
    const { data, error: err } = await supabase
      .from('categories')
      .update(updates as Database['public']['Tables']['categories']['Update'])
      .eq('id', id)
      .select()
      .single();

    if (err) throw err;
    const row = data as CategoryRow;
    setCategories((prev) => prev.map((c) => (c.id === id ? row : c)));
    return row;
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    return updateCategory(id, { is_active });
  };

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    toggleActive,
  };
}
