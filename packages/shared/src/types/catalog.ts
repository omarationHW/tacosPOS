export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
  modifier_groups?: ProductModifierGroup[];
}

export interface ModifierGroup {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  modifiers?: Modifier[];
}

export interface ProductModifierGroup {
  id: string;
  product_id: string;
  modifier_group_id: string;
  modifier_group?: ModifierGroup;
}

export interface Modifier {
  id: string;
  modifier_group_id: string;
  name: string;
  price_override: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
