import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Bell, Plus, Sparkles, Trash2 } from "lucide-react";
import { MAIN_CATEGORIES, SUB_CATEGORIES, getSizeRule, type MainCategory } from "@/lib/taxonomy";
import { toast } from "sonner";

export const Route = createFileRoute("/me/alerts")({
  component: AlertsPage,
});

type Alert = {
  id: string;
  brand: string | null;
  main_category: string | null;
  sub_category: string | null;
  size: string | null;
  min_price: number | null;
  max_price: number | null;
  city: string | null;
  delivery_method: string | null;
  is_active: boolean;
};

const empty = {
  brand: "",
  main_category: "",
  sub_category: "",
  size: "",
  min_price: "",
  max_price: "",
  city: "",
  delivery_method: "",
};

function AlertsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Alert[]>([]);
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) return;
    setBusy(true);
    const { data } = await supabase
      .from("style_alerts")
      .select("id, brand, main_category, sub_category, size, min_price, max_price, city, delivery_method, is_active")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as Alert[]) ?? []);
    setBusy(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const subs = useMemo(() => {
    if (!form.main_category) return [] as string[];
    return SUB_CATEGORIES[form.main_category as MainCategory] ?? [];
  }, [form.main_category]);

  const sizeRule = useMemo(() => {
    if (!form.main_category) return null;
    return getSizeRule(form.main_category, form.sub_category);
  }, [form.main_category, form.sub_category]);

  async function save() {
    if (!user) return;
    if (!form.brand && !form.main_category && !form.size && !form.city) {
      toast.error("Lägg till minst ett kriterium");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("style_alerts").insert({
      user_id: user.id,
      brand: form.brand.trim() || null,
      main_category: form.main_category || null,
      sub_category: form.sub_category || null,
      size: form.size || null,
      min_price: form.min_price ? Number(form.min_price) : null,
      max_price: form.max_price ? Number(form.max_price) : null,
      city: form.city.trim() || null,
      delivery_method: form.delivery_method || null,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Style alert sparad");
    setForm(empty);
    setOpen(false);
    void load();
  }

  async function toggle(a: Alert) {
    const { error } = await supabase
      .from("style_alerts")
      .update({ is_active: !a.is_active })
      .eq("id", a.id);
    if (error) toast.error(error.message);
    else void load();
  }

  async function remove(id: string) {
    if (!confirm("Ta bort denna style alert?")) return;
    const { error } = await supabase.from("style_alerts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else void load();
  }

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header subtitle="Style alerts" />
        <main className="mx-auto max-w-md px-4 py-12 text-center text-sm text-muted-foreground">
          Logga in för att skapa style alerts.{" "}
          <Link to="/login" className="text-primary underline">Logga in</Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Style alerts" />
      <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl">Style alerts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Få en notis så fort ett plagg som matchar dina kriterier dyker upp.
            </p>
          </div>
          <button
            onClick={() => setOpen((o) => !o)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Ny alert
          </button>
        </div>

        {open && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <Field label="Märke">
              <input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="t.ex. Acne Studios"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Huvudkategori">
                <select
                  value={form.main_category}
                  onChange={(e) => setForm({ ...form, main_category: e.target.value, sub_category: "", size: "" })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Alla</option>
                  {MAIN_CATEGORIES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Underkategori">
                <select
                  value={form.sub_category}
                  onChange={(e) => setForm({ ...form, sub_category: e.target.value, size: "" })}
                  disabled={!form.main_category}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">Alla</option>
                  {subs.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            {sizeRule && (
              <Field label={sizeRule.label}>
                <select
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Alla</option>
                  {sizeRule.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min pris (SEK)">
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.min_price}
                  onChange={(e) => setForm({ ...form, min_price: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Max pris (SEK)">
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.max_price}
                  onChange={(e) => setForm({ ...form, max_price: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stad">
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="t.ex. Stockholm"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Leverans">
                <select
                  value={form.delivery_method}
                  onChange={(e) => setForm({ ...form, delivery_method: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Alla</option>
                  <option value="shipping">Frakt</option>
                  <option value="pickup">Upphämtning</option>
                  <option value="both">Båda</option>
                </select>
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">
                Avbryt
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Sparar…" : "Spara alert"}
              </button>
            </div>
          </div>
        )}

        {busy ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary/60" />
            <p className="mt-3 font-display text-lg">Inga alerts ännu</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Skapa en alert för att få notis när någon lägger upp något du letar efter.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      {summarize(a).map((chip, i) => (
                        <span key={i} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">{chip}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => toggle(a)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${a.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      {a.is_active ? "Aktiv" : "Pausad"}
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                      aria-label="Ta bort"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-start gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-[11px] text-muted-foreground">
          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p>Du får en notis i appen och under <Link to="/notifications" className="underline">Notiser</Link> när nya plagg matchar.</p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-eyebrow text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function summarize(a: Alert): string[] {
  const out: string[] = [];
  if (a.brand) out.push(a.brand);
  if (a.main_category) out.push(a.main_category);
  if (a.sub_category) out.push(a.sub_category);
  if (a.size) out.push(`Strl ${a.size}`);
  if (a.min_price != null || a.max_price != null) {
    const lo = a.min_price ?? "";
    const hi = a.max_price ?? "";
    out.push(`${lo}${lo !== "" || hi !== "" ? "–" : ""}${hi} kr`);
  }
  if (a.city) out.push(a.city);
  if (a.delivery_method) out.push(a.delivery_method === "shipping" ? "Frakt" : a.delivery_method === "pickup" ? "Upphämtning" : "Båda");
  if (out.length === 0) out.push("Alla nya plagg");
  return out;
}
