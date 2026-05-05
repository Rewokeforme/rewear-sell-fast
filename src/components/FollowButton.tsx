import { useFollow } from "@/lib/follows";
import { cn } from "@/lib/utils";
import { Check, UserPlus } from "lucide-react";

export function FollowButton({
  sellerId,
  size = "default",
  className,
}: {
  sellerId: string | null | undefined;
  size?: "sm" | "default";
  className?: string;
}) {
  const { following, toggle, busy, canFollow } = useFollow(sellerId);
  if (!canFollow) return null;

  const base =
    size === "sm"
      ? "text-xs px-3 py-1 gap-1"
      : "text-sm px-4 py-2 gap-1.5";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      disabled={busy}
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-medium transition disabled:opacity-50",
        following
          ? "border-border bg-card text-foreground hover:bg-secondary"
          : "border-foreground bg-foreground text-background hover:opacity-90",
        base,
        className,
      )}
    >
      {following ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {following ? "Följer" : "Följ"}
    </button>
  );
}
