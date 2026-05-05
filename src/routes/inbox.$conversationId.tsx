import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, Flag, Send } from "lucide-react";
import { formatSEK } from "@/lib/rewear";
import { buyerQuickReplies, sellerQuickReplies } from "@/lib/quickReplies";
import { format, isToday, isYesterday } from "date-fns";
import { sv } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/inbox/$conversationId")({
  component: ConversationPage,
});

type Msg = { id: string; sender_id: string; body: string; read_at: string | null; created_at: string };
type Conv = { buyer_id: string; seller_id: string; listing_id: string };
type ListingHead = { id: string; title: string; price_sek: number; status: string; listing_images: { url: string }[] };

function formatDay(d: Date) {
  if (isToday(d)) return "Idag";
  if (isYesterday(d)) return "Igår";
  return format(d, "d MMM", { locale: sv });
}

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [conv, setConv] = useState<Conv | null>(null);
  const [listing, setListing] = useState<ListingHead | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("conversations")
        .select("buyer_id, seller_id, listing_id, listings(id, title, price_sek, status, listing_images(url))")
        .eq("id", conversationId)
        .maybeSingle();
      if (c) {
        setConv({ buyer_id: c.buyer_id, seller_id: c.seller_id, listing_id: c.listing_id });
        setListing((c as unknown as { listings: ListingHead }).listings);
      }
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
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
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Mark incoming messages as read
  useEffect(() => {
    if (!user || messages.length === 0) return;
    const unreadIds = messages.filter((m) => m.sender_id !== user.id && !m.read_at).map((m) => m.id);
    if (unreadIds.length === 0) return;
    void supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
  }, [user, messages]);

  const isSeller = useMemo(() => conv && user && conv.seller_id === user.id, [conv, user]);
  const quickReplies = isSeller ? sellerQuickReplies : buyerQuickReplies;

  async function sendBody(text: string) {
    if (!user || !text.trim() || !conv) return;
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: text.trim(),
    });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body;
    setBody("");
    await sendBody(text);
  }

  async function reportConversation() {
    if (!user) return;
    const reason = window.prompt("Beskriv kort varför du rapporterar:");
    if (!reason) return;
    const { error } = await supabase.from("user_reports").insert({
      reporter_id: user.id,
      reported_conversation_id: conversationId,
      reason,
    });
    if (error) toast.error(error.message);
    else toast.success("Tack — rapporten är skickad.");
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

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <Header subtitle="Chatt" />
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2">
          <Link to="/inbox" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          {listing && (
            <Link to="/listing/$id" params={{ id: listing.id }} className="flex flex-1 items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
                {listing.listing_images?.[0]?.url && (
                  <img src={listing.listing_images[0].url} className="h-full w-full object-cover" alt="" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{listing.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatSEK(listing.price_sek)}</span>
                  {listing.status !== "active" && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase">
                      {listing.status === "sold" ? "Såld" : listing.status}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )}
          <button
            onClick={reportConversation}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Rapportera konversation"
          >
            <Flag className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {groups.map((g) => (
            <div key={g.day} className="space-y-2">
              <p className="text-center text-[10px] uppercase tracking-wide text-muted-foreground">{g.day}</p>
              {g.items.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        mine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card border border-border rounded-bl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-line">{m.body}</p>
                      <p className={`mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
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
      </div>

      {/* Quick replies */}
      <div className="border-t border-border bg-background px-3 pt-2">
        <div className="mx-auto max-w-2xl overflow-x-auto scrollbar-none">
          <div className="flex gap-2 pb-2">
            {quickReplies.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void sendBody(q)}
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs transition hover:bg-secondary"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form
        onSubmit={send}
        className="border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Skriv ett meddelande…"
            className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-ring"
          />
          <button
            type="submit"
            disabled={!body.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
