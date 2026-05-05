import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Heart, Leaf, LogOut, Package, ShieldCheck, Star } from "lucide-react";
import { badgeForSeller } from "@/lib/rewear";

export const Route = createFileRoute("/me")({
  component: MePage,
});

function MePage() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; city: string | null; avatar_url: string | null; rewear_score: number; is_verified: boolean } | null>(null);
  const [stats, setStats] = useState({ active: 0, sold: 0, co2: 0, rating: 0, ratingCount: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("full_name, city, avatar_url, rewear_score, is_verified").eq("id", user.id).maybeSingle();
      setProfile(p as typeof profile);

      const [active, sold, co2sold, reviews] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "active"),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "sold"),
        supabase.from("listings").select("co2_saved_kg").eq("seller_id", user.id).eq("status", "sold"),
        supabase.from("reviews").select("rating").eq("reviewee_id", user.id),
      ]);
      const co2 = ((co2sold.data ?? []) as Array<{ co2_saved_kg: number }>).reduce((acc, r) => acc + Number(r.co2_saved_kg ?? 0), 0);
      const ratings = ((reviews.data ?? []) as Array<{ rating: number }>).map((r) => r.rating);
      setStats({
        active: active.count ?? 0,
        sold: sold.count ?? 0,
        co2,
        rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
        ratingCount: ratings.length,
      });
    })();
  }, [user]);

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

  const badge = badgeForSeller(stats.sold, stats.rating);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Profil" />
      <main className="mx-auto max-w-2xl px-4 py-4 space-y-6">
        <section className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-muted">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-xl">
                {(profile?.full_name ?? user?.email ?? "?")[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display text-xl">{profile?.full_name ?? "Namnlös"}</h1>
              {profile?.is_verified && <ShieldCheck className="h-4 w-4 text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">{profile?.city ?? user?.email}</p>
            <span className="mt-1 inline-block text-eyebrow text-primary">{badge}</span>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Stat label="Rewear Score" value={profile?.rewear_score ?? 0} />
          <Stat label="Aktiva annonser" value={stats.active} />
          <Stat label="Sålda plagg" value={stats.sold} />
          <Stat
            label="Betyg"
            value={stats.ratingCount ? `${stats.rating.toFixed(1)}` : "–"}
            sub={stats.ratingCount ? `${stats.ratingCount} omdömen` : undefined}
          />
          <div className="col-span-2 rounded-xl bg-primary/10 p-4">
            <p className="text-eyebrow text-primary flex items-center gap-1">
              <Leaf className="h-3 w-3" /> CO₂ sparad
            </p>
            <p className="mt-1 font-display text-3xl">{Math.round(stats.co2)} kg</p>
            <p className="text-xs text-muted-foreground">Tack för att du säljer second hand.</p>
          </div>
        </section>

        <nav className="space-y-2">
          <RowLink to="/me/listings" icon={Package} label="Mina annonser" />
          <RowLink to="/me/favorites" icon={Heart} label="Sparade" />
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

function RowLink({ to, icon: Icon, label }: { to: "/me/listings" | "/me/favorites" | "/admin"; icon: typeof Heart; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm transition hover:bg-secondary">
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
