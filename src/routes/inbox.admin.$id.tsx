import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, ShieldCheck, ExternalLink, Lock } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export const Route = createFileRoute("/inbox/admin/$id")({
  component: AdminMessagePage,
});

type AdminMsg = {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  related_listing_id: string | null;
  related_conversation_id: string | null;
  is_read: boolean;
  created_at: string;
};

type ListingHead = { id: string; title: string; price_sek: number; listing_images: { url: string }[] } | null;

function AdminMessagePage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [msg, setMsg] = useState<AdminMsg | null>(null);
  const [listing, setListing] = useState<ListingHead>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("admin_messages")
        .select("id, user_id, subject, body, related_listing_id, related_conversation_id, is_read, created_at")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setMsg(data as AdminMsg);
        if (!data.is_read && data.user_id === user.id) {
          void supabase.from("admin_messages").update({ is_read: true }).eq("id", id);
        }
        if (data.related_listing_id) {
          const { data: l } = await supabase
            .from("listings")
            .select("id, title, price_sek, listing_images(url)")
            .eq("id", data.related_listing_id)
            .maybeSingle();
          setListing((l as ListingHead) ?? null);
        }
      }
      setBusy(false);
    })();
  }, [id, user]);

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header subtitle="Meddelande" />
        <main className="mx-auto max-w-md px-4 py-12 text-center text-sm text-muted-foreground">
          Logga in för att se meddelandet.
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header subtitle="Meddelande från Rewear" />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <button
          onClick={() => navigate({ to: "/inbox" })}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Tillbaka till inkorgen
        </button>

        {busy ? (
          <div className="h-40 animate-pulse rounded-2xl bg-card" />
        ) : !msg ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            Meddelandet hittades inte.
          </div>
        ) : (
          <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            {/* Header */}
            <header className="flex items-start gap-3 border-b border-border bg-primary/5 px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-lg leading-tight">{msg.subject}</h1>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Rewear-teamet
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {format(new Date(msg.created_at), "d MMM yyyy 'kl.' HH:mm", { locale: sv })}
                </p>
              </div>
            </header>

            {/* Related listing */}
            {listing && (
              <Link
                to="/listing/$id"
                params={{ id: listing.id }}
                className="flex items-center gap-3 border-b border-border px-5 py-3 transition hover:bg-secondary/50"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border">
                  {listing.listing_images?.[0]?.url ? (
                    <img src={listing.listing_images[0].url} className="h-full w-full object-cover" alt={listing.title} />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Gäller annonsen</p>
                  <p className="truncate text-sm font-medium">{listing.title}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}

            {/* Body */}
            <div className="px-5 py-6">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{msg.body}</p>
            </div>

            {/* Locked footer */}
            <footer className="flex items-center gap-2 border-t border-border bg-muted/40 px-5 py-3 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Det här meddelandet går inte att svara på. Behöver du hjälp? Kontakta supporten.
            </footer>
          </article>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/inbox" className="underline hover:text-foreground">Till inkorgen</Link>
        </p>
      </main>
    </div>
  );
}
