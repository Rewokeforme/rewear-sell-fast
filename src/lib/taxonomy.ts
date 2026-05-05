// Rewear category taxonomy: huvudkategori → underkategorier
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

export const CLOTHING_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"];
export const SHOE_SIZES = Array.from({ length: 46 - 35 + 1 }, (_, i) => String(35 + i));
export const KIDS_SIZES = ["50","56","62","68","74","80","86","92","98","104","110","116","122","128","134","140","146","152","158","164"];
export const BAG_ACC_SIZES = ["One size", "Liten", "Medium", "Stor"];
export const WAIST_SIZES = Array.from({ length: 38 - 24 + 1 }, (_, i) => `W${24 + i}`);
export const LENGTH_SIZES = Array.from({ length: 36 - 28 + 1 }, (_, i) => `L${28 + i}`);

export function sizesForCategory(main: string, sub: string): { sizes: string[]; label: string; optional?: boolean } {
  if (main === "Skor") return { sizes: SHOE_SIZES, label: "Skostorlek" };
  if (main === "Barn") return { sizes: KIDS_SIZES, label: "Barnstorlek (cm)" };
  if (main === "Väskor" || main === "Accessoarer") return { sizes: BAG_ACC_SIZES, label: "Storlek (valfritt)", optional: true };
  return { sizes: CLOTHING_SIZES, label: "Storlek" };
}

export function isJeans(sub: string): boolean {
  return /jeans/i.test(sub);
}
