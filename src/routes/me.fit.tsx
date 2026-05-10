import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  CLOTHING_SIZES,
  ADULT_SHOE_SIZES,
  KIDS_CLOTHING_SIZES,
  KIDS_SHOE_SIZES,
} from "@/lib/taxonomy";
import { STYLE_TAG_SUGGESTIONS } from "@/lib/listingSchema";
import { ChevronLeft, Sparkles, X } from "lucide-react";

export const Route = createFileRoute("/me/fit")({
  component: FitProfilePage,
});

type FitRow = {
  user_id: string;
  clothing_size: string | null;
  shoe_size: string | null;
  kids_sizes: string[] | null;
  favorite_brands: string[] | null;
  preferred_fit: string | null;
  style_tags: string[] | null;
};

type Fit = "tight" | "normal" | "oversized";

const KIDS_OPTIONS = useMemo
  ? null
  : null;
const ALL_KIDS = [
  ...KIDS_CLOTHING_SIZES.map((s) => `${s} cm`),
  ...KIDS_SHOE_SIZES.map((s) => `EU ${s}`),
];

function FitProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clothingSize, setClothingSize] = useState<string>("");
  const [shoeSize, setShoeSize] = useState<string>("");
  const [kidsSizes, setKidsSizes] = useState<string[]>([]);
  const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState("");
  const [preferredFit, setPreferredFit] = useState<Fit | "">("");
  const [styleTags, setStyleTags] = useState<string[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    supabase
      .from("fit_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as FitRow | null;
        if (row) {
          setClothingSize(row.clothing_size ?? "");
          setShoeSize(row.shoe_size ?? "");
          setKidsSizes(row.kids_sizes ?? []);
          setFavoriteBrands(row.favorite_brands ?? []);
          setPreferredFit((row.preferred_fit as Fit) ?? "");
          setStyleTags(row.style_tags ?? []);
        }
        setLoading(false);
      });
  }, [user, authLoading, navigate]);

  function toggleArr(list: string[], v: string, setter: (l: string[]) => void) {
    setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function addBrand() {
    const v = brandInput.trim();
    if (!v) return;
    if (favoriteBrands.includes(v)) {
      setBrandInput("");
      return;
    }
    if (favoriteBrands.length >= 10) {
      toast.info("Max 10 favoritmärken");
      return;
    }
    setFavoriteBrands([...favoriteBrands, v]);
    setBrandInput("");
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      clothing_size: clothingSize || null,
      shoe_size: shoeSize || null,
      kids_sizes: kidsSizes,
      favorite_brands: favoriteBrands,
      preferred_fit: preferredFit || null,
      style_tags: styleTags,
    };
    const { error } = await supabase
      .from("fit_profiles")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Fit Match-profil sparad");
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header subtitle="Fit Match" />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header subtitle="Fit Match" />
      <main className="mx-auto max-w-2xl px-4 py-4 space-y-6">
        <Link to="/me" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" /> Tillbaka till profil
        </Link>

        <header className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Fit Match
          </div>
          <h1 className="font-display text-2xl">Din storlek & stil</h1>
          <p className="text-sm text-muted-foreground">
            När du fyller i dina storlekar visar vi diskret om ett plagg matchar — och hjälper dig hitta rätt snabbare. Du kan alltid uppdatera detta senare.
          </p>
        </header>

        {/* Klädstorlek */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-eyebrow text-muted-foreground">Klädstorlek (vuxen)</h2>
          <div className="flex flex-wrap gap-2">
            {CLOTHING_SIZES.map((s) => (
              <Pill key={s} active={clothingSize === s} onClick={() => setClothingSize(clothingSize === s ? "" : s)}>{s}</Pill>
            ))}
          </div>
        </section>

        {/* Skostorlek */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-eyebrow text-muted-foreground">Skostorlek (vuxen)</h2>
          <div className="flex flex-wrap gap-2">
            {ADULT_SHOE_SIZES.map((s) => (
              <Pill key={s} active={shoeSize === s} onClick={() => setShoeSize(shoeSize === s ? "" : s)}>{s}</Pill>
            ))}
          </div>
        </section>

        {/* Fit */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-eyebrow text-muted-foreground">Hur föredrar du passformen?</h2>
          <div className="flex flex-wrap gap-2">
            {(["tight", "normal", "oversized"] as Fit[]).map((f) => (
              <Pill key={f} active={preferredFit === f} onClick={() => setPreferredFit(preferredFit === f ? "" : f)}>
                {f === "tight" ? "Tajt" : f === "normal" ? "Normal" : "Oversized"}
              </Pill>
            ))}
          </div>
        </section>

        {/* Barnstorlekar */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-eyebrow text-muted-foreground">Barnstorlekar (valfritt)</h2>
          <p className="text-xs text-muted-foreground">Välj de storlekar du handlar för — kläder eller skor.</p>
          <div className="flex flex-wrap gap-2">
            {ALL_KIDS.map((s) => (
              <Pill key={s} active={kidsSizes.includes(s)} onClick={() => toggleArr(kidsSizes, s, setKidsSizes)}>
                {s}
              </Pill>
            ))}
          </div>
        </section>

        {/* Favoritmärken */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-eyebrow text-muted-foreground">Favoritmärken (valfritt)</h2>
          <div className="flex gap-2">
            <input
              value={brandInput}
              onChange={(e) => setBrandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addBrand();
                }
              }}
              placeholder="t.ex. Acne Studios"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addBrand}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Lägg till
            </button>
          </div>
          {favoriteBrands.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {favoriteBrands.map((b) => (
                <span key={b} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs">
                  {b}
                  <button
                    type="button"
                    aria-label={`Ta bort ${b}`}
                    onClick={() => setFavoriteBrands(favoriteBrands.filter((x) => x !== b))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Stil */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-eyebrow text-muted-foreground">Din stil (valfritt)</h2>
          <div className="flex flex-wrap gap-2">
            {STYLE_TAG_SUGGESTIONS.map((t) => (
              <Pill key={t} active={styleTags.includes(t)} onClick={() => toggleArr(styleTags, t, setStyleTags)}>
                #{t}
              </Pill>
            ))}
          </div>
        </section>

        <div className="sticky bottom-20 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-card disabled:opacity-60"
          >
            {saving ? "Sparar…" : "Spara Fit Match-profil"}
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}
