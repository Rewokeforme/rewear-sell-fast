
-- 1. Add columns to reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS order_id uuid,
  ADD COLUMN IF NOT EXISTS communication_rating integer,
  ADD COLUMN IF NOT EXISTS description_accuracy_rating integer,
  ADD COLUMN IF NOT EXISTS shipping_rating integer,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Sub-rating range checks (1..5, nullable)
DO $$ BEGIN
  ALTER TABLE public.reviews ADD CONSTRAINT reviews_comm_rating_chk
    CHECK (communication_rating IS NULL OR communication_rating BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.reviews ADD CONSTRAINT reviews_desc_rating_chk
    CHECK (description_accuracy_rating IS NULL OR description_accuracy_rating BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.reviews ADD CONSTRAINT reviews_ship_rating_chk
    CHECK (shipping_rating IS NULL OR shipping_rating BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Reviewer cannot equal reviewee
DO $$ BEGIN
  ALTER TABLE public.reviews ADD CONSTRAINT reviews_no_self
    CHECK (reviewer_id <> reviewee_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Drop old uniqueness, add new one per order
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_listing_id_key;
DO $$ BEGIN
  ALTER TABLE public.reviews ADD CONSTRAINT reviews_unique_per_order
    UNIQUE (order_id, reviewer_id, reviewee_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS reviews_order_idx ON public.reviews(order_id);

-- 5. Validate review against order
CREATE OR REPLACE FUNCTION public.reviews_validate_against_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o_buyer uuid;
  o_seller uuid;
  o_status order_status;
  o_listing uuid;
  v_active_dispute boolean;
BEGIN
  IF NEW.order_id IS NULL THEN
    RAISE EXCEPTION 'order_id krävs för säljarbetyg';
  END IF;
  SELECT buyer_id, seller_id, status, listing_id
    INTO o_buyer, o_seller, o_status, o_listing
  FROM public.orders WHERE id = NEW.order_id;
  IF o_buyer IS NULL THEN
    RAISE EXCEPTION 'Ordern finns inte';
  END IF;
  IF NEW.reviewer_id <> o_buyer THEN
    RAISE EXCEPTION 'Endast köparen kan betygsätta säljaren';
  END IF;
  IF NEW.reviewee_id <> o_seller THEN
    RAISE EXCEPTION 'Reviewee måste vara säljaren på ordern';
  END IF;
  IF o_status NOT IN ('delivered','completed') THEN
    RAISE EXCEPTION 'Ordern måste vara levererad innan du kan betygsätta';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.disputes
     WHERE order_id = NEW.order_id
       AND status IN ('open','awaiting_buyer_evidence','awaiting_seller_response','under_review')
  ) INTO v_active_dispute;
  IF v_active_dispute THEN
    RAISE EXCEPTION 'Ordern har en aktiv tvist';
  END IF;
  -- Auto-fill listing_id from order if missing
  IF NEW.listing_id IS NULL THEN
    NEW.listing_id := o_listing;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_reviews_validate_against_order ON public.reviews;
CREATE TRIGGER trg_reviews_validate_against_order
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reviews_validate_against_order();

-- 6. Notify seller on new review
CREATE OR REPLACE FUNCTION public.notify_seller_on_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_title text;
  v_buyer_name text;
BEGIN
  SELECT title INTO v_listing_title FROM public.listings WHERE id = NEW.listing_id;
  SELECT COALESCE(full_name, 'En köpare') INTO v_buyer_name FROM public.profiles WHERE id = NEW.reviewer_id;
  INSERT INTO public.notifications
    (user_id, type, title, body, related_listing_id, related_user_id, related_order_id)
  VALUES
    (NEW.reviewee_id, 'system', 'Du har fått ett nytt betyg',
     v_buyer_name || ' gav dig ' || NEW.rating || ' stjärnor för ' || COALESCE(v_listing_title, 'ditt plagg') || '.',
     NEW.listing_id, NEW.reviewer_id, NEW.order_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_seller_on_review ON public.reviews;
CREATE TRIGGER trg_notify_seller_on_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_seller_on_review();

-- 7. RLS: allow reviewer to update their own review (insert + select policies already exist)
DROP POLICY IF EXISTS "reviews update own" ON public.reviews;
CREATE POLICY "reviews update own" ON public.reviews
  FOR UPDATE USING (auth.uid() = reviewer_id) WITH CHECK (auth.uid() = reviewer_id);
