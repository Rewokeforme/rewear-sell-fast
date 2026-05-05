export type SellerBadge = "Premium Seller" | "Betrodd säljare" | "Ny säljare" | null;

export type SellerStatsLite = {
  first_listing_at: string | null;
  sold_count: number;
  average_rating: number;
};

/**
 * Dynamic seller badge:
 * - "Premium Seller" if 25+ sold and avg >= 4.7
 * - "Betrodd säljare" if 10+ sold
 * - "Ny säljare" if first listing within last 30 days AND <10 sold
 * - otherwise null
 */
export function computeSellerBadge(stats: SellerStatsLite | null | undefined): SellerBadge {
  if (!stats) return null;
  const sold = stats.sold_count ?? 0;
  const avg = stats.average_rating ?? 0;
  if (sold >= 25 && avg >= 4.7) return "Premium Seller";
  if (sold >= 10) return "Betrodd säljare";
  if (stats.first_listing_at) {
    const days = (Date.now() - new Date(stats.first_listing_at).getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 30) return "Ny säljare";
  }
  return null;
}

/** @deprecated use computeSellerBadge with seller_stats */
export function badgeForSeller(soldCount: number, avgRating: number): SellerBadge {
  if (soldCount >= 25 && avgRating >= 4.7) return "Premium Seller";
  if (soldCount >= 10) return "Betrodd säljare";
  return null;
}

export function formatSEK(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(value);
}

export function priceGuideRange(samples: number[]): [number, number] | null {
  if (samples.length < 3) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return [Math.round(median * 0.7), Math.round(median * 1.3)];
}
