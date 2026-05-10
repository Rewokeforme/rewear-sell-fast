import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight } from "lucide-react";

type Wardrobe = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  is_verified: boolean | null;
};

export function FollowedWardrobes({ userId }: { userId: string }) {
  const [items, setItems] = useState<Wardrobe[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: follows } = await supabase
        .from("follows")
        .select("seller_id, created_at")
        .eq("follower_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      const ids = ((follows ?? []) as Array<{ seller_id: string }>).map((r) => r.seller_id);
      if (ids.length === 0) {
        if (!cancelled) setItems([]);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, city, is_verified")
        .in("id", ids);
      // bevara följ-ordningen
      const map = new Map((profiles ?? []).map((p) => [p.id, p as Wardrobe]));
      const ordered = ids.map((id) => map.get(id)).filter(Boolean) as Wardrobe[];
      if (!cancelled) setItems(ordered);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!items || items.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-eyebrow text-primary">Personligt</p>
          <h2 className="font-display text-2xl">Från garderober du följer</h2>
        </div>
        <Link
          to="/me/following"
          className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Visa alla <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 scrollbar-none">
        <div className="flex gap-3">
          {items.map((p) => (
            <Link
              key={p.id}
              to="/profile/$userId"
              params={{ userId: p.id }}
              className="group flex w-20 shrink-0 flex-col items-center gap-1.5 text-center"
            >
              <div className="h-16 w-16 overflow-hidden rounded-full bg-muted ring-2 ring-transparent transition group-hover:ring-foreground/40">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center font-display text-base">
                    {(p.full_name ?? "?")[0]}
                  </div>
                )}
              </div>
              <span className="line-clamp-1 text-[11px] font-medium text-foreground">
                {p.full_name ?? "Säljare"}
              </span>
              {p.city && (
                <span className="line-clamp-1 text-[10px] text-muted-foreground">{p.city}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
