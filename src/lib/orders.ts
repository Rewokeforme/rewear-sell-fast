import { supabase } from "@/integrations/supabase/client";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "disputed"
  | "refunded";

export type OrderRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: OrderStatus;
  item_price: number;
  shipping_price: number;
  platform_fee: number;
  total_amount: number;
  currency: string;
  delivery_method: string;
  created_at: string;
  updated_at: string;
};

export type OrderWithListing = OrderRow & {
  listing: {
    id: string;
    title: string;
    price_sek: number;
    listing_images: { url: string; position: number }[];
  } | null;
  buyer: { id: string; full_name: string | null; avatar_url: string | null } | null;
  seller: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

const SELECT_WITH_RELATIONS = `
  *,
  listing:listings!orders_listing_id_fkey(id, title, price_sek, listing_images(url, position)),
  buyer:profiles!orders_buyer_id_fkey(id, full_name, avatar_url),
  seller:profiles!orders_seller_id_fkey(id, full_name, avatar_url)
`;

// Fallback select without explicit FK names (in case relationships aren't named)
const SELECT_FALLBACK = `*`;

export async function createOrder(params: {
  listingId: string;
  buyerId: string;
  sellerId: string;
  itemPrice: number;
  shippingPrice?: number;
  deliveryMethod: string;
}): Promise<{ data: OrderRow | null; error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("orders")
    .insert({
      listing_id: params.listingId,
      buyer_id: params.buyerId,
      seller_id: params.sellerId,
      item_price: params.itemPrice,
      shipping_price: params.shippingPrice ?? 0,
      platform_fee: 0,
      delivery_method: params.deliveryMethod,
      status: "pending_payment",
    })
    .select("*")
    .single();
  return { data: (data as OrderRow) ?? null, error: error?.message ?? null };
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("orders")
    .update({ status })
    .eq("id", orderId);
  return { error: error?.message ?? null };
}

export async function getOrder(orderId: string): Promise<OrderWithListing | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("orders")
    .select(SELECT_WITH_RELATIONS)
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fb = await (supabase as any).from("orders").select(SELECT_FALLBACK).eq("id", orderId).maybeSingle();
    return (fb.data as OrderWithListing) ?? null;
  }
  return data as OrderWithListing;
}

export async function getMyPurchases(buyerId: string): Promise<OrderWithListing[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("orders")
    .select(SELECT_WITH_RELATIONS)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  return (data as OrderWithListing[]) ?? [];
}

export async function getMySales(sellerId: string): Promise<OrderWithListing[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("orders")
    .select(SELECT_WITH_RELATIONS)
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  return (data as OrderWithListing[]) ?? [];
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Väntar på betalning",
  paid: "Betald",
  shipped: "Skickad",
  delivered: "Levererad",
  completed: "Slutförd",
  cancelled: "Avbruten",
  disputed: "Tvist",
  refunded: "Återbetald",
};
