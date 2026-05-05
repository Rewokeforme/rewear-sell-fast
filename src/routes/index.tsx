import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ListingCard } from "@/components/ListingCard";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { CategoryRow, ListingWithDetails } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rewear — Sälj dina kläder på 60 sekunder" },
      {
        name: "description",
        content:
          "Premium svensk second hand. Sälj snabbt med AI och spara CO₂ för varje plagg.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("categories")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("listings")
      .select(
        "*, listing_images(*), profiles(id,full_name,city,avatar_url,rewear_score,is_verified), categories(slug,name_sv)",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(40);
    if (activeCat) q = q.eq("category_id", activeCat);
    q.then(({ data }) => {
      setListings((data as unknown as ListingWithDetails[]) ?? []);
      setLoading(false);
    });
  }, [activeCat]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-4 space-y-6">
        <section className="pt-2">
          <p className="text-eyebrow text-primary">Skandinavisk second hand</p>
          <h1 className="mt-1 font-display text-3xl leading-[1.1]">
            Sälj dina kläder på{" "}
            <span className="text-primary">60 sekunder</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ladda upp en bild. AI föreslår märke, pris och beskrivning.
          </p>
          <Link
            to="/sell"
            className="mt-4 inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground shadow-card transition hover:opacity-90"
          >
            Skapa annons
          </Link>
        </section>

        {!isSupabaseConfigured && (
          <div className="rounded-lg border border-dashed border-accent/40 bg-accent/10 p-4 text-sm">
            <p className="font-medium">Supabase är inte konfigurerat ännu.</p>
            <p className="mt-1 text-muted-foreground">
              Lägg till <code>VITE_SUPABASE_URL</code> och{" "}
              <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> i en <code>.env</code> och kör{" "}
              <code>db/schema.sql</code> i Supabase SQL Editor.
            </p>
          </div>
        )}

        <div className="-mx-4 overflow-x-auto px-4 scrollbar-none">
          <div className="flex gap-2">
            <CategoryPill active={activeCat === null} onClick={() => setActiveCat(null)}>
              Alla
            </CategoryPill>
            {categories.map((c) => (
              <CategoryPill
                key={c.id}
                active={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
              >
                {c.name_sv}
              </CategoryPill>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Inga annonser ännu. Bli först att lägga upp ett plagg.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function CategoryPill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background hover:border-foreground/40",
      )}
    >
      {children}
    </button>
  );
}
