import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { FollowButton } from "@/components/FollowButton";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";
import type { ListingWithDetails } from "@/lib/database.types";
import { Flag, ShieldCheck, Star, UserMinus } from "lucide-react";
import { computeAllBadges, type SellerStatsLite, type VerificationFlags } from "@/lib/rewear";
import { TrustBadges } from "@/components/TrustBadges";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ReportDialog } from "@/components/ReportDialog";

type Stats = SellerStatsLite & {
  rating_count: number;
  active_listings_count: number;
  followers_count: number;
  total_co2_saved: number;
  rewear_score: number;
};

export const Route = createFileRoute("/profile/$userId")({
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<{
    full_name: string | null; city: string | null; avatar_url: string | null; bio: string | null;
    rewear_score: number; is_verified: boolean;
    email_verified: boolean; phone_verified: boolean; identity_verified: boolean;
  } | null>(null);
  const [items, setItems] = useState<ListingWithDetails[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, city, avatar_url, bio, rewear_score, is_verified, email_verified, phone_verified, identity_verified")
        .eq("id", userId)
        .maybeSingle();
      setProfile(p as typeof profile);

      const { data: l } = await supabase
        .from("listings")
        .select("*, listing_images(*), profiles(id,full_name,city,avatar_url,rewear_score,is_verified), categories(slug,name_sv)")
        .eq("seller_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      setItems((l as unknown as ListingWithDetails[]) ?? []);

      const { data: s } = await supabase
        .from("seller_stats")
        .select("first_listing_at, sold_count, average_rating, rating_count, active_listings_count, followers_count, total_co2_saved, rewear_score")
        .eq("user_id", userId)
        .maybeSingle();
      setStats(s as Stats);
    })();
  }, [userId]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId)
      .maybeSingle()
      .then(({ data }) => setBlocked(Boolean(data)));
  }, [user, userId]);

  async function submitReport(reason: string) {
    if (!user) return;
    const { error } = await supabase.from("user_reports").insert({
      reporter_id: user.id,
      reported_user_id: userId,
      reason,
    });
    if (error) toast.error(error.message);
    else toast.success("Tack — rapporten är skickad.");
  }

  async function toggleBlock() {
    if (!user || user.id === userId) return;
    if (blocked) {
      await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", userId);
      setBlocked(false);
      toast.success("Blockering borttagen");
    } else {
      const { error } = await supabase.from("user_blocks").insert({ blocker_id: user.id, blocked_id: userId });
      if (error) toast.error(error.message);
      else {
        setBlocked(true);
        toast.success("Användaren blockerad");
      }
    }
  }

  const badges = computeAllBadges(stats, profile);
  const isMe = user?.id === userId;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-4 space-y-5">
        <section className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-muted">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="h-full w-full object-cover" alt="" />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-xl">
                {(profile?.full_name ?? "?")[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display text-xl">{profile?.full_name ?? "Säljare"}</h1>
              {profile?.is_verified && <ShieldCheck className="h-4 w-4 text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">{profile?.city}</p>
            {badges.length > 0 && <TrustBadges badges={badges} className="mt-2" />}
            {stats && stats.rating_count > 0 && (
              <span className="mt-1 flex items-center gap-0.5 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-current" /> {stats.average_rating.toFixed(1)} ({stats.rating_count})
              </span>
            )}
          </div>
          {!isMe && <FollowButton sellerId={userId} />}
        </section>

        {profile?.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}

        {/* Stats */}
        <section className="grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Aktiva" value={stats?.active_listings_count ?? 0} />
          <MiniStat label="Sålda" value={stats?.sold_count ?? 0} />
          <MiniStat label="Följare" value={stats?.followers_count ?? 0} />
          <MiniStat label="Score" value={stats?.rewear_score ?? 0} />
          <MiniStat label="Betyg" value={stats?.rating_count ? stats.average_rating.toFixed(1) : "–"} />
          <MiniStat label="CO₂ kg" value={Math.round(Number(stats?.total_co2_saved ?? 0))} />
        </section>

        <h2 className="text-eyebrow text-muted-foreground">Aktiva annonser</h2>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Inga aktiva annonser.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}

        {!isMe && user && (
          <div className="flex gap-2 pt-4 text-xs">
            <button
              onClick={() => setReportOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-border py-2 text-muted-foreground hover:text-foreground"
            >
              <Flag className="h-3 w-3" /> Rapportera
            </button>
            <button
              onClick={toggleBlock}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-border py-2 text-muted-foreground hover:text-foreground"
            >
              <UserMinus className="h-3 w-3" /> {blocked ? "Avblockera" : "Blockera"}
            </button>
          </div>
        )}

        <p className="pt-4 text-center text-xs">
          <Link to="/" className="text-muted-foreground underline">Till hem</Link>
        </p>
      </main>
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        title="Rapportera användare"
        description="Hjälp oss hålla Rewear tryggt. Berätta kort vad som är fel — vårt team granskar alla rapporter."
        onSubmit={submitReport}
      />
      <BottomNav />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="font-display text-lg">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
