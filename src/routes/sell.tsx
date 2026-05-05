import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Camera, X, MapPin, Truck, Handshake, Info } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { CategoryRow } from "@/lib/database.types";
import { priceGuideRange, formatSEK } from "@/lib/rewear";

export const Route = createFileRoute("/sell")({
  component: SellPage,
});

const CONDITIONS = ["Nyskick", "Mycket bra", "Bra", "Sliten"] as const;
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "34", "36", "38", "40", "42", "44"];

function SellPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [brand, setBrand] = useState("");
  const [title, setTitle] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState<string>(CONDITIONS[1]);
  const [price, setPrice] = useState<string>("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"shipping" | "pickup" | "both">("shipping");
  const [buyerPaysShipping, setBuyerPaysShipping] = useState(true);
  const [shippingPrice, setShippingPrice] = useState<string>("");
  const [shipsWithin, setShipsWithin] = useState<"1" | "2-3" | "4-7">("2-3");
  const [busy, setBusy] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const showShipping = deliveryMethod === "shipping" || deliveryMethod === "both";
  const showPickup = deliveryMethod === "pickup" || deliveryMethod === "both";

  useEffect(() => {
    supabase
      .from("categories")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setPriceRange(null);
      return;
    }
    supabase
      .from("listings")
      .select("price_sek")
      .eq("status", "active")
      .eq("category_id", categoryId)
      .limit(50)
      .then(({ data }) => {
        const prices = (data ?? []).map((d) => d.price_sek);
        setPriceRange(priceGuideRange(prices));
      });
  }, [categoryId]);

  function onFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).slice(0, 5 - files.length);
    setFiles((prev) => [...prev, ...arr]);
    setPreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))]);
  }

  function removeImage(i: number) {
    setFiles((f) => f.filter((_, idx) => idx !== i));
    setPreviews((p) => {
      URL.revokeObjectURL(p[i]);
      return p.filter((_, idx) => idx !== i);
    });
  }

  function aiSuggest() {
    if (files.length === 0) {
      toast.info("Ladda upp en bild först.");
      return;
    }
    // Placeholder — riktig AI kopplas in senare
    toast.success("AI-förslag inlagda (placeholder)");
    if (!brand) setBrand("Acne Studios");
    if (!title) setTitle("Mörkblå ulljacka");
    if (!description)
      setDescription(
        "Klassisk ulljacka i mörkblå, knappt använd. Snygg passform och tidlös design.",
      );
    if (!price) setPrice("950");
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Du måste vara inloggad.");
      return;
    }
    if (files.length === 0) {
      toast.error("Lägg till minst en bild.");
      return;
    }
    if (!categoryId) {
      toast.error("Välj en kategori.");
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("Ange ett giltigt pris.");
      return;
    }

    if (!city.trim()) {
      toast.error("Ange stad.");
      return;
    }
    if (!deliveryMethod) {
      toast.error("Välj leveranssätt.");
      return;
    }

    setBusy(true);
    try {
      const { data: listing, error: lErr } = await supabase
        .from("listings")
        .insert({
          seller_id: user.id,
          category_id: categoryId,
          title,
          brand: brand || null,
          size: size || null,
          condition,
          price_sek: priceNum,
          description: description || null,
          city: city.trim(),
          area: area.trim() || null,
          delivery_method: deliveryMethod,
          buyer_pays_shipping: showShipping ? buyerPaysShipping : true,
          shipping_price: showShipping && shippingPrice ? Number(shippingPrice) : null,
          ships_within_days: showShipping ? shipsWithin : null,
        })
        .select()
        .single();
      if (lErr) throw lErr;

      // Upload images
      const uploads = await Promise.all(
        files.map(async (file, idx) => {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${user.id}/${listing.id}/${idx}-${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("listing-images")
            .upload(path, file, { contentType: file.type, upsert: false });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(path);
          return { listing_id: listing.id, url: pub.publicUrl, position: idx };
        }),
      );

      const { error: imgErr } = await supabase.from("listing_images").insert(uploads);
      if (imgErr) throw imgErr;

      toast.success("Annons publicerad!");
      navigate({ to: "/listing/$id", params: { id: listing.id } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Något gick fel";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header />
        <main className="mx-auto max-w-md px-4 py-12 text-center">
          <h1 className="font-display text-2xl">Logga in för att sälja</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Skapa konto eller logga in för att lägga upp ditt första plagg.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Till inloggning
          </Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header subtitle="Ny annons" />
      <main className="mx-auto max-w-2xl px-4 py-4">
        <h1 className="font-display text-2xl">Skapa annons</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tre steg, klart på under en minut.
        </p>

        <form onSubmit={publish} className="mt-6 space-y-6">
          {/* Bilder */}
          <section>
            <SectionTitle index={1}>Bilder (1–5)</SectionTitle>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
                  <img src={src} className="h-full w-full object-cover" alt="" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {files.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-foreground/40"
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-xs">Lägg till</span>
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </section>

          {/* AI */}
          <section>
            <SectionTitle index={2}>Föreslå med AI</SectionTitle>
            <button
              type="button"
              onClick={aiSuggest}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/20"
            >
              <Sparkles className="h-4 w-4" />
              Föreslå med AI
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              AI känner igen märke, föreslår pris och skriver beskrivning.
              (Placeholder tills riktig modell kopplas in.)
            </p>
          </section>

          {/* Detaljer */}
          <section>
            <SectionTitle index={3}>Detaljer</SectionTitle>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Märke" full>
                <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Acne, COS…" />
              </Field>
              <Field label="Titel" full>
                <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mörkblå ulljacka" />
              </Field>
              <Field label="Kategori">
                <select className="input" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Välj…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name_sv}</option>
                  ))}
                </select>
              </Field>
              <Field label="Storlek">
                <select className="input" value={size} onChange={(e) => setSize(e.target.value)}>
                  <option value="">Välj…</option>
                  {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Skick">
                <select className="input" value={condition} onChange={(e) => setCondition(e.target.value)}>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Pris (SEK)">
                <input className="input" type="number" min={0} required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
              </Field>
              <Field label="Beskrivning" full>
                <textarea className="input min-h-[100px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Material, passform, eventuella defekter…" />
              </Field>
            </div>

            {priceRange && (
              <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                Prisguide: liknande plagg brukar säljas för{" "}
                <strong className="text-foreground">
                  {formatSEK(priceRange[0])} – {formatSEK(priceRange[1])}
                </strong>
              </p>
            )}
          </section>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-card transition disabled:opacity-50"
          >
            {busy ? "Publicerar…" : "Publicera annons"}
          </button>
        </form>
      </main>
      <BottomNav />
      <style>{`
        .input { width:100%; border-radius:.75rem; border:1px solid var(--border); background:var(--card); padding:.65rem .85rem; font-size:.875rem; outline:none; }
        .input:focus { border-color: var(--ring); box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 20%, transparent); }
      `}</style>
    </div>
  );
}

function SectionTitle({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-medium text-background">
        {index}
      </span>
      <h2 className="font-display text-lg">{children}</h2>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={full ? "col-span-2 block" : "block"}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
