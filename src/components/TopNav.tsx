import { Link, useLocation } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/lib/notifications";

const items = [
  { to: "/", label: "Hem" },
  { to: "/search", label: "Sök" },
  { to: "/sell", label: "Sälj" },
  { to: "/inbox", label: "Inkorg" },
  { to: "/me", label: "Profil" },
] as const;

export function TopNav() {
  const { pathname } = useLocation();
  const unread = useUnreadNotifications();
  return (
    <nav className="hidden md:flex items-center gap-1">
      {items.map(({ to, label }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        const badge = to === "/inbox" && unread > 0;
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {badge && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-accent-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        );
      })}
      <Link
        to="/notifications"
        className={cn(
          "relative ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          pathname.startsWith("/notifications")
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-label="Notiser"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-background" />
        )}
      </Link>
    </nav>
  );
}
