import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatSEK } from "@/lib/rewear";
import { AdminReplyDialog } from "@/components/AdminReplyDialog";
import { Flag, MessageSquare, Reply, ShieldCheck, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

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
type AdminUser = {
  id: string;
  full_name: string | null;
  city: string | null;
  is_verified: boolean;
  identity_verified: boolean;
  is_suspended: boolean;
  rewear_score: number;
};

type ReporterProfile = { id: string; full_name: string | null } | null;

type ListingReport = {
  kind: "listing";
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_id: string;
  listing_id: string;
  admin_response: string | null;
  responded_at: string | null;
  reporter: ReporterProfile;
  listing: { id: string; title: string } | null;
};

type ConversationReport = {
  kind: "conversation";
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_id: string;
  reported_conversation_id: string | null;
  reported_user_id: string | null;
  admin_response: string | null;
  responded_at: string | null;
  reporter: ReporterProfile;
};

type AnyReport = ListingReport | ConversationReport;

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const [tab, setTab] = useState<"reports" | "listings" | "users" | "stats">("reports");
  const [reportTab, setReportTab] = useState<"listing" | "conversation">("listing");
  const [reportFilter, setReportFilter] = useState<"open" | "resolved" | "all">("open");

  const [listings, setListings] = useState<AdminListing[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listingReports, setListingReports] = useState<ListingReport[]>([]);
  const [convReports, setConvReports] = useState<ConversationReport[]>([]);
  const [stats, setStats] = useState({ totalListings: 0, sold: 0, users: 0, totalCo2: 0 });

  const [replyTarget, setReplyTarget] = useState<AnyReport | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function loadAll() {
    const [l, u, lr, cr, sold, totalListings, totalUsers, co2] = await Promise.all([
      supabase.from("listings").select("id, title, price_sek, status, created_at, seller_id, profiles(full_name)").order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("id, full_name, city, is_verified, identity_verified, is_suspended, rewear_score").order("created_at", { ascending: false }).limit(50),
      supabase
        .from("reports")
        .select("id, reason, status, created_at, reporter_id, listing_id, admin_response, responded_at, reporter:profiles!reports_reporter_id_fkey(id, full_name), listing:listings!reports_listing_id_fkey(id, title)")
        .order("created_at", { ascending: false }),
      supabase
        .from("user_reports")
        .select("id, reason, status, created_at, reporter_id, reported_conversation_id, reported_user_id, admin_response, responded_at, reporter:profiles!user_reports_reporter_id_fkey(id, full_name)")
        .order("created_at", { ascending: false }),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "sold"),
      supabase.from("listings").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("listings").select("co2_saved_kg").eq("status", "sold"),
    ]);
    setListings(((l.data ?? []) as unknown) as AdminListing[]);
    setUsers((u.data ?? []) as AdminUser[]);
    setListingReports(
      ((lr.data ?? []) as unknown[]).map((r) => ({ kind: "listing", ...(r as object) })) as ListingReport[],
    );
    setConvReports(
      ((cr.data ?? []) as unknown[]).map((r) => ({ kind: "conversation", ...(r as object) })) as ConversationReport[],
    );
    setStats({
      totalListings: totalListings.count ?? 0,
      sold: sold.count ?? 0,
      users: totalUsers.count ?? 0,
      totalCo2: ((co2.data ?? []) as Array<{ co2_saved_kg: number }>).reduce((a, b) => a + Number(b.co2_saved_kg ?? 0), 0),
    });
  }

  const openListingCount = useMemo(() => listingReports.filter((r) => r.status !== "resolved").length, [listingReports]);
  const openConvCount = useMemo(() => convReports.filter((r) => r.status !== "resolved").length, [convReports]);
  const openTotal = openListingCount + openConvCount;

  const visibleReports: AnyReport[] = useMemo(() => {
    const base = reportTab === "listing" ? listingReports : convReports;
    return base.filter((r) => {
      if (reportFilter === "all") return true;
      if (reportFilter === "open") return r.status !== "resolved";
      return r.status === "resolved";
    });
  }, [reportTab, reportFilter, listingReports, convReports]);

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

  async function toggleIdentityVerified(id: string, current: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({
        identity_verified: !current,
        identity_provider: !current ? "manual" : null,
        identity_verified_at: !current ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setUsers((p) => p.map((u) => (u.id === id ? { ...u, identity_verified: !current } : u)));
    toast.success(!current ? "Markerad som ID-verifierad" : "ID-verifiering borttagen");
  }

  async function toggleSuspended(id: string, current: boolean) {
    if (!current && !confirm("Stänga av användaren? De kommer inte kunna logga in på vissa funktioner.")) return;
    const { error } = await supabase.from("profiles").update({ is_suspended: !current }).eq("id", id);
    if (error) return toast.error(error.message);
    setUsers((p) => p.map((u) => (u.id === id ? { ...u, is_suspended: !current } : u)));
    toast.success(!current ? "Användaren avstängd" : "Avstängning hävd");
  }

  async function dismissReport(report: AnyReport) {
    const table = report.kind === "listing" ? "reports" : "user_reports";
    const status = report.kind === "listing" ? "dismissed" : "dismissed";
    const { error } = await supabase.from(table).update({ status }).eq("id", report.id);
    if (error) return toast.error(error.message);
    toast.success("Rapport avfärdad");
    if (report.kind === "listing") {
      setListingReports((p) => p.map((r) => (r.id === report.id ? { ...r, status } : r)));
    } else {
      setConvReports((p) => p.map((r) => (r.id === report.id ? { ...r, status } : r)));
    }
  }

  async function submitReply(reply: string) {
    if (!replyTarget || !user) return;
    const now = new Date().toISOString();

    if (replyTarget.kind === "listing") {
      const { error: upErr } = await supabase
        .from("reports")
        .update({ admin_response: reply, responded_by: user.id, responded_at: now, status: "resolved" })
        .eq("id", replyTarget.id);
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      const { data: adminMsg, error: amErr } = await supabase
        .from("admin_messages")
        .insert({
          user_id: replyTarget.reporter_id,
          sent_by: user.id,
          subject: "Svar från Rewear-teamet",
          body: reply,
          related_listing_id: replyTarget.listing_id,
          related_report_id: replyTarget.id,
        })
        .select("id")
        .maybeSingle();
      if (amErr) {
        toast.error(amErr.message);
        return;
      }
      const { error: nErr } = await supabase.from("notifications").insert({
        user_id: replyTarget.reporter_id,
        type: "admin_reply",
        title: "Svar från Rewear-teamet",
        body: reply,
        related_listing_id: replyTarget.listing_id,
        related_conversation_id: adminMsg?.id ?? null,
      });
      if (nErr) {
        toast.error(nErr.message);
        return;
      }
      setListingReports((p) =>
        p.map((r) =>
          r.id === replyTarget.id
            ? { ...r, status: "resolved", admin_response: reply, responded_at: now }
            : r,
        ),
      );
    } else {
      const { error: upErr } = await supabase
        .from("user_reports")
        .update({ admin_response: reply, responded_by: user.id, responded_at: now, status: "resolved" })
        .eq("id", replyTarget.id);
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      const { data: adminMsg, error: amErr } = await supabase
        .from("admin_messages")
        .insert({
          user_id: replyTarget.reporter_id,
          sent_by: user.id,
          subject: "Svar från Rewear-teamet",
          body: reply,
          related_conversation_id: replyTarget.reported_conversation_id,
          related_user_id: replyTarget.reported_user_id,
          related_report_id: replyTarget.id,
        })
        .select("id")
        .maybeSingle();
      if (amErr) {
        toast.error(amErr.message);
        return;
      }
      const { error: nErr } = await supabase.from("notifications").insert({
        user_id: replyTarget.reporter_id,
        type: "admin_reply",
        title: "Svar från Rewear-teamet",
        body: reply,
        related_conversation_id: adminMsg?.id ?? null,
        related_user_id: replyTarget.reported_user_id,
      });
      if (nErr) {
        toast.error(nErr.message);
        return;
      }
      setConvReports((p) =>
        p.map((r) =>
          r.id === replyTarget.id
            ? { ...r, status: "resolved", admin_response: reply, responded_at: now }
            : r,
        ),
      );
    }
    toast.success("Svar skickat — landar i användarens inkorg");
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Admin" />
      <main className="mx-auto max-w-3xl px-4 py-4">
        <h1 className="font-display text-2xl mb-4">Adminpanel</h1>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {(["reports", "listings", "users", "stats"] as const).map((t) => {
            const active = tab === t;
            const label = t === "reports" ? "Rapporter" : t === "listings" ? "Annonser" : t === "users" ? "Användare" : "Statistik";
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                  active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-secondary"
                }`}
              >
                {label}
                {t === "reports" && openTotal > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-background/20 text-background" : "bg-accent text-accent-foreground"}`}>
                    {openTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {tab === "stats" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Användare" value={stats.users} />
            <Stat label="Annonser totalt" value={stats.totalListings} />
            <Stat label="Sålda" value={stats.sold} />
            <Stat label="CO₂ sparad (kg)" value={Math.round(stats.totalCo2)} />
          </div>
        )}

        {tab === "reports" && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full border border-border bg-card p-1">
                <SubTab
                  active={reportTab === "listing"}
                  onClick={() => setReportTab("listing")}
                  label="Annonser"
                  count={openListingCount}
                />
                <SubTab
                  active={reportTab === "conversation"}
                  onClick={() => setReportTab("conversation")}
                  label="Konversationer"
                  count={openConvCount}
                />
              </div>
              <div className="inline-flex rounded-full border border-border bg-card p-1">
                {(["open", "resolved", "all"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setReportFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      reportFilter === f ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "open" ? "Öppna" : f === "resolved" ? "Besvarade" : "Alla"}
                  </button>
                ))}
              </div>
            </div>

            {visibleReports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="mt-3 font-display text-lg">Inga rapporter</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {reportFilter === "open"
                    ? "Allt är hanterat — bra jobbat!"
                    : "Inget att visa här just nu."}
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {visibleReports.map((r) => (
                  <li key={`${r.kind}-${r.id}`} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                        {r.kind === "listing" ? <Flag className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-eyebrow text-muted-foreground">
                            {r.kind === "listing" ? "Annonsrapport" : "Konversationsrapport"}
                          </span>
                          <StatusPill status={r.status} />
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(r.created_at), { locale: sv, addSuffix: true })}
                          </span>
                        </div>

                        <p className="mt-1.5 text-sm text-foreground">{r.reason}</p>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            Rapporterad av{" "}
                            {r.reporter ? (
                              <Link to="/profile/$userId" params={{ userId: r.reporter.id }} className="text-foreground hover:underline">
                                {r.reporter.full_name ?? "Användare"}
                              </Link>
                            ) : (
                              "okänd"
                            )}
                          </span>
                          {r.kind === "listing" && r.listing && (
                            <>
                              <span>·</span>
                              <Link to="/listing/$id" params={{ id: r.listing.id }} className="text-primary hover:underline">
                                Visa annons
                              </Link>
                            </>
                          )}
                          {r.kind === "conversation" && r.reported_conversation_id && (
                            <>
                              <span>·</span>
                              <Link
                                to="/inbox/$conversationId"
                                params={{ conversationId: r.reported_conversation_id }}
                                className="text-primary hover:underline"
                              >
                                Visa konversation
                              </Link>
                            </>
                          )}
                        </div>

                        {r.admin_response && (
                          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              <ShieldCheck className="h-3 w-3" /> Ditt svar
                              {r.responded_at && (
                                <span className="font-normal text-muted-foreground normal-case tracking-normal">
                                  · {formatDistanceToNow(new Date(r.responded_at), { locale: sv, addSuffix: true })}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm leading-relaxed text-foreground">{r.admin_response}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {r.status !== "resolved" && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                        <button
                          onClick={() => setReplyTarget(r)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-soft transition hover:bg-primary/90"
                        >
                          <Reply className="h-3.5 w-3.5" />
                          {r.admin_response ? "Svara igen" : "Svara"}
                        </button>
                        <button
                          onClick={() => dismissReport(r)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                          Avfärda
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
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
              <li key={u.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm">
                <Link to="/profile/$userId" params={{ userId: u.id }} className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {u.full_name ?? "?"}
                    {u.is_suspended && <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">Avstängd</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.city ?? "—"} · Score {u.rewear_score}</p>
                </Link>
                <button
                  onClick={() => toggleVerified(u.id, u.is_verified)}
                  className={`rounded-full border px-3 py-1 text-xs ${u.is_verified ? "border-primary text-primary" : "border-border"}`}
                >
                  {u.is_verified ? "Verifierad" : "Verifiera"}
                </button>
                <button
                  onClick={() => toggleIdentityVerified(u.id, u.identity_verified)}
                  className={`rounded-full border px-3 py-1 text-xs ${u.identity_verified ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                >
                  {u.identity_verified ? "ID-verifierad" : "Markera ID-verifierad"}
                </button>
                <button
                  onClick={() => toggleSuspended(u.id, u.is_suspended)}
                  className={`rounded-full border px-3 py-1 text-xs ${u.is_suspended ? "border-primary text-primary" : "border-destructive/40 text-destructive"}`}
                >
                  {u.is_suspended ? "Häv avstängning" : "Stäng av"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BottomNav />

      <AdminReplyDialog
        open={Boolean(replyTarget)}
        onOpenChange={(o) => !o && setReplyTarget(null)}
        context={
          replyTarget
            ? { reason: replyTarget.reason, reporterName: replyTarget.reporter?.full_name ?? null }
            : null
        }
        onSubmit={submitReply}
      />
    </div>
  );
}

function SubTab({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-background/20" : "bg-accent text-accent-foreground"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: "Öppen", cls: "bg-accent/15 text-accent" },
    resolved: { label: "Besvarad", cls: "bg-primary/15 text-primary" },
    dismissed: { label: "Avfärdad", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${m.cls}`}>
      {m.label}
    </span>
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
