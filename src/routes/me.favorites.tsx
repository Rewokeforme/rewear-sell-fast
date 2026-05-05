import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ListingCard } from "@/components/ListingCard";
import type { ListingWithDetails } from "@/lib/database.types";

export const Route = createFileRoute("/me/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ListingWithDetails[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("favorites")
        .select("listing_id, listings(*, listing_images(*), profiles(id,full_name,city,avatar_url,rewear_score,is_verified), categories(slug,name_sv))")
        .eq("user_id", user.id);
      setItems(((data ?? []) as Array<{ listings: ListingWithDetails | null }>).map((d) => d.listings).filter(Boolean) as ListingWithDetails[]);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Sparade" />
      <main className="mx-auto max-w-2xl px-4 py-4">
        <h1 className="font-display text-2xl mb-4">Sparade</h1>
        {items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Inga sparade plagg än.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
