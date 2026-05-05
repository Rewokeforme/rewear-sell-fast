import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox/")({
  component: InboxPage,
});

type ConvSummary = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  listings: { title: string; status: string; listing_images: { url: string }[] } | null;
  other_profile: { id: string; full_name: string | null; avatar_url: string | null } | null;
  last_message: { body: string; sender_id: string; read_at: string | null; created_at: string } | null;
  unread: boolean;
};

type Tab = "all" | "buy" | "sell" | "unread";

function InboxPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<ConvSummary[]>([]);
  const [busy, setBusy] = useState(true);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, listing_id, buyer_id, seller_id, last_message_at, listings(title, status, listing_images(url))")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      const list = (convs ?? []) as Array<Omit<ConvSummary, "other_profile" | "last_message" | "unread">>;
      const otherIds = Array.from(new Set(list.map((c) => (c.buyer_id === user.id ? c.seller_id : c.buyer_id))));
      const convIds = list.map((c) => c.id);

      const [{ data: profs }, { data: msgs }] = await Promise.all([
        otherIds.length
          ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", otherIds)
          : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; avatar_url: string | null }> }),
        convIds.length
          ? supabase
              .from("messages")
              .select("conversation_id, body, sender_id, read_at, created_at")
              .in("conversation_id", convIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as Array<{ conversation_id: string; body: string; sender_id: string; read_at: string | null; created_at: string }> }),
      ]);

      const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
      const lastByConv = new Map<string, { body: string; sender_id: string; read_at: string | null; created_at: string }>();
      for (const m of msgs ?? []) {
        if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
      }

      setItems(
        list.map((c) => {
          const otherId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
          const last = lastByConv.get(c.id) ?? null;
          const unread = Boolean(last && last.sender_id !== user.id && !last.read_at);
          return {
            ...c,
            other_profile: profMap.get(otherId) ?? null,
            last_message: last,
            unread,
          };
        }),
      );
      setBusy(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    if (!user) return items;
    switch (tab) {
      case "buy":
        return items.filter((c) => c.buyer_id === user.id);
      case "sell":
        return items.filter((c) => c.seller_id === user.id);
      case "unread":
        return items.filter((c) => c.unread);
      default:
        return items;
    }
  }, [items, tab, user]);

  if (!loading && !user) {
    return (
      <Empty>
        Logga in för att se din inkorg.{" "}
        <Link to="/login" className="text-primary underline">Logga in</Link>
      </Empty>
    );
  }

  const counts = {
    all: items.length,
    buy: items.filter((c) => user && c.buyer_id === user.id).length,
    sell: items.filter((c) => user && c.seller_id === user.id).length,
    unread: items.filter((c) => c.unread).length,
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Inkorg" />
      <main className="mx-auto max-w-2xl px-4 py-4">
        <h1 className="font-display text-2xl mb-4">Meddelanden</h1>

        <div className="mb-4 flex gap-1 rounded-full border border-border bg-card p-1 text-xs">
          {(["all", "buy", "sell", "unread"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-full py-1.5 font-medium transition",
                tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "all" && "Alla"}
              {t === "buy" && "Köp"}
              {t === "sell" && "Sälj"}
              {t === "unread" && "Olästa"}
              <span className="ml-1 opacity-60">{counts[t]}</span>
            </button>
          ))}
        </div>

        {busy ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {tab === "unread" ? "Inga olästa meddelanden." : "Inga konversationer ännu."}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((c) => {
              const cover = c.listings?.listing_images?.[0]?.url;
              const status = c.listings?.status;
              return (
                <li key={c.id}>
                  <Link
                    to="/inbox/$conversationId"
                    params={{ conversationId: c.id }}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:bg-secondary"
                  >
                    <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-muted shrink-0">
                      {cover && <img src={cover} className="h-full w-full object-cover" alt="" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm truncate", c.unread ? "font-semibold" : "font-medium")}>
                          {c.other_profile?.full_name ?? "Användare"}
                        </p>
                        {status && status !== "active" && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                            {status === "sold" ? "Såld" : status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{c.listings?.title}</p>
                      {c.last_message && (
                        <p className={cn("text-xs truncate", c.unread ? "text-foreground" : "text-muted-foreground")}>
                          {c.last_message.body}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.last_message_at), { locale: sv, addSuffix: true })}
                      </span>
                      {c.unread && <span className="h-2 w-2 rounded-full bg-accent" />}
                    </div>
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
      <main className="mx-auto max-w-md px-4 py-12 text-center text-sm text-muted-foreground">{children}</main>
      <BottomNav />
    </div>
  );
}
