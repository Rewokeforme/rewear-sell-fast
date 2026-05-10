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

export type PaymentMethod = "klarna" | "card" | "swish";

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
  shipping_full_name: string | null;
  shipping_street: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_phone: string | null;
  payment_method: string | null;
  is_mock_payment?: boolean | null;
  paid_at?: string | null;
};

export type OrderWithListing = OrderRow & {
  listing: {
    id: string;
    title: string;
    price_sek: number;
    listing_images: { url: string; position: number }[];
  } | null;
  buyer: { id: string; full_name: string | null; avatar_url: string | null } | null;
  seller: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    is_verified?: boolean | null;
    trust_score?: number | null;
  } | null;
};

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

export async function updateOrderShipping(
  orderId: string,
  shipping: {
    fullName: string;
    street: string;
    postalCode: string;
    city: string;
    phone: string;
    paymentMethod: PaymentMethod;
  },
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("orders")
    .update({
      shipping_full_name: shipping.fullName,
      shipping_street: shipping.street,
      shipping_postal_code: shipping.postalCode,
      shipping_city: shipping.city,
      shipping_phone: shipping.phone,
      payment_method: shipping.paymentMethod,
    })
    .eq("id", orderId);
  return { error: error?.message ?? null };
}

async function hydrateOrder(order: OrderRow | null): Promise<OrderWithListing | null> {
  if (!order) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [listingRes, buyerRes, sellerRes] = await Promise.all([
    sb
      .from("listings")
      .select("id, title, price_sek, listing_images(url, position)")
      .eq("id", order.listing_id)
      .maybeSingle(),
    sb
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", order.buyer_id)
      .maybeSingle(),
    sb
      .from("profiles")
      .select("id, full_name, avatar_url, is_verified, trust_score")
      .eq("id", order.seller_id)
      .maybeSingle(),
  ]);
  return {
    ...order,
    listing: listingRes.data ?? null,
    buyer: buyerRes.data ?? null,
    seller: sellerRes.data ?? null,
  };
}

export async function getOrder(orderId: string): Promise<OrderWithListing | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  return hydrateOrder(data as OrderRow | null);
}

export async function getMyPurchases(buyerId: string): Promise<OrderWithListing[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("orders")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  const rows = (data as OrderRow[]) ?? [];
  const hydrated = await Promise.all(rows.map(hydrateOrder));
  return hydrated.filter(Boolean) as OrderWithListing[];
}

export async function getMySales(sellerId: string): Promise<OrderWithListing[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("orders")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  const rows = (data as OrderRow[]) ?? [];
  const hydrated = await Promise.all(rows.map(hydrateOrder));
  return hydrated.filter(Boolean) as OrderWithListing[];
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

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  klarna: "Klarna",
  card: "Kort",
  swish: "Swish",
};
