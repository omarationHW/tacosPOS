import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ModifierGroupRow = Database['public']['Tables']['modifier_groups']['Row'];
type ModifierRow = Database['public']['Tables']['modifiers']['Row'];

export interface ProductWithRelations extends Omit<ProductRow, 'price'> {
  price: number;
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
  modifier_groups: Array<{
    id: string;
    modifier_group_id: string;
    modifier_group: ModifierGroupRow & { modifiers: ModifierRow[] };
  }>;
}

export function useProducts() {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, icon, color),
        modifier_groups:product_modifier_groups(
          id,
          modifier_group_id,
          modifier_group:modifier_groups(
            *,
            modifiers(*)
          )
        )
      `)
      .order('sort_order');

    if (err) {
      setError(err.message);
    } else {
      setProducts((data ?? []) as unknown as ProductWithRelations[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error: err } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);
    if (err) throw err;

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const createProduct = async (
    product: {
      name: string;
      category_id: string;
      price: number;
      description?: string | null;
      image_url?: string | null;
      is_active?: boolean;
      sort_order?: number;
    },
    imageFile?: File | null,
    modifierGroupIds?: string[],
  ) => {
    let image_url = product.image_url;
    if (imageFile) {
      image_url = await uploadImage(imageFile);
    }

    const { data, error: err } = await supabase
      .from('products')
      .insert({ ...product, image_url } as Database['public']['Tables']['products']['Insert'])
      .select()
      .single();

    if (err) throw err;
    const row = data as ProductRow;

    if (modifierGroupIds?.length) {
      const links = modifierGroupIds.map((mgId) => ({
        product_id: row.id,
        modifier_group_id: mgId,
      }));
      await supabase
        .from('product_modifier_groups')
        .insert(links as Database['public']['Tables']['product_modifier_groups']['Insert'][]);
    }

    await fetchProducts();
    return row;
  };

  const updateProduct = async (
    id: string,
    updates: Partial<ProductRow>,
    imageFile?: File | null,
    modifierGroupIds?: string[],
  ) => {
    let image_url = updates.image_url;
    if (imageFile) {
      image_url = await uploadImage(imageFile);
    }

    const { data, error: err } = await supabase
      .from('products')
      .update({ ...updates, image_url } as Database['public']['Tables']['products']['Update'])
      .eq('id', id)
      .select()
      .single();

    if (err) throw err;
    const row = data as ProductRow;

    if (modifierGroupIds !== undefined) {
      await supabase
        .from('product_modifier_groups')
        .delete()
        .eq('product_id', id);

      if (modifierGroupIds.length) {
        const links = modifierGroupIds.map((mgId) => ({
          product_id: id,
          modifier_group_id: mgId,
        }));
        await supabase
          .from('product_modifier_groups')
          .insert(links as Database['public']['Tables']['product_modifier_groups']['Insert'][]);
      }
    }

    await fetchProducts();
    return row;
  };

  const deleteProduct = async (id: string) => {
    const { error: err } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (err) throw err;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    products,
    loading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadImage,
  };
}

export function useModifierGroups() {
  const [groups, setGroups] = useState<(ModifierGroupRow & { modifiers: ModifierRow[] })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('modifier_groups')
      .select('*, modifiers(*)')
      .order('name');
    setGroups((data ?? []) as unknown as (ModifierGroupRow & { modifiers: ModifierRow[] })[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (
    group: { name: string; min_select?: number; max_select?: number; is_required?: boolean },
    modifiers: { name: string; price_override?: number }[],
  ) => {
    const { data: groupData, error: groupErr } = await supabase
      .from('modifier_groups')
      .insert({
        name: group.name,
        min_select: group.min_select,
        max_select: group.max_select,
        is_required: group.is_required,
      } as Database['public']['Tables']['modifier_groups']['Insert'])
      .select()
      .single();
    if (groupErr) throw groupErr;

    const gd = groupData as ModifierGroupRow;

    if (modifiers.length) {
      const mods = modifiers.map((m, i) => ({
        modifier_group_id: gd.id,
        name: m.name,
        price_override: m.price_override ?? 0,
        sort_order: i,
      }));
      const { error: modErr } = await supabase
        .from('modifiers')
        .insert(mods as Database['public']['Tables']['modifiers']['Insert'][]);
      if (modErr) throw modErr;
    }

    await fetchGroups();
    return gd;
  };

  return { groups, loading, fetchGroups, createGroup };
}
