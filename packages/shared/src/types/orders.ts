import type { OrderStatus, OrderItemStatus, PaymentMethod } from '../constants.js';

export interface Order {
  id: string;
  table_id: string;
  created_by: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  status: OrderItemStatus;
  notes: string | null;
  sent_to_kitchen_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  product_name?: string;
  modifiers?: OrderItemModifier[];
}

export interface OrderItemModifier {
  id: string;
  order_item_id: string;
  modifier_id: string;
  modifier_name: string;
  price_override: number;
  created_at: string;
}
