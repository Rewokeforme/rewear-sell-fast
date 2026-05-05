import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type NotificationRow = {
  id: string;
  user_id: string;
  type: "new_listing" | "new_message" | "new_follower" | "system";
  title: string;
  body: string | null;
  related_listing_id: string | null;
  related_user_id: string | null;
  related_conversation_id: string | null;
  is_read: boolean;
  created_at: string;
};

export function useUnreadNotifications() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { count: c } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (!cancelled) setCount(c ?? 0);
    };
    void load();
    const channel = supabase
      .channel(`notif-count:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
}

export async function markAllNotificationsRead(userId: string) {
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
}
