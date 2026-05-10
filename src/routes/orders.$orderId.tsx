import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { TestPaymentBanner } from "@/components/TestPaymentBanner";
import {
  ProtectionSummary,
  SellerProtection,
  BuyerProtection,
} from "@/components/ProtectionInfo";
import { DisputeDialog } from "@/components/DisputeDialog";
import { getDisputeForOrder, type DisputeRow, type DisputeStatus } from "@/lib/disputes";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getOrder,
  updateOrderStatus,
  updateOrderTracking,
  confirmPickupHandover,
  type OrderStatus,
  type OrderWithListing,
} from "@/lib/orders";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { ShipOrderForm } from "@/components/ShipOrderForm";
import { formatSEK } from "@/lib/rewear";
import { MessageCircle, Truck, CheckCircle2 } from "lucide-react";

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
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [dispute, setDispute] = useState<DisputeRow | null>(null);

  async function load() {
    const o = await getOrder(orderId);
    setOrder(o);
    if (o) {
      setCarrier(o.carrier ?? "");
      setTrackingNumber(o.tracking_number ?? "");
      const d = await getDisputeForOrder(o.id);
      setDispute(d);
    }
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

  async function handleMarkShipped() {
    if (!order) return;
    if (order.delivery_method === "shipping") {
      if (!carrier.trim() || !trackingNumber.trim()) {
        toast.error("Fyll i transportör och spårningsnummer");
        return;
      }
      setBusy(true);
      const { error: tErr } = await updateOrderTracking(
        order.id,
        carrier.trim(),
        trackingNumber.trim(),
      );
      if (tErr) {
        toast.error(tErr);
        setBusy(false);
        return;
      }
    }
    await transition("shipped", "Markerad som skickad");
  }

  async function handlePickupConfirm(role: "buyer" | "seller") {
    if (!order) return;
    setBusy(true);
    const { error } = await confirmPickupHandover(order.id, role);
    if (error) toast.error(error);
    else {
      toast.success("Bekräftelse registrerad");
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
  const isPickup = order.delivery_method === "pickup";

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header subtitle="Order" />
      <main className="mx-auto max-w-md px-4 py-5 space-y-4">
        {(order.is_mock_payment ||
          ["pending_payment", "paid", "shipped", "delivered"].includes(order.status)) && (
          <TestPaymentBanner variant={isSeller ? "seller" : "buyer"} />
        )}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Order #{order.id.slice(0, 8)}
          </p>
          <OrderStatusBadge status={order.status} isMock={order.is_mock_payment} />
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

        {/* Tracking info (visible when set) */}
        {(order.tracking_number || order.carrier) && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm space-y-1">
            <p className="font-medium flex items-center gap-2">
              <Truck className="h-4 w-4" /> Spårning
            </p>
            {order.carrier && <p className="text-muted-foreground">Transportör: {order.carrier}</p>}
            {order.tracking_number && (
              <p className="text-muted-foreground">Spårningsnr: {order.tracking_number}</p>
            )}
            {order.shipped_at && (
              <p className="text-xs text-muted-foreground">
                Skickad: {new Date(order.shipped_at).toLocaleString("sv-SE")}
              </p>
            )}
            {order.delivered_at && (
              <p className="text-xs text-muted-foreground">
                Levererad: {new Date(order.delivered_at).toLocaleString("sv-SE")}
              </p>
            )}
          </div>
        )}

        {/* Leveransinformation för säljare när order är betald eller senare */}
        {isSeller &&
          ["paid", "shipped", "delivered", "completed", "disputed"].includes(order.status) &&
          order.delivery_method !== "pickup" &&
          order.shipping_full_name && (
            <div className="rounded-xl border border-border bg-card p-4 text-sm space-y-1">
              <p className="font-medium mb-1">Leveransinformation</p>
              <p>{order.shipping_full_name}</p>
              <p>{order.shipping_street}</p>
              <p>
                {order.shipping_postal_code} {order.shipping_city}
              </p>
              {order.shipping_phone && (
                <p className="text-muted-foreground">Tel: {order.shipping_phone}</p>
              )}
            </div>
          )}

        {/* Kontakta motpart */}
        {(isBuyer || isSeller) && (
          <button
            onClick={async () => {
              if (!user) return;
              const otherId = isBuyer ? order.seller_id : order.buyer_id;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const sb = supabase as any;
              const { data: existing } = await sb
                .from("conversations")
                .select("id")
                .eq("listing_id", order.listing_id)
                .eq("buyer_id", order.buyer_id)
                .eq("seller_id", order.seller_id)
                .maybeSingle();
              let convId: string | undefined = existing?.id;
              if (!convId) {
                const { data: created, error } = await sb
                  .from("conversations")
                  .insert({
                    listing_id: order.listing_id,
                    buyer_id: order.buyer_id,
                    seller_id: order.seller_id,
                  })
                  .select("id")
                  .single();
                if (error) {
                  toast.error(error.message);
                  return;
                }
                convId = created.id;
              }
              if (convId) {
                navigate({ to: "/inbox/$conversationId", params: { conversationId: convId } });
              }
              void otherId;
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium"
          >
            <MessageCircle className="h-4 w-4" />
            {isBuyer ? "Kontakta säljare" : "Kontakta köpare"}
          </button>
        )}

        {/* Seller ship form — replaces the old inline button */}
        {isSeller && order.status === "paid" && !isPickup && (
          <ShipOrderForm order={order} onShipped={load} />
        )}

        {/* Buyer shipping notice */}
        {isBuyer &&
          order.delivery_method === "shipping" &&
          ["paid", "shipped"].includes(order.status) &&
          !order.tracking_number && (
            <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
              Säljaren ansvarar för att skicka varan med spårbar frakt. ReWoke visar
              spårningsinformation när säljaren har lagt in den.
            </div>
          )}

        {/* Pickup handover — dual confirmation */}
        {isPickup && ["paid"].includes(order.status) && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm space-y-3">
            <p className="font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Bekräfta överlämning
            </p>
            <p className="text-xs text-muted-foreground">
              Båda parter behöver bekräfta för att ordern ska räknas som levererad.
            </p>
            <div className="flex gap-2 text-xs">
              <span
                className={`flex-1 rounded-lg border px-2 py-1.5 text-center ${
                  order.seller_handover_confirmed_at
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                Säljare {order.seller_handover_confirmed_at ? "✓" : "väntar"}
              </span>
              <span
                className={`flex-1 rounded-lg border px-2 py-1.5 text-center ${
                  order.buyer_handover_confirmed_at
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                Köpare {order.buyer_handover_confirmed_at ? "✓" : "väntar"}
              </span>
            </div>
            {isSeller && !order.seller_handover_confirmed_at && (
              <button
                disabled={busy}
                onClick={() => handlePickupConfirm("seller")}
                className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                Bekräfta överlämnat
              </button>
            )}
            {isBuyer && !order.buyer_handover_confirmed_at && (
              <button
                disabled={busy}
                onClick={() => handlePickupConfirm("buyer")}
                className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                Bekräfta mottaget
              </button>
            )}
          </div>
        )}

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
          {isBuyer && order.status === "shipped" && (
            <button
              disabled={busy}
              onClick={() => transition("delivered", "Mottagen")}
              className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Bekräfta mottagen
            </button>
          )}
          {isBuyer && order.status === "delivered" && (() => {
            const deadline = order.buyer_review_deadline
              ? new Date(order.buyer_review_deadline)
              : null;
            const now = new Date();
            const deadlinePassed = deadline ? now >= deadline : false;
            const activeDispute =
              dispute &&
              (
                ["open", "awaiting_buyer_evidence", "awaiting_seller_response", "under_review"] as DisputeStatus[]
              ).includes(dispute.status);
            const canComplete = deadlinePassed && !activeDispute;
            return (
              <div className="space-y-2">
                <button
                  disabled={busy || !canComplete}
                  onClick={() => transition("completed", "Order slutförd")}
                  className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {canComplete ? "Slutför ordern" : "Slutför ordern efter granskningsperioden"}
                </button>
                <p className="text-xs text-muted-foreground">
                  Du har 48 timmar från bekräftad leverans att kontrollera varan och rapportera problem.
                </p>
                {deadline && (
                  <p className="text-xs text-muted-foreground">
                    Granskningsperioden slutar:{" "}
                    {deadline.toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                )}
                {activeDispute && (
                  <p className="text-xs text-destructive">
                    Tvist pågår — ordern kan inte slutföras förrän tvisten är löst.
                  </p>
                )}
              </div>
            );
          })()}
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
          {(isBuyer || isSeller) &&
            ["paid", "shipped", "delivered"].includes(order.status) &&
            (() => {
              const activeDispute =
                dispute &&
                (
                  ["open", "awaiting_buyer_evidence", "awaiting_seller_response", "under_review"] as DisputeStatus[]
                ).includes(dispute.status);
              if (activeDispute) {
                return (
                  <p className="w-full text-center text-xs text-muted-foreground">
                    Tvist pågår (status: {dispute!.status})
                  </p>
                );
              }
              return (
                <button
                  disabled={busy}
                  onClick={() => setShowDispute(true)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Öppna tvist
                </button>
              );
            })()}
        </div>

        {/* Protection blocks */}
        <ProtectionSummary />
        <SellerProtection />
        <BuyerProtection />
      </main>

      {showDispute && user && (
        <DisputeDialog
          order={order}
          userId={user.id}
          role={isBuyer ? "buyer" : "seller"}
          onClose={() => setShowDispute(false)}
          onCreated={load}
        />
      )}

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
