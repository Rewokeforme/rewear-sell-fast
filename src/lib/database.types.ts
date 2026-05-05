// Minimal hand-typed schema. Replace with `supabase gen types typescript` output when ready.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          city: string | null;
          avatar_url: string | null;
          bio: string | null;
          is_verified: boolean;
          rewear_score: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      user_roles: {
        Row: { id: string; user_id: string; role: "admin" | "user" };
        Insert: { user_id: string; role: "admin" | "user" };
        Update: Partial<{ role: "admin" | "user" }>;
      };
      categories: {
        Row: { id: string; slug: string; name_sv: string; sort_order: number };
        Insert: Omit<Database["public"]["Tables"]["categories"]["Row"], "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
      };
      co2_factors: {
        Row: { category_id: string; kg_saved: number };
        Insert: { category_id: string; kg_saved: number };
        Update: Partial<{ kg_saved: number }>;
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          category_id: string | null;
          title: string;
          brand: string | null;
          size: string | null;
          condition: string | null;
          price_sek: number;
          description: string | null;
          status: "active" | "sold" | "removed";
          ai_detected_brand: string | null;
          ai_suggested_price: number | null;
          ai_generated_description: string | null;
          co2_saved_kg: number;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["listings"]["Row"],
          "id" | "created_at" | "co2_saved_kg" | "status"
        > & { id?: string; status?: "active" | "sold" | "removed"; co2_saved_kg?: number };
        Update: Partial<Database["public"]["Tables"]["listings"]["Row"]>;
      };
      listing_images: {
        Row: { id: string; listing_id: string; url: string; position: number };
        Insert: Omit<Database["public"]["Tables"]["listing_images"]["Row"], "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["listing_images"]["Row"]>;
      };
      favorites: {
        Row: { user_id: string; listing_id: string; created_at: string };
        Insert: { user_id: string; listing_id: string };
        Update: Partial<{ user_id: string; listing_id: string }>;
      };
      conversations: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          last_message_at: string;
          created_at: string;
        };
        Insert: { id?: string; listing_id: string; buyer_id: string; seller_id: string };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Row"]>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: { id?: string; conversation_id: string; sender_id: string; body: string };
        Update: Partial<{ read_at: string | null }>;
      };
      reviews: {
        Row: {
          id: string;
          reviewer_id: string;
          reviewee_id: string;
          listing_id: string | null;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["reviews"]["Row"],
          "id" | "created_at"
        > & { id?: string };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Row"]>;
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          listing_id: string;
          reason: string;
          status: "open" | "resolved";
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          listing_id: string;
          reason: string;
          status?: "open" | "resolved";
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Row"]>;
      };
    };
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
export type ListingImageRow = Database["public"]["Tables"]["listing_images"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
export type ReportRow = Database["public"]["Tables"]["reports"]["Row"];

export type ListingWithDetails = ListingRow & {
  listing_images: ListingImageRow[];
  profiles: Pick<ProfileRow, "id" | "full_name" | "city" | "avatar_url" | "rewear_score" | "is_verified"> | null;
  categories: Pick<CategoryRow, "slug" | "name_sv"> | null;
};
