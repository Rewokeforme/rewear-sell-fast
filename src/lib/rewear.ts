export function badgeForSeller(soldCount: number, avgRating: number) {
  if (soldCount >= 25 && avgRating >= 4.7) return "Premium Seller";
  if (soldCount >= 10) return "Betrodd säljare";
  return "Ny säljare";
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
