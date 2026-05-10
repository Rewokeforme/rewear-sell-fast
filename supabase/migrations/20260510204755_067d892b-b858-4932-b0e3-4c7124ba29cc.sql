
-- 1. New columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_mock_payment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- 2. Stricter insert validation: force prices & delivery from listing
CREATE OR REPLACE FUNCTION public.orders_validate_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_seller uuid;
  l_status public.listing_status;
  l_price int;
  l_shipping_price numeric;
  l_buyer_pays boolean;
  l_delivery text;
BEGIN
  SELECT seller_id, status, price_sek, shipping_price, buyer_pays_shipping, delivery_method
    INTO l_seller, l_status, l_price, l_shipping_price, l_buyer_pays, l_delivery
  FROM public.listings WHERE id = NEW.listing_id;

  IF l_seller IS NULL THEN
    RAISE EXCEPTION 'Annonsen finns inte';
  END IF;
  IF NEW.buyer_id = l_seller THEN
    RAISE EXCEPTION 'Du kan inte köpa din egen annons';
  END IF;
  IF l_status <> 'active' THEN
    RAISE EXCEPTION 'Annonsen är inte tillgänglig (status: %)', l_status;
  END IF;

  -- Force trusted fields from listing
  NEW.seller_id := l_seller;
  NEW.item_price := l_price;

  -- Validate delivery_method against listing
  IF NEW.delivery_method IS NULL THEN
    NEW.delivery_method := CASE WHEN l_delivery = 'both' THEN 'shipping' ELSE l_delivery END;
  END IF;
  IF l_delivery = 'shipping' AND NEW.delivery_method <> 'shipping' THEN
    RAISE EXCEPTION 'Annonsen kan endast skickas';
  END IF;
  IF l_delivery = 'pickup' AND NEW.delivery_method <> 'pickup' THEN
    RAISE EXCEPTION 'Annonsen kan endast hämtas';
  END IF;
  IF l_delivery = 'both' AND NEW.delivery_method NOT IN ('shipping','pickup') THEN
    RAISE EXCEPTION 'Ogiltig leveransmetod';
  END IF;

  -- Force shipping_price from listing
  IF NEW.delivery_method = 'pickup' THEN
    NEW.shipping_price := 0;
  ELSIF NEW.delivery_method = 'shipping' AND l_buyer_pays AND l_shipping_price IS NOT NULL THEN
    NEW.shipping_price := COALESCE(l_shipping_price, 0)::int;
  ELSE
    NEW.shipping_price := 0;
  END IF;

  -- Force platform_fee = 0 for now
  NEW.platform_fee := 0;

  RETURN NEW;
END;
$$;

-- 3. Lock immutable fields on UPDATE
CREATE OR REPLACE FUNCTION public.orders_lock_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.listing_id := OLD.listing_id;
    NEW.buyer_id := OLD.buyer_id;
    NEW.seller_id := OLD.seller_id;
    NEW.item_price := OLD.item_price;
    NEW.shipping_price := OLD.shipping_price;
    NEW.platform_fee := OLD.platform_fee;
    NEW.currency := OLD.currency;
    NEW.delivery_method := OLD.delivery_method;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_lock_immutable ON public.orders;
CREATE TRIGGER trg_orders_lock_immutable
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_lock_immutable_fields();

-- 4. Mark mock payment + paid_at when transitioning to paid
CREATE OR REPLACE FUNCTION public.orders_mark_mock_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    NEW.paid_at := COALESCE(NEW.paid_at, now());
    -- All current payments are mock until real provider integrated
    NEW.is_mock_payment := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_mark_mock_paid ON public.orders;
CREATE TRIGGER trg_orders_mark_mock_paid
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_mark_mock_paid();

-- 5. Unique active order per listing
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_order_per_listing
  ON public.orders (listing_id)
  WHERE status IN ('pending_payment','paid','shipped','delivered','disputed');
