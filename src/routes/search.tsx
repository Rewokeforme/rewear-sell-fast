import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ListingCard } from "@/components/ListingCard";
import { supabase } from "@/integrations/supabase/client";
import type { ListingWithDetails } from "@/lib/database.types";
import { MAIN_CATEGORIES, SUB_CATEGORIES, getSizeRule, type MainCategory } from "@/lib/taxonomy";

export const Route = createFileRoute("/search")({
  component: SearchPage,
});

const CONDITIONS = ["Nyskick", "Mycket bra", "Bra", "Sliten"];

function SearchPage() {
  const [q, setQ] = useState("");
  const [mainCategory, setMainCategory] = useState<MainCategory | "">("");
  const [subCategory, setSubCategory] = useState("");
  const [size, setSize] = useState("");
  const [brand, setBrand] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [condition, setCondition] = useState("");
  const [city, setCity] = useState("");
  const [delivery, setDelivery] = useState("");
  const [sort, setSort] = useState<"new" | "low" | "high">("new");
  const [results, setResults] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  // Reset sub-category when main changes
  useEffect(() => { setSubCategory(""); setSize(""); }, [mainCategory]);

  const sizeInfo = useMemo(() => getSizeRule(mainCategory, subCategory), [mainCategory, subCategory]);

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from("listings")
      .select("*, listing_images(*), profiles(id,full_name,city,avatar_url,rewoke_score,is_verified), categories(slug,name_sv)")
      .eq("status", "active")
      .limit(60);

    if (q) query = query.or(`title.ilike.%${q}%,brand.ilike.%${q}%`);
    if (mainCategory) query = query.eq("main_category", mainCategory);
    if (subCategory) query = query.eq("sub_category", subCategory);
    if (size) query = query.eq("size", size);
    if (brand) query = query.ilike("brand", `%${brand}%`);
    if (maxPrice) query = query.lte("price_sek", Number(maxPrice));
    if (condition) query = query.eq("condition", condition);
    if (city) query = query.ilike("city", `%${city}%`);
    if (delivery) query = query.eq("delivery_method", delivery);
    if (sort === "new") query = query.order("created_at", { ascending: false });
    if (sort === "low") query = query.order("price_sek", { ascending: true });
    if (sort === "high") query = query.order("price_sek", { ascending: false });

    const t = setTimeout(() => {
      query.then(({ data }) => {
        setResults((data as unknown as ListingWithDetails[]) ?? []);
        setLoading(false);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [q, mainCategory, subCategory, size, brand, maxPrice, condition, city, delivery, sort]);

  const chip = "rounded-full border border-border bg-card px-3 py-1.5 text-xs outline-none focus:border-ring";

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Sök" />
      <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Sök märke, modell…"
            className="w-full rounded-full border border-border bg-card py-3 pl-10 pr-4 text-sm outline-none focus:border-ring"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select className={chip} value={mainCategory} onChange={(e) => setMainCategory(e.target.value as MainCategory | "")}>
            <option value="">Huvudkategori</option>
            {MAIN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={chip} value={subCategory} onChange={(e) => setSubCategory(e.target.value)} disabled={!mainCategory}>
            <option value="">Underkategori</option>
            {mainCategory && SUB_CATEGORIES[mainCategory].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={chip} value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">Storlek</option>
            {sizeInfo.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className={`${chip} w-28`} placeholder="Märke" value={brand} onChange={(e) => setBrand(e.target.value)} />
          <input className={`${chip} w-24`} type="number" placeholder="Max kr" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          <select className={chip} value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="">Skick</option>
            {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className={`${chip} w-28`} placeholder="Stad" value={city} onChange={(e) => setCity(e.target.value)} />
          <select className={chip} value={delivery} onChange={(e) => setDelivery(e.target.value)}>
            <option value="">Leverans</option>
            <option value="shipping">Skickas</option>
            <option value="pickup">Hämtas</option>
            <option value="both">Båda</option>
          </select>
          <select className={`${chip} ml-auto`} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="new">Nyast</option>
            <option value="low">Lägst pris</option>
            <option value="high">Högst pris</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : results.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Inga träffar.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {results.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
