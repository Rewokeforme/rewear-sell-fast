ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS main_category text,
  ADD COLUMN IF NOT EXISTS sub_category text,
  ADD COLUMN IF NOT EXISTS shoe_size text,
  ADD COLUMN IF NOT EXISTS waist_size text,
  ADD COLUMN IF NOT EXISTS length_size text;

CREATE INDEX IF NOT EXISTS idx_listings_main_category ON public.listings(main_category);
CREATE INDEX IF NOT EXISTS idx_listings_sub_category ON public.listings(sub_category);