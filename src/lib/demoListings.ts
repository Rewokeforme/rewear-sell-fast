import type { ListingWithDetails } from "@/lib/database.types";

// Curated demo listings used to make the home feed feel alive before real
// inventory exists. Images are royalty-free Unsplash photos.
const make = (
  i: number,
  data: {
    title: string;
    brand: string;
    size: string;
    price: number;
    co2: number;
    image: string;
    category: { slug: string; name_sv: string };
    city?: string;
    delivery_method?: "shipping" | "pickup" | "both";
  },
): ListingWithDetails => ({
  id: `demo-${i}`,
  seller_id: "demo",
  category_id: null,
  title: data.title,
  brand: data.brand,
  size: data.size,
  condition: "Mycket bra skick",
  price_sek: data.price,
  description: null,
  status: "active",
  ai_detected_brand: null,
  ai_suggested_price: null,
  ai_generated_description: null,
  co2_saved_kg: data.co2,
  city: data.city ?? "Stockholm",
  area: null,
  delivery_method: data.delivery_method ?? "both",
  shipping_price: null,
  buyer_pays_shipping: true,
  ships_within_days: "2-3",
  main_category: null,
  sub_category: null,
  shoe_size: null,
  waist_size: null,
  length_size: null,
  size_type: null,
  size_label: null,
  measurements: null,
  condition_checks: null,
  style_tags: null,
  views_count: 0,
  created_at: new Date().toISOString(),
  listing_images: [{ id: `img-${i}`, listing_id: `demo-${i}`, url: data.image, position: 0 }],
  profiles: null,
  categories: data.category,
});

export const demoListings: ListingWithDetails[] = [
  make(1, {
    title: "Ullkappa, beige",
    brand: "Acne Studios",
    size: "S",
    price: 1800,
    co2: 15,
    image: "https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?w=800&q=80",
    category: { slug: "ytterklader", name_sv: "Ytterkläder" },
  }),
  make(2, {
    title: "Strukturerad blazer",
    brand: "Filippa K",
    size: "M",
    price: 950,
    co2: 8,
    image: "https://images.unsplash.com/photo-1632149877166-f75d49000351?w=800&q=80",
    category: { slug: "kavajer", name_sv: "Kavajer" },
  }),
  make(3, {
    title: "Blommig midiklänning",
    brand: "Ganni",
    size: "S",
    price: 1200,
    co2: 7,
    image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80",
    category: { slug: "klanningar", name_sv: "Klänningar" },
  }),
  make(4, {
    title: "Air Max 90 sneakers",
    brand: "Nike",
    size: "42",
    price: 650,
    co2: 12,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    category: { slug: "skor", name_sv: "Skor" },
  }),
  make(5, {
    title: "Oxfordskjorta, vit",
    brand: "Arket",
    size: "M",
    price: 400,
    co2: 5,
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80",
    category: { slug: "skjortor", name_sv: "Skjortor" },
  }),
  make(6, {
    title: "501 Original jeans",
    brand: "Levi's",
    size: "30/32",
    price: 550,
    co2: 10,
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80",
    category: { slug: "jeans", name_sv: "Jeans" },
  }),
  make(7, {
    title: "Vinterjacka, marinblå",
    brand: "Polarn O. Pyret",
    size: "104",
    price: 350,
    co2: 9,
    image: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=800&q=80",
    category: { slug: "barn", name_sv: "Barn" },
  }),
  make(8, {
    title: "Vintage läderväska",
    brand: "Vintage",
    size: "Onesize",
    price: 700,
    co2: 6,
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
    category: { slug: "vaskor", name_sv: "Väskor" },
  }),
];

export const trendingBrands = [
  "Acne Studios",
  "Filippa K",
  "Ganni",
  "Arket",
  "Levi's",
  "Nike",
  "Polarn O. Pyret",
  "Vintage",
];
