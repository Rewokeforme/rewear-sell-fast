// ReWoke category taxonomy: huvudkategori → underkategorier + storleksregler
export const MAIN_CATEGORIES = [
  "Dam",
  "Herr",
  "Barn",
  "Unisex",
  "Skor",
  "Väskor",
  "Accessoarer",
  "Vintage",
  "Premium / Designer",
  "Sport & Outdoor",
] as const;

export type MainCategory = (typeof MAIN_CATEGORIES)[number];

export const SUB_CATEGORIES: Record<MainCategory, string[]> = {
  Dam: [
    "Jackor & kappor", "Blazers", "Toppar", "T-shirts", "Skjortor & blusar",
    "Stickat", "Klänningar", "Kjolar", "Byxor", "Jeans", "Shorts",
    "Set & kostymer", "Underkläder", "Badkläder", "Gravidkläder",
  ],
  Herr: [
    "Jackor & rockar", "Kavajer", "T-shirts", "Pikétröjor", "Skjortor",
    "Hoodies & sweatshirts", "Stickat", "Byxor", "Jeans", "Shorts",
    "Kostymer", "Underkläder", "Badkläder",
  ],
  Barn: [
    "Ytterkläder", "Overaller", "Tröjor", "T-shirts", "Byxor", "Jeans",
    "Klänningar", "Set", "Pyjamas", "Skor", "Accessoarer", "Babykläder",
    "Regnkläder", "Vinterkläder",
  ],
  Unisex: [
    "Jackor", "T-shirts", "Hoodies & sweatshirts", "Stickat", "Byxor", "Jeans", "Shorts",
  ],
  Skor: [
    "Sneakers", "Boots", "Stövlar", "Klackar", "Sandaler", "Loafers",
    "Finskor", "Träningsskor", "Vinterskor", "Barnskor",
  ],
  Väskor: [
    "Handväskor", "Axelväskor", "Crossbody", "Ryggsäckar",
    "Weekendväskor", "Plånböcker", "Necessärer",
  ],
  Accessoarer: [
    "Bälten", "Kepsar", "Mössor", "Halsdukar", "Solglasögon",
    "Smycken", "Klockor", "Plånböcker", "Håraccessoarer",
  ],
  Vintage: [
    "Vintagejackor", "Vintageklänningar", "Vintagejeans", "Vintageväskor",
    "Vintageaccessoarer", "Retro sport", "Y2K", "90-tal", "80-tal",
  ],
  "Premium / Designer": [
    "Designerkläder", "Designerväskor", "Designerskor",
    "Lyxaccessoarer", "Klockor", "Smycken",
  ],
  "Sport & Outdoor": [
    "Träningskläder", "Löparkläder", "Outdoorjackor", "Skaljackor",
    "Regnkläder", "Termokläder", "Fleece", "Skidkläder", "Golfkläder", "Yogakläder",
  ],
};

// ---- Size sets ----
export const CLOTHING_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"];
export const ADULT_SHOE_SIZES = Array.from({ length: 48 - 35 + 1 }, (_, i) => String(35 + i));
export const KIDS_SHOE_SIZES = Array.from({ length: 35 - 18 + 1 }, (_, i) => String(18 + i));
export const KIDS_CLOTHING_SIZES = ["50","56","62","68","74","80","86","92","98","104","110","116","122","128","134","140","146","152","158","164"];
export const BAG_SIZES = ["One size", "Liten", "Medium", "Stor"];
export const ACC_SIZES = ["One size", "Liten", "Medium", "Stor"];
export const KIDS_ACC_SIZES = ["One size", "Baby", "Barn", "Junior"];
export const WAIST_SIZES = Array.from({ length: 40 - 24 + 1 }, (_, i) => `W${24 + i}`);
export const LENGTH_SIZES = Array.from({ length: 36 - 28 + 1 }, (_, i) => `L${28 + i}`);

const KIDS_CLOTHING_SUBS = new Set([
  "Ytterkläder", "Overaller", "Tröjor", "T-shirts", "Byxor", "Jeans",
  "Klänningar", "Set", "Pyjamas", "Babykläder", "Regnkläder", "Vinterkläder",
]);

export type SizeRule = {
  sizes: string[];
  label: string;
  optional?: boolean;
};

/**
 * Central regelmotor: returnerar storleksregler baserat på huvud- + underkategori.
 * Måste användas i både skapa-annons, redigera-annons och söksidan.
 */
export function getSizeRule(main: string, sub: string): SizeRule {
  // Barn — special case före allmän Skor-regel
  if (main === "Barn") {
    if (sub === "Skor") return { sizes: KIDS_SHOE_SIZES, label: "Skostorlek" };
    if (sub === "Accessoarer") return { sizes: KIDS_ACC_SIZES, label: "Storlek" };
    if (KIDS_CLOTHING_SUBS.has(sub)) return { sizes: KIDS_CLOTHING_SIZES, label: "Barnstorlek (cm)" };
    return { sizes: KIDS_CLOTHING_SIZES, label: "Barnstorlek (cm)" };
  }

  // Skor — vuxen
  if (main === "Skor") return { sizes: ADULT_SHOE_SIZES, label: "Skostorlek" };

  // Väskor
  if (main === "Väskor") return { sizes: BAG_SIZES, label: "Storlek" };

  // Accessoarer — valfritt
  if (main === "Accessoarer") return { sizes: ACC_SIZES, label: "Storlek (valfritt)", optional: true };

  // Premium / Designer — beror på underkategori
  if (main === "Premium / Designer") {
    if (sub === "Designerväskor" || sub === "Lyxaccessoarer" || sub === "Klockor" || sub === "Smycken") {
      return { sizes: BAG_SIZES, label: "Storlek" };
    }
    if (sub === "Designerskor") return { sizes: ADULT_SHOE_SIZES, label: "Skostorlek" };
    return { sizes: CLOTHING_SIZES, label: "Storlek" };
  }

  // Vintage — heuristik
  if (main === "Vintage") {
    if (/sko/i.test(sub)) return { sizes: ADULT_SHOE_SIZES, label: "Skostorlek" };
    if (/väsk|accessoar/i.test(sub)) return { sizes: BAG_SIZES, label: "Storlek" };
    return { sizes: CLOTHING_SIZES, label: "Storlek" };
  }

  // Sport & Outdoor — alltid klädstorlekar
  if (main === "Sport & Outdoor") return { sizes: CLOTHING_SIZES, label: "Storlek" };

  // Default: Dam / Herr / Unisex
  return { sizes: CLOTHING_SIZES, label: "Storlek" };
}

/** Visa extra waist/length-fält för Dam/Herr/Unisex Jeans (och Vintage Jeans). */
export function showJeansSizes(main: string, sub: string): boolean {
  if (sub === "Jeans" && (main === "Dam" || main === "Herr" || main === "Unisex")) return true;
  if (main === "Vintage" && sub === "Vintagejeans") return true;
  return false;
}

/** Validera att en sparad storlek fortfarande är giltig för vald kategori. */
export function isValidSizeForCategory(main: string, sub: string, size: string): boolean {
  if (!size) return true;
  return getSizeRule(main, sub).sizes.includes(size);
}
