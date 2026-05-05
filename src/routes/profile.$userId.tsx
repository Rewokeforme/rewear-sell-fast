import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";
import type { ListingWithDetails } from "@/lib/database.types";
import { ShieldCheck, Star } from "lucide-react";
import { badgeForSeller } from "@/lib/rewear";

export const Route = createFileRoute("/profile/$userId")({
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const [profile, setProfile] = useState<{ full_name: string | null; city: string | null; avatar_url: string | null; bio: string | null; rewear_score: number; is_verified: boolean } | null>(null);
  const [items, setItems] = useState<ListingWithDetails[]>([]);
  const [stats, setStats] = useState({ sold: 0, rating: 0, count: 0 });

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("full_name, city, avatar_url, bio, rewear_score, is_verified").eq("id", userId).maybeSingle();
      setProfile(p as typeof profile);
      const { data: l } = await supabase
        .from("listings")
        .select("*, listing_images(*), profiles(id,full_name,city,avatar_url,rewear_score,is_verified), categories(slug,name_sv)")
        .eq("seller_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      setItems((l as unknown as ListingWithDetails[]) ?? []);
      const [sold, reviews] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", userId).eq("status", "sold"),
        supabase.from("reviews").select("rating").eq("reviewee_id", userId),
      ]);
      const ratings = ((reviews.data ?? []) as Array<{ rating: number }>).map((r) => r.rating);
      setStats({
        sold: sold.count ?? 0,
        rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
        count: ratings.length,
      });
    })();
  }, [userId]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-4 space-y-5">
        <section className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-muted">
            {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" alt="" /> : <div className="flex h-full items-center justify-center font-display text-xl">{(profile?.full_name ?? "?")[0]}</div>}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display text-xl">{profile?.full_name ?? "Säljare"}</h1>
              {profile?.is_verified && <ShieldCheck className="h-4 w-4 text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">{profile?.city}</p>
            <div className="mt-1 flex items-center gap-3 text-xs">
              <span className="text-eyebrow text-primary">{badgeForSeller(stats.sold, stats.rating)}</span>
              {stats.count > 0 && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Star className="h-3 w-3 fill-current" /> {stats.rating.toFixed(1)} ({stats.count})
                </span>
              )}
            </div>
          </div>
        </section>

        {profile?.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}

        <h2 className="text-eyebrow text-muted-foreground">Aktiva annonser</h2>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Inga aktiva annonser.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}

        <p className="pt-4 text-center text-xs">
          <Link to="/" className="text-muted-foreground underline">Till hem</Link>
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
