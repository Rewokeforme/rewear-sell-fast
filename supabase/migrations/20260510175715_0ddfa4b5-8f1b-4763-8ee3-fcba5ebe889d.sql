
-- ============================================================
-- Fas 1A: ReWoke MVP-utbyggnad (datamodell)
-- ============================================================

-- 1) listings: nya kolumner (idempotenta)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS size_type text,
  ADD COLUMN IF NOT EXISTS size_label text,
  ADD COLUMN IF NOT EXISTS measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS condition_checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS style_tags text[] NOT NULL DEFAULT '{}';

-- shoe_size, waist_size, length_size finns redan (nullable). Säkerställ.
ALTER TABLE public.listings
  ALTER COLUMN shoe_size DROP NOT NULL,
  ALTER COLUMN waist_size DROP NOT NULL,
  ALTER COLUMN length_size DROP NOT NULL;

-- Validera size_type-värden via trigger (CHECK skulle räcka, men trigger är konsekvent med projektets policy)
CREATE OR REPLACE FUNCTION public.validate_listing_size_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.size_type IS NOT NULL AND NEW.size_type NOT IN (
    'clothing','shoes_adult','shoes_kids','kids_clothing','jeans_wl','bag','accessory'
  ) THEN
    RAISE EXCEPTION 'Ogiltig size_type: %', NEW.size_type;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_listing_size_type ON public.listings;
CREATE TRIGGER trg_validate_listing_size_type
  BEFORE INSERT OR UPDATE OF size_type ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.validate_listing_size_type();

-- 2) fit_profiles
CREATE TABLE IF NOT EXISTS public.fit_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clothing_size text,
  shoe_size text,
  kids_sizes text[] NOT NULL DEFAULT '{}',
  favorite_brands text[] NOT NULL DEFAULT '{}',
  preferred_fit text CHECK (preferred_fit IS NULL OR preferred_fit IN ('tight','normal','oversized')),
  style_tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_fit_profiles_touch ON public.fit_profiles;
CREATE TRIGGER trg_fit_profiles_touch
  BEFORE UPDATE ON public.fit_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.fit_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fit_profiles read own" ON public.fit_profiles;
CREATE POLICY "fit_profiles read own" ON public.fit_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fit_profiles insert own" ON public.fit_profiles;
CREATE POLICY "fit_profiles insert own" ON public.fit_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fit_profiles update own" ON public.fit_profiles;
CREATE POLICY "fit_profiles update own" ON public.fit_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fit_profiles delete own" ON public.fit_profiles;
CREATE POLICY "fit_profiles delete own" ON public.fit_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- 3) style_alerts (matchningstrigger kommer i Fas 3)
CREATE TABLE IF NOT EXISTS public.style_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand text,
  main_category text,
  sub_category text,
  size text,
  min_price integer,
  max_price integer,
  city text,
  delivery_method text CHECK (delivery_method IS NULL OR delivery_method IN ('shipping','pickup','both')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS style_alerts_user_idx ON public.style_alerts (user_id, is_active);
CREATE INDEX IF NOT EXISTS style_alerts_match_idx
  ON public.style_alerts (is_active, main_category, sub_category, brand);

DROP TRIGGER IF EXISTS trg_style_alerts_touch ON public.style_alerts;
CREATE TRIGGER trg_style_alerts_touch
  BEFORE UPDATE ON public.style_alerts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.style_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "style_alerts read own" ON public.style_alerts;
CREATE POLICY "style_alerts read own" ON public.style_alerts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "style_alerts insert own" ON public.style_alerts;
CREATE POLICY "style_alerts insert own" ON public.style_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "style_alerts update own" ON public.style_alerts;
CREATE POLICY "style_alerts update own" ON public.style_alerts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "style_alerts delete own" ON public.style_alerts;
CREATE POLICY "style_alerts delete own" ON public.style_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- 4) Skärp listings RLS: aktiva annonser läses av inloggade användare (och ägare/admin för icke-aktiva)
DROP POLICY IF EXISTS "listings read active" ON public.listings;
CREATE POLICY "listings read active" ON public.listings
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND status = 'active')
    OR seller_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- (insert/update/delete policies för listings finns redan och är korrekta)
-- (notifications-policies finns redan: notif read own / insert own / update own / delete own)
