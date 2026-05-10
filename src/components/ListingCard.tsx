import { Link } from "@tanstack/react-router";
import { Heart, Leaf, MapPin, Truck, Handshake, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { formatSEK } from "@/lib/rewear";
import { formatSizeForDisplay } from "@/lib/fitMatch";
import { cn } from "@/lib/utils";
import type { ListingWithDetails } from "@/lib/database.types";

function conditionLabel(c: string | null) {
  if (!c) return null;
  const map: Record<string, string> = {
    new: "Nytt",
    "like-new": "Som nytt",
    excellent: "Mycket bra",
    good: "Bra",
    fair: "Slitet",
  };
  return map[c] ?? c;
}

export function ListingCard({ listing }: { listing: ListingWithDetails }) {
  const cover = listing.listing_images?.[0]?.url;
  const [fav, setFav] = useState(false);
  const isDemo = listing.id.startsWith("demo-");
  const cond = conditionLabel(listing.condition);
  const sizeDisp = formatSizeForDisplay({
    sizeType: listing.size_type,
    sizeLabel: listing.size_label,
    size: listing.size,
    shoeSize: listing.shoe_size,
    waistSize: listing.waist_size,
    lengthSize: listing.length_size,
  });
  const sellerVerified = Boolean(listing.profiles?.is_verified);

  const inner = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Ingen bild
          </div>
        )}

        {/* Gradient for legibility of badges */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-foreground/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setFav((f) => !f);
          }}
          aria-label="Spara som favorit"
          className="absolute right-2.5 top-2.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-soft backdrop-blur-md transition hover:scale-105 hover:bg-background"
        >
          <Heart className={cn("h-4 w-4 transition", fav && "fill-accent text-accent")} />
        </button>

        {/* Top-left badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
          {cond && (
            <span className="inline-flex items-center rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground shadow-soft backdrop-blur-md">
              {cond}
            </span>
          )}
        </div>

        {/* Bottom-left badges */}
        <div className="absolute bottom-2.5 left-2.5 flex flex-wrap items-center gap-1">
          {listing.co2_saved_kg > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-soft backdrop-blur-md">
              <Leaf className="h-3 w-3 text-primary" />
              −{Math.round(Number(listing.co2_saved_kg))} kg
            </span>
          )}
          {(listing.delivery_method === "shipping" || listing.delivery_method === "both") && (
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow-soft backdrop-blur-md"
              aria-label="Skickas"
              title="Skickas"
            >
              <Truck className="h-3 w-3" />
            </span>
          )}
          {(listing.delivery_method === "pickup" || listing.delivery_method === "both") && (
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow-soft backdrop-blur-md"
              aria-label="Lokal upphämtning"
              title="Lokal upphämtning"
            >
              <Handshake className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 px-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="line-clamp-1 font-display text-[15px] leading-tight text-foreground">
            {listing.title}
          </h3>
          <span className="shrink-0 font-display text-[15px] font-medium text-foreground">
            {formatSEK(listing.price_sek)}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {listing.brand && (
            <>
              <span className="truncate font-medium uppercase tracking-wider text-foreground/70">
                {listing.brand}
              </span>
              <span aria-hidden>·</span>
            </>
          )}
          {listing.size && <span>Stl {listing.size}</span>}
          {listing.city && (
            <>
              {listing.size && <span aria-hidden>·</span>}
              <span className="inline-flex items-center gap-0.5 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {listing.city}
              </span>
            </>
          )}
        </div>
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
