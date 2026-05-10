import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/rewear";
import { BadgeCheck, Sparkles, ShieldCheck, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AdminMsgItem = {
  id: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
  related_listing_id: string | null;
  listing: { title: string; listing_images: { url: string }[] } | null;
};

export const Route = createFileRoute("/inbox/")({
  component: InboxPage,
});

type ConvSummary = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  listings: { title: string; status: string; price_sek: number; listing_images: { url: string }[] } | null;
  other_profile: { id: string; full_name: string | null; avatar_url: string | null; is_verified: boolean } | null;
  other_stats: { sold_count: number; average_rating: number } | null;
  last_message: { body: string; sender_id: string; read_at: string | null; created_at: string } | null;
  unread: boolean;
};

type Tab = "all" | "buy" | "sell" | "unread";

function counterpartBadge(stats: ConvSummary["other_stats"], verified: boolean): string | null {
  if (stats && stats.sold_count >= 25 && stats.average_rating >= 4.7) return "Premium";
  if (stats && stats.sold_count >= 10) return "Betrodd";
  if (verified) return "Verifierad";
  return null;
}

function InboxPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ConvSummary[]>([]);
  const [adminMsgs, setAdminMsgs] = useState<AdminMsgItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function deleteConversation(convId: string) {
    if (!user) return;
    setDeletingId(convId);
    const prev = items;
    setItems((arr) => arr.filter((c) => c.id !== convId));
    const { error } = await supabase
      .from("conversation_deletions")
      .insert({ conversation_id: convId, user_id: user.id });
    setDeletingId(null);
    if (error) {
      setItems(prev);
      toast.error(error.message);
    } else {
      toast.success("Konversationen är raderad.");
    }
  }

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setBusy(false);
      return;
    }
    let cancelled = false;
    setBusy(true);

    (async () => {
      try {
        // Admin messages (with related listing info fetched separately — no FK on admin_messages)
        const { data: am } = await supabase
          .from("admin_messages")
          .select("id, subject, body, is_read, created_at, related_listing_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        const amRows = (am ?? []) as Array<Omit<AdminMsgItem, "listing">>;
        const amListingIds = Array.from(new Set(amRows.map((m) => m.related_listing_id).filter((x): x is string => !!x)));
        const amListingsRes = amListingIds.length
          ? await supabase.from("listings").select("id, title, listing_images(url)").in("id", amListingIds)
          : { data: [] as Array<{ id: string; title: string; listing_images: { url: string }[] }> };
        const amListingMap = new Map((amListingsRes.data ?? []).map((l) => [l.id, l]));
        if (cancelled) return;
        setAdminMsgs(
          amRows.map((m) => ({
            ...m,
            listing: m.related_listing_id ? amListingMap.get(m.related_listing_id) ?? null : null,
          })),
        );

        const [convsRes, deletionsRes] = await Promise.all([
          supabase
            .from("conversations")
            .select("id, listing_id, buyer_id, seller_id, last_message_at, listings(title, status, price_sek, listing_images(url))")
            .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
            .order("last_message_at", { ascending: false }),
          supabase
            .from("conversation_deletions")
            .select("conversation_id")
            .eq("user_id", user.id),
        ]);
        const deletedSet = new Set((deletionsRes.data ?? []).map((d) => d.conversation_id));
        const list = ((convsRes.data ?? []) as Array<Omit<ConvSummary, "other_profile" | "other_stats" | "last_message" | "unread">>)
          .filter((c) => !deletedSet.has(c.id));
        const otherIds = Array.from(new Set(list.map((c) => (c.buyer_id === user.id ? c.seller_id : c.buyer_id))));
        const convIds = list.map((c) => c.id);

        const [profsRes, statsRes, msgsRes] = await Promise.all([
          otherIds.length
            ? supabase.from("profiles").select("id, full_name, avatar_url, is_verified").in("id", otherIds)
            : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; avatar_url: string | null; is_verified: boolean }> }),
          otherIds.length
            ? supabase.from("seller_stats").select("user_id, sold_count, average_rating").in("user_id", otherIds)
            : Promise.resolve({ data: [] as Array<{ user_id: string; sold_count: number; average_rating: number }> }),
          convIds.length
            ? supabase
                .from("messages")
                .select("conversation_id, body, sender_id, read_at, created_at")
                .in("conversation_id", convIds)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [] as Array<{ conversation_id: string; body: string; sender_id: string; read_at: string | null; created_at: string }> }),
        ]);

        const profMap = new Map((profsRes.data ?? []).map((p) => [p.id, p]));
        const statsMap = new Map((statsRes.data ?? []).map((s) => [s.user_id, s]));
        const lastByConv = new Map<string, { body: string; sender_id: string; read_at: string | null; created_at: string }>();
        for (const m of msgsRes.data ?? []) {
          if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
        }

        if (cancelled) return;
        setItems(
          list.map((c) => {
            const otherId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
            const last = lastByConv.get(c.id) ?? null;
            const unread = Boolean(last && last.sender_id !== user.id && !last.read_at);
            const s = statsMap.get(otherId);
            return {
              ...c,
              other_profile: profMap.get(otherId) ?? null,
              other_stats: s ? { sold_count: s.sold_count, average_rating: s.average_rating } : null,
              last_message: last,
              unread,
            };
          }),
        );
      } catch (err) {
        console.error("Inbox load failed:", err);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

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

  const unreadAdmin = adminMsgs.filter((m) => !m.is_read).length;
  const counts = {
    all: items.length + adminMsgs.length,
    buy: items.filter((c) => user && c.buyer_id === user.id).length,
    sell: items.filter((c) => user && c.seller_id === user.id).length,
    unread: items.filter((c) => c.unread).length + unreadAdmin,
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Inkorg" />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="font-display text-3xl mb-1">Meddelanden</h1>
        <p className="text-sm text-muted-foreground mb-5">Dina pågående dialoger om plagg.</p>

        <div className="mb-5 flex gap-1 rounded-full border border-border bg-card p-1 text-xs shadow-soft">
          {(["all", "buy", "sell", "unread"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-full py-2 font-medium transition",
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

        {/* Admin messages — show on "all" and "unread" tabs */}
        {!busy && (tab === "all" || tab === "unread") && adminMsgs.length > 0 && (
          <ul className="mb-3 space-y-2.5">
            {adminMsgs
              .filter((m) => (tab === "unread" ? !m.is_read : true))
              .map((m) => (
                <li key={m.id}>
                  <Link
                    to="/inbox/admin/$id"
                    params={{ id: m.id }}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft transition hover:shadow-card",
                      m.is_read ? "border-border" : "border-primary/40 bg-primary/5",
                    )}
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground ring-1 ring-primary/20">
                      <ShieldCheck className="h-7 w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={cn("text-sm truncate", m.is_read ? "font-medium" : "font-semibold")}>
                          ReWoke-teamet
                        </p>
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                          Officiellt
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.subject}
                        {m.listing && <> · om <span className="text-foreground/80">{m.listing.title}</span></>}
                      </p>
                      <p className={cn("mt-0.5 text-xs truncate", m.is_read ? "text-muted-foreground" : "text-foreground font-medium")}>
                        {m.body}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(m.created_at), { locale: sv, addSuffix: true })}
                      </span>
                      {!m.is_read ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-soft" />
                      ) : (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </Link>
                </li>
              ))}
          </ul>
        )}

        {busy ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : filtered.length === 0 && (tab !== "all" || adminMsgs.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
            <p className="font-display text-lg">
              {tab === "unread" ? "Inga olästa meddelanden" : "Inga konversationer ännu"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              När du chattar om ett plagg dyker det upp här.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((c) => {
              const cover = c.listings?.listing_images?.[0]?.url;
              const status = c.listings?.status;
              const badge = counterpartBadge(c.other_stats, c.other_profile?.is_verified ?? false);
              return (
                <li key={c.id} className="relative group/row">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate({ to: "/inbox/$conversationId", params: { conversationId: c.id } })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void navigate({ to: "/inbox/$conversationId", params: { conversationId: c.id } });
                      }
                    }}
                    className={cn(
                      "group flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-3 pr-12 shadow-soft transition",
                      "hover:border-primary/30 hover:shadow-card",
                      deletingId === c.id && "opacity-50",
                    )}
                  >
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-muted shrink-0 ring-1 ring-border">
                      {cover && <img src={cover} className="h-full w-full object-cover" alt="" />}
                      {status === "sold" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-[9px] font-semibold uppercase tracking-wider text-background">
                          Såld
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={cn("text-sm truncate", c.unread ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                          {c.other_profile?.full_name ?? "Användare"}
                        </p>
                        {badge === "Verifierad" && (
                          <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                        {(badge === "Betrodd" || badge === "Premium") && (
                          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                            <Sparkles className="h-2.5 w-2.5" />
                            {badge}
                          </span>
                        )}
                        {status && status !== "active" && status !== "sold" && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                            {status}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="truncate">{c.listings?.title}</span>
                        {c.listings?.price_sek != null && (
                          <>
                            <span>·</span>
                            <span className="font-medium text-foreground/80 shrink-0">{formatSEK(c.listings.price_sek)}</span>
                          </>
                        )}
                      </div>

                      {c.last_message && (
                        <p className={cn(
                          "mt-0.5 text-xs truncate",
                          c.unread ? "text-foreground font-medium" : "text-muted-foreground",
                        )}>
                          {c.last_message.sender_id === user?.id && "Du: "}
                          {c.last_message.body}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.last_message_at), { locale: sv, addSuffix: true })}
                      </span>
                      {c.unread && <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-soft" />}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteConversation(c.id);
                    }}
                    disabled={deletingId === c.id}
                    aria-label="Radera konversation"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus:opacity-100 md:opacity-0 md:group-hover/row:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
