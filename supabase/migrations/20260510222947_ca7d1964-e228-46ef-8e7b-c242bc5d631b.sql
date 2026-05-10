
-- Add related_order_id column to notifications for order-related notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS related_order_id uuid;

CREATE INDEX IF NOT EXISTS idx_notifications_related_order_id
  ON public.notifications(related_order_id);

-- Trigger: notify buyer when order is marked as shipped
CREATE OR REPLACE FUNCTION public.notify_buyer_on_order_shipped()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_title text;
  v_body text;
BEGIN
  IF NEW.status = 'shipped' AND OLD.status IS DISTINCT FROM 'shipped' THEN
    SELECT title INTO v_listing_title FROM public.listings WHERE id = NEW.listing_id;
    v_body := 'Säljaren har markerat ' || COALESCE(v_listing_title, 'din vara') || ' som skickad.';
    IF NEW.carrier IS NOT NULL OR NEW.tracking_number IS NOT NULL THEN
      v_body := v_body || ' Transportör: ' || COALESCE(NEW.carrier, '-') ||
                ' · Spårningsnummer: ' || COALESCE(NEW.tracking_number, '-');
    END IF;
    INSERT INTO public.notifications
      (user_id, type, title, body, related_listing_id, related_user_id, related_order_id)
    VALUES
      (NEW.buyer_id, 'system', 'Din order har skickats', v_body,
       NEW.listing_id, NEW.seller_id, NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_buyer_shipped ON public.orders;
CREATE TRIGGER trg_notify_buyer_shipped
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_buyer_on_order_shipped();

-- Trigger: notify seller (and buyer for pickup) when order becomes delivered
CREATE OR REPLACE FUNCTION public.notify_on_order_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_title text;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    SELECT title INTO v_listing_title FROM public.listings WHERE id = NEW.listing_id;

    -- Notify seller
    INSERT INTO public.notifications
      (user_id, type, title, body, related_listing_id, related_user_id, related_order_id)
    VALUES
      (NEW.seller_id, 'system', 'Köparen har bekräftat mottagande',
       'Köparen har bekräftat att ' || COALESCE(v_listing_title, 'varan') ||
       ' har mottagits. Granskningsperioden på 48 timmar har startat.',
       NEW.listing_id, NEW.buyer_id, NEW.id);

    -- For pickup orders, also notify buyer that handover is confirmed
    IF NEW.delivery_method = 'pickup' THEN
      INSERT INTO public.notifications
        (user_id, type, title, body, related_listing_id, related_user_id, related_order_id)
      VALUES
        (NEW.buyer_id, 'system', 'Överlämning bekräftad',
         'Överlämning av ' || COALESCE(v_listing_title, 'varan') ||
         ' är bekräftad. Granskningsperioden på 48 timmar har startat.',
         NEW.listing_id, NEW.seller_id, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_on_delivered ON public.orders;
CREATE TRIGGER trg_notify_on_delivered
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_order_delivered();
