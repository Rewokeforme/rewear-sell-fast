import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Bell, Camera, Heart, Leaf, LogOut, Package, ShieldCheck, Star, Users } from "lucide-react";
import { computeSellerBadge, type SellerStatsLite } from "@/lib/rewear";

export const Route = createFileRoute("/me")({
  component: MePage,
});

type Stats = SellerStatsLite & {
  rating_count: number;
  active_listings_count: number;
  followers_count: number;
  total_co2_saved: number;
  rewear_score: number;
};

function MePage() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    full_name: string | null; city: string | null; avatar_url: string | null;
    rewear_score: number; is_verified: boolean;
  } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      alert("Välj en bildfil");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Bilden får vara max 5 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (updErr) throw updErr;
      setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, city, avatar_url, rewear_score, is_verified")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(p as typeof profile);

      const { data: s } = await supabase
        .from("seller_stats")
        .select("first_listing_at, sold_count, average_rating, rating_count, active_listings_count, followers_count, total_co2_saved, rewear_score")
        .eq("user_id", user.id)
        .maybeSingle();
      setStats(s as Stats);
    })();
  }, [user]);

  if (location.pathname !== "/me") {
    return <Outlet />;
  }

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header />
        <main className="mx-auto max-w-md px-4 py-12 text-center">
          <h1 className="font-display text-2xl">Din profil</h1>
          <p className="mt-2 text-sm text-muted-foreground">Logga in för att se din profil.</p>
          <Link to="/login" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Logga in</Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  const badge = computeSellerBadge(stats);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Profil" />
      <main className="mx-auto max-w-2xl px-4 py-4 space-y-6">
        <section className="flex items-center gap-4">
          <label className="relative h-16 w-16 cursor-pointer overflow-hidden rounded-full bg-muted">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-xl">
                {(profile?.full_name ?? user?.email ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/40 opacity-0 transition group-hover:opacity-100 hover:opacity-100">
              <Camera className="h-5 w-5 text-background" />
            </div>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarChange}
              disabled={uploading}
            />
          </label>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display text-xl">{profile?.full_name ?? "Namnlös"}</h1>
              {profile?.is_verified && <ShieldCheck className="h-4 w-4 text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">{profile?.city ?? user?.email}</p>
            {badge && <span className="mt-1 inline-block text-eyebrow text-primary">{badge}</span>}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Stat label="Rewear Score" value={stats?.rewear_score ?? profile?.rewear_score ?? 0} />
          <Stat label="Aktiva annonser" value={stats?.active_listings_count ?? 0} />
          <Stat label="Sålda plagg" value={stats?.sold_count ?? 0} />
          <Stat label="Följare" value={stats?.followers_count ?? 0} />
          <Stat
            label="Betyg"
            value={stats && stats.rating_count ? stats.average_rating.toFixed(1) : "–"}
            sub={stats && stats.rating_count ? `${stats.rating_count} omdömen` : undefined}
          />
          <Stat label="CO₂ sparad" value={`${Math.round(Number(stats?.total_co2_saved ?? 0))} kg`} />
        </section>

        <nav className="space-y-2">
          <RowLink to="/me/listings" icon={Package} label="Mina annonser" />
          <RowLink to="/me/favorites" icon={Heart} label="Sparade" />
          <RowLink to="/me/following" icon={Users} label="Säljare jag följer" />
          <RowLink to="/notifications" icon={Bell} label="Notiser" />
          <RowLink to="/inbox" icon={Users} label="Inkorg" />
          {isAdmin && <RowLink to="/admin" icon={Star} label="Adminpanel" />}
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm transition hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
            Logga ut
          </button>
        </nav>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          <Leaf className="mr-1 inline h-3 w-3 text-primary" />
          Tack för att du säljer second hand.
        </p>
      </main>
      <BottomNav />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-eyebrow text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function RowLink({
  to,
  icon: Icon,
  label,
}: {
  to: "/me/listings" | "/me/favorites" | "/me/following" | "/notifications" | "/inbox" | "/admin";
  icon: typeof Heart;
  label: string;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm transition hover:bg-secondary">
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
