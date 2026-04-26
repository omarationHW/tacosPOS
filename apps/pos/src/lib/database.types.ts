export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      business_lines: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          schedule: Json
          slug: Database["public"]["Enums"]["business_line_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          schedule?: Json
          slug: Database["public"]["Enums"]["business_line_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          schedule?: Json
          slug?: Database["public"]["Enums"]["business_line_type"]
          updated_at?: string
        }
        Relationships: []
      }
      cash_register_movements: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string | null
          id: string
          order_id: string | null
          session_id: string
          type: Database["public"]["Enums"]["movement_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          order_id?: string | null
          session_id: string
          type: Database["public"]["Enums"]["movement_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          order_id?: string | null
          session_id?: string
          type?: Database["public"]["Enums"]["movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_register_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_sessions: {
        Row: {
          business_line_id: string
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          created_at: string
          difference: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_amount: number
          updated_at: string
        }
        Insert: {
          business_line_id: string
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          created_at?: string
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_amount: number
          updated_at?: string
        }
        Update: {
          business_line_id?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          created_at?: string
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_sessions_business_line_id_fkey"
            columns: ["business_line_id"]
            isOneToOne: false
            referencedRelation: "business_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          business_line_id: string
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          business_line_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          business_line_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_business_line_id_fkey"
            columns: ["business_line_id"]
            isOneToOne: false
            referencedRelation: "business_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          birthday: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          birthday?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      modifier_groups: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_required: boolean
          max_select: number
          min_select: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          max_select?: number
          min_select?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          max_select?: number
          min_select?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      modifiers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          modifier_group_id: string
          name: string
          price_override: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          modifier_group_id: string
          name: string
          price_override?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          modifier_group_id?: string
          name?: string
          price_override?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modifiers_modifier_group_id_fkey"
            columns: ["modifier_group_id"]
            isOneToOne: false
            referencedRelation: "modifier_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_modifiers: {
        Row: {
          created_at: string
          id: string
          modifier_id: string
          modifier_name: string
          order_item_id: string
          price_override: number
        }
        Insert: {
          created_at?: string
          id?: string
          modifier_id: string
          modifier_name: string
          order_item_id: string
          price_override?: number
        }
        Update: {
          created_at?: string
          id?: string
          modifier_id?: string
          modifier_name?: string
          order_item_id?: string
          price_override?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_modifiers_modifier_id_fkey"
            columns: ["modifier_id"]
            isOneToOne: false
            referencedRelation: "modifiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_modifiers_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          product_id: string
          quantity: number
          sent_to_kitchen_at: string | null
          status: Database["public"]["Enums"]["order_item_status"]
          subtotal: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          product_id: string
          quantity?: number
          sent_to_kitchen_at?: string | null
          status?: Database["public"]["Enums"]["order_item_status"]
          subtotal: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string
          quantity?: number
          sent_to_kitchen_at?: string | null
          status?: Database["public"]["Enums"]["order_item_status"]
          subtotal?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          business_line_id: string
          created_at: string
          created_by: string
          customer_id: string | null
          customer_name: string | null
          daily_order_number: number | null
          discount: number
          id: string
          notes: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          pickup_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_id: string | null
          tax: number
          tip: number
          total: number
          updated_at: string
        }
        Insert: {
          business_line_id: string
          created_at?: string
          created_by: string
          customer_id?: string | null
          customer_name?: string | null
          daily_order_number?: number | null
          discount?: number
          id?: string
          notes?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pickup_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          tax?: number
          tip?: number
          total?: number
          updated_at?: string
        }
        Update: {
          business_line_id?: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          customer_name?: string | null
          daily_order_number?: number | null
          discount?: number
          id?: string
          notes?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pickup_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          tax?: number
          tip?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_line_id_fkey"
            columns: ["business_line_id"]
            isOneToOne: false
            referencedRelation: "business_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_initial_seeds: {
        Row: {
          created_at: string
          email: string
          pin: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          email: string
          pin: string
          profile_id: string
        }
        Update: {
          created_at?: string
          email?: string
          pin?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pin_initial_seeds_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modifier_groups: {
        Row: {
          id: string
          modifier_group_id: string
          product_id: string
        }
        Insert: {
          id?: string
          modifier_group_id: string
          product_id: string
        }
        Update: {
          id?: string
          modifier_group_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_modifier_groups_modifier_group_id_fkey"
            columns: ["modifier_group_id"]
            isOneToOne: false
            referencedRelation: "modifier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modifier_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_line_id: string
          category_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          business_line_id: string
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          business_line_id?: string
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_line_id_fkey"
            columns: ["business_line_id"]
            isOneToOne: false
            referencedRelation: "business_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_business_lines: {
        Row: {
          business_line_id: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          business_line_id: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          business_line_id?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_business_lines_business_line_id_fkey"
            columns: ["business_line_id"]
            isOneToOne: false
            referencedRelation: "business_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_business_lines_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          pin_hash: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          is_active?: boolean
          pin_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          pin_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          position_x: number | null
          position_y: number | null
          status: Database["public"]["Enums"]["table_status"]
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          position_x?: number | null
          position_y?: number | null
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          position_x?: number | null
          position_y?: number | null
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _pin_to_password: { Args: { pin: string }; Returns: string }
      admin_reset_pin: { Args: { target_profile_id: string }; Returns: string }
      admin_rotate_password: {
        Args: { target_profile_id: string }
        Returns: undefined
      }
      change_own_pin: {
        Args: { new_pin: string; old_pin: string }
        Returns: undefined
      }
      delete_initial_pin: {
        Args: { target_profile_id: string }
        Returns: undefined
      }
      ensure_my_profile: { Args: never; Returns: undefined }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      list_profiles_for_login: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      peek_initial_pin: { Args: { target_profile_id: string }; Returns: string }
      set_user_pin: {
        Args: { new_pin: string; user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      business_line_type: "hamburguesas" | "carnitas"
      movement_type: "sale" | "withdrawal" | "deposit" | "tip"
      order_item_status:
        | "pending"
        | "preparing"
        | "ready"
        | "delivered"
        | "cancelled"
      order_status: "open" | "in_progress" | "completed" | "cancelled"
      order_type: "dine_in" | "takeout" | "delivery"
      payment_method: "cash" | "card" | "transfer"
      table_status: "available" | "occupied" | "reserved"
      user_role: "admin" | "cashier" | "kitchen" | "waiter"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      business_line_type: ["hamburguesas", "carnitas"],
      movement_type: ["sale", "withdrawal", "deposit", "tip"],
      order_item_status: [
        "pending",
        "preparing",
        "ready",
        "delivered",
        "cancelled",
      ],
      order_status: ["open", "in_progress", "completed", "cancelled"],
      order_type: ["dine_in", "takeout", "delivery"],
      payment_method: ["cash", "card", "transfer"],
      table_status: ["available", "occupied", "reserved"],
      user_role: ["admin", "cashier", "kitchen", "waiter"],
    },
  },
} as const
