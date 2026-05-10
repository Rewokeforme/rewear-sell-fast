import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bookmark, Eye, Flag, Handshake, Heart, Info, Leaf, MapPin, ShieldCheck, ShoppingBag, Star, Truck } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { createOrder } from "@/lib/orders";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { FollowButton } from "@/components/FollowButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { computeAllBadges, formatSEK, type SellerStatsLite, type VerificationFlags } from "@/lib/rewear";
import { TrustBadges } from "@/components/TrustBadges";
import type { ListingWithDetails } from "@/lib/database.types";
import { ReportDialog } from "@/components/ReportDialog";
import { CONDITION_LABELS, MEASUREMENT_LABELS, type ConditionKey, type MeasurementKey } from "@/lib/listingSchema";
import { computeFitMatch, formatSizeForDisplay, type FitProfile } from "@/lib/fitMatch";
import { Check, X, Sparkles, AlertCircle, Ruler } from "lucide-react";

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
  const [sellerVerification, setSellerVerification] = useState<VerificationFlags | null>(null);
  const [savesCount, setSavesCount] = useState<number>(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [fitProfile, setFitProfile] = useState<FitProfile | null>(null);
  const [fitProfileLoaded, setFitProfileLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setFitProfile(null);
      setFitProfileLoaded(true);
      return;
    }
    supabase
      .from("fit_profiles")
      .select("clothing_size, shoe_size, kids_sizes")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFitProfile((data as FitProfile) ?? null);
        setFitProfileLoaded(true);
      });
  }, [user]);

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
    supabase
      .from("profiles")
      .select("email_verified, phone_verified, identity_verified, full_name, city")
      .eq("id", listing.profiles.id)
      .maybeSingle()
      .then(({ data }) => setSellerVerification((data as VerificationFlags) ?? null));
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

  function openReport() {
    if (!user || !listing) {
      navigate({ to: "/login" });
      return;
    }
    setReportOpen(true);
  }

  async function submitReport(reason: string) {
    if (!user || !listing) return;
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
  const sellerBadges = computeAllBadges(stats, sellerVerification);
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

          {(() => {
            const sizeDisp = formatSizeForDisplay({
              sizeType: listing.size_type,
              sizeLabel: listing.size_label,
              size: listing.size,
              shoeSize: listing.shoe_size,
              waistSize: listing.waist_size,
              lengthSize: listing.length_size,
            });
            return (
              <div className="flex flex-wrap gap-2">
                {sizeDisp && <Chip>{sizeDisp.label}: <strong className="ml-1 font-medium">{sizeDisp.value}</strong></Chip>}
                {listing.condition && <Chip>{listing.condition}</Chip>}
                {(listing.main_category || listing.categories?.name_sv) && (
                  <Chip>
                    {listing.main_category ?? listing.categories?.name_sv}
                    {listing.sub_category ? ` · ${listing.sub_category}` : ""}
                  </Chip>
                )}
              </div>
            );
          })()}

          {/* Fit Match */}
          {fitProfileLoaded && (() => {
            const fm = computeFitMatch({
              sizeType: listing.size_type,
              size: listing.size,
              shoeSize: listing.shoe_size,
              sizeLabel: listing.size_label,
              profile: fitProfile,
            });
            if (fm.kind === "no-profile") {
              return (
                <Link
                  to="/me"
                  className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Lägg till din storlek för bättre rekommendationer
                </Link>
              );
            }
            const cls =
              fm.kind === "match"
                ? "border-primary/30 bg-primary/10 text-primary"
                : fm.kind === "check"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                : "border-border bg-card text-muted-foreground";
            const Icon = fm.kind === "match" ? Check : fm.kind === "check" ? AlertCircle : Sparkles;
            return (
              <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
                <Icon className="h-3.5 w-3.5" />
                {fm.label}
              </div>
            );
          })()}

          {/* Style tags */}
          {Array.isArray(listing.style_tags) && listing.style_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {listing.style_tags.slice(0, 5).map((t) => (
                <span key={t} className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground/80">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Engagemang */}
          <div className="flex items-center gap-2">
            <StatPill icon={<Eye className="h-3.5 w-3.5" />} value={(listing as unknown as { views_count?: number }).views_count ?? 0} label={((listing as unknown as { views_count?: number }).views_count ?? 0) === 1 ? "visning" : "visningar"} />
            <StatPill icon={<Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />} value={savesCount} label={savesCount === 1 ? "sparad" : "sparade"} highlight={saved} />
          </div>

          {listing.co2_saved_kg > 0 && (
            <div className="flex items-start gap-3 rounded-xl bg-primary/10 p-3 text-sm">
              <Leaf className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="flex-1">
                <p>
                  Genom att köpa second hand sparar du uppskattningsvis{" "}
                  <strong>{Math.round(Number(listing.co2_saved_kg))} kg CO₂</strong>.
                </p>
                <HoverCard openDelay={100}>
                  <HoverCardTrigger asChild>
                    <button type="button" className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline">
                      <Info className="h-3 w-3" />
                      Hur räknar vi?
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 text-xs leading-relaxed">
                    <p className="font-medium text-foreground mb-1">Uppskattning, inte exakt mätning</p>
                    <p className="text-muted-foreground">
                      Siffran är ett <strong>branschgenomsnitt per kategori</strong> (t.ex. jacka, byxor, skor) och visar ungefär hur mycket CO₂ som hade släppts ut vid produktion av ett motsvarande nytt plagg. Den faktiska besparingen beror på material, vikt och tillverkningsland – något vi inte mäter per plagg idag.
                    </p>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </div>
          )}

          {listing.description && (
            <div>
              <h2 className="text-eyebrow text-muted-foreground mb-1">Beskrivning</h2>
              <p className="text-sm whitespace-pre-line">{listing.description}</p>
            </div>
          )}

          {/* Mått */}
          <MeasurementsSection measurements={listing.measurements} />

          {/* Skick kontrollerat av säljaren */}
          <ConditionChecksSection checks={listing.condition_checks} />

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
                    {sellerBadges.length > 0 && <TrustBadges badges={sellerBadges} className="mt-1" />}
                  </div>
                </Link>
                <FollowButton sellerId={seller.id} size="sm" />
              </div>
            </div>
          )}

          {(() => {
            const isOwner = user?.id === listing.seller_id;
            const status = listing.status as string;
            const isReserved = status === "reserved";
            const isSold = status === "sold";
            return (
              <div className="pt-2 space-y-2">
                {isSold && (
                  <div className="rounded-xl border border-border bg-muted px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                    Såld
                  </div>
                )}
                {isReserved && !isSold && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900">
                    Reserverad
                  </div>
                )}
                {isOwner ? (
                  <Link
                    to="/me/listings"
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium"
                  >
                    Hantera dina annonser
                  </Link>
                ) : (
                  <>
                    {!isReserved && !isSold && (
                      <button
                        onClick={async () => {
                          if (!user) {
                            navigate({ to: "/login" });
                            return;
                          }
                          const { data, error } = await createOrder({
                            listingId: listing.id,
                            buyerId: user.id,
                            sellerId: listing.seller_id,
                            itemPrice: listing.price_sek,
                            shippingPrice:
                              listing.buyer_pays_shipping && listing.shipping_price
                                ? Math.round(Number(listing.shipping_price))
                                : 0,
                            deliveryMethod: listing.delivery_method,
                          });
                          if (error || !data) {
                            toast.error(error ?? "Kunde inte skapa order");
                            return;
                          }
                          navigate({ to: "/checkout/$orderId", params: { orderId: data.id } });
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-card"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Reservera & gå till testkassa
                      </button>
                    )}
                    {!isReserved && !isSold && (
                      <p className="text-[11px] text-center text-muted-foreground -mt-1">
                        Betalning är i testläge — ingen riktig debitering sker.
                      </p>
                    )}
                    <button
                      onClick={() => startConversation("")}
                      className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm font-medium"
                    >
                      Skicka meddelande
                    </button>
                    <button
                      onClick={toggleSave}
                      className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm font-medium"
                    >
                      {saved ? "Sparad" : "Spara"}
                    </button>
                  </>
                )}
              </div>
            );
          })()}

          {user?.id !== listing.seller_id && (
            <button
              onClick={openReport}
              className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Flag className="h-3 w-3" /> Rapportera annonsen
            </button>
          )}
        </div>
      </main>
      <BottomNav />
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} onSubmit={submitReport} />
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

function MeasurementsSection({ measurements }: { measurements: Record<string, number> | null }) {
  const entries = measurements
    ? (Object.entries(measurements).filter(([, v]) => typeof v === "number" && v > 0) as [MeasurementKey, number][])
    : [];
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <h2 className="text-eyebrow text-muted-foreground flex items-center gap-1.5">
        <Ruler className="h-3.5 w-3.5" /> Mått
      </h2>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">Säljaren har inte lagt till mått.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-2 border-b border-border/50 pb-1 last:border-0">
              <dt className="text-muted-foreground">{MEASUREMENT_LABELS[k] ?? k}</dt>
              <dd className="font-medium tabular-nums">{v} cm</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function ConditionChecksSection({ checks }: { checks: Record<string, boolean> | null }) {
  if (!checks || Object.keys(checks).length === 0) return null;
  const positive: { key: ConditionKey; label: string }[] = [];
  const negative: { key: ConditionKey; label: string }[] = [];

  const c = checks as Record<ConditionKey, boolean | undefined>;
  // Negativa egenskaper: visa "Inga ..." om false, annars varning
  if (c.has_stains === false) positive.push({ key: "has_stains", label: "Inga fläckar" });
  else if (c.has_stains === true) negative.push({ key: "has_stains", label: "Fläckar angivna" });
  if (c.has_holes === false) positive.push({ key: "has_holes", label: "Inga hål eller skador" });
  else if (c.has_holes === true) negative.push({ key: "has_holes", label: "Hål eller skador angivna" });
  if (c.has_pilling === false) positive.push({ key: "has_pilling", label: "Ej noppigt tyg" });
  else if (c.has_pilling === true) negative.push({ key: "has_pilling", label: "Noppigt tyg angivet" });
  // Positiva egenskaper: visa bara om true
  if (c.is_cleaned) positive.push({ key: "is_cleaned", label: CONDITION_LABELS.is_cleaned });
  if (c.buttons_zipper_ok) positive.push({ key: "buttons_zipper_ok", label: CONDITION_LABELS.buttons_zipper_ok });
  if (c.receipt_available) positive.push({ key: "receipt_available", label: CONDITION_LABELS.receipt_available });
  if (c.authenticity_documented) positive.push({ key: "authenticity_documented", label: CONDITION_LABELS.authenticity_documented });

  if (positive.length === 0 && negative.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <h2 className="text-eyebrow text-muted-foreground">Skick kontrollerat av säljaren</h2>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {positive.map((it) => (
          <li key={it.key} className="flex items-center gap-2 text-sm">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-3 w-3" />
            </span>
            <span>{it.label}</span>
          </li>
        ))}
        {negative.map((it) => (
          <li key={it.key} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10">
              <X className="h-3 w-3" />
            </span>
            <span>{it.label}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground pt-1">
        Informationen är angiven av säljaren. ReWoke verifierar inte enskilda plagg.
      </p>
    </div>
  );
}
