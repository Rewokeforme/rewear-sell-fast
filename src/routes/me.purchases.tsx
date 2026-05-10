import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { getMyPurchases, type OrderWithListing } from "@/lib/orders";
import { getReviewsForOrders, type ReviewRow } from "@/lib/reviews";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { TestPaymentBanner } from "@/components/TestPaymentBanner";
import { formatSEK } from "@/lib/rewear";
import { Package, Star } from "lucide-react";

export const Route = createFileRoute("/me/purchases")({
  component: MyPurchasesPage,
});

function MyPurchasesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithListing[]>([]);
  const [reviews, setReviews] = useState<Record<string, ReviewRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    getMyPurchases(user.id).then(async (o) => {
      setOrders(o);
      const eligible = o
        .filter((x) => x.status === "delivered" || x.status === "completed")
        .map((x) => x.id);
      setReviews(await getReviewsForOrders(eligible, user.id));
      setLoading(false);
    });
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Mina köp" />
      <main className="mx-auto max-w-2xl px-4 py-4 space-y-3">
        <TestPaymentBanner variant="buyer" />
        {loading ? (
          <p className="text-sm text-muted-foreground">Laddar...</p>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Du har inga köp än.</p>
            <Link to="/" className="mt-4 inline-block text-sm text-primary underline">Hitta plagg</Link>
          </div>
        ) : (
          orders.map((o) => {
            const img = [...(o.listing?.listing_images ?? [])].sort((a, b) => a.position - b.position)[0];
            return (
              <Link
                key={o.id}
                to="/orders/$orderId"
                params={{ orderId: o.id }}
                className="flex gap-3 rounded-xl border border-border bg-card p-3 transition hover:bg-secondary"
              >
                <div className="h-20 w-16 overflow-hidden rounded-lg bg-muted shrink-0">
                  {img && <img src={img.url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{o.listing?.title ?? "Plagg"}</p>
                  <p className="text-xs text-muted-foreground">
                    Säljare: {o.seller?.full_name ?? "Säljare"}
                  </p>
                  <p className="text-sm mt-1">{formatSEK(o.total_amount)}</p>
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <OrderStatusBadge status={o.status} isMock={o.is_mock_payment} />
                    {!["delivered", "completed", "cancelled", "refunded"].includes(o.status) && (
                      <span className="text-[11px] text-muted-foreground">
                        {o.delivery_method === "shipping" && "Skickas"}
                        {o.delivery_method === "pickup" && "Hämtas"}
                        {o.delivery_method === "both" && "Skickas/hämtas"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {o.status === "pending_payment" && "Väntar på betalning"}
                    {o.status === "paid" && "Väntar på att säljaren skickar"}
                    {o.status === "shipped" && "Skickad – bekräfta när du mottagit varan"}
                    {o.status === "delivered" &&
                      (reviews[o.id] ? "Granskningsperiod pågår" : "Granskningsperiod pågår – betygsätt säljaren")}
                    {o.status === "completed" && (reviews[o.id] ? "Slutförd" : "Slutförd – betygsätt säljaren")}
                    {o.status === "disputed" && "Tvist pågår"}
                    {o.status === "cancelled" && "Avbruten"}
                    {o.status === "refunded" && "Återbetald"}
                  </p>
                  {(o.status === "delivered" || o.status === "completed") && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium">
                      <Star className="h-3 w-3" />
                      {reviews[o.id] ? `Betyg lämnat (${reviews[o.id].rating}/5)` : "Betygsätt säljaren"}
                    </p>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </main>
      <BottomNav />
    </div>
  );
}
