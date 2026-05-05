-- 1. profiles: add verification + trust + suspension fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_provider text,
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS trust_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- Backfill email_verified from auth.users (best-effort)
UPDATE public.profiles p
SET email_verified = true
FROM auth.users u
WHERE u.id = p.id AND u.email_confirmed_at IS NOT NULL AND p.email_verified = false;

-- 2. seller_verifications table
CREATE TABLE IF NOT EXISTS public.seller_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  verification_type text NOT NULL,        -- 'email' | 'phone' | 'identity'
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'verified' | 'failed' | 'expired'
  provider text,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verifications read own or admin" ON public.seller_verifications;
CREATE POLICY "verifications read own or admin"
  ON public.seller_verifications FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "verifications admin write" ON public.seller_verifications;
CREATE POLICY "verifications admin write"
  ON public.seller_verifications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. user_reports: add reported_message_id + admin_notes
ALTER TABLE public.user_reports
  ADD COLUMN IF NOT EXISTS reported_message_id uuid,
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- 4. trust_score recompute function
CREATE OR REPLACE FUNCTION public.recompute_trust_score(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email boolean;
  v_phone boolean;
  v_identity boolean;
  v_sold int;
  v_avg numeric;
  v_score numeric := 0;
BEGIN
  SELECT email_verified, phone_verified, identity_verified
    INTO v_email, v_phone, v_identity
    FROM public.profiles WHERE id = _user_id;

  SELECT COALESCE(sold_count,0), COALESCE(average_rating,0)
    INTO v_sold, v_avg
    FROM public.seller_stats WHERE user_id = _user_id;

  IF v_email THEN v_score := v_score + 10; END IF;
  IF v_phone THEN v_score := v_score + 15; END IF;
  IF v_identity THEN v_score := v_score + 30; END IF;
  v_score := v_score + LEAST(v_sold * 1.5, 30);
  v_score := v_score + LEAST(v_avg * 3, 15);

  UPDATE public.profiles SET trust_score = v_score WHERE id = _user_id;
END; $$;