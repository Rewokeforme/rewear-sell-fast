import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, UserMinus, Users } from "lucide-react";

export const Route = createFileRoute("/me/following")({
  component: FollowingPage,
});

type FollowedSeller = {
  follow_id: string;
  followed_at: string;
  seller_id: string;
  full_name: string | null;
  city: string | null;
  avatar_url: string | null;
  active_listings_count: number;
  sold_count: number;
  average_rating: number;
  rating_count: number;
};

function FollowingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<FollowedSeller[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: follows } = await supabase
        .from("follows")
        .select("id, created_at, seller_id")
        .eq("follower_id", user.id)
        .order("created_at", { ascending: false });

      if (!follows || follows.length === 0) {
        setItems([]);
        return;
      }

      const sellerIds = follows.map((f) => f.seller_id);
      const [{ data: profiles }, { data: stats }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, city, avatar_url").in("id", sellerIds),
        supabase
          .from("seller_stats")
          .select("user_id, active_listings_count, sold_count, average_rating, rating_count")
          .in("user_id", sellerIds),
      ]);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const statsMap = new Map((stats ?? []).map((s) => [s.user_id, s]));

      const merged: FollowedSeller[] = follows.map((f) => {
        const p = profileMap.get(f.seller_id);
        const s = statsMap.get(f.seller_id);
        return {
          follow_id: f.id,
          followed_at: f.created_at,
          seller_id: f.seller_id,
          full_name: p?.full_name ?? null,
          city: p?.city ?? null,
          avatar_url: p?.avatar_url ?? null,
          active_listings_count: s?.active_listings_count ?? 0,
          sold_count: s?.sold_count ?? 0,
          average_rating: Number(s?.average_rating ?? 0),
          rating_count: s?.rating_count ?? 0,
        };
      });
      setItems(merged);
    })();
  }, [user]);

  async function handleUnfollow(followId: string, sellerId: string) {
    if (!confirm("Sluta följa denna säljare?")) return;
    const prev = items;
    setItems((arr) => (arr ? arr.filter((i) => i.follow_id !== followId) : arr));
    const { error } = await supabase.from("follows").delete().eq("id", followId).eq("follower_id", user!.id);
    if (error) {
      alert(error.message);
      setItems(prev);
    }
    void sellerId;
  }

  if (!loading && !user) {
    navigate({ to: "/login" });
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Följer" />
      <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">
        <Link to="/me" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Tillbaka till profil
        </Link>

        <div>
          <h1 className="font-display text-2xl">Säljare du följer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items === null ? "Laddar…" : `${items.length} säljare`}
          </p>
        </div>

        {items && items.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Du följer inga säljare ännu. Hitta säljare att följa via deras profil.
            </p>
            <Link
              to="/search"
              className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Utforska annonser
            </Link>
          </div>
        )}

        <ul className="space-y-2">
          {items?.map((s) => (
            <li
              key={s.follow_id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <Link
                to="/profile/$userId"
                params={{ userId: s.seller_id }}
                className="flex flex-1 items-center gap-3"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center font-display text-base">
                      {(s.full_name ?? "?")[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.full_name ?? "Namnlös"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.city ? `${s.city} · ` : ""}
                    {s.active_listings_count} aktiva · {s.sold_count} sålda
                    {s.rating_count > 0 ? ` · ★ ${s.average_rating.toFixed(1)}` : ""}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => handleUnfollow(s.follow_id, s.seller_id)}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs transition hover:bg-secondary"
                aria-label="Sluta följa"
              >
                <UserMinus className="h-3.5 w-3.5" />
                Följer
              </button>
            </li>
          ))}
        </ul>
      </main>
      <BottomNav />
    </div>
  );
}
