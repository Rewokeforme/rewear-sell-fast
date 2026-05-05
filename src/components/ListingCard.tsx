import { Link } from "@tanstack/react-router";
import { Heart, Leaf, MapPin, Truck, Handshake } from "lucide-react";
import { useState } from "react";
import { formatSEK } from "@/lib/rewear";
import { cn } from "@/lib/utils";
import type { ListingWithDetails } from "@/lib/database.types";

export function ListingCard({ listing }: { listing: ListingWithDetails }) {
  const cover = listing.listing_images?.[0]?.url;
  const [fav, setFav] = useState(false);
  const isDemo = listing.id.startsWith("demo-");

  const inner = (
    <>
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

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setFav((f) => !f);
          }}
          aria-label="Spara som favorit"
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/85 text-foreground backdrop-blur transition hover:bg-background"
        >
          <Heart className={cn("h-4 w-4", fav && "fill-accent text-accent")} />
        </button>

        {listing.co2_saved_kg > 0 && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur">
            <Leaf className="h-3 w-3 text-primary" />−{Math.round(Number(listing.co2_saved_kg))} kg CO₂
          </span>
        )}
      </div>
      <div className="mt-2.5 space-y-0.5">
        {listing.brand && (
          <p className="text-eyebrow text-muted-foreground">{listing.brand}</p>
        )}
        <p className="line-clamp-1 text-sm font-medium">{listing.title}</p>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs text-muted-foreground">{listing.size ?? "–"}</span>
          <span className="font-display text-sm text-primary">
            {formatSEK(listing.price_sek)}
          </span>
        </div>
        {(listing.city || listing.delivery_method) && (
          <div className="flex items-center justify-between pt-0.5 text-[11px] text-muted-foreground">
            {listing.city ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {listing.city}
              </span>
            ) : <span />}
            {listing.delivery_method === "shipping" && <Truck className="h-3 w-3" aria-label="Skickas" />}
            {listing.delivery_method === "pickup" && <Handshake className="h-3 w-3" aria-label="Lokal upphämtning" />}
            {listing.delivery_method === "both" && (
              <span className="inline-flex items-center gap-0.5"><Truck className="h-3 w-3" /><Handshake className="h-3 w-3" /></span>
            )}
          </div>
        )}
      </div>
    </>
  );

  if (isDemo) {
    return <div className="group block cursor-default">{inner}</div>;
  }

  return (
    <Link to="/listing/$id" params={{ id: listing.id }} className="group block">
      {inner}
    </Link>
  );
}
