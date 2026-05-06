import { BadgeCheck, Crown, ShieldCheck, Sparkles, Star } from "lucide-react";
import type { SellerBadge } from "@/lib/rewoke";
import { cn } from "@/lib/utils";

type Props = {
  badges: Exclude<SellerBadge, null>[];
  size?: "sm" | "md";
  className?: string;
};

const STYLE: Record<
  Exclude<SellerBadge, null>,
  { icon: React.ComponentType<{ className?: string }>; cls: string }
> = {
  "Premium Seller": {
    icon: Crown,
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  "Betrodd säljare": {
    icon: Star,
    cls: "border-primary/30 bg-primary/10 text-primary",
  },
  "ID-verifierad": {
    icon: BadgeCheck,
    cls: "border-primary/30 bg-primary/10 text-primary",
  },
  "Verifierad profil": {
    icon: ShieldCheck,
    cls: "border-border bg-secondary text-foreground",
  },
  "Ny säljare": {
    icon: Sparkles,
    cls: "border-border bg-card text-muted-foreground",
  },
};

export function TrustBadges({ badges, size = "sm", className }: Props) {
  if (!badges.length) return null;
  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {badges.map((b) => {
        const { icon: Icon, cls } = STYLE[b];
        return (
          <span
            key={b}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border font-medium",
              padding,
              cls,
            )}
          >
            <Icon className={iconSize} />
            {b}
          </span>
        );
      })}
    </div>
  );
}
