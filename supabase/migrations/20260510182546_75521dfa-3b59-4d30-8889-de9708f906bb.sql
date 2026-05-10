
CREATE OR REPLACE FUNCTION public.notify_style_alert_matches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_seller_name text;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'En säljare') INTO v_seller_name
    FROM public.profiles WHERE id = NEW.seller_id;

  FOR r IN
    SELECT sa.user_id
    FROM public.style_alerts sa
    WHERE sa.is_active = true
      AND sa.user_id <> NEW.seller_id
      AND (sa.brand IS NULL OR lower(sa.brand) = lower(coalesce(NEW.brand, '')))
      AND (sa.main_category IS NULL OR sa.main_category = NEW.main_category)
      AND (sa.sub_category IS NULL OR sa.sub_category = NEW.sub_category)
      AND (sa.size IS NULL OR sa.size = NEW.size OR sa.size = NEW.size_label)
      AND (sa.min_price IS NULL OR NEW.price_sek >= sa.min_price)
      AND (sa.max_price IS NULL OR NEW.price_sek <= sa.max_price)
      AND (sa.city IS NULL OR lower(sa.city) = lower(coalesce(NEW.city, '')))
      AND (sa.delivery_method IS NULL
           OR sa.delivery_method = NEW.delivery_method
           OR NEW.delivery_method = 'both')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, related_listing_id, related_user_id)
    VALUES (
      r.user_id,
      'style_alert_match',
      'Ny matchning: ' || NEW.title,
      'Ett nytt plagg matchar din style alert från ' || v_seller_name,
      NEW.id,
      NEW.seller_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_style_alert_matches ON public.listings;
CREATE TRIGGER trg_notify_style_alert_matches
AFTER INSERT ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.notify_style_alert_matches();
