import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ListingCard } from "@/components/ListingCard";
import { supabase } from "@/integrations/supabase/client";
import type { CategoryRow, ListingWithDetails } from "@/lib/database.types";

export const Route = createFileRoute("/search")({
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [catId, setCatId] = useState<string>("");
  const [size, setSize] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<"new" | "low" | "high">("new");
  const [results, setResults] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from("listings")
      .select("*, listing_images(*), profiles(id,full_name,city,avatar_url,rewear_score,is_verified), categories(slug,name_sv)")
      .eq("status", "active")
      .limit(60);

    if (q) query = query.or(`title.ilike.%${q}%,brand.ilike.%${q}%`);
    if (catId) query = query.eq("category_id", catId);
    if (size) query = query.eq("size", size);
    if (maxPrice) query = query.lte("price_sek", Number(maxPrice));
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
  }, [q, catId, size, maxPrice, sort]);

  const sizes = useMemo(() => ["XS", "S", "M", "L", "XL", "36", "38", "40"], []);

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

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4">
          <select className="rounded-full border border-border bg-card px-3 py-1.5 text-xs" value={catId} onChange={(e) => setCatId(e.target.value)}>
            <option value="">Kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name_sv}</option>)}
          </select>
          <select className="rounded-full border border-border bg-card px-3 py-1.5 text-xs" value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">Storlek</option>
            {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="number"
            placeholder="Max kr"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-24 rounded-full border border-border bg-card px-3 py-1.5 text-xs"
          />
          <select className="rounded-full border border-border bg-card px-3 py-1.5 text-xs ml-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
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
