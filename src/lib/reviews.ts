import { supabase } from "@/integrations/supabase/client";

export type ReviewRow = {
  id: string;
  order_id: string | null;
  listing_id: string | null;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  communication_rating: number | null;
  description_accuracy_rating: number | null;
  shipping_rating: number | null;
  created_at: string;
};

export async function getReviewForOrder(
  orderId: string,
  reviewerId: string,
): Promise<ReviewRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("reviews")
    .select("*")
    .eq("order_id", orderId)
    .eq("reviewer_id", reviewerId)
    .maybeSingle();
  return (data as ReviewRow) ?? null;
}

export async function getReviewsForOrders(
  orderIds: string[],
  reviewerId: string,
): Promise<Record<string, ReviewRow>> {
  if (orderIds.length === 0) return {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("reviews")
    .select("*")
    .in("order_id", orderIds)
    .eq("reviewer_id", reviewerId);
  const map: Record<string, ReviewRow> = {};
  for (const r of (data ?? []) as ReviewRow[]) {
    if (r.order_id) map[r.order_id] = r;
  }
  return map;
}

export async function getReviewsBySellerOrders(
  orderIds: string[],
): Promise<Record<string, ReviewRow>> {
  if (orderIds.length === 0) return {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("reviews")
    .select("*")
    .in("order_id", orderIds);
  const map: Record<string, ReviewRow> = {};
  for (const r of (data ?? []) as ReviewRow[]) {
    if (r.order_id) map[r.order_id] = r;
  }
  return map;
}

export async function createSellerReview(params: {
  orderId: string;
  listingId: string | null;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string | null;
  communicationRating?: number | null;
  descriptionAccuracyRating?: number | null;
  shippingRating?: number | null;
}): Promise<{ data: ReviewRow | null; error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("reviews")
    .insert({
      order_id: params.orderId,
      listing_id: params.listingId,
      reviewer_id: params.reviewerId,
      reviewee_id: params.revieweeId,
      rating: params.rating,
      comment: params.comment ?? null,
      communication_rating: params.communicationRating ?? null,
      description_accuracy_rating: params.descriptionAccuracyRating ?? null,
      shipping_rating: params.shippingRating ?? null,
    })
    .select("*")
    .single();
  return { data: (data as ReviewRow) ?? null, error: error?.message ?? null };
}
