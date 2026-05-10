import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { TestPaymentBanner } from "@/components/TestPaymentBanner";
import { useAuth } from "@/lib/auth";
import {
  getOrder,
  updateOrderStatus,
  updateOrderShipping,
  type OrderWithListing,
  type PaymentMethod,
} from "@/lib/orders";
import { formatSEK } from "@/lib/rewear";
import { Loader2, ShieldCheck, Truck, MapPin, BadgeCheck, Lock } from "lucide-react";

export const Route = createFileRoute("/checkout/$orderId")({
  component: CheckoutPage,
});

const shippingSchema = z.object({
  fullName: z.string().trim().min(2, "Ange namn").max(100),
  street: z.string().trim().min(3, "Ange gatuadress").max(120),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{3}\s?\d{2}$/, "Postnummer ska vara 5 siffror"),
  city: z.string().trim().min(2, "Ange ort").max(60),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-]{6,20}$/, "Ogiltigt telefonnummer"),
});

function CheckoutPage() {
  const { orderId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const [fullName, setFullName] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("klarna");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    getOrder(orderId).then((o) => {
      setOrder(o);
      if (o) {
        setFullName(o.shipping_full_name ?? o.buyer?.full_name ?? "");
        setStreet(o.shipping_street ?? "");
        setPostalCode(o.shipping_postal_code ?? "");
        setCity(o.shipping_city ?? "");
        setPhone(o.shipping_phone ?? "");
        if (o.payment_method) setPaymentMethod(o.payment_method as PaymentMethod);
      }
      setLoading(false);
    });
  }, [orderId, user, authLoading, navigate]);

  async function handlePay() {
    if (!order) return;
    const needsAddress = order.delivery_method !== "pickup";

    if (needsAddress) {
      const parsed = shippingSchema.safeParse({ fullName, street, postalCode, city, phone });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        parsed.error.issues.forEach((i) => {
          errs[i.path[0] as string] = i.message;
        });
        setErrors(errs);
        toast.error("Kontrollera leveransuppgifterna");
        return;
      }
    }
    if (!acceptTerms) {
      toast.error("Du måste godkänna villkoren");
      return;
    }
    setErrors({});
    setPaying(true);

    if (needsAddress) {
      const { error: shipErr } = await updateOrderShipping(order.id, {
        fullName,
        street,
        postalCode,
        city,
        phone,
        paymentMethod,
      });
      if (shipErr) {
        toast.error(shipErr);
        setPaying(false);
        return;
      }
    }

    const { error } = await updateOrderStatus(order.id, "paid");
    if (error) {
      toast.error(error);
      setPaying(false);
      return;
    }
    toast.success("Betalning genomförd (simulering)");
    navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header subtitle="Kassa" />
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!order || order.buyer_id !== user?.id) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header subtitle="Kassa" />
        <div className="mx-auto max-w-md px-4 py-12 text-center text-muted-foreground">
          Ordern hittades inte.
          <div className="mt-4">
            <Link to="/" className="text-primary underline">Till hem</Link>
          </div>
        </div>
      </div>
    );
  }

  if (order.status !== "pending_payment") {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header subtitle="Kassa" />
        <div className="mx-auto max-w-md px-4 py-10 text-center space-y-3">
          <p>Ordern är redan {order.status}.</p>
          <Link
            to="/orders/$orderId"
            params={{ orderId: order.id }}
            className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Visa order
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  const img = [...(order.listing?.listing_images ?? [])].sort((a, b) => a.position - b.position)[0];
  const needsAddress = order.delivery_method !== "pickup";
  const addressValid = !needsAddress ||
    shippingSchema.safeParse({ fullName, street, postalCode, city, phone }).success;
  const canPay = acceptTerms && addressValid;
  const sellerName = order.seller?.full_name ?? "Säljare";
  const sellerInitial = sellerName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header subtitle="Kassa" />
      <main className="mx-auto max-w-5xl px-4 py-6 lg:py-10">
        <div className="mb-6">
          <h1 className="font-display text-3xl tracking-tight">Slutför köpet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trygg handel via ReWoke köpar- och säljarskydd
          </p>
        </div>
        <div className="mb-6">
          <TestPaymentBanner variant="checkout" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* LEFT — form */}
          <div className="space-y-5">
            {/* Säljare */}
            <Section title="Säljare" icon={<BadgeCheck className="h-4 w-4" />}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted overflow-hidden flex items-center justify-center text-base font-medium">
                  {order.seller?.avatar_url ? (
                    <img src={order.seller.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    sellerInitial
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{sellerName}</p>
                    {order.seller?.is_verified && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verifierad
                      </span>
                    )}
                  </div>
                  {typeof order.seller?.trust_score === "number" && order.seller.trust_score > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Trust score: {Math.round(order.seller.trust_score)}
                    </p>
                  )}
                </div>
                <Link
                  to="/profile/$userId"
                  params={{ userId: order.seller_id }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Se profil
                </Link>
              </div>
            </Section>

            {/* Leverans */}
            {needsAddress ? (
              <Section title="Leveransadress" icon={<Truck className="h-4 w-4" />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="För- och efternamn"
                    value={fullName}
                    onChange={setFullName}
                    error={errors.fullName}
                    autoComplete="name"
                    className="sm:col-span-2"
                  />
                  <Field
                    label="Gatuadress"
                    value={street}
                    onChange={setStreet}
                    error={errors.street}
                    autoComplete="street-address"
                    className="sm:col-span-2"
                  />
                  <Field
                    label="Postnummer"
                    value={postalCode}
                    onChange={setPostalCode}
                    error={errors.postalCode}
                    autoComplete="postal-code"
                    placeholder="123 45"
                  />
                  <Field
                    label="Ort"
                    value={city}
                    onChange={setCity}
                    error={errors.city}
                    autoComplete="address-level2"
                  />
                  <Field
                    label="Telefon"
                    value={phone}
                    onChange={setPhone}
                    error={errors.phone}
                    autoComplete="tel"
                    type="tel"
                    className="sm:col-span-2"
                    placeholder="070 123 45 67"
                  />
                </div>
              </Section>
            ) : (
              <Section title="Upphämtning" icon={<MapPin className="h-4 w-4" />}>
                <p className="text-sm text-muted-foreground">
                  Säljaren har valt lokal upphämtning. Ni kommer överens om plats
                  och tid via meddelanden efter köpet.
                </p>
              </Section>
            )}

            {/* Betalmetod */}
            <Section title="Betalningsmetod" icon={<Lock className="h-4 w-4" />}>
              <div className="grid gap-2">
                <PaymentOption
                  active={paymentMethod === "klarna"}
                  onClick={() => setPaymentMethod("klarna")}
                  label="Klarna"
                  hint="Betala nu, om 30 dagar eller dela upp"
                />
                <PaymentOption
                  active={paymentMethod === "card"}
                  onClick={() => setPaymentMethod("card")}
                  label="Kort"
                  hint="Visa, Mastercard, Amex"
                />
                <PaymentOption
                  active={paymentMethod === "swish"}
                  onClick={() => setPaymentMethod("swish")}
                  label="Swish"
                  hint="Direkt från din bank"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Detta är en testkassa — ingen riktig betalning genomförs än.
              </p>
            </Section>

            {/* Köpar- och säljarskydd */}
            <Section title="ReWoke köpar- och säljarskydd" icon={<ShieldCheck className="h-4 w-4" />}>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>• När betalning aktiveras hanteras betalningen via ReWoke enligt våra villkor</li>
                <li>• Spårbar frakt krävs för fullt leveransskydd</li>
                <li>• Vid problem granskas bevis från köpare, säljare och transportör</li>
                <li>• Återbetalning sker inte automatiskt utan tvistgranskning</li>
              </ul>
            </Section>
          </div>

          {/* RIGHT — summary */}
          <aside className="lg:sticky lg:top-6 lg:self-start space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex gap-4">
                <div className="h-24 w-20 overflow-hidden rounded-lg bg-muted shrink-0">
                  {img ? (
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{order.listing?.title ?? "Plagg"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Säljs av {sellerName}
                  </p>
                  <p className="font-display text-lg mt-2">{formatSEK(order.item_price)}</p>
                </div>
              </div>

              <div className="border-t border-border mt-4 pt-4 space-y-2 text-sm">
                <Row label="Vara" value={formatSEK(order.item_price)} />
                <Row
                  label="Frakt"
                  value={order.shipping_price > 0 ? formatSEK(order.shipping_price) : "0 kr"}
                />
                {order.platform_fee > 0 && (
                  <Row label="Plattformsavgift" value={formatSEK(order.platform_fee)} />
                )}
                <div className="border-t border-border pt-3 mt-3 flex justify-between font-display text-lg">
                  <span>Totalt</span>
                  <span>{formatSEK(order.total_amount)}</span>
                </div>
              </div>

              <label className="mt-4 flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                <span>
                  Jag godkänner ReWokes{" "}
                  <Link to="/terms" className="underline hover:text-foreground">
                    villkor
                  </Link>{" "}
                  och{" "}
                  <Link to="/privacy" className="underline hover:text-foreground">
                    integritetspolicy
                  </Link>
                  .
                </span>
              </label>

              <button
                onClick={handlePay}
                disabled={paying || !canPay}
                className="mt-4 w-full rounded-full bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground shadow-card transition-opacity disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
                title={
                  !acceptTerms
                    ? "Du måste godkänna villkoren först"
                    : !addressValid
                      ? "Fyll i leveransadressen först"
                      : undefined
                }
              >
                {paying ? "Behandlar..." : `Testbetala ${formatSEK(order.total_amount)}`}
              </button>

              <p className="mt-3 text-center text-xs text-muted-foreground inline-flex items-center justify-center gap-1.5 w-full">
                <Lock className="h-3 w-3" /> Testkassa · ingen riktig debitering
              </p>
            </div>
          </aside>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-lg mb-4">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary ${
          error ? "border-destructive" : "border-border"
        }`}
      />
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function PaymentOption({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-lg border p-3.5 text-left transition-colors ${
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:border-foreground/30"
      }`}
    >
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
      </div>
      <span
        className={`h-4 w-4 rounded-full border-2 ${
          active ? "border-primary bg-primary" : "border-border"
        }`}
      />
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
