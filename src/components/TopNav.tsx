import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Hem" },
  { to: "/search", label: "Sök" },
  { to: "/sell", label: "Sälj" },
  { to: "/inbox", label: "Inkorg" },
  { to: "/me", label: "Profil" },
] as const;

export function TopNav() {
  const { pathname } = useLocation();
  return (
    <nav className="hidden md:flex items-center gap-1">
      {items.map(({ to, label }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
