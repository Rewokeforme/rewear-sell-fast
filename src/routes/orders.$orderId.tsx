import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { getOrder, updateOrderStatus, type OrderStatus, type OrderWithListing } from "@/lib/orders";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatSEK } from "@/lib/rewear";

export const Route = createFileRoute("/orders/$orderId")({
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    const o = await getOrder(orderId);
    setOrder(o);
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, user, authLoading]);

  async function transition(next: OrderStatus, label: string) {
    if (!order) return;
    setBusy(true);
    const { error } = await updateOrderStatus(order.id, next);
    if (error) toast.error(error);
    else {
      toast.success(label);
      await load();
    }
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header subtitle="Order" />
        <p className="px-4 py-6 text-sm text-muted-foreground">Laddar...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header subtitle="Order" />
        <p className="px-4 py-6 text-sm text-muted-foreground">Ordern hittades inte.</p>
      </div>
    );
  }

  const isBuyer = user?.id === order.buyer_id;
  const isSeller = user?.id === order.seller_id;
  const img = [...(order.listing?.listing_images ?? [])].sort((a, b) => a.position - b.position)[0];

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header subtitle="Order" />
      <main className="mx-auto max-w-md px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Order #{order.id.slice(0, 8)}
          </p>
          <OrderStatusBadge status={order.status} />
        </div>

        <Link
          to="/listing/$id"
          params={{ id: order.listing_id }}
          className="flex gap-3 rounded-xl border border-border bg-card p-3"
        >
          <div className="h-20 w-16 overflow-hidden rounded-lg bg-muted shrink-0">
            {img && <img src={img.url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="flex-1">
            <p className="font-medium">{order.listing?.title ?? "Plagg"}</p>
            <p className="text-xs text-muted-foreground">
              {isBuyer ? `Säljare: ${order.seller?.full_name ?? "Säljare"}` : `Köpare: ${order.buyer?.full_name ?? "Köpare"}`}
            </p>
          </div>
        </Link>

        <div className="rounded-xl border border-border bg-card p-4 text-sm space-y-1.5">
          <Row label="Vara" value={formatSEK(order.item_price)} />
          <Row label="Frakt" value={order.shipping_price > 0 ? formatSEK(order.shipping_price) : "0 kr"} />
          {order.platform_fee > 0 && <Row label="Avgift" value={formatSEK(order.platform_fee)} />}
          <div className="border-t border-border pt-2 mt-2 flex justify-between font-medium">
            <span>Totalt</span>
            <span>{formatSEK(order.total_amount)}</span>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Leverans:{" "}
            {order.delivery_method === "shipping" && "Skickas"}
            {order.delivery_method === "pickup" && "Lokal upphämtning"}
            {order.delivery_method === "both" && "Skickas eller hämtas"}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {isBuyer && order.status === "pending_payment" && (
            <Link
              to="/checkout/$orderId"
              params={{ orderId: order.id }}
              className="block w-full rounded-full bg-primary px-5 py-3 text-center text-sm font-medium text-primary-foreground"
            >
              Fortsätt till betalning
            </Link>
          )}
          {isSeller && order.status === "paid" && (
            <button
              disabled={busy}
              onClick={() => transition("shipped", "Markerad som skickad")}
              className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Markera som skickad
            </button>
          )}
          {isBuyer && order.status === "shipped" && (
            <button
              disabled={busy}
              onClick={() => transition("delivered", "Mottagen")}
              className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Bekräfta mottagen
            </button>
          )}
          {isBuyer && order.status === "delivered" && (
            <button
              disabled={busy}
              onClick={() => transition("completed", "Order slutförd")}
              className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Slutför ordern
            </button>
          )}
          {isSeller && (order.status === "pending_payment" || order.status === "paid") && (
            <button
              disabled={busy}
              onClick={() => transition("cancelled", "Order avbruten")}
              className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm font-medium disabled:opacity-60"
            >
              Avbryt order
            </button>
          )}
          {isBuyer && order.status === "pending_payment" && (
            <button
              disabled={busy}
              onClick={() => transition("cancelled", "Order avbruten")}
              className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm font-medium disabled:opacity-60"
            >
              Avbryt
            </button>
          )}
          {isBuyer && (order.status === "paid" || order.status === "shipped" || order.status === "delivered") && (
            <button
              disabled={busy}
              onClick={() => transition("disputed", "Tvist öppnad")}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Öppna tvist
            </button>
          )}
        </div>
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
