export type SellerBadge =
  | "Premium Seller"
  | "Betrodd säljare"
  | "ID-verifierad"
  | "Verifierad profil"
  | "Ny säljare"
  | null;

export type SellerStatsLite = {
  first_listing_at: string | null;
  sold_count: number;
  average_rating: number;
};

export type VerificationFlags = {
  email_verified?: boolean;
  phone_verified?: boolean;
  identity_verified?: boolean;
  full_name?: string | null;
  city?: string | null;
};

/** Considered "Verifierad profil" when email + phone verified and basic profile filled. */
export function isBaseVerified(v: VerificationFlags | null | undefined): boolean {
  if (!v) return false;
  return Boolean(v.email_verified && v.phone_verified && v.full_name && v.city);
}

/**
 * Top badge to show on a seller. Returns the highest tier that applies.
 * Tier order: Premium > Betrodd > ID-verifierad > Verifierad profil > Ny säljare.
 */
export function computeSellerBadge(
  stats: SellerStatsLite | null | undefined,
  verification?: VerificationFlags | null,
): SellerBadge {
  const sold = stats?.sold_count ?? 0;
  const avg = stats?.average_rating ?? 0;
  const idVerified = Boolean(verification?.identity_verified);

  if (sold >= 25 && avg >= 4.7 && idVerified) return "Premium Seller";
  if (sold >= 10 && avg >= 4.7) return "Betrodd säljare";
  if (idVerified) return "ID-verifierad";
  if (isBaseVerified(verification)) return "Verifierad profil";
  if (stats?.first_listing_at) {
    const days = (Date.now() - new Date(stats.first_listing_at).getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 30) return "Ny säljare";
  }
  return null;
}

/** All badges a seller currently qualifies for (for display lists). */
export function computeAllBadges(
  stats: SellerStatsLite | null | undefined,
  verification?: VerificationFlags | null,
): Exclude<SellerBadge, null>[] {
  const out: Exclude<SellerBadge, null>[] = [];
  const sold = stats?.sold_count ?? 0;
  const avg = stats?.average_rating ?? 0;
  const idVerified = Boolean(verification?.identity_verified);

  if (sold >= 25 && avg >= 4.7 && idVerified) out.push("Premium Seller");
  if (sold >= 10 && avg >= 4.7) out.push("Betrodd säljare");
  if (idVerified) out.push("ID-verifierad");
  if (isBaseVerified(verification)) out.push("Verifierad profil");
  if (out.length === 0 && stats?.first_listing_at) {
    const days = (Date.now() - new Date(stats.first_listing_at).getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 30) out.push("Ny säljare");
  }
  return out;
}

/** @deprecated use computeSellerBadge */
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
