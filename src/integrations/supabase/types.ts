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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      orders: {
        Row: {
          awb_assigned_date: string | null
          awb_no: string | null
          billed_weight: number | null
          channel: string
          cod_charges: number | null
          courier_company: string | null
          created_at: string
          customer_city: string | null
          customer_email: string | null
          customer_mobile: string | null
          customer_name: string | null
          customer_pincode: string | null
          customer_state: string | null
          fwd_charges: number | null
          gst_charges: number | null
          id: string
          order_date: string
          order_delivered_date: string | null
          order_number: string
          order_pickup_date: string | null
          order_status: string
          order_total: number
          payment_method: string
          product_discount: number | null
          product_name: string
          product_price: number
          product_quantity: number
          product_sku: string
          rto_charges: number | null
          store_name: string | null
          store_order_date: string | null
          sub_order_number: string | null
          total_freight_charge: number | null
          updated_at: string
          user_id: string
          warehouse_id: string | null
          warehouse_name: string | null
          zone: string | null
        }
        Insert: {
          awb_assigned_date?: string | null
          awb_no?: string | null
          billed_weight?: number | null
          channel: string
          cod_charges?: number | null
          courier_company?: string | null
          created_at?: string
          customer_city?: string | null
          customer_email?: string | null
          customer_mobile?: string | null
          customer_name?: string | null
          customer_pincode?: string | null
          customer_state?: string | null
          fwd_charges?: number | null
          gst_charges?: number | null
          id?: string
          order_date: string
          order_delivered_date?: string | null
          order_number: string
          order_pickup_date?: string | null
          order_status: string
          order_total: number
          payment_method: string
          product_discount?: number | null
          product_name: string
          product_price: number
          product_quantity?: number
          product_sku: string
          rto_charges?: number | null
          store_name?: string | null
          store_order_date?: string | null
          sub_order_number?: string | null
          total_freight_charge?: number | null
          updated_at?: string
          user_id: string
          warehouse_id?: string | null
          warehouse_name?: string | null
          zone?: string | null
        }
        Update: {
          awb_assigned_date?: string | null
          awb_no?: string | null
          billed_weight?: number | null
          channel?: string
          cod_charges?: number | null
          courier_company?: string | null
          created_at?: string
          customer_city?: string | null
          customer_email?: string | null
          customer_mobile?: string | null
          customer_name?: string | null
          customer_pincode?: string | null
          customer_state?: string | null
          fwd_charges?: number | null
          gst_charges?: number | null
          id?: string
          order_date?: string
          order_delivered_date?: string | null
          order_number?: string
          order_pickup_date?: string | null
          order_status?: string
          order_total?: number
          payment_method?: string
          product_discount?: number | null
          product_name?: string
          product_price?: number
          product_quantity?: number
          product_sku?: string
          rto_charges?: number | null
          store_name?: string | null
          store_order_date?: string | null
          sub_order_number?: string | null
          total_freight_charge?: number | null
          updated_at?: string
          user_id?: string
          warehouse_id?: string | null
          warehouse_name?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          product_url: string | null
          shop_name: string
          shopify_product_id: string
          sku: string
          title: string
          updated_at: string | null
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          product_url?: string | null
          shop_name: string
          shopify_product_id: string
          sku: string
          title: string
          updated_at?: string | null
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          product_url?: string | null
          shop_name?: string
          shopify_product_id?: string
          sku?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: []
      }
      purchase_batches: {
        Row: {
          created_at: string
          file_names: string[]
          id: string
          notes: string | null
          total_items: number
          upload_date: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          file_names: string[]
          id?: string
          notes?: string | null
          total_items?: number
          upload_date?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          file_names?: string[]
          id?: string
          notes?: string | null
          total_items?: number
          upload_date?: string
          user_id?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          batch_id: string | null
          created_at: string | null
          date: string
          id: string
          notes: string | null
          quantity: number
          shop_name: string
          sku: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          quantity?: number
          shop_name: string
          sku: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          quantity?: number
          shop_name?: string
          sku?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "purchase_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          quantity: number
          return_date: string
          shop_name: string
          sku: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          quantity?: number
          return_date: string
          shop_name: string
          sku: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          quantity?: number
          return_date?: string
          shop_name?: string
          sku?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_credentials: {
        Row: {
          created_at: string
          id: string
          shopify_admin_token: string
          shopify_store_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          shopify_admin_token: string
          shopify_store_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          shopify_admin_token?: string
          shopify_store_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
