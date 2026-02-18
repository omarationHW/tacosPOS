export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'admin' | 'cashier' | 'kitchen';
          pin_hash: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          role?: 'admin' | 'cashier' | 'kitchen';
          pin?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'admin' | 'cashier' | 'kitchen';
          pin?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          color: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          sort_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
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
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      modifier_groups: {
        Row: {
          id: string;
          name: string;
          min_select: number;
          max_select: number;
          is_required: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          min_select?: number;
          max_select?: number;
          is_required?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          min_select?: number;
          max_select?: number;
          is_required?: boolean;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_modifier_groups: {
        Row: {
          id: string;
          product_id: string;
          modifier_group_id: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          modifier_group_id: string;
        };
        Update: {
          product_id?: string;
          modifier_group_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_modifier_groups_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_modifier_groups_modifier_group_id_fkey';
            columns: ['modifier_group_id'];
            isOneToOne: false;
            referencedRelation: 'modifier_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      modifiers: {
        Row: {
          id: string;
          modifier_group_id: string;
          name: string;
          price_override: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          modifier_group_id: string;
          name: string;
          price_override?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          modifier_group_id?: string;
          name?: string;
          price_override?: number;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'modifiers_modifier_group_id_fkey';
            columns: ['modifier_group_id'];
            isOneToOne: false;
            referencedRelation: 'modifier_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      tables: {
        Row: {
          id: string;
          name: string;
          capacity: number;
          status: 'available' | 'occupied' | 'reserved';
          position_x: number | null;
          position_y: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          capacity?: number;
          status?: 'available' | 'occupied' | 'reserved';
          position_x?: number | null;
          position_y?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          capacity?: number;
          status?: 'available' | 'occupied' | 'reserved';
          position_x?: number | null;
          position_y?: number | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          table_id: string | null;
          created_by: string;
          status: 'open' | 'in_progress' | 'completed' | 'cancelled';
          subtotal: number;
          tax: number;
          total: number;
          payment_method: 'cash' | 'card' | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_id?: string | null;
          created_by: string;
          status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
          subtotal?: number;
          tax?: number;
          total?: number;
          payment_method?: 'cash' | 'card' | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          table_id?: string;
          status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
          subtotal?: number;
          tax?: number;
          total?: number;
          payment_method?: 'cash' | 'card' | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_table_id_fkey';
            columns: ['table_id'];
            isOneToOne: false;
            referencedRelation: 'tables';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
          notes: string | null;
          sent_to_kitchen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity?: number;
          unit_price: number;
          subtotal: number;
          status?: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
          notes?: string | null;
          sent_to_kitchen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          quantity?: number;
          unit_price?: number;
          subtotal?: number;
          status?: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
          notes?: string | null;
          sent_to_kitchen_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      order_item_modifiers: {
        Row: {
          id: string;
          order_item_id: string;
          modifier_id: string;
          modifier_name: string;
          price_override: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_item_id: string;
          modifier_id: string;
          modifier_name: string;
          price_override?: number;
          created_at?: string;
        };
        Update: {
          modifier_name?: string;
          price_override?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'order_item_modifiers_order_item_id_fkey';
            columns: ['order_item_id'];
            isOneToOne: false;
            referencedRelation: 'order_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_item_modifiers_modifier_id_fkey';
            columns: ['modifier_id'];
            isOneToOne: false;
            referencedRelation: 'modifiers';
            referencedColumns: ['id'];
          },
        ];
      };
      cash_register_sessions: {
        Row: {
          id: string;
          opened_by: string;
          closed_by: string | null;
          opening_amount: number;
          closing_amount: number | null;
          expected_amount: number | null;
          difference: number | null;
          opened_at: string;
          closed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          opened_by: string;
          closed_by?: string | null;
          opening_amount: number;
          closing_amount?: number | null;
          expected_amount?: number | null;
          difference?: number | null;
          opened_at?: string;
          closed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          closed_by?: string | null;
          closing_amount?: number | null;
          expected_amount?: number | null;
          difference?: number | null;
          closed_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cash_register_sessions_opened_by_fkey';
            columns: ['opened_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      cash_register_movements: {
        Row: {
          id: string;
          session_id: string;
          type: 'sale' | 'withdrawal' | 'deposit' | 'tip';
          amount: number;
          description: string | null;
          order_id: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          type: 'sale' | 'withdrawal' | 'deposit' | 'tip';
          amount: number;
          description?: string | null;
          order_id?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          description?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cash_register_movements_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'cash_register_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_register_movements_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cash_register_movements_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      verify_pin: {
        Args: { user_id: string; pin_input: string };
        Returns: boolean;
      };
      set_user_pin: {
        Args: { user_id: string; new_pin: string };
        Returns: undefined;
      };
      get_user_role: {
        Args: Record<string, never>;
        Returns: 'admin' | 'cashier' | 'kitchen';
      };
    };
    Enums: {
      user_role: 'admin' | 'cashier' | 'kitchen';
      order_status: 'open' | 'in_progress' | 'completed' | 'cancelled';
      order_item_status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
      table_status: 'available' | 'occupied' | 'reserved';
      payment_method: 'cash' | 'card';
      movement_type: 'sale' | 'withdrawal' | 'deposit' | 'tip';
    };
  };
}
