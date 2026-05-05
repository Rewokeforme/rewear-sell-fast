import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, Send } from "lucide-react";
import { formatSEK } from "@/lib/rewear";

export const Route = createFileRoute("/inbox/$conversationId")({
  component: ConversationPage,
});

type Msg = { id: string; sender_id: string; body: string; created_at: string };

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [listing, setListing] = useState<{ id: string; title: string; price_sek: number; listing_images: { url: string }[] } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: conv } = await supabase
        .from("conversations")
        .select("listing_id, listings(id, title, price_sek, listing_images(url))")
        .eq("id", conversationId)
        .maybeSingle();
      if (conv) setListing((conv as unknown as { listings: typeof listing }).listings);

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
        (payload) => {
          setMessages((m) => [...m, payload.new as Msg]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !body.trim()) return;
    const text = body.trim();
    setBody("");
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: text,
    });
  }

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
                <p className="text-xs text-muted-foreground">{formatSEK(listing.price_sek)}</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-2">
          {messages.map((m) => {
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
                  {m.body}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={send} className="border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
