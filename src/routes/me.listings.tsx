import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ListingCard } from "@/components/ListingCard";
import type { ListingWithDetails } from "@/lib/database.types";
import { toast } from "sonner";

export const Route = createFileRoute("/me/listings")({
  component: MyListingsPage,
});

function MyListingsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ListingWithDetails[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("listings")
      .select("*, listing_images(*), profiles(id,full_name,city,avatar_url,rewear_score,is_verified), categories(slug,name_sv)")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as unknown as ListingWithDetails[]) ?? []));
  }, [user]);

  async function markSold(id: string) {
    const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Markerad som såld");
    setItems((p) => p.map((l) => (l.id === id ? { ...l, status: "sold" as const } : l)));
  }

  async function remove(id: string) {
    if (!confirm("Ta bort annons?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((p) => p.filter((l) => l.id !== id));
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Mina annonser" />
      <main className="mx-auto max-w-2xl px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-2xl">Mina annonser</h1>
          <Link to="/sell" className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground">+ Ny</Link>
        </div>
        {items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Du har inga annonser än.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((l) => (
              <div key={l.id} className="space-y-2">
                <div className="relative">
                  <ListingCard listing={l} />
                  {l.status !== "active" && (
                    <span className="absolute right-2 top-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] uppercase tracking-wider text-background">
                      {l.status === "sold" ? "Såld" : "Borttagen"}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {l.status === "active" && (
                    <button onClick={() => markSold(l.id)} className="flex-1 rounded-full border border-border px-2 py-1 text-[11px]">
                      Markera såld
                    </button>
                  )}
                  <button onClick={() => remove(l.id)} className="flex-1 rounded-full border border-destructive/30 px-2 py-1 text-[11px] text-destructive">
                    Ta bort
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
