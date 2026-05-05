import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bookmark, Eye, Flag, Handshake, Heart, Leaf, MapPin, ShieldCheck, Star, Truck } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { FollowButton } from "@/components/FollowButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { computeSellerBadge, formatSEK, type SellerStatsLite } from "@/lib/rewear";
import type { ListingWithDetails } from "@/lib/database.types";
import { ReportDialog } from "@/components/ReportDialog";

export const Route = createFileRoute("/listing/$id")({
  component: ListingPage,
});

function ListingPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState<ListingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState<SellerStatsLite & { rating_count: number; followers_count: number } | null>(null);
  const [savesCount, setSavesCount] = useState<number>(0);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("listings")
      .select(
        "*, listing_images(*), profiles(id,full_name,city,avatar_url,rewear_score,is_verified), categories(slug,name_sv)",
      )
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setListing((data as unknown as ListingWithDetails) ?? null);
        setLoading(false);
      });
  }, [id]);

  // Räkna en visning per annons per webbläsarsession
  useEffect(() => {
    if (!id || typeof window === "undefined") return;
    const key = `viewed:${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    supabase.rpc("increment_listing_views", { _listing_id: id }).then(() => {
      setListing((prev) => (prev ? ({ ...prev, views_count: ((prev as unknown as { views_count?: number }).views_count ?? 0) + 1 } as ListingWithDetails) : prev));
    });
  }, [id]);

  // Hämta antal som sparat annonsen
  useEffect(() => {
    if (!id) return;
    supabase
      .from("favorites")
      .select("listing_id", { count: "exact", head: true })
      .eq("listing_id", id)
      .then(({ count }) => setSavesCount(count ?? 0));
  }, [id, saved]);

  useEffect(() => {
    if (!user || !listing) return;
    supabase
      .from("favorites")
      .select("listing_id")
      .eq("user_id", user.id)
      .eq("listing_id", listing.id)
      .maybeSingle()
      .then(({ data }) => setSaved(Boolean(data)));
  }, [user, listing]);

  useEffect(() => {
    if (!listing?.profiles?.id) return;
    supabase
      .from("seller_stats")
      .select("first_listing_at, sold_count, average_rating, rating_count, followers_count")
      .eq("user_id", listing.profiles.id)
      .maybeSingle()
      .then(({ data }) => setStats(data as typeof stats));
  }, [listing?.profiles?.id]);

  async function toggleSave() {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!listing) return;
    if (saved) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", listing.id);
      setSaved(false);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, listing_id: listing.id });
      setSaved(true);
      toast.success("Sparat");
    }
  }

  async function startConversation(message: string) {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!listing || listing.seller_id === user.id) {
      toast.info("Du kan inte kontakta dig själv.");
      return;
    }
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", user.id)
      .eq("seller_id", listing.seller_id)
      .maybeSingle();

    let convId = existing?.id;
    if (!convId) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ listing_id: listing.id, buyer_id: user.id, seller_id: listing.seller_id })
        .select("id")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      convId = created.id;
    }

    if (message) {
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        body: message,
      });
    }
    navigate({ to: "/inbox/$conversationId", params: { conversationId: convId } });
  }

  async function reportListing() {
    if (!user || !listing) {
      navigate({ to: "/login" });
      return;
    }
    const reason = window.prompt("Beskriv kort varför du rapporterar annonsen:");
    if (!reason) return;
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      listing_id: listing.id,
      reason,
    });
    if (error) toast.error(error.message);
    else toast.success("Tack — rapporten är skickad.");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <p className="text-muted-foreground">Annonsen finns inte.</p>
          <Link to="/" className="mt-4 inline-block text-primary underline">Till hem</Link>
        </div>
      </div>
    );
  }

  const seller = listing.profiles;
  const sellerBadge = computeSellerBadge(stats);
  const images = [...(listing.listing_images ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />
      <main className="mx-auto max-w-2xl">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          {images[activeImg] ? (
            <img src={images[activeImg].url} alt={listing.title} className="h-full w-full object-cover" />
          ) : null}
          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`h-1.5 rounded-full transition-all ${i === activeImg ? "w-6 bg-background" : "w-1.5 bg-background/60"}`}
                />
              ))}
            </div>
          )}
          <button
            onClick={toggleSave}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur shadow-card"
          >
            <Heart className={`h-5 w-5 ${saved ? "fill-accent text-accent" : ""}`} />
          </button>
        </div>

        {images.length > 1 && (
          <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActiveImg(i)}
                className={`relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${i === activeImg ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100"}`}
              >
                <img src={img.url} alt={`${listing.title} ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="px-4 py-5 space-y-4">
          {listing.brand && <p className="text-eyebrow text-muted-foreground">{listing.brand}</p>}
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display text-2xl leading-tight">{listing.title}</h1>
            <p className="font-display text-2xl text-foreground">{formatSEK(listing.price_sek)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {listing.size && <Chip>Storlek {listing.size}</Chip>}
            {listing.condition && <Chip>{listing.condition}</Chip>}
            {listing.categories?.name_sv && <Chip>{listing.categories.name_sv}</Chip>}
          </div>

          {/* Engagemang */}
          <div className="flex items-center gap-2">
            <StatPill icon={<Eye className="h-3.5 w-3.5" />} value={(listing as unknown as { views_count?: number }).views_count ?? 0} label={((listing as unknown as { views_count?: number }).views_count ?? 0) === 1 ? "visning" : "visningar"} />
            <StatPill icon={<Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />} value={savesCount} label={savesCount === 1 ? "sparad" : "sparade"} highlight={saved} />
          </div>

          {listing.co2_saved_kg > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-3 text-sm">
              <Leaf className="h-5 w-5 text-primary" />
              <p>
                Genom att köpa second hand sparar du ca{" "}
                <strong>{Math.round(Number(listing.co2_saved_kg))} kg CO₂</strong>.
              </p>
            </div>
          )}

          {listing.description && (
            <div>
              <h2 className="text-eyebrow text-muted-foreground mb-1">Beskrivning</h2>
              <p className="text-sm whitespace-pre-line">{listing.description}</p>
            </div>
          )}

          {/* Plats & leverans */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <h2 className="text-eyebrow text-muted-foreground">Plats & leverans</h2>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground">Finns i: </span>
                <span className="font-medium">
                  {listing.city}{listing.area ? `, ${listing.area}` : ""}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm">
              {listing.delivery_method === "pickup" ? (
                <Handshake className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <Truck className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div>
                <span className="text-muted-foreground">Leverans: </span>
                <span className="font-medium">
                  {listing.delivery_method === "shipping" && "Skickas"}
                  {listing.delivery_method === "pickup" && "Lokal upphämtning"}
                  {listing.delivery_method === "both" && "Skickas eller hämtas"}
                </span>
              </div>
            </div>
            {(listing.delivery_method === "shipping" || listing.delivery_method === "both") && (
              <div className="text-sm text-muted-foreground pl-6">
                Frakt:{" "}
                <span className="text-foreground">
                  {listing.shipping_price != null
                    ? formatSEK(listing.shipping_price) + (listing.buyer_pays_shipping ? " (köparen betalar)" : " (säljaren betalar)")
                    : listing.buyer_pays_shipping ? "Köparen betalar" : "Säljaren betalar"}
                </span>
                {listing.ships_within_days && (
                  <> · Skickas inom {listing.ships_within_days === "1" ? "1 dag" : listing.ships_within_days + " dagar"}</>
                )}
              </div>
            )}
            {(listing.delivery_method === "pickup" || listing.delivery_method === "both") && (
              <p className="text-xs text-muted-foreground pl-6">
                Bestäm exakt mötesplats i chatten och träffas gärna på offentlig plats.
              </p>
            )}
          </div>

          {/* Säljare */}
          {seller && (
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                <Link to="/profile/$userId" params={{ userId: seller.id }} className="flex flex-1 items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-muted">
                    {seller.avatar_url ? (
                      <img src={seller.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-medium">
                        {(seller.full_name ?? "?")[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm">{seller.full_name ?? "Säljare"}</p>
                      {seller.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {stats && stats.rating_count > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-current" />
                          {stats.average_rating.toFixed(1)} ({stats.rating_count})
                        </span>
                      )}
                      <span>· {stats?.sold_count ?? 0} sålda</span>
                      <span>· {stats?.followers_count ?? 0} följare</span>
                    </div>
                    {sellerBadge && <span className="text-eyebrow text-primary">{sellerBadge}</span>}
                  </div>
                </Link>
                <FollowButton sellerId={seller.id} size="sm" />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => startConversation("")}
              className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-card"
            >
              Skicka meddelande
            </button>
          </div>

          <button
            onClick={reportListing}
            className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Flag className="h-3 w-3" /> Rapportera annonsen
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border bg-card px-3 py-1 text-xs">{children}</span>;
}

function StatPill({
  icon,
  value,
  label,
  highlight = false,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
        highlight
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      <span className={highlight ? "text-accent" : "text-foreground/70"}>{icon}</span>
      <span className="font-medium tabular-nums text-foreground">{value.toLocaleString("sv-SE")}</span>
      <span>{label}</span>
    </div>
  );
}
