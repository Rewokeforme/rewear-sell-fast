import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

export const Route = createFileRoute("/inbox/")({
  component: InboxPage,
});

type ConvSummary = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  listings: { title: string; listing_images: { url: string }[] } | null;
  other_profile: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

function InboxPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<ConvSummary[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, listing_id, buyer_id, seller_id, last_message_at, listings(title, listing_images(url))")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      const otherIds = Array.from(
        new Set(((convs ?? []) as Array<{ buyer_id: string; seller_id: string }>).map((c) =>
          c.buyer_id === user.id ? c.seller_id : c.buyer_id,
        )),
      );
      const { data: profs } = otherIds.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", otherIds)
        : { data: [] };
      const profMap = new Map(((profs ?? []) as Array<{ id: string }>).map((p) => [p.id, p]));

      setItems(
        (convs ?? []).map((c: unknown) => {
          const conv = c as ConvSummary;
          const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
          return { ...conv, other_profile: (profMap.get(otherId) as ConvSummary["other_profile"]) ?? null };
        }),
      );
      setBusy(false);
    })();
  }, [user]);

  if (!loading && !user) {
    return (
      <Empty>
        Logga in för att se din inkorg.{" "}
        <Link to="/login" className="text-primary underline">Logga in</Link>
      </Empty>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Inkorg" />
      <main className="mx-auto max-w-2xl px-4 py-4">
        <h1 className="font-display text-2xl mb-4">Meddelanden</h1>
        {busy ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Inga konversationer ännu.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((c) => {
              const cover = c.listings?.listing_images?.[0]?.url;
              return (
                <li key={c.id}>
                  <Link
                    to="/inbox/$conversationId"
                    params={{ conversationId: c.id }}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:bg-secondary"
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-lg bg-muted shrink-0">
                      {cover && <img src={cover} className="h-full w-full object-cover" alt="" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.other_profile?.full_name ?? "Användare"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.listings?.title}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.last_message_at), { locale: sv, addSuffix: true })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="mx-auto max-w-md px-4 py-12 text-center text-sm text-muted-foreground">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
