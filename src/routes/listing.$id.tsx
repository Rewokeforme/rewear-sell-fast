import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Heart, Leaf, MessageCircle, ShieldCheck, Star } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { badgeForSeller, formatSEK } from "@/lib/rewear";
import type { ListingWithDetails } from "@/lib/database.types";

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
  const [sellerStats, setSellerStats] = useState({ sold: 0, avg: 0, count: 0 });

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
    const sid = listing.profiles.id;
    Promise.all([
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", sid).eq("status", "sold"),
      supabase.from("reviews").select("rating").eq("reviewee_id", sid),
    ]).then(([sold, reviews]) => {
      const ratings = (reviews.data ?? []).map((r) => r.rating);
      const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      setSellerStats({ sold: sold.count ?? 0, avg, count: ratings.length });
    });
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
    // Find or create conversation
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", user.id)
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

    await supabase.from("messages").insert({
      conversation_id: convId,
      sender_id: user.id,
      body: message,
    });

    navigate({ to: "/inbox/$conversationId", params: { conversationId: convId } });
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
  const sellerBadge = badgeForSeller(sellerStats.sold, sellerStats.avg);
  const images = listing.listing_images ?? [];

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />
      <main className="mx-auto max-w-2xl">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          {images[activeImg] ? (
            <img
              src={images[activeImg].url}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
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

          {/* Säljare */}
          {seller && (
            <Link
              to="/profile/$userId"
              params={{ userId: seller.id }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:bg-secondary"
            >
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
                  {sellerStats.count > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-current" />
                      {sellerStats.avg.toFixed(1)} ({sellerStats.count})
                    </span>
                  )}
                  <span>· {sellerStats.sold} sålda</span>
                </div>
              </div>
              <span className="text-eyebrow text-primary">{sellerBadge}</span>
            </Link>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => startConversation(`Hej! Är "${listing.title}" fortfarande ledig?`)}
              className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-card"
            >
              Visa intresse
            </button>
            <button
              onClick={() => startConversation("Hej! Jag har en fråga om plagget.")}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background"
              aria-label="Skicka meddelande"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs">
      {children}
    </span>
  );
}
