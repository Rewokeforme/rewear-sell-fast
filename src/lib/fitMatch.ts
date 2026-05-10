import type { SizeType } from "./listingSchema";

export type FitProfile = {
  clothing_size: string | null;
  shoe_size: string | null;
  kids_sizes: string[] | null;
};

export type FitMatchResult =
  | { kind: "match"; label: string }
  | { kind: "check"; label: string }
  | { kind: "missing"; label: string }
  | { kind: "no-profile" };

function norm(v: string | null | undefined) {
  return (v ?? "").trim().toLowerCase();
}

/**
 * Lightweight rule-based fit match. Conservative copy — never guarantees fit.
 */
export function computeFitMatch(args: {
  sizeType: string | null;
  size: string | null;
  shoeSize: string | null;
  sizeLabel: string | null;
  profile: FitProfile | null;
}): FitMatchResult {
  const { profile } = args;
  if (!profile) return { kind: "no-profile" };

  const t = (args.sizeType ?? "clothing") as SizeType;
  const listingSize = norm(args.size) || norm(args.sizeLabel);
  const listingShoe = norm(args.shoeSize) || norm(args.size);

  if (t === "shoes_adult") {
    const u = norm(profile.shoe_size);
    if (!u) return { kind: "missing", label: "Skostorlek saknas i din Fit Match-profil" };
    if (!listingShoe) return { kind: "check", label: "Kontrollera mått" };
    return u === listingShoe
      ? { kind: "match", label: "Matchar din sparade skostorlek" }
      : { kind: "check", label: "Avviker från din sparade storlek" };
  }

  if (t === "shoes_kids" || t === "kids_clothing") {
    const kids = (profile.kids_sizes ?? []).map(norm);
    if (kids.length === 0) return { kind: "missing", label: "Barnstorlek saknas i din Fit Match-profil" };
    const cmp = t === "shoes_kids" ? listingShoe : listingSize;
    if (!cmp) return { kind: "check", label: "Kontrollera mått" };
    return kids.includes(cmp)
      ? { kind: "match", label: "Matchar din sparade barnstorlek" }
      : { kind: "check", label: "Avviker från sparade barnstorlekar" };
  }

  if (t === "bag" || t === "accessory") {
    return { kind: "check", label: "Kontrollera mått" };
  }

  // clothing / jeans_wl
  const u = norm(profile.clothing_size);
  if (!u) return { kind: "missing", label: "Klädstorlek saknas i din Fit Match-profil" };
  if (!listingSize) return { kind: "check", label: "Kontrollera mått" };
  return u === listingSize
    ? { kind: "match", label: "Matchar din sparade storlek" }
    : { kind: "check", label: "Avviker från din sparade storlek" };
}

export function formatSizeForDisplay(args: {
  sizeType: string | null;
  sizeLabel: string | null;
  size: string | null;
  shoeSize: string | null;
  waistSize: string | null;
  lengthSize: string | null;
}): { label: string; value: string } | null {
  const t = (args.sizeType ?? "") as SizeType | "";
  const label = args.sizeLabel?.trim();
  const fallback = args.size?.trim();

  switch (t) {
    case "kids_clothing": {
      const v = label || fallback;
      return v ? { label: "Barnstorlek", value: v } : null;
    }
    case "shoes_adult": {
      const v = args.shoeSize?.trim() || label || fallback;
      return v ? { label: "Skostorlek", value: v } : null;
    }
    case "shoes_kids": {
      const v = args.shoeSize?.trim() || label || fallback;
      return v ? { label: "Barnskor", value: v } : null;
    }
    case "jeans_wl": {
      const w = args.waistSize?.trim();
      const l = args.lengthSize?.trim();
      if (w && l) return { label: "Jeansstorlek", value: `W${w} / L${l}` };
      if (w) return { label: "Jeansstorlek", value: `W${w}` };
      const v = label || fallback;
      return v ? { label: "Jeansstorlek", value: v } : null;
    }
    case "bag":
    case "accessory": {
      const v = label || fallback;
      return { label: "Storlek", value: v || "One size" };
    }
    case "clothing":
    default: {
      const v = label || fallback;
      return v ? { label: "Storlek", value: v } : null;
    }
  }
}
