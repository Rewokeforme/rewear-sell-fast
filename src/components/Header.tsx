import { Link } from "@tanstack/react-router";
import { TopNav } from "./TopNav";

export function Header({ subtitle }: { subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl tracking-tight">Rewear</span>
          <span className="text-eyebrow text-primary">SE</span>
        </Link>
        <TopNav />
        {subtitle && (
          <span className="text-xs text-muted-foreground md:hidden">{subtitle}</span>
        )}
      </div>
    </header>
  );
}
