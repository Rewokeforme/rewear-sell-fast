import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatSEK } from "@/lib/rewear";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type AdminListing = {
  id: string;
  title: string;
  price_sek: number;
  status: string;
  created_at: string;
  seller_id: string;
  profiles: { full_name: string | null } | null;
};
type AdminUser = { id: string; full_name: string | null; city: string | null; is_verified: boolean; rewear_score: number };
type AdminReport = { id: string; reason: string; status: string; created_at: string; listing_id: string };

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<"listings" | "users" | "reports" | "stats">("listings");
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [stats, setStats] = useState({ totalListings: 0, sold: 0, users: 0, totalCo2: 0 });

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [l, u, r, sold, totalListings, totalUsers, co2] = await Promise.all([
        supabase.from("listings").select("id, title, price_sek, status, created_at, seller_id, profiles(full_name)").order("created_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("id, full_name, city, is_verified, rewear_score").order("created_at", { ascending: false }).limit(50),
        supabase.from("reports").select("id, reason, status, created_at, listing_id").order("created_at", { ascending: false }),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "sold"),
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("co2_saved_kg").eq("status", "sold"),
      ]);
      setListings(((l.data ?? []) as unknown) as AdminListing[]);
      setUsers((u.data ?? []) as AdminUser[]);
      setReports((r.data ?? []) as AdminReport[]);
      setStats({
        totalListings: totalListings.count ?? 0,
        sold: sold.count ?? 0,
        users: totalUsers.count ?? 0,
        totalCo2: ((co2.data ?? []) as Array<{ co2_saved_kg: number }>).reduce((a, b) => a + Number(b.co2_saved_kg ?? 0), 0),
      });
    })();
  }, [isAdmin]);

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header />
        <main className="mx-auto max-w-md px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">Endast admin har tillgång.</p>
          <Link to="/" className="mt-4 inline-block text-primary underline">Till hem</Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  async function deleteListing(id: string) {
    if (!confirm("Ta bort annons?")) return;
    const { error } = await supabase.from("listings").update({ status: "removed" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Borttagen");
    setListings((p) => p.map((l) => (l.id === id ? { ...l, status: "removed" } : l)));
  }

  async function toggleVerified(id: string, current: boolean) {
    const { error } = await supabase.from("profiles").update({ is_verified: !current }).eq("id", id);
    if (error) return toast.error(error.message);
    setUsers((p) => p.map((u) => (u.id === id ? { ...u, is_verified: !current } : u)));
  }

  async function resolveReport(id: string) {
    const { error } = await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
    if (error) return toast.error(error.message);
    setReports((p) => p.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)));
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Admin" />
      <main className="mx-auto max-w-3xl px-4 py-4">
        <h1 className="font-display text-2xl mb-4">Adminpanel</h1>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {(["listings", "users", "reports", "stats"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium ${tab === t ? "border-foreground bg-foreground text-background" : "border-border"}`}
            >
              {t === "listings" ? "Annonser" : t === "users" ? "Användare" : t === "reports" ? "Rapporter" : "Statistik"}
            </button>
          ))}
        </div>

        {tab === "stats" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Användare" value={stats.users} />
            <Stat label="Annonser totalt" value={stats.totalListings} />
            <Stat label="Sålda" value={stats.sold} />
            <Stat label="CO₂ sparad (kg)" value={Math.round(stats.totalCo2)} />
          </div>
        )}

        {tab === "listings" && (
          <ul className="space-y-2">
            {listings.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm">
                <Link to="/listing/$id" params={{ id: l.id }} className="flex-1 min-w-0">
                  <p className="font-medium truncate">{l.title}</p>
                  <p className="text-xs text-muted-foreground">{l.profiles?.full_name ?? "?"} · {formatSEK(l.price_sek)} · {l.status}</p>
                </Link>
                {l.status !== "removed" && (
                  <button onClick={() => deleteListing(l.id)} className="rounded-full border border-destructive/30 px-3 py-1 text-xs text-destructive">Ta bort</button>
                )}
              </li>
            ))}
          </ul>
        )}

        {tab === "users" && (
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm">
                <Link to="/profile/$userId" params={{ userId: u.id }} className="flex-1 min-w-0">
                  <p className="font-medium truncate">{u.full_name ?? "?"}</p>
                  <p className="text-xs text-muted-foreground">{u.city ?? "—"} · Score {u.rewear_score}</p>
                </Link>
                <button
                  onClick={() => toggleVerified(u.id, u.is_verified)}
                  className={`rounded-full border px-3 py-1 text-xs ${u.is_verified ? "border-primary text-primary" : "border-border"}`}
                >
                  {u.is_verified ? "Verifierad" : "Verifiera"}
                </button>
              </li>
            ))}
          </ul>
        )}

        {tab === "reports" && (
          <ul className="space-y-2">
            {reports.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Inga rapporter.</p> : reports.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm">
                <Link to="/listing/$id" params={{ id: r.listing_id }} className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.reason}</p>
                  <p className="text-xs text-muted-foreground">{r.status}</p>
                </Link>
                {r.status !== "resolved" && (
                  <button onClick={() => resolveReport(r.id)} className="rounded-full border border-border px-3 py-1 text-xs">Lös</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-eyebrow text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}
