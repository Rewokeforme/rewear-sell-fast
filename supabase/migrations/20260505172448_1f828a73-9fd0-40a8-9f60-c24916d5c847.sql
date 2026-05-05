-- Backfill-safe addition: add columns nullable, fill defaults, then enforce NOT NULL
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS delivery_method text,
  ADD COLUMN IF NOT EXISTS shipping_price numeric,
  ADD COLUMN IF NOT EXISTS buyer_pays_shipping boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ships_within_days text;

-- Backfill existing rows so NOT NULL can be enforced
UPDATE public.listings SET city = 'Stockholm' WHERE city IS NULL;
UPDATE public.listings SET delivery_method = 'shipping' WHERE delivery_method IS NULL;

-- Enforce required fields
ALTER TABLE public.listings
  ALTER COLUMN city SET NOT NULL,
  ALTER COLUMN delivery_method SET NOT NULL;

-- Constrain delivery_method to valid values
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_delivery_method_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_delivery_method_check
  CHECK (delivery_method IN ('shipping', 'pickup', 'both'));

-- Constrain ships_within_days to valid values (or null)
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_ships_within_days_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_ships_within_days_check
  CHECK (ships_within_days IS NULL OR ships_within_days IN ('1', '2-3', '4-7'));