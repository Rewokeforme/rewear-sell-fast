/**
 * Hero video configuration.
 *
 * Set heroVideoUrl to a hosted video URL (Supabase Storage, CDN, etc).
 * Optionally provide a webm source for better compression.
 * If no video is provided or it fails to load, the fallbackImage is shown.
 *
 * Do NOT bundle large video files into the app — always host externally.
 */
export const heroVideoUrl: string | null = null;
export const heroVideoUrlWebm: string | null = null;

export const heroFallbackImage: string =
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80";

export const heroPoster: string = heroFallbackImage;
