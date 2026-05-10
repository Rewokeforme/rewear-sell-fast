
-- 1. BEFORE INSERT trigger on disputes: force open status, null admin fields for non-admins
CREATE OR REPLACE FUNCTION public.disputes_lock_admin_fields_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status := 'open';
    NEW.admin_decision := NULL;
    NEW.admin_notes := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_disputes_lock_admin_insert ON public.disputes;
CREATE TRIGGER trg_disputes_lock_admin_insert
  BEFORE INSERT ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.disputes_lock_admin_fields_insert();

-- 3. Partial unique index: only one active dispute per order
CREATE UNIQUE INDEX IF NOT EXISTS disputes_one_active_per_order
  ON public.disputes (order_id)
  WHERE status IN ('open','awaiting_buyer_evidence','awaiting_seller_response','under_review');

-- 2 & 4. Block delivered -> completed before buyer_review_deadline or while active dispute exists
CREATE OR REPLACE FUNCTION public.orders_enforce_completion_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_active_dispute boolean;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    -- Admin bypass
    IF public.has_role(auth.uid(), 'admin') THEN
      RETURN NEW;
    END IF;

    -- Block if active dispute exists
    SELECT EXISTS (
      SELECT 1 FROM public.disputes
       WHERE order_id = NEW.id
         AND status IN ('open','awaiting_buyer_evidence','awaiting_seller_response','under_review')
    ) INTO v_active_dispute;
    IF v_active_dispute THEN
      RAISE EXCEPTION 'Ordern kan inte slutföras medan en aktiv tvist pågår';
    END IF;

    -- Require review deadline to have passed
    IF NEW.buyer_review_deadline IS NULL OR now() < NEW.buyer_review_deadline THEN
      RAISE EXCEPTION 'Ordern kan slutföras först efter granskningsperioden (% )', NEW.buyer_review_deadline;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_enforce_completion ON public.orders;
CREATE TRIGGER trg_orders_enforce_completion
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_enforce_completion_rules();
