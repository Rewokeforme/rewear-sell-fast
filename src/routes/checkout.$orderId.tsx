import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { getOrder, updateOrderStatus, type OrderWithListing } from "@/lib/orders";
import { formatSEK } from "@/lib/rewear";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/checkout/$orderId")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { orderId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    getOrder(orderId).then((o) => {
      setOrder(o);
      setLoading(false);
    });
  }, [orderId, user, authLoading, navigate]);

  async function handlePay() {
    if (!order) return;
    setPaying(true);
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
        <div className="mx-auto max-w-md px-4 py-12 text-center">
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

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header subtitle="Kassa" />
      <main className="mx-auto max-w-md px-4 py-6 space-y-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex gap-3">
            <div className="h-20 w-16 overflow-hidden rounded-lg bg-muted shrink-0">
              {img && <img src={img.url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1">
              <p className="font-medium">{order.listing?.title ?? "Plagg"}</p>
              <p className="text-xs text-muted-foreground">
                Säljare: {order.seller?.full_name ?? "Säljare"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
          <Row label="Vara" value={formatSEK(order.item_price)} />
          <Row label="Frakt" value={order.shipping_price > 0 ? formatSEK(order.shipping_price) : "Ingår / 0 kr"} />
          {order.platform_fee > 0 && <Row label="Plattformsavgift" value={formatSEK(order.platform_fee)} />}
          <div className="border-t border-border pt-2 mt-2 flex justify-between font-medium">
            <span>Totalt</span>
            <span>{formatSEK(order.total_amount)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Leveranssätt:{" "}
            {order.delivery_method === "shipping" && "Skickas"}
            {order.delivery_method === "pickup" && "Lokal upphämtning"}
            {order.delivery_method === "both" && "Skickas eller hämtas"}
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
          Detta är en testkassa. Inga riktiga pengar hanteras än — knappen nedan
          markerar bara ordern som betald.
        </div>

        <button
          onClick={handlePay}
          disabled={paying}
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-card disabled:opacity-60"
        >
          {paying ? "Behandlar..." : "Fortsätt till betalning"}
        </button>
      </main>
      <BottomNav />
    </div>
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
