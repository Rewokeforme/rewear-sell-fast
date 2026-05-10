import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { getMyPurchases, type OrderWithListing } from "@/lib/orders";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { TestPaymentBanner } from "@/components/TestPaymentBanner";
import { formatSEK } from "@/lib/rewear";
import { Package } from "lucide-react";

export const Route = createFileRoute("/me/purchases")({
  component: MyPurchasesPage,
});

function MyPurchasesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    getMyPurchases(user.id).then((o) => {
      setOrders(o);
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
                  <div className="mt-1.5 flex items-center gap-2">
                    <OrderStatusBadge status={o.status} isMock={o.is_mock_payment} />
                    <span className="text-[11px] text-muted-foreground">
                      {o.delivery_method === "shipping" && "Skickas"}
                      {o.delivery_method === "pickup" && "Hämtas"}
                      {o.delivery_method === "both" && "Skickas/hämtas"}
                    </span>
                  </div>
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
