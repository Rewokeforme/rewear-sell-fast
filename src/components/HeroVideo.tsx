import { useEffect, useRef, useState } from "react";
import {
  heroVideoUrl,
  heroVideoUrlWebm,
  heroFallbackImage,
  heroPoster,
} from "@/lib/heroConfig";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const showVideo = !!heroVideoUrl && !failed && !reducedMotion;

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2.5rem] bg-muted shadow-card md:aspect-[5/6]">
      {showVideo ? (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={heroPoster}
          onError={() => setFailed(true)}
        >
          {heroVideoUrlWebm && <source src={heroVideoUrlWebm} type="video/webm" />}
          {heroVideoUrl && <source src={heroVideoUrl} type="video/mp4" />}
        </video>
      ) : (
        <img
          src={heroFallbackImage}
          alt="Skandinavisk garderob med vintageplagg"
          className="h-full w-full object-cover"
          loading="eager"
        />
      )}

      {/* Soft vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

      {/* Floating overlay chips */}
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2 md:left-6 md:top-6">
        <span className="rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-soft backdrop-blur">
          AI föreslår pris
        </span>
      </div>
      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 md:right-6">
        <span className="rounded-full bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background shadow-soft backdrop-blur">
          Publicera på under en minut
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 md:bottom-6 md:left-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-3 py-1.5 text-xs font-semibold text-[var(--cream)] shadow-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--cream)]" />
          −8 kg CO₂
        </span>
      </div>
    </div>
  );
}
