import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, Sparkles, Tag, Send, Bot, Leaf, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ListingCard } from "@/components/ListingCard";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { CategoryRow, ListingWithDetails } from "@/lib/database.types";
import { demoListings, trendingBrands } from "@/lib/demoListings";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

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
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedTab, setFeedTab] = useState<"discover" | "following">("discover");
  const [followingIds, setFollowingIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => {
    if (!user) {
      setFollowingIds(null);
      return;
    }
    supabase
      .from("follows")
      .select("seller_id")
      .eq("follower_id", user.id)
      .then(({ data }) => setFollowingIds(((data ?? []) as Array<{ seller_id: string }>).map((r) => r.seller_id)));
  }, [user]);

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
    if (feedTab === "following") {
      if (!followingIds || followingIds.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }
      q = q.in("seller_id", followingIds);
    }
    q.then(({ data }) => {
      setListings((data as unknown as ListingWithDetails[]) ?? []);
      setLoading(false);
    });
  }, [activeCat, feedTab, followingIds]);

  const showDemo = !loading && feedTab === "discover" && listings.length === 0;
  const feed = showDemo ? demoListings : listings;
  const showFollowingEmpty =
    !loading && feedTab === "following" && listings.length === 0;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10 space-y-12 md:space-y-16">
        {/* HERO */}
        <section className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-eyebrow text-primary">Skandinavisk second hand</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] md:text-6xl">
              Sälj dina kläder på{" "}
              <span className="text-primary italic">60 sekunder</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground">
              Ladda upp en bild. Vår AI hittar märket, föreslår priset och skriver
              annonsen åt dig. Du behöver bara godkänna.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/sell"
                className="inline-flex items-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background shadow-card transition hover:opacity-90"
              >
                Skapa annons med AI
              </Link>
              <Link
                to="/search"
                className="inline-flex items-center rounded-full border border-border px-6 py-3 text-sm font-medium transition hover:border-foreground/40"
              >
                Utforska plagg
              </Link>
            </div>
          </div>

          {/* AI Upload card */}
          <AiUploadCard />
        </section>

        {/* Social proof */}
        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={<Bot className="h-4 w-4" />}
            title="AI-skapat annonsutkast"
            body="Märke, pris och beskrivning på sekunder."
          />
          <StatCard
            icon={<Leaf className="h-4 w-4" />}
            title="CO₂-spårning per plagg"
            body="Se exakt hur mycket utsläpp du sparar."
          />
          <StatCard
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Trygg svensk second hand"
            body="Verifierade säljare, säkra meddelanden."
          />
        </section>

        {/* Trending brands */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Populärt just nu</h2>
            <span className="text-eyebrow text-muted-foreground">Märken</span>
          </div>
          <div className="-mx-4 overflow-x-auto px-4 scrollbar-none">
            <div className="flex gap-2">
              {trendingBrands.map((b) => (
                <Link
                  key={b}
                  to="/search"
                  className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm transition hover:border-foreground/40"
                >
                  {b}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Feed */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex gap-1 rounded-full border border-border bg-card p-1 text-xs">
              <FeedTabBtn active={feedTab === "discover"} onClick={() => setFeedTab("discover")}>
                Upptäck
              </FeedTabBtn>
              <FeedTabBtn active={feedTab === "following"} onClick={() => setFeedTab("following")}>
                Följer
              </FeedTabBtn>
            </div>
            <Link to="/search" className="text-eyebrow text-muted-foreground hover:text-foreground">
              Visa alla
            </Link>
          </div>

          {feedTab === "discover" && categories.length > 0 && (
            <div className="mb-4 overflow-x-auto scrollbar-none">
              <div className="flex gap-2">
                <CategoryPill active={activeCat === null} onClick={() => setActiveCat(null)}>
                  Alla
                </CategoryPill>
                {categories.map((c) => (
                  <CategoryPill key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
                    {c.name_sv}
                  </CategoryPill>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : showFollowingEmpty ? (
            <FollowingEmpty hasUser={Boolean(user)} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
                {feed.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
              {showDemo && <EmptyStateBanner />}
            </>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

function FeedTabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 font-medium transition",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function FollowingEmpty({ hasUser }: { hasUser: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
      <p className="text-eyebrow text-primary">Tomt här ännu</p>
      <h3 className="mt-2 font-display text-2xl">Följ säljare du gillar</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        När de lägger ut nya plagg visas de här.
      </p>
      <Link
        to={hasUser ? "/search" : "/login"}
        className="mt-5 inline-flex items-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
      >
        {hasUser ? "Hitta säljare" : "Logga in"}
      </Link>
    </div>
  );
}

function AiUploadCard() {
  const steps = [
    { icon: Camera, label: "Ladda upp bild" },
    { icon: Sparkles, label: "AI hittar märke" },
    { icon: Tag, label: "AI föreslår pris" },
    { icon: Send, label: "Publicera annons" },
  ];
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-eyebrow text-primary">AI-flöde</p>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
            ~60 sek
          </span>
        </div>
        <h3 className="mt-2 font-display text-xl">Från bild till annons</h3>
        <ol className="mt-5 space-y-3">
          {steps.map(({ icon: Icon, label }, i) => (
            <li key={label} className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-primary ring-1 ring-border">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm">{label}</span>
              <span className="text-eyebrow text-muted-foreground">0{i + 1}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-eyebrow">Rewear</span>
      </div>
      <p className="mt-2 font-display text-base">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function EmptyStateBanner() {
  return (
    <div className="mt-8 rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center">
      <p className="text-eyebrow text-primary">Ingen riktig annons ännu</p>
      <h3 className="mt-2 font-display text-2xl">Bli först att sälja på Rewear</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Ladda upp ett plagg och låt AI skapa annonsen åt dig. Det tar under en minut.
      </p>
      <Link
        to="/sell"
        className="mt-5 inline-flex items-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
      >
        Lägg upp ditt första plagg
      </Link>
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
