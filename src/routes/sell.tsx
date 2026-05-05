import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Camera, X, MapPin, Truck, Handshake, Info, Leaf, Eye, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { CategoryRow } from "@/lib/database.types";
import { priceGuideRange, formatSEK, computeSellerBadge, type SellerStatsLite } from "@/lib/rewear";
import { MAIN_CATEGORIES, SUB_CATEGORIES, getSizeRule, showJeansSizes, isValidSizeForCategory, WAIST_SIZES, LENGTH_SIZES, type MainCategory } from "@/lib/taxonomy";

export const Route = createFileRoute("/sell")({
  component: SellPage,
});

const CONDITIONS = ["Nyskick", "Mycket bra", "Bra", "Sliten"] as const;

const DRAFT_KEY = "rewear:sell:draft";

type DeliveryMethod = "shipping" | "pickup" | "both";

function SellPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [mainCategory, setMainCategory] = useState<MainCategory | "">("");
  const [subCategory, setSubCategory] = useState<string>("");
  const [brand, setBrand] = useState("");
  const [title, setTitle] = useState("");
  const [size, setSize] = useState("");
  const [waistSize, setWaistSize] = useState("");
  const [lengthSize, setLengthSize] = useState("");
  const [condition, setCondition] = useState<string>(CONDITIONS[1]);
  const [price, setPrice] = useState<string>("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("shipping");
  const [buyerPaysShipping, setBuyerPaysShipping] = useState(true);
  const [shippingPrice, setShippingPrice] = useState<string>("");
  const [shipsWithin, setShipsWithin] = useState<"1" | "2-3" | "4-7">("2-3");
  const [busy, setBusy] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [previewActiveImg, setPreviewActiveImg] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [sellerStats, setSellerStats] = useState<SellerStatsLite | null>(null);
  const [co2Kg, setCo2Kg] = useState<number>(4);
  const fileInput = useRef<HTMLInputElement>(null);
  const showShipping = deliveryMethod === "shipping" || deliveryMethod === "both";
  const showPickup = deliveryMethod === "pickup" || deliveryMethod === "both";
  const hasImages = files.length > 0;

  useEffect(() => {
    supabase
      .from("categories")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  // Hämta säljarstatistik för preview-säljarkortet
  useEffect(() => {
    if (!user) return;
    supabase
      .from("seller_stats")
      .select("first_listing_at, sold_count, average_rating, rating_count")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSellerStats(data as unknown as SellerStatsLite);
      });
  }, [user]);

  // Hämta CO₂-besparing för vald kategori
  useEffect(() => {
    if (!categoryId) return;
    supabase
      .from("co2_factors")
      .select("kg_saved")
      .eq("category_id", categoryId)
      .maybeSingle()
      .then(({ data }) => {
        if (data && typeof data.kg_saved === "number") setCo2Kg(Number(data.kg_saved));
      });
  }, [categoryId]);

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
    if (!hasImages) return;
    toast.success("AI-förslag inlagda (placeholder)");
    if (!brand) setBrand("Acne Studios");
    if (!title) setTitle("Mörkblå ulljacka");
    if (!description)
      setDescription(
        "Klassisk ulljacka i mörkblå, knappt använd. Snygg passform och tidlös design.",
      );
    if (!price) setPrice("950");
  }

  const sizeInfo = useMemo(() => getSizeRule(mainCategory, subCategory), [mainCategory, subCategory]);
  const jeansVisible = showJeansSizes(mainCategory, subCategory);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (files.length === 0) e.images = "Lägg till minst en bild.";
    if (!brand.trim()) e.brand = "Ange märke.";
    if (!title.trim()) e.title = "Ange titel.";
    if (!mainCategory) e.mainCategory = "Välj huvudkategori.";
    if (mainCategory && !subCategory) e.subCategory = "Välj underkategori.";
    if (!sizeInfo.optional && !size) e.size = "Välj storlek.";
    if (!condition) e.condition = "Välj skick.";
    const priceNum = Number(price);
    if (!price || !Number.isFinite(priceNum) || priceNum <= 0) e.price = "Ange ett pris över 0.";
    if (!city.trim()) e.city = "Ange stad.";
    if (!deliveryMethod) e.deliveryMethod = "Välj leveranssätt.";
    return e;
  }

  const liveErrors = useMemo(() => (submitAttempted ? validate() : errors), [submitAttempted, errors, files, brand, title, mainCategory, subCategory, size, condition, price, city, deliveryMethod, sizeInfo]);

  function saveDraft() {
    try {
      const draft = {
        brand, title, categoryId, mainCategory, subCategory, size, waistSize, lengthSize, condition, price, description,
        city, area, deliveryMethod, buyerPaysShipping, shippingPrice, shipsWithin,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      toast.success("Utkast sparat på enheten");
    } catch {
      toast.error("Kunde inte spara utkast");
    }
  }

  // Restore draft once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.brand) setBrand(d.brand);
      if (d.title) setTitle(d.title);
      if (d.categoryId) setCategoryId(d.categoryId);
      if (d.mainCategory) setMainCategory(d.mainCategory);
      if (d.subCategory) setSubCategory(d.subCategory);
      if (d.size) setSize(d.size);
      if (d.waistSize) setWaistSize(d.waistSize);
      if (d.lengthSize) setLengthSize(d.lengthSize);
      if (d.condition) setCondition(d.condition);
      if (d.price) setPrice(d.price);
      if (d.description) setDescription(d.description);
      if (d.city) setCity(d.city);
      if (d.area) setArea(d.area);
      if (d.deliveryMethod) setDeliveryMethod(d.deliveryMethod);
      if (typeof d.buyerPaysShipping === "boolean") setBuyerPaysShipping(d.buyerPaysShipping);
      if (d.shippingPrice) setShippingPrice(d.shippingPrice);
      if (d.shipsWithin) setShipsWithin(d.shipsWithin);
    } catch { /* ignore */ }
  }, []);

  // Reset sub-category when main changes
  useEffect(() => { setSubCategory(""); }, [mainCategory]);

  // Nollställ storlek om den inte längre är giltig för vald kategori
  useEffect(() => {
    if (size && !isValidSizeForCategory(mainCategory, subCategory, size)) {
      setSize("");
    }
    if (!jeansVisible) {
      if (waistSize) setWaistSize("");
      if (lengthSize) setLengthSize("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainCategory, subCategory]);


  const titleWordCount = title.trim() ? title.trim().split(/\s+/).length : 0;
  const titleNeedsImprovement = !!title.trim() && (titleWordCount < 3 || title.trim().length < 12);
  const sellerBadge = computeSellerBadge(sellerStats);
  const sellerName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Du";
  const sellerInitial = sellerName?.[0]?.toUpperCase() ?? "?";
  const sellerAvatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null;

  function openPreview() {
    setSubmitAttempted(true);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Fyll i fälten som är markerade.");
      return;
    }
    setPreviewActiveImg(0);
    setShowPreview(true);
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!user) {
      toast.error("Du måste vara inloggad.");
      return;
    }
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Fyll i fälten som är markerade.");
      return;
    }
    const priceNum = Number(price);

    setBusy(true);
    try {
      const { data: listing, error: lErr } = await supabase
        .from("listings")
        .insert({
          seller_id: user.id,
          category_id: categoryId || null,
          main_category: mainCategory || null,
          sub_category: subCategory || null,
          title,
          brand: brand || null,
          size: size || null,
          shoe_size: mainCategory === "Skor" ? size || null : null,
          waist_size: jeansVisible ? waistSize || null : null,
          length_size: jeansVisible ? lengthSize || null : null,
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

      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
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

  const deliveryLabel: Record<DeliveryMethod, string> = {
    shipping: "Skickas",
    pickup: "Hämtas",
    both: "Skickas eller hämtas",
  };

  return (
    <div className="min-h-screen bg-background pb-40 sm:pb-32">
      <Header subtitle="Ny annons" />
      <main className="mx-auto max-w-2xl px-4 py-4">
        <h1 className="font-display text-2xl">Skapa annons</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ta en bild. AI hjälper dig. Publicera på under en minut.
        </p>

        <form onSubmit={publish} className="mt-6 space-y-6" noValidate>
          {/* Bilder */}
          <section>
            <SectionTitle index={1}>Bilder (1–5)</SectionTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Första bilden visas som huvudbild i annonsen.
            </p>

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <div className="mt-3 grid grid-cols-4 grid-rows-2 gap-2 sm:gap-3">
              {/* Huvudbild — stor, spänner 2x2 */}
              {previews[0] ? (
                <div className="relative col-span-2 row-span-2 aspect-square overflow-hidden rounded-xl bg-muted">
                  <img src={previews[0]} alt="Huvudbild" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-full bg-foreground/90 px-2 py-0.5 text-[10px] font-medium text-background">
                    Huvudbild
                  </span>
                  <button
                    type="button"
                    onClick={() => removeImage(0)}
                    className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5"
                    aria-label="Ta bort bild"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  className={`col-span-2 row-span-2 flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground transition hover:border-foreground/40 ${liveErrors.images ? "border-destructive/60 bg-destructive/5" : "border-border"}`}
                  onClick={() => fileInput.current?.click()}
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-xs font-medium">Lägg till huvudbild</span>
                </label>
              )}

              {/* 4 mindre slots */}
              {[1, 2, 3, 4].map((slot) => {
                const src = previews[slot];
                if (src) {
                  return (
                    <div key={slot} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                      <img src={src} className="h-full w-full object-cover" alt="" />
                      <button
                        type="button"
                        onClick={() => removeImage(slot)}
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                        aria-label="Ta bort bild"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                }
                const disabled = !hasImages && slot > 1;
                return (
                  <label
                    key={slot}
                    onClick={(e) => {
                      if (disabled) {
                        e.preventDefault();
                        return;
                      }
                      fileInput.current?.click();
                    }}
                    className={`flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-foreground/40 ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    <Camera className="h-4 w-4" />
                  </label>
                );
              })}
            </div>
            {liveErrors.images && <FieldError>{liveErrors.images}</FieldError>}
          </section>

          {/* AI */}
          <section>
            <SectionTitle index={2}>Föreslå med AI</SectionTitle>
            <button
              type="button"
              onClick={aiSuggest}
              disabled={!hasImages}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-accent/10"
            >
              <Sparkles className="h-4 w-4" />
              Föreslå med AI
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              {hasImages
                ? "AI känner igen märke, föreslår pris och skriver beskrivning. (Placeholder tills riktig modell kopplas in.)"
                : "Lägg till minst en bild för att aktivera AI-förslag."}
            </p>
          </section>

          {/* Detaljer */}
          <section>
            <SectionTitle index={3}>Detaljer</SectionTitle>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Märke" full error={liveErrors.brand}>
                <input className={inputCls(liveErrors.brand)} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Acne, COS…" />
              </Field>
              <Field label="Titel" full error={liveErrors.title}>
                <input className={inputCls(liveErrors.title)} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mörkblå ulljacka" />
              </Field>
              <Field label="Huvudkategori" error={liveErrors.mainCategory}>
                <select
                  className={inputCls(liveErrors.mainCategory)}
                  value={mainCategory}
                  onChange={(e) => setMainCategory(e.target.value as MainCategory | "")}
                >
                  <option value="">Välj…</option>
                  {MAIN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Underkategori" error={liveErrors.subCategory}>
                <select
                  className={inputCls(liveErrors.subCategory)}
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  disabled={!mainCategory}
                >
                  <option value="">{mainCategory ? "Välj…" : "Välj huvudkategori först"}</option>
                  {mainCategory && SUB_CATEGORIES[mainCategory].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label={sizeInfo.label} error={liveErrors.size}>
                <select className={inputCls(liveErrors.size)} value={size} onChange={(e) => setSize(e.target.value)}>
                  <option value="">{sizeInfo.optional ? "Valfritt" : "Välj…"}</option>
                  {sizeInfo.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              {jeansVisible && (
                <>
                  <Field label="Midja (waist)">
                    <select className={inputCls()} value={waistSize} onChange={(e) => setWaistSize(e.target.value)}>
                      <option value="">Välj…</option>
                      {WAIST_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Längd (length)">
                    <select className={inputCls()} value={lengthSize} onChange={(e) => setLengthSize(e.target.value)}>
                      <option value="">Välj…</option>
                      {LENGTH_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </>
              )}
              <Field label="Skick" error={liveErrors.condition}>
                <select className={inputCls(liveErrors.condition)} value={condition} onChange={(e) => setCondition(e.target.value)}>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Pris (SEK)" error={liveErrors.price}>
                <input
                  className={inputCls(liveErrors.price)}
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex. 450"
                />
              </Field>
              <Field label="Beskrivning" full>
                <textarea className={inputCls()} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Material, passform, eventuella defekter…" />
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

          {/* Plats & leverans */}
          <section>
            <SectionTitle index={4}>Plats & leverans</SectionTitle>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Stad" full error={liveErrors.city}>
                <input
                  className={inputCls(liveErrors.city)}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex. Stockholm, Göteborg, Malmö"
                  maxLength={80}
                />
              </Field>
              <Field label="Område (valfritt)" full>
                <input
                  className={inputCls()}
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Ex. Södermalm, Majorna, Hisingen"
                  maxLength={80}
                />
              </Field>
            </div>

            <div className="mt-4">
              <span className="mb-2 block text-xs font-medium text-muted-foreground">Leveranssätt</span>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: "shipping", label: "Skickas", icon: Truck },
                  { v: "pickup", label: "Hämtas", icon: Handshake },
                  { v: "both", label: "Skickas eller hämtas", icon: MapPin },
                ] as const).map(({ v, label, icon: Icon }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDeliveryMethod(v)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-[11px] font-medium leading-tight text-center transition ${
                      deliveryMethod === v
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-foreground hover:border-foreground/40"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {showShipping && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-3">
                <p className="text-eyebrow text-muted-foreground">Frakt</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBuyerPaysShipping(true)}
                    className={`flex-1 rounded-full border px-3 py-2 text-xs ${buyerPaysShipping ? "border-foreground bg-foreground text-background" : "border-border"}`}
                  >
                    Köparen betalar
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuyerPaysShipping(false)}
                    className={`flex-1 rounded-full border px-3 py-2 text-xs ${!buyerPaysShipping ? "border-foreground bg-foreground text-background" : "border-border"}`}
                  >
                    Säljaren betalar
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Fraktpris (valfritt)">
                    <input
                      className={inputCls()}
                      type="number"
                      min={0}
                      value={shippingPrice}
                      onChange={(e) => setShippingPrice(e.target.value)}
                      placeholder="Ex. 59"
                    />
                  </Field>
                  <Field label="Skickas inom">
                    <select
                      className={inputCls()}
                      value={shipsWithin}
                      onChange={(e) => setShipsWithin(e.target.value as "1" | "2-3" | "4-7")}
                    >
                      <option value="1">1 dag</option>
                      <option value="2-3">2–3 dagar</option>
                      <option value="4-7">4–7 dagar</option>
                    </select>
                  </Field>
                </div>
              </div>
            )}

            {showPickup && (
              <div className="mt-3 flex gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0 text-foreground/70" />
                <p>
                  Visa aldrig exakt adress i annonsen. Bestäm mötesplats i chatten och träffas gärna på offentlig plats.
                </p>
              </div>
            )}
          </section>

          {/* Desktop actions */}
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={saveDraft}
              className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              Spara som utkast
            </button>
            <button
              type="button"
              onClick={openPreview}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              <Eye className="h-4 w-4" /> Förhandsgranska
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-card transition disabled:opacity-50"
            >
              {busy ? "Publicerar…" : "Publicera annons"}
            </button>
          </div>
        </form>
      </main>

      {/* Sticky mobile actions */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-2xl gap-2">
          <button
            type="button"
            onClick={saveDraft}
            className="rounded-full border border-border bg-card px-3 py-2.5 text-xs font-medium"
          >
            Utkast
          </button>
          <button
            type="button"
            onClick={openPreview}
            className="inline-flex items-center justify-center gap-1 rounded-full border border-border bg-card px-3 py-2.5 text-xs font-medium"
          >
            <Eye className="h-3.5 w-3.5" /> Förhandsgranska
          </button>
          <button
            type="button"
            onClick={(e) => publish(e as unknown as React.FormEvent)}
            disabled={busy}
            className="flex-1 rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground shadow-card disabled:opacity-50"
          >
            {busy ? "Publicerar…" : "Publicera"}
          </button>
        </div>
      </div>

      <BottomNav />

      {/* Preview modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-[960px] max-h-[92vh] p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-background focus:outline-none focus-visible:outline-none focus:ring-0 [&>button]:hidden">
          <DialogHeader className="sticky top-0 z-10 flex-row items-start justify-between gap-4 space-y-0 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
            <div className="space-y-0.5">
              <DialogTitle className="font-display text-lg sm:text-xl">Förhandsgranska annons</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Kontrollera uppgifterna innan du publicerar.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label="Stäng"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          <div className="overflow-y-auto px-4 py-5 sm:px-6 sm:py-6" style={{ maxHeight: "calc(92vh - 64px - 72px)" }}>
            <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-8">
              {/* Vänster: bildgalleri */}
              <div>
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                  {previews[previewActiveImg] ? (
                    <img
                      src={previews[previewActiveImg]}
                      alt={title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Ingen bild
                    </div>
                  )}
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-medium text-foreground shadow-sm backdrop-blur">
                    <Leaf className="h-3 w-3 text-primary" />
                    −{co2Kg} kg CO₂
                  </span>
                </div>
                {previews.length > 1 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {previews.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPreviewActiveImg(i)}
                        className={`h-[72px] w-[72px] overflow-hidden rounded-lg bg-muted transition ${
                          i === previewActiveImg ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100"
                        }`}
                        aria-label={`Visa bild ${i + 1}`}
                      >
                        <img src={p} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Höger: produktinfo */}
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <p className="text-eyebrow text-muted-foreground">{brand || "Ej angivet"}</p>
                  <h3 className="font-display text-2xl leading-tight text-foreground">
                    {title || "Titel saknas"}
                  </h3>
                  <p className="font-display text-3xl text-primary">
                    {price ? formatSEK(Number(price)) : "Ej angivet"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {size && <PreviewChip>Storlek {size}</PreviewChip>}
                  {jeansVisible && waistSize && <PreviewChip>{waistSize}</PreviewChip>}
                  {jeansVisible && lengthSize && <PreviewChip>{lengthSize}</PreviewChip>}
                  {condition && <PreviewChip>{condition}</PreviewChip>}
                  {mainCategory && <PreviewChip>{mainCategory}</PreviewChip>}
                  {subCategory && <PreviewChip>{subCategory}</PreviewChip>}
                </div>

                <div className="space-y-2.5 rounded-xl border border-border bg-card p-4">
                  <p className="text-eyebrow text-muted-foreground">Plats & leverans</p>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p>
                      <span className="text-muted-foreground">Finns i: </span>
                      <span className="font-medium">
                        {city || "Ej angivet"}{area ? `, ${area}` : ""}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    {deliveryMethod === "pickup" ? (
                      <Handshake className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Truck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <p>
                      <span className="text-muted-foreground">Leverans: </span>
                      <span className="font-medium">{deliveryLabel[deliveryMethod]}</span>
                    </p>
                  </div>
                  {showShipping && (
                    <p className="pl-6 text-sm">
                      <span className="text-muted-foreground">Frakt: </span>
                      <span className="font-medium">
                        {buyerPaysShipping ? "Köparen betalar" : "Säljaren betalar"}
                        {shippingPrice ? ` ${formatSEK(Number(shippingPrice))}` : ""}
                        {shipsWithin ? ` · skickas inom ${shipsWithin === "1" ? "1 dag" : shipsWithin + " dagar"}` : ""}
                      </span>
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-eyebrow text-muted-foreground mb-1.5">Beskrivning</p>
                  <p className="whitespace-pre-line text-sm text-foreground">
                    {description || <span className="text-muted-foreground">Ej angivet</span>}
                  </p>
                </div>

                {user && (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium">
                      {(user.user_metadata?.full_name as string | undefined)?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium">
                          {(user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Du"}
                        </p>
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground">Säljare · ny annons</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="sticky bottom-0 z-10 flex gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              Tillbaka och redigera
            </button>
            <button
              type="button"
              onClick={(e) => { setShowPreview(false); publish(e as unknown as React.FormEvent); }}
              disabled={busy}
              className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-card transition hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Publicerar…" : "Publicera annons"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .rw-input { width:100%; border-radius:.75rem; border:1px solid var(--border); background:var(--card); padding:.65rem .85rem; font-size:.875rem; outline:none; transition:border-color .15s, box-shadow .15s; }
        .rw-input:focus { border-color: var(--ring); box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 20%, transparent); }
        .rw-input.error { border-color: var(--destructive); background: color-mix(in oklab, var(--destructive) 5%, var(--card)); }
        textarea.rw-input { min-height: 100px; }
      `}</style>
    </div>
  );
}

function inputCls(error?: string) {
  return `rw-input${error ? " error" : ""}`;
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

function Field({ label, children, full, error }: { label: string; children: React.ReactNode; full?: boolean; error?: string }) {
  return (
    <label className={full ? "sm:col-span-2 block" : "block"}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <FieldError>{error}</FieldError>}
    </label>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-[11px] font-medium text-destructive">{children}</span>;
}

function PreviewChip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border bg-card px-3 py-1 text-xs">{children}</span>;
}
