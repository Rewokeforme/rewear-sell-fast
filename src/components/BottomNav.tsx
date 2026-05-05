import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, PlusSquare, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/lib/notifications";

type Item = { to: "/" | "/search" | "/sell" | "/inbox" | "/me"; label: string; icon: typeof Home; cta?: boolean };
const items: Item[] = [
  { to: "/", label: "Hem", icon: Home },
  { to: "/search", label: "Sök", icon: Search },
  { to: "/sell", label: "Sälj", icon: PlusSquare, cta: true },
  { to: "/inbox", label: "Inkorg", icon: MessageCircle },
  { to: "/me", label: "Profil", icon: User },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const unread = useUnreadNotifications();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, cta }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const showBadge = to === "/inbox" && unread > 0;
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {cta ? (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-card -mt-3 ring-4 ring-background">
                    <Icon className="h-5 w-5" />
                  </span>
                ) : (
                  <span className="relative">
                    <Icon className="h-5 w-5" />
                    {showBadge && (
                      <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-accent-foreground">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </span>
                )}
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
