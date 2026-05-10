import { supabase } from "@/integrations/supabase/client";

export type DisputeReason =
  | "item_not_received"
  | "item_not_as_described"
  | "damaged_item"
  | "wrong_item"
  | "suspected_fraud"
  | "other";

export type DisputeStatus =
  | "open"
  | "awaiting_buyer_evidence"
  | "awaiting_seller_response"
  | "under_review"
  | "resolved_buyer"
  | "resolved_seller"
  | "closed";

export type DisputeRow = {
  id: string;
  order_id: string;
  opened_by: string;
  reason: DisputeReason;
  description: string | null;
  buyer_evidence_urls: string[];
  seller_evidence_urls: string[];
  carrier_tracking_snapshot: Record<string, unknown> | null;
  status: DisputeStatus;
  admin_decision: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export const DISPUTE_REASON_LABEL: Record<DisputeReason, string> = {
  item_not_received: "Varan har inte kommit fram",
  item_not_as_described: "Varan stämmer inte med beskrivningen",
  damaged_item: "Varan är skadad",
  wrong_item: "Fel vara mottagen",
  suspected_fraud: "Misstänkt bedrägeri",
  other: "Annat",
};

export async function createDispute(params: {
  orderId: string;
  openedBy: string;
  reason: DisputeReason;
  description: string;
  buyerEvidenceUrls?: string[];
  sellerEvidenceUrls?: string[];
}): Promise<{ data: DisputeRow | null; error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from("disputes")
    .insert({
      order_id: params.orderId,
      opened_by: params.openedBy,
      reason: params.reason,
      description: params.description,
      buyer_evidence_urls: params.buyerEvidenceUrls ?? [],
      seller_evidence_urls: params.sellerEvidenceUrls ?? [],
      status: "open",
    })
    .select("*")
    .single();
  return { data: (data as DisputeRow) ?? null, error: error?.message ?? null };
}

export async function getDisputeForOrder(orderId: string): Promise<DisputeRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("disputes")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as DisputeRow) ?? null;
}

export async function uploadDisputeEvidence(
  orderId: string,
  userId: string,
  files: File[],
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const path = `disputes/${orderId}/${userId}-${Date.now()}-${file.name}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).storage
      .from("listing-images")
      .upload(path, file, { upsert: false });
    if (error) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = (supabase as any).storage.from("listing-images").getPublicUrl(path);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }
  return urls;
}
