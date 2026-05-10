
-- 1. Extend orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS carrier text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_review_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_handover_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS seller_handover_confirmed_at timestamptz;

-- 2. Enums for disputes
DO $$ BEGIN
  CREATE TYPE public.dispute_reason AS ENUM
    ('item_not_received','item_not_as_described','damaged_item','wrong_item','suspected_fraud','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.dispute_status AS ENUM
    ('open','awaiting_buyer_evidence','awaiting_seller_response','under_review','resolved_buyer','resolved_seller','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  opened_by uuid NOT NULL,
  reason public.dispute_reason NOT NULL,
  description text,
  buyer_evidence_urls text[] NOT NULL DEFAULT '{}',
  seller_evidence_urls text[] NOT NULL DEFAULT '{}',
  carrier_tracking_snapshot jsonb,
  status public.dispute_status NOT NULL DEFAULT 'open',
  admin_decision text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON public.disputes(order_id);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- 4. RLS for disputes
DROP POLICY IF EXISTS "disputes read parties" ON public.disputes;
CREATE POLICY "disputes read parties" ON public.disputes
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = disputes.order_id
        AND (auth.uid() = o.buyer_id OR auth.uid() = o.seller_id)
    )
  );

DROP POLICY IF EXISTS "disputes insert parties" ON public.disputes;
CREATE POLICY "disputes insert parties" ON public.disputes
  FOR INSERT WITH CHECK (
    auth.uid() = opened_by
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = disputes.order_id
        AND (auth.uid() = o.buyer_id OR auth.uid() = o.seller_id)
    )
  );

DROP POLICY IF EXISTS "disputes update parties or admin" ON public.disputes;
CREATE POLICY "disputes update parties or admin" ON public.disputes
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = disputes.order_id
        AND (auth.uid() = o.buyer_id OR auth.uid() = o.seller_id)
    )
  );

-- 5. Lock admin-only fields on disputes for non-admins
CREATE OR REPLACE FUNCTION public.disputes_lock_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.admin_decision := OLD.admin_decision;
    NEW.admin_notes := OLD.admin_notes;
    NEW.opened_by := OLD.opened_by;
    NEW.order_id := OLD.order_id;
    NEW.reason := OLD.reason;
    NEW.created_at := OLD.created_at;
    -- non-admins can only set their own evidence side; not allowed to flip resolved_*
    IF NEW.status IN ('resolved_buyer','resolved_seller','closed','under_review') THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_disputes_lock_admin ON public.disputes;
CREATE TRIGGER trg_disputes_lock_admin
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.disputes_lock_admin_fields();

-- 6. Order timestamps + tracking enforcement + handover -> delivered
CREATE OR REPLACE FUNCTION public.orders_set_lifecycle_timestamps()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'shipped' AND OLD.status IS DISTINCT FROM 'shipped' THEN
    -- Require tracking for shipping orders
    IF NEW.delivery_method = 'shipping' AND (NEW.tracking_number IS NULL OR length(trim(NEW.tracking_number)) = 0) THEN
      RAISE EXCEPTION 'Spårningsnummer krävs för att markera ordern som skickad';
    END IF;
    NEW.shipped_at := COALESCE(NEW.shipped_at, now());
  END IF;

  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    NEW.delivered_at := COALESCE(NEW.delivered_at, now());
    NEW.buyer_review_deadline := COALESCE(NEW.buyer_review_deadline, NEW.delivered_at + interval '48 hours');
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_lifecycle_ts ON public.orders;
CREATE TRIGGER trg_orders_lifecycle_ts
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_set_lifecycle_timestamps();

-- 7. Pickup handover dual-confirmation
CREATE OR REPLACE FUNCTION public.orders_pickup_handover()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF OLD.delivery_method <> 'pickup' THEN RETURN NEW; END IF;

  -- Only the right party may set their flag (non-admins)
  IF NOT public.has_role(v_uid, 'admin') THEN
    IF NEW.buyer_handover_confirmed_at IS DISTINCT FROM OLD.buyer_handover_confirmed_at
       AND v_uid <> OLD.buyer_id THEN
      NEW.buyer_handover_confirmed_at := OLD.buyer_handover_confirmed_at;
    END IF;
    IF NEW.seller_handover_confirmed_at IS DISTINCT FROM OLD.seller_handover_confirmed_at
       AND v_uid <> OLD.seller_id THEN
      NEW.seller_handover_confirmed_at := OLD.seller_handover_confirmed_at;
    END IF;
  END IF;

  -- Auto-transition to delivered when both confirmed
  IF NEW.buyer_handover_confirmed_at IS NOT NULL
     AND NEW.seller_handover_confirmed_at IS NOT NULL
     AND NEW.status = 'paid' THEN
    NEW.status := 'delivered';
    NEW.delivered_at := COALESCE(NEW.delivered_at, now());
    NEW.buyer_review_deadline := COALESCE(NEW.buyer_review_deadline, NEW.delivered_at + interval '48 hours');
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_pickup_handover ON public.orders;
CREATE TRIGGER trg_orders_pickup_handover
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_pickup_handover();

-- 8. Allow pickup parties to write only their own handover field via lock function update
-- The orders_lock_immutable_fields already prevents most field changes; tracking + handover
-- fields are not in its lock list, so they're free for parties (RLS already restricts row access).
-- Tracking should only be writable by seller. Enforce via trigger:
CREATE OR REPLACE FUNCTION public.orders_restrict_tracking_writes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF public.has_role(v_uid, 'admin') THEN RETURN NEW; END IF;
  IF (NEW.tracking_number IS DISTINCT FROM OLD.tracking_number
      OR NEW.carrier IS DISTINCT FROM OLD.carrier)
     AND v_uid <> OLD.seller_id THEN
    NEW.tracking_number := OLD.tracking_number;
    NEW.carrier := OLD.carrier;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_restrict_tracking ON public.orders;
CREATE TRIGGER trg_orders_restrict_tracking
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_restrict_tracking_writes();
