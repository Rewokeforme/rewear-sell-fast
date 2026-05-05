import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  ChevronLeft,
  MoreHorizontal,
  Send,
  ShieldCheck,
  Sparkles,
  Flag,
  Ban,
  ExternalLink,
  User as UserIcon,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { formatSEK } from "@/lib/rewear";
import { buyerQuickReplies, sellerQuickReplies, detectFraudRisk } from "@/lib/quickReplies";
import { format, isToday, isYesterday } from "date-fns";
import { sv } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ReportDialog } from "@/components/ReportDialog";

export const Route = createFileRoute("/inbox/$conversationId")({
  component: ConversationPage,
});

type Msg = {
  id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type Conv = { buyer_id: string; seller_id: string; listing_id: string };

type ListingHead = {
  id: string;
  title: string;
  price_sek: number;
  status: string;
  delivery_method: string;
  seller_id: string;
  listing_images: { url: string }[];
};

type SellerStats = {
  sold_count: number;
  average_rating: number;
  first_listing_at: string | null;
};

function formatDay(d: Date) {
  if (isToday(d)) return "Idag";
  if (isYesterday(d)) return "Igår";
  return format(d, "d MMMM", { locale: sv });
}

function statusLabel(status: string) {
  if (status === "sold") return { label: "Såld", tone: "muted" as const };
  if (status === "removed") return { label: "Borttagen", tone: "muted" as const };
  return { label: "Aktiv", tone: "active" as const };
}

function badgeFor(stats: SellerStats | null, isVerified: boolean): string | null {
  if (!stats && !isVerified) return null;
  if (stats && stats.sold_count >= 25 && stats.average_rating >= 4.7) return "Premium Seller";
  if (stats && stats.sold_count >= 10) return "Betrodd säljare";
  if (isVerified) return "Verifierad profil";
  if (stats?.first_listing_at) {
    const d = new Date(stats.first_listing_at);
    if (Date.now() - d.getTime() < 1000 * 60 * 60 * 24 * 30) return "Ny säljare";
  }
  return null;
}

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [conv, setConv] = useState<Conv | null>(null);
  const [listing, setListing] = useState<ListingHead | null>(null);
  const [counterpart, setCounterpart] = useState<{ id: string; full_name: string | null; avatar_url: string | null; is_verified: boolean } | null>(null);
  const [counterpartStats, setCounterpartStats] = useState<SellerStats | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMsgId, setReportMsgId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation, listing, messages
  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("conversations")
        .select("buyer_id, seller_id, listing_id, listings(id, title, price_sek, status, delivery_method, seller_id, listing_images(url))")
        .eq("id", conversationId)
        .maybeSingle();
      if (c) {
        setConv({ buyer_id: c.buyer_id, seller_id: c.seller_id, listing_id: c.listing_id });
        setListing((c as unknown as { listings: ListingHead }).listings);
      }
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, body, read_at, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Msg[]);
    })();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages((m) => [...m, payload.new as Msg]),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const updated = payload.new as Msg;
          setMessages((m) => m.map((msg) => (msg.id === updated.id ? { ...msg, ...updated } : msg)));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Load counterpart profile + seller stats
  useEffect(() => {
    if (!conv || !user) return;
    const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
    (async () => {
      const [{ data: profile }, { data: stats }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, is_verified").eq("id", otherId).maybeSingle(),
        supabase.from("seller_stats").select("sold_count, average_rating, first_listing_at").eq("user_id", otherId).maybeSingle(),
      ]);
      if (profile) setCounterpart(profile as typeof counterpart);
      setCounterpartStats((stats as SellerStats | null) ?? null);
    })();
  }, [conv, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Mark incoming as read (and optimistically update locally)
  useEffect(() => {
    if (!user || messages.length === 0) return;
    const unreadIds = messages.filter((m) => m.sender_id !== user.id && !m.read_at).map((m) => m.id);
    if (unreadIds.length === 0) return;
    const now = new Date().toISOString();
    setMessages((arr) => arr.map((m) => (unreadIds.includes(m.id) ? { ...m, read_at: now } : m)));
    void supabase.from("messages").update({ read_at: now }).in("id", unreadIds);
  }, [user, messages]);

  const isSeller = useMemo(() => Boolean(conv && user && conv.seller_id === user.id), [conv, user]);
  const quickReplies = isSeller ? sellerQuickReplies : buyerQuickReplies;

  const fraud = useMemo(() => detectFraudRisk(body), [body]);

  async function sendBody(text: string) {
    if (!user || !text.trim() || !conv) return;
    const risk = detectFraudRisk(text);
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: text.trim(),
      flagged: risk.risky,
      flag_reason: risk.reason,
    });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body;
    setBody("");
    await sendBody(text);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Desktop: Enter sends. Mobile (where shiftKey is rarely available) keeps newline.
    const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
    if (e.key === "Enter" && !e.shiftKey && isDesktop) {
      e.preventDefault();
      void send(e as unknown as React.FormEvent);
    }
  }

  function reportConversation() {
    setMenuOpen(false);
    if (!user) return;
    setReportOpen(true);
  }

  async function submitReport(reason: string) {
    if (!user) return;
    const { error } = await supabase.from("user_reports").insert({
      reporter_id: user.id,
      reported_conversation_id: conversationId,
      reason,
    });
    if (error) toast.error(error.message);
    else toast.success("Tack — rapporten är skickad.");
  }

  async function submitMessageReport(reason: string) {
    if (!user || !reportMsgId) return;
    const { error } = await supabase.from("user_reports").insert({
      reporter_id: user.id,
      reported_conversation_id: conversationId,
      reported_message_id: reportMsgId,
      reason,
    });
    if (error) toast.error(error.message);
    else toast.success("Tack — meddelandet har rapporterats.");
    setReportMsgId(null);
  }

  async function blockUser() {
    setMenuOpen(false);
    if (!user || !counterpart) return;
    if (!window.confirm(`Blockera ${counterpart.full_name ?? "användaren"}?`)) return;
    const { error } = await supabase.from("user_blocks").insert({
      blocker_id: user.id,
      blocked_id: counterpart.id,
    });
    if (error) toast.error(error.message);
    else toast.success("Användaren är blockerad.");
  }

  async function deleteConversation() {
    setMenuOpen(false);
    if (!user) return;
    if (!window.confirm("Radera denna konversation från din inkorg? Den dyker upp igen om motparten skickar ett nytt meddelande.")) return;
    const { error } = await supabase
      .from("conversation_deletions")
      .insert({ conversation_id: conversationId, user_id: user.id });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Konversationen är raderad.");
      void navigate({ to: "/inbox" });
    }
  }
  // Group messages by day
  const groups = useMemo(() => {
    const out: { day: string; items: Msg[] }[] = [];
    for (const m of messages) {
      const day = formatDay(new Date(m.created_at));
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [messages]);

  const status = listing ? statusLabel(listing.status) : null;
  const sellerBadge = badgeFor(counterpartStats, counterpart?.is_verified ?? false);
  const showLocalSafety = listing?.delivery_method === "pickup" || listing?.delivery_method === "both";

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <Header subtitle="Meddelanden" />

      {/* Sticky product card */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-[760px] px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/inbox" className="-ml-1 rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground">
              <ChevronLeft className="h-5 w-5" />
            </Link>

            {listing && (
              <div className="flex flex-1 items-center gap-3 min-w-0">
                <Link
                  to="/listing/$id"
                  params={{ id: listing.id }}
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border"
                >
                  {listing.listing_images?.[0]?.url ? (
                    <img src={listing.listing_images[0].url} className="h-full w-full object-cover" alt={listing.title} />
                  ) : null}
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to="/listing/$id"
                      params={{ id: listing.id }}
                      className="font-display text-base leading-tight truncate hover:underline"
                    >
                      {listing.title}
                    </Link>
                    {status && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          status.tone === "active"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {status.label}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    <span className="font-medium text-foreground">{formatSEK(listing.price_sek)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground truncate">
                      {isSeller ? "Köpare: " : "Säljare: "}
                      {counterpart?.full_name ?? "Användare"}
                    </span>
                    {sellerBadge && !isSeller && (
                      <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                        <Sparkles className="h-3 w-3" />
                        {sellerBadge}
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  to="/listing/$id"
                  params={{ id: listing.id }}
                  className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-secondary"
                >
                  Visa annons
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Mer"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-card">
                    {listing && (
                      <Link
                        to="/listing/$id"
                        params={{ id: listing.id }}
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-secondary"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        Visa annons
                      </Link>
                    )}
                    {counterpart && (
                      <Link
                        to="/profile/$userId"
                        params={{ userId: counterpart.id }}
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-secondary"
                      >
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        {isSeller ? "Visa köparprofil" : "Visa säljarprofil"}
                      </Link>
                    )}
                    <button
                      onClick={reportConversation}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-secondary"
                    >
                      <Flag className="h-4 w-4 text-muted-foreground" />
                      Rapportera konversation
                    </button>
                    <button
                      onClick={blockUser}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-destructive hover:bg-secondary"
                    >
                      <Ban className="h-4 w-4" />
                      Blockera användare
                    </button>
                    <div className="border-t border-border" />
                    <button
                      onClick={deleteConversation}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-destructive hover:bg-secondary"
                    >
                      <Trash2 className="h-4 w-4" />
                      Radera konversation
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Trust row */}
          <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
            <p className="leading-relaxed">
              För din trygghet: håll kommunikationen och affären i Rewear.
              {showLocalSafety && (
                <> Dela aldrig exakt adress direkt — bestäm mötesplats i chatten och träffas gärna på offentlig plats.</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[760px] px-4 py-6">
          {messages.length === 0 ? (
            <div className="mx-auto mt-12 max-w-sm rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg">Starta dialogen om plagget</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Fråga om skick, passform, fler bilder eller leverans.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((g) => (
                <div key={g.day} className="space-y-1.5">
                  <p className="text-center text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    {g.day}
                  </p>
                  {g.items.map((m, i) => {
                    const mine = m.sender_id === user?.id;
                    const prev = g.items[i - 1];
                    const grouped = prev && prev.sender_id === m.sender_id;
                    const senderName = mine
                      ? "Du"
                      : counterpart?.full_name ?? "Användare";
                    return (
                      <div key={m.id} className={cn("group/msg flex flex-col", mine ? "items-end" : "items-start", grouped ? "mt-0.5" : "mt-3")}>
                        {!grouped && (
                          <p className={cn("px-1 pb-1 text-[11px] font-medium text-muted-foreground", mine ? "text-right" : "text-left")}>
                            {senderName}
                          </p>
                        )}
                        <div className={cn("flex max-w-[75%] flex-col", mine ? "items-end" : "items-start")}>
                          <div className={cn("flex items-center gap-1.5", mine ? "flex-row-reverse" : "flex-row")}>
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2.5 text-sm leading-snug shadow-soft",
                                mine
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-card text-card-foreground border border-border rounded-bl-md",
                              )}
                            >
                              <p className="whitespace-pre-wrap break-words">{m.body}</p>
                            </div>
                            {!mine && (
                              <button
                                type="button"
                                onClick={() => setReportMsgId(m.id)}
                                aria-label="Rapportera meddelande"
                                className="opacity-0 transition group-hover/msg:opacity-100 focus:opacity-100 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                              >
                                <Flag className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="mt-1 px-1 text-[10px] text-muted-foreground">
                            {format(new Date(m.created_at), "HH:mm")}
                            {mine && (m.read_at ? " · Läst" : " · Skickat")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick replies */}
      <div className="border-t border-border bg-background">
        <div className="mx-auto max-w-[760px] px-4 pt-3">
          <p className="text-eyebrow mb-2 text-muted-foreground">Snabba frågor</p>
          <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2 pb-2">
              {quickReplies.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void sendBody(q)}
                  className="shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-secondary"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Anti-fraud warning */}
        {fraud.risky && (
          <div className="mx-auto max-w-[760px] px-4">
            <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[11px] text-foreground">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
              <p>För din trygghet rekommenderar vi att du håller kommunikationen och affären i Rewear.</p>
            </div>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={send}
          className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
        >
          <div className="mx-auto flex max-w-[760px] items-end gap-2">
            <div className="flex-1 rounded-2xl border border-border bg-card px-4 py-2 shadow-soft focus-within:border-ring transition">
              <textarea
                ref={inputRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder="Skriv ett meddelande…"
                className="w-full resize-none bg-transparent text-sm leading-snug outline-none placeholder:text-muted-foreground max-h-32"
              />
            </div>
            <button
              type="submit"
              disabled={!body.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Skicka meddelande"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        title="Rapportera konversation"
        description="Berätta kort vad som är fel — vårt team granskar alla rapporter och kan vidta åtgärder."
        presets={[
          "Bedrägeriförsök",
          "Vill betala utanför Rewear",
          "Trakasserier",
          "Spam",
          "Olämpligt språk",
          "Annat",
        ]}
        onSubmit={submitReport}
      />
      <ReportDialog
        open={Boolean(reportMsgId)}
        onOpenChange={(o) => { if (!o) setReportMsgId(null); }}
        title="Rapportera meddelande"
        description="Berätta kort varför detta specifika meddelande bryter mot reglerna."
        presets={[
          "Bedrägeriförsök",
          "Försöker flytta affären utanför Rewear",
          "Trakasserier",
          "Spam",
          "Olämpligt språk",
          "Annat",
        ]}
        onSubmit={submitMessageReport}
      />
    </div>
  );
}
