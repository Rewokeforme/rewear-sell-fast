import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { getMySales, updateOrderStatus, type OrderWithListing } from "@/lib/orders";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { TestPaymentBanner } from "@/components/TestPaymentBanner";
import { formatSEK } from "@/lib/rewear";
import { Package } from "lucide-react";

export const Route = createFileRoute("/me/sales")({
  component: MySalesPage,
});

function MySalesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithListing[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    const o = await getMySales(user.id);
    setOrders(o);
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
  }, [user, authLoading]);

  async function markShipped(id: string) {
    const { error } = await updateOrderStatus(id, "shipped");
    if (error) toast.error(error);
    else {
      toast.success("Markerad som skickad");
      load();
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Mina försäljningar" />
      <main className="mx-auto max-w-2xl px-4 py-4 space-y-3">
        <TestPaymentBanner variant="seller" />
        {loading ? (
          <p className="text-sm text-muted-foreground">Laddar...</p>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Inga försäljningar än.</p>
          </div>
        ) : (
          orders.map((o) => {
            const img = [...(o.listing?.listing_images ?? [])].sort((a, b) => a.position - b.position)[0];
            return (
              <div key={o.id} className="rounded-xl border border-border bg-card p-3">
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="flex gap-3"
                >
                  <div className="h-20 w-16 overflow-hidden rounded-lg bg-muted shrink-0">
                    {img && <img src={img.url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{o.listing?.title ?? "Plagg"}</p>
                    <p className="text-xs text-muted-foreground">
                      Köpare: {o.buyer?.full_name ?? "Köpare"}
                    </p>
                    <p className="text-sm mt-1">{formatSEK(o.total_amount)}</p>
                    <div className="mt-1.5">
                      <OrderStatusBadge status={o.status} isMock={o.is_mock_payment} />
                    </div>
                  </div>
                </Link>
                {o.status === "paid" && (
                  <button
                    onClick={() => markShipped(o.id)}
                    className="mt-3 w-full rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Markera som skickad
                  </button>
                )}
              </div>
            );
          })
        )}
      </main>
      <BottomNav />
    </div>
  );
}
