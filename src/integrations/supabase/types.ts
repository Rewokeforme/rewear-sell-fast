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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          related_conversation_id: string | null
          related_listing_id: string | null
          related_report_id: string | null
          related_user_id: string | null
          sent_by: string | null
          subject: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_conversation_id?: string | null
          related_listing_id?: string | null
          related_report_id?: string | null
          related_user_id?: string | null
          sent_by?: string | null
          subject?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_conversation_id?: string | null
          related_listing_id?: string | null
          related_report_id?: string | null
          related_user_id?: string | null
          sent_by?: string | null
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name_sv: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          name_sv: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          name_sv?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      co2_factors: {
        Row: {
          category_id: string
          kg_saved: number
        }
        Insert: {
          category_id: string
          kg_saved?: number
        }
        Update: {
          category_id?: string
          kg_saved?: number
        }
        Relationships: [
          {
            foreignKeyName: "co2_factors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_deletions: {
        Row: {
          conversation_id: string
          deleted_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          deleted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          deleted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          listing_id: string
          seller_id: string
          status: Database["public"]["Enums"]["conversation_status"]
          unread_count_for_buyer: number
          unread_count_for_seller: number
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          listing_id: string
          seller_id: string
          status?: Database["public"]["Enums"]["conversation_status"]
          unread_count_for_buyer?: number
          unread_count_for_seller?: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          listing_id?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          unread_count_for_buyer?: number
          unread_count_for_seller?: number
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      fit_profiles: {
        Row: {
          clothing_size: string | null
          created_at: string
          favorite_brands: string[]
          kids_sizes: string[]
          preferred_fit: string | null
          shoe_size: string | null
          style_tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          clothing_size?: string | null
          created_at?: string
          favorite_brands?: string[]
          kids_sizes?: string[]
          preferred_fit?: string | null
          shoe_size?: string | null
          style_tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          clothing_size?: string | null
          created_at?: string
          favorite_brands?: string[]
          kids_sizes?: string[]
          preferred_fit?: string | null
          shoe_size?: string | null
          style_tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          seller_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          seller_id?: string
        }
        Relationships: []
      }
      listing_images: {
        Row: {
          id: string
          listing_id: string
          position: number
          url: string
        }
        Insert: {
          id?: string
          listing_id: string
          position?: number
          url: string
        }
        Update: {
          id?: string
          listing_id?: string
          position?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          ai_detected_brand: string | null
          ai_generated_description: string | null
          ai_suggested_price: number | null
          area: string | null
          brand: string | null
          buyer_pays_shipping: boolean
          category_id: string | null
          city: string
          co2_saved_kg: number
          condition: string | null
          condition_checks: Json
          created_at: string
          delivery_method: string
          description: string | null
          id: string
          length_size: string | null
          main_category: string | null
          measurements: Json
          price_sek: number
          seller_id: string
          shipping_price: number | null
          ships_within_days: string | null
          shoe_size: string | null
          size: string | null
          size_label: string | null
          size_type: string | null
          status: Database["public"]["Enums"]["listing_status"]
          style_tags: string[]
          sub_category: string | null
          title: string
          views_count: number
          waist_size: string | null
        }
        Insert: {
          ai_detected_brand?: string | null
          ai_generated_description?: string | null
          ai_suggested_price?: number | null
          area?: string | null
          brand?: string | null
          buyer_pays_shipping?: boolean
          category_id?: string | null
          city: string
          co2_saved_kg?: number
          condition?: string | null
          condition_checks?: Json
          created_at?: string
          delivery_method: string
          description?: string | null
          id?: string
          length_size?: string | null
          main_category?: string | null
          measurements?: Json
          price_sek: number
          seller_id: string
          shipping_price?: number | null
          ships_within_days?: string | null
          shoe_size?: string | null
          size?: string | null
          size_label?: string | null
          size_type?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          style_tags?: string[]
          sub_category?: string | null
          title: string
          views_count?: number
          waist_size?: string | null
        }
        Update: {
          ai_detected_brand?: string | null
          ai_generated_description?: string | null
          ai_suggested_price?: number | null
          area?: string | null
          brand?: string | null
          buyer_pays_shipping?: boolean
          category_id?: string | null
          city?: string
          co2_saved_kg?: number
          condition?: string | null
          condition_checks?: Json
          created_at?: string
          delivery_method?: string
          description?: string | null
          id?: string
          length_size?: string | null
          main_category?: string | null
          measurements?: Json
          price_sek?: number
          seller_id?: string
          shipping_price?: number | null
          ships_within_days?: string | null
          shoe_size?: string | null
          size?: string | null
          size_label?: string | null
          size_type?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          style_tags?: string[]
          sub_category?: string | null
          title?: string
          views_count?: number
          waist_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_profile_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          flag_reason: string | null
          flagged: boolean
          id: string
          is_read: boolean
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          is_read?: boolean
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          is_read?: boolean
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          related_conversation_id: string | null
          related_listing_id: string | null
          related_user_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          related_conversation_id?: string | null
          related_listing_id?: string | null
          related_user_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          related_conversation_id?: string | null
          related_listing_id?: string | null
          related_user_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          currency: string
          delivery_method: string
          id: string
          item_price: number
          listing_id: string
          payment_method: string | null
          platform_fee: number
          seller_id: string
          shipping_city: string | null
          shipping_full_name: string | null
          shipping_phone: string | null
          shipping_postal_code: string | null
          shipping_price: number
          shipping_street: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          currency?: string
          delivery_method: string
          id?: string
          item_price: number
          listing_id: string
          payment_method?: string | null
          platform_fee?: number
          seller_id: string
          shipping_city?: string | null
          shipping_full_name?: string | null
          shipping_phone?: string | null
          shipping_postal_code?: string | null
          shipping_price?: number
          shipping_street?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          currency?: string
          delivery_method?: string
          id?: string
          item_price?: number
          listing_id?: string
          payment_method?: string | null
          platform_fee?: number
          seller_id?: string
          shipping_city?: string | null
          shipping_full_name?: string | null
          shipping_phone?: string | null
          shipping_postal_code?: string | null
          shipping_price?: number
          shipping_street?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          email_verified: boolean
          full_name: string | null
          id: string
          identity_provider: string | null
          identity_verified: boolean
          identity_verified_at: string | null
          is_suspended: boolean
          is_verified: boolean
          phone_verified: boolean
          rewear_score: number
          trust_score: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          email_verified?: boolean
          full_name?: string | null
          id: string
          identity_provider?: string | null
          identity_verified?: boolean
          identity_verified_at?: string | null
          is_suspended?: boolean
          is_verified?: boolean
          phone_verified?: boolean
          rewear_score?: number
          trust_score?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          email_verified?: boolean
          full_name?: string | null
          id?: string
          identity_provider?: string | null
          identity_verified?: boolean
          identity_verified_at?: string | null
          is_suspended?: boolean
          is_verified?: boolean
          phone_verified?: boolean
          rewear_score?: number
          trust_score?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          listing_id: string
          reason: string
          reporter_id: string
          responded_at: string | null
          responded_by: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          listing_id: string
          reason: string
          reporter_id: string
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          reason?: string
          reporter_id?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          listing_id: string | null
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_stats: {
        Row: {
          active_listings_count: number
          average_rating: number
          first_listing_at: string | null
          followers_count: number
          rating_count: number
          rewear_score: number
          sold_count: number
          total_co2_saved: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_listings_count?: number
          average_rating?: number
          first_listing_at?: string | null
          followers_count?: number
          rating_count?: number
          rewear_score?: number
          sold_count?: number
          total_co2_saved?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_listings_count?: number
          average_rating?: number
          first_listing_at?: string | null
          followers_count?: number
          rating_count?: number
          rewear_score?: number
          sold_count?: number
          total_co2_saved?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_verifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          provider: string | null
          status: string
          user_id: string
          verification_type: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string | null
          status?: string
          user_id: string
          verification_type: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string | null
          status?: string
          user_id?: string
          verification_type?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      style_alerts: {
        Row: {
          brand: string | null
          city: string | null
          created_at: string
          delivery_method: string | null
          id: string
          is_active: boolean
          main_category: string | null
          max_price: number | null
          min_price: number | null
          size: string | null
          sub_category: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          city?: string | null
          created_at?: string
          delivery_method?: string | null
          id?: string
          is_active?: boolean
          main_category?: string | null
          max_price?: number | null
          min_price?: number | null
          size?: string | null
          sub_category?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          city?: string | null
          created_at?: string
          delivery_method?: string | null
          id?: string
          is_active?: boolean
          main_category?: string | null
          max_price?: number | null
          min_price?: number | null
          size?: string | null
          sub_category?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          admin_notes: string | null
          admin_response: string | null
          created_at: string
          id: string
          reason: string
          reported_conversation_id: string | null
          reported_message_id: string | null
          reported_user_id: string | null
          reporter_id: string
          responded_at: string | null
          responded_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          admin_response?: string | null
          created_at?: string
          id?: string
          reason: string
          reported_conversation_id?: string | null
          reported_message_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          admin_response?: string | null
          created_at?: string
          id?: string
          reason?: string
          reported_conversation_id?: string | null
          reported_message_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_transition_order: {
        Args: {
          _is_buyer: boolean
          _is_seller: boolean
          _new: Database["public"]["Enums"]["order_status"]
          _old: Database["public"]["Enums"]["order_status"]
        }
        Returns: boolean
      }
      compute_seller_badge: { Args: { _user_id: string }; Returns: string }
      expire_unpaid_orders: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_listing_views: {
        Args: { _listing_id: string }
        Returns: undefined
      }
      is_conversation_member: {
        Args: { _conv_id: string; _user_id: string }
        Returns: boolean
      }
      recompute_rewear_score: { Args: { _user_id: string }; Returns: undefined }
      recompute_seller_stats: { Args: { _user_id: string }; Returns: undefined }
      recompute_trust_score: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      conversation_status: "active" | "archived" | "blocked"
      listing_status: "active" | "sold" | "removed" | "reserved"
      notification_type:
        | "new_listing"
        | "new_message"
        | "new_follower"
        | "system"
        | "admin_reply"
      order_status:
        | "pending_payment"
        | "paid"
        | "shipped"
        | "delivered"
        | "completed"
        | "cancelled"
        | "disputed"
        | "refunded"
      report_status: "open" | "resolved"
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
      app_role: ["admin", "user"],
      conversation_status: ["active", "archived", "blocked"],
      listing_status: ["active", "sold", "removed", "reserved"],
      notification_type: [
        "new_listing",
        "new_message",
        "new_follower",
        "system",
        "admin_reply",
      ],
      order_status: [
        "pending_payment",
        "paid",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
        "disputed",
        "refunded",
      ],
      report_status: ["open", "resolved"],
    },
  },
} as const
