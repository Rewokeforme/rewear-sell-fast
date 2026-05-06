-- Notify seller when an order is created (buyer wants to buy) and when paid
CREATE OR REPLACE FUNCTION public.notify_seller_on_new_order()
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
  SELECT COALESCE(full_name, 'En köpare') INTO v_buyer_name FROM public.profiles WHERE id = NEW.buyer_id;

  INSERT INTO public.notifications (user_id, type, title, body, related_listing_id, related_user_id)
  VALUES (
    NEW.seller_id,
    'system',
    v_buyer_name || ' vill köpa ' || COALESCE(v_listing_title, 'ditt plagg'),
    'Du har fått en ny köpförfrågan. Öppna ordern för att se detaljer.',
    NEW.listing_id,
    NEW.buyer_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_on_new_order ON public.orders;
CREATE TRIGGER trg_notify_seller_on_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_seller_on_new_order();

-- Notify seller when order becomes paid
CREATE OR REPLACE FUNCTION public.notify_seller_on_order_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_title text;
  v_buyer_name text;
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    SELECT title INTO v_listing_title FROM public.listings WHERE id = NEW.listing_id;
    SELECT COALESCE(full_name, 'En köpare') INTO v_buyer_name FROM public.profiles WHERE id = NEW.buyer_id;

    INSERT INTO public.notifications (user_id, type, title, body, related_listing_id, related_user_id)
    VALUES (
      NEW.seller_id,
      'system',
      'Betalt: ' || COALESCE(v_listing_title, 'ditt plagg'),
      v_buyer_name || ' har betalat. Förbered plagget för leverans.',
      NEW.listing_id,
      NEW.buyer_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_on_order_paid ON public.orders;
CREATE TRIGGER trg_notify_seller_on_order_paid
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_seller_on_order_paid();