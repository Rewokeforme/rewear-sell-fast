
-- 1. Add 'reserved' to listing_status enum
DO $$ BEGIN
  ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'reserved';
EXCEPTION WHEN others THEN NULL; END $$;

-- 2. Create order_status enum
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'pending_payment','paid','shipped','delivered','completed','cancelled','disputed','refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending_payment',
  item_price integer NOT NULL CHECK (item_price >= 0),
  shipping_price integer NOT NULL DEFAULT 0 CHECK (shipping_price >= 0),
  platform_fee integer NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  total_amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SEK',
  delivery_method text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_buyer_not_seller CHECK (buyer_id <> seller_id)
);

CREATE INDEX IF NOT EXISTS orders_buyer_idx ON public.orders (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_seller_idx ON public.orders (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_listing_idx ON public.orders (listing_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);

-- 4. Updated_at + total trigger
CREATE OR REPLACE FUNCTION public.orders_set_computed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.total_amount := COALESCE(NEW.item_price,0) + COALESCE(NEW.shipping_price,0) + COALESCE(NEW.platform_fee,0);
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_orders_set_computed ON public.orders;
CREATE TRIGGER trg_orders_set_computed
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_set_computed();

-- 5. Validate insert: listing must be active, buyer != seller_id from listing
CREATE OR REPLACE FUNCTION public.orders_validate_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_listing_seller uuid;
  v_listing_status public.listing_status;
BEGIN
  SELECT seller_id, status INTO v_listing_seller, v_listing_status
  FROM public.listings WHERE id = NEW.listing_id;

  IF v_listing_seller IS NULL THEN
    RAISE EXCEPTION 'Annonsen finns inte';
  END IF;

  IF NEW.seller_id <> v_listing_seller THEN
    NEW.seller_id := v_listing_seller;
  END IF;

  IF NEW.buyer_id = v_listing_seller THEN
    RAISE EXCEPTION 'Du kan inte köpa din egen annons';
  END IF;

  IF v_listing_status <> 'active' THEN
    RAISE EXCEPTION 'Annonsen är inte tillgänglig (status: %)', v_listing_status;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_orders_validate_insert ON public.orders;
CREATE TRIGGER trg_orders_validate_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_validate_insert();

-- 6. Sync listing status from order status
CREATE OR REPLACE FUNCTION public.orders_sync_listing_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.listings SET status = 'reserved'
      WHERE id = NEW.listing_id AND status = 'active';
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    IF NEW.status = 'completed' THEN
      UPDATE public.listings SET status = 'sold' WHERE id = NEW.listing_id;
    ELSIF NEW.status IN ('cancelled','refunded') THEN
      -- Only revert if no other active order exists for this listing
      IF NOT EXISTS (
        SELECT 1 FROM public.orders
        WHERE listing_id = NEW.listing_id
          AND id <> NEW.id
          AND status IN ('pending_payment','paid','shipped','delivered','disputed')
      ) THEN
        UPDATE public.listings SET status = 'active'
          WHERE id = NEW.listing_id AND status = 'reserved';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_orders_sync_listing ON public.orders;
CREATE TRIGGER trg_orders_sync_listing
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_sync_listing_status();

-- 7. Transition validation function
CREATE OR REPLACE FUNCTION public.can_transition_order(
  _is_buyer boolean, _is_seller boolean, _old public.order_status, _new public.order_status
) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _old = _new THEN true
    -- Buyer transitions
    WHEN _is_buyer AND _old = 'pending_payment' AND _new IN ('paid','cancelled') THEN true
    WHEN _is_buyer AND _old = 'shipped' AND _new = 'delivered' THEN true
    WHEN _is_buyer AND _old = 'delivered' AND _new = 'completed' THEN true
    WHEN _is_buyer AND _old IN ('paid','shipped','delivered') AND _new = 'disputed' THEN true
    -- Seller transitions
    WHEN _is_seller AND _old = 'paid' AND _new = 'shipped' THEN true
    WHEN _is_seller AND _old IN ('pending_payment','paid') AND _new = 'cancelled' THEN true
    ELSE false
  END;
$$;

-- 8. Enforce transition on UPDATE
CREATE OR REPLACE FUNCTION public.orders_enforce_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_buyer boolean;
  v_is_seller boolean;
  v_is_admin boolean;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  v_is_admin := public.has_role(v_uid, 'admin');
  IF v_is_admin THEN RETURN NEW; END IF;
  v_is_buyer := (v_uid = OLD.buyer_id);
  v_is_seller := (v_uid = OLD.seller_id);
  IF NOT public.can_transition_order(v_is_buyer, v_is_seller, OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Otillåten statusändring: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_orders_enforce_transition ON public.orders;
CREATE TRIGGER trg_orders_enforce_transition
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_enforce_transition();

-- 9. RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders read parties" ON public.orders;
CREATE POLICY "orders read parties" ON public.orders FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "orders insert buyer" ON public.orders;
CREATE POLICY "orders insert buyer" ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "orders update parties" ON public.orders;
CREATE POLICY "orders update parties" ON public.orders FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));
