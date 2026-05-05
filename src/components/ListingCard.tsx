import { Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import { formatSEK } from "@/lib/rewear";
import type { ListingWithDetails } from "@/lib/database.types";

export function ListingCard({ listing }: { listing: ListingWithDetails }) {
  const cover = listing.listing_images?.[0]?.url;
  return (
    <Link
      to="/listing/$id"
      params={{ id: listing.id }}
      className="group block"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Ingen bild
          </div>
        )}
        {listing.co2_saved_kg > 0 && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-primary-foreground backdrop-blur">
            <Leaf className="h-3 w-3" />−{Math.round(Number(listing.co2_saved_kg))} kg CO₂
          </span>
        )}
      </div>
      <div className="mt-2 space-y-0.5">
        {listing.brand && (
          <p className="text-eyebrow text-muted-foreground">{listing.brand}</p>
        )}
        <p className="line-clamp-1 text-sm font-medium">{listing.title}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{listing.size ?? "–"}</span>
          <span className="font-display text-sm text-foreground">
            {formatSEK(listing.price_sek)}
          </span>
        </div>
      </div>
    </Link>
  );
}
