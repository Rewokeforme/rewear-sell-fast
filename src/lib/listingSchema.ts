// Standardiserade nycklar och hjälpare för listings-fält i Fas 1A.
// Används både i skapa- och redigera-annons så formatet blir konsekvent i DB.

import { showJeansSizes } from "./taxonomy";

export type SizeType =
  | "clothing"
  | "shoes_adult"
  | "shoes_kids"
  | "kids_clothing"
  | "jeans_wl"
  | "bag"
  | "accessory";

export const MEASUREMENT_KEYS = [
  "chest_width",
  "garment_length",
  "waist_width",
  "inseam_length",
  "sleeve_length",
  "shoe_inner_length",
] as const;
export type MeasurementKey = (typeof MEASUREMENT_KEYS)[number];
export type Measurements = Partial<Record<MeasurementKey, number>>;

export const MEASUREMENT_LABELS: Record<MeasurementKey, string> = {
  chest_width: "Bröstvidd (cm)",
  garment_length: "Längd (cm)",
  waist_width: "Midja (cm)",
  inseam_length: "Innerbenslängd (cm)",
  sleeve_length: "Ärmlängd (cm)",
  shoe_inner_length: "Skons innermått (cm)",
};

export const CONDITION_KEYS = [
  "has_stains",
  "has_holes",
  "has_pilling",
  "is_cleaned",
  "buttons_zipper_ok",
  "receipt_available",
  "authenticity_documented",
] as const;
export type ConditionKey = (typeof CONDITION_KEYS)[number];
export type ConditionChecks = Partial<Record<ConditionKey, boolean>>;

export const CONDITION_LABELS: Record<ConditionKey, string> = {
  has_stains: "Har fläckar",
  has_holes: "Har hål eller slitage",
  has_pilling: "Noppigt tyg",
  is_cleaned: "Tvättat / rengjort",
  buttons_zipper_ok: "Knappar & dragkedja fungerar",
  receipt_available: "Kvitto finns",
  authenticity_documented: "Äkthet kan styrkas",
};

/** Mått som är relevanta för en viss size_type — används för att rendera rätt fält. */
export function relevantMeasurementKeys(sizeType: SizeType): MeasurementKey[] {
  switch (sizeType) {
    case "shoes_adult":
    case "shoes_kids":
      return ["shoe_inner_length"];
    case "bag":
    case "accessory":
      return ["garment_length", "chest_width"];
    case "jeans_wl":
      return ["waist_width", "inseam_length", "garment_length"];
    case "kids_clothing":
    case "clothing":
    default:
      return ["chest_width", "garment_length", "waist_width", "inseam_length", "sleeve_length"];
  }
}

const KIDS_CLOTHING_SUBS = new Set([
  "Ytterkläder", "Overaller", "Tröjor", "T-shirts", "Byxor", "Jeans",
  "Klänningar", "Set", "Pyjamas", "Babykläder", "Regnkläder", "Vinterkläder",
]);

/** Härled size_type från huvud- + underkategori. Speglar getSizeRule i taxonomy.ts. */
export function deriveSizeType(main: string, sub: string): SizeType {
  if (main === "Barn") {
    if (sub === "Skor") return "shoes_kids";
    if (sub === "Accessoarer") return "accessory";
    if (KIDS_CLOTHING_SUBS.has(sub)) return "kids_clothing";
    return "kids_clothing";
  }
  if (main === "Skor") return "shoes_adult";
  if (main === "Väskor") return "bag";
  if (main === "Accessoarer") return "accessory";
  if (main === "Premium / Designer") {
    if (sub === "Designerväskor" || sub === "Lyxaccessoarer" || sub === "Klockor" || sub === "Smycken") return "bag";
    if (sub === "Designerskor") return "shoes_adult";
    return "clothing";
  }
  if (main === "Vintage") {
    if (/sko/i.test(sub)) return "shoes_adult";
    if (/väsk|accessoar/i.test(sub)) return "bag";
    return "clothing";
  }
  if (showJeansSizes(main, sub)) return "jeans_wl";
  return "clothing";
}

/** Bygg en human-readable size_label, t.ex. "Storlek M" eller "W30 / L32" eller "EU 42". */
export function buildSizeLabel(args: {
  sizeType: SizeType;
  size?: string;
  waistSize?: string;
  lengthSize?: string;
}): string {
  const { sizeType, size, waistSize, lengthSize } = args;
  if (sizeType === "jeans_wl") {
    const parts = [waistSize, lengthSize].filter(Boolean);
    if (parts.length) return parts.join(" / ");
    return size ?? "";
  }
  if (!size) return "";
  if (sizeType === "shoes_adult" || sizeType === "shoes_kids") return `EU ${size}`;
  if (sizeType === "kids_clothing") return `${size} cm`;
  return size;
}

export const STYLE_TAG_SUGGESTIONS = [
  "minimalistisk", "vintage", "streetwear", "klassisk", "bohemisk",
  "sporty", "elegant", "preppy", "y2k", "scandi", "workwear", "festival",
];
