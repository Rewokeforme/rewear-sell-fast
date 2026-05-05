import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { markAllNotificationsRead, type NotificationRow } from "@/lib/notifications";
import { Bell, MessageCircle, Package, ShieldCheck, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setItems((data as NotificationRow[]) ?? []);
      setBusy(false);
      await markAllNotificationsRead(user.id);
    })();
  }, [user]);

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header subtitle="Notiser" />
        <main className="mx-auto max-w-md px-4 py-12 text-center text-sm text-muted-foreground">
          Logga in för att se dina notiser.{" "}
          <Link to="/login" className="text-primary underline">Logga in</Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Notiser" />
      <main className="mx-auto max-w-2xl px-4 py-4">
        <h1 className="font-display text-2xl mb-4">Notiser</h1>
        {busy ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 font-display text-lg">Inga notiser ännu</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Följ säljare så får du veta när de lägger upp nya plagg.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => {
              const isAdminReply = n.type === "admin_reply";
              return (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      if (isAdminReply && n.related_conversation_id) {
                        // For admin replies, related_conversation_id stores the admin_messages.id
                        navigate({ to: "/inbox/admin/$id", params: { id: n.related_conversation_id } });
                      } else if (n.related_conversation_id) {
                        navigate({ to: "/inbox/$conversationId", params: { conversationId: n.related_conversation_id } });
                      } else if (n.related_listing_id) {
                        navigate({ to: "/listing/$id", params: { id: n.related_listing_id } });
                      } else if (n.related_user_id) {
                        navigate({ to: "/profile/$userId", params: { userId: n.related_user_id } });
                      }
                    }}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:bg-secondary ${
                      isAdminReply
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isAdminReply ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                      }`}
                    >
                      {isAdminReply ? (
                        <ShieldCheck className="h-4 w-4" />
                      ) : n.type === "new_message" ? (
                        <MessageCircle className="h-4 w-4" />
                      ) : n.type === "new_follower" ? (
                        <UserPlus className="h-4 w-4" />
                      ) : (
                        <Package className="h-4 w-4" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{n.title}</p>
                        {isAdminReply && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">
                            Rewear-teamet
                          </span>
                        )}
                      </div>
                      {n.body && (
                        <p className={`text-xs ${isAdminReply ? "mt-1 text-foreground/80 line-clamp-3" : "line-clamp-1 text-muted-foreground"}`}>
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { locale: sv, addSuffix: true })}
                      </p>
                    </div>
                    {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}
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
