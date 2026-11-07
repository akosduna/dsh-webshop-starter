// Mirrors supabase/migrations. After changing the schema, regenerate with:
//   npx supabase gen types typescript --local > src/types/database.ts
// (or --project-id <ref> for a hosted project) and keep the helper exports at the bottom.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13';
  };
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string;
          company: string | null;
          country: string;
          created_at: string;
          full_name: string;
          id: string;
          is_default: boolean;
          phone: string | null;
          postal_code: string;
          street: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          city: string;
          company?: string | null;
          country?: string;
          created_at?: string;
          full_name: string;
          id?: string;
          is_default?: boolean;
          phone?: string | null;
          postal_code: string;
          street: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          city?: string;
          company?: string | null;
          country?: string;
          created_at?: string;
          full_name?: string;
          id?: string;
          is_default?: boolean;
          phone?: string | null;
          postal_code?: string;
          street?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          name: string;
          parent_id: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name: string;
          parent_id?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          image_url: string | null;
          line_total_cents: number;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          sku: string | null;
          unit_price_cents: number;
          variant_id: string | null;
          variant_name: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_url?: string | null;
          line_total_cents: number;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          sku?: string | null;
          unit_price_cents: number;
          variant_id?: string | null;
          variant_name?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string | null;
          line_total_cents?: number;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          sku?: string | null;
          unit_price_cents?: number;
          variant_id?: string | null;
          variant_name?: string | null;
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
          {
            foreignKeyName: 'order_items_variant_id_fkey';
            columns: ['variant_id'];
            isOneToOne: false;
            referencedRelation: 'product_variants';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          billing_address: Json;
          created_at: string;
          currency: string;
          customer_note: string | null;
          email: string;
          id: string;
          order_number: number;
          paid_at: string | null;
          payment_status: string;
          phone: string | null;
          shipping_address: Json | null;
          shipping_cents: number;
          shipping_method_id: string | null;
          shipping_method_name: string;
          shipping_method_type: string;
          status: string;
          stock_decremented_at: string | null;
          stripe_payment_intent_id: string | null;
          subtotal_cents: number;
          total_cents: number;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          billing_address: Json;
          created_at?: string;
          currency?: string;
          customer_note?: string | null;
          email: string;
          id?: string;
          order_number?: number;
          paid_at?: string | null;
          payment_status?: string;
          phone?: string | null;
          shipping_address?: Json | null;
          shipping_cents?: number;
          shipping_method_id?: string | null;
          shipping_method_name: string;
          shipping_method_type?: string;
          status?: string;
          stock_decremented_at?: string | null;
          stripe_payment_intent_id?: string | null;
          subtotal_cents: number;
          total_cents: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          billing_address?: Json;
          created_at?: string;
          currency?: string;
          customer_note?: string | null;
          email?: string;
          id?: string;
          order_number?: number;
          paid_at?: string | null;
          payment_status?: string;
          phone?: string | null;
          shipping_address?: Json | null;
          shipping_cents?: number;
          shipping_method_id?: string | null;
          shipping_method_name?: string;
          shipping_method_type?: string;
          status?: string;
          stock_decremented_at?: string | null;
          stripe_payment_intent_id?: string | null;
          subtotal_cents?: number;
          total_cents?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_shipping_method_id_fkey';
            columns: ['shipping_method_id'];
            isOneToOne: false;
            referencedRelation: 'shipping_methods';
            referencedColumns: ['id'];
          },
        ];
      };
      product_images: {
        Row: {
          alt: string | null;
          created_at: string;
          id: string;
          product_id: string;
          sort_order: number;
          storage_path: string | null;
          url: string;
        };
        Insert: {
          alt?: string | null;
          created_at?: string;
          id?: string;
          product_id: string;
          sort_order?: number;
          storage_path?: string | null;
          url: string;
        };
        Update: {
          alt?: string | null;
          created_at?: string;
          id?: string;
          product_id?: string;
          sort_order?: number;
          storage_path?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_images_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      product_variants: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          options: Json;
          price_cents: number | null;
          product_id: string;
          sku: string | null;
          sort_order: number;
          stock_quantity: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          options?: Json;
          price_cents?: number | null;
          product_id: string;
          sku?: string | null;
          sort_order?: number;
          stock_quantity?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          options?: Json;
          price_cents?: number | null;
          product_id?: string;
          sku?: string | null;
          sort_order?: number;
          stock_quantity?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_variants_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      products: {
        Row: {
          category_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          is_featured: boolean;
          name: string;
          option_names: string[];
          price_cents: number;
          sku: string | null;
          slug: string;
          sort_order: number;
          stock_quantity: number;
          updated_at: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          name: string;
          option_names?: string[];
          price_cents: number;
          sku?: string | null;
          slug: string;
          sort_order?: number;
          stock_quantity?: number;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          name?: string;
          option_names?: string[];
          price_cents?: number;
          sku?: string | null;
          slug?: string;
          sort_order?: number;
          stock_quantity?: number;
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
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shipping_methods: {
        Row: {
          created_at: string;
          description: string | null;
          free_over_cents: number | null;
          id: string;
          is_active: boolean;
          name: string;
          price_cents: number;
          sort_order: number;
          type: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          free_over_cents?: number | null;
          id?: string;
          is_active?: boolean;
          name: string;
          price_cents?: number;
          sort_order?: number;
          type?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          free_over_cents?: number | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          price_cents?: number;
          sort_order?: number;
          type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      store_settings: {
        Row: {
          address: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          currency: string;
          hero_subtitle: string | null;
          hero_title: string | null;
          id: number;
          shop_name: string;
          tagline: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          currency?: string;
          hero_subtitle?: string | null;
          hero_title?: string | null;
          id?: number;
          shop_name?: string;
          tagline?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          currency?: string;
          hero_subtitle?: string | null;
          hero_title?: string | null;
          id?: number;
          shop_name?: string;
          tagline?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      decrement_stock: {
        Args: { p_product_id: string | null; p_variant_id: string | null; p_quantity: number };
        Returns: number;
      };
      is_admin: { Args: never; Returns: boolean };
      mark_order_paid: {
        Args: { p_order_id: string; p_payment_intent_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
