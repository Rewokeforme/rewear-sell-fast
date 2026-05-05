import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ListingCard } from "@/components/ListingCard";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { CategoryRow, ListingWithDetails } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: HomeRoute,
});

function HomeRoute() {
  return (
    <>
      <AppShellHome />
    </>
  );
}

function AppShellHome() {
  return (
    <div>
      <AppShell />
      <Home />
    </div>
  );
}

// We render directly inside AppShell via Outlet pattern would need layout routes.
// To keep things simple, render the Home content inline in a layout-less route:
function Home() {
  return null;
}

// Override: render via direct shell composition
Route.update({
  component: function () {
    return (
      <Shell>
        <HomeContent />
      </Shell>
    );
  },
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <ShellHeaderAndNav />
      <main className="mx-auto max-w-2xl px-4 py-4">{children}</main>
    </div>
  );
}

function ShellHeaderAndNav() {
  // Reuse AppShell parts inline
  // (kept minimal; the real header/nav are imported below)
  return <></>;
}

function HomeContent() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("categories")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => {
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
    <div className="space-y-6">
      <section>
        <p className="text-eyebrow text-primary">Skandinavisk second hand</p>
        <h1 className="mt-1 font-display text-3xl leading-tight">
          Sälj dina kläder på <em className="not-italic text-primary">60 sekunder</em>
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
        <div className="rounded-lg border border-dashed border-accent/40 bg-accent/5 p-4 text-sm">
          <p className="font-medium">Supabase är inte konfigurerat.</p>
          <p className="mt-1 text-muted-foreground">
            Lägg till <code>VITE_SUPABASE_URL</code> och{" "}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> i <code>.env</code> och kör{" "}
            <code>db/schema.sql</code> i Supabase.
          </p>
        </div>
      )}

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveCat(null)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition",
              activeCat === null
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background hover:border-foreground/30",
            )}
          >
            Alla
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition",
                activeCat === c.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:border-foreground/30",
              )}
            >
              {c.name_sv}
            </button>
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
    </div>
  );
}
