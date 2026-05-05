import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function useFollow(sellerId: string | null | undefined) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !sellerId || user.id === sellerId) {
      setFollowing(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("seller_id", sellerId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setFollowing(Boolean(data));
      });
    return () => {
      cancelled = true;
    };
  }, [user, sellerId]);

  const toggle = useCallback(async () => {
    if (!user) {
      toast.info("Logga in för att följa säljare");
      return;
    }
    if (!sellerId || user.id === sellerId) return;
    setBusy(true);
    try {
      if (following) {
        await supabase.from("follows").delete().eq("follower_id", user.id).eq("seller_id", sellerId);
        setFollowing(false);
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: user.id, seller_id: sellerId });
        if (error) throw error;
        setFollowing(true);
        toast.success("Du följer nu säljaren");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Något gick fel";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [user, sellerId, following]);

  const canFollow = Boolean(user && sellerId && user.id !== sellerId);

  return { following, toggle, busy, canFollow };
}
