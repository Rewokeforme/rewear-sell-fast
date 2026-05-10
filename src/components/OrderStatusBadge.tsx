import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";

const STYLE: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-900 border-amber-200",
  paid: "bg-blue-100 text-blue-900 border-blue-200",
  shipped: "bg-indigo-100 text-indigo-900 border-indigo-200",
  delivered: "bg-violet-100 text-violet-900 border-violet-200",
  completed: "bg-emerald-100 text-emerald-900 border-emerald-200",
  cancelled: "bg-muted text-muted-foreground border-border",
  disputed: "bg-orange-100 text-orange-900 border-orange-200",
  refunded: "bg-muted text-muted-foreground border-border",
};

export function OrderStatusBadge({ status, isMock }: { status: OrderStatus; isMock?: boolean | null }) {
  const showMock = isMock && (status === "paid" || status === "shipped" || status === "delivered" || status === "completed");
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLE[status]}`}
    >
      {ORDER_STATUS_LABEL[status]}
      {showMock && (
        <span className="ml-1 rounded-full bg-amber-200 text-amber-900 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide">
          Test
        </span>
      )}
    </span>
  );
}
