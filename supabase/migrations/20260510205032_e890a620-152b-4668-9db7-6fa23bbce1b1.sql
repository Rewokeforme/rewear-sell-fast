
CREATE OR REPLACE FUNCTION public.notify_seller_on_order_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      CASE WHEN NEW.is_mock_payment THEN '[TEST] Testbetalning: ' ELSE 'Betalt: ' END || COALESCE(v_listing_title, 'ditt plagg'),
      CASE WHEN NEW.is_mock_payment
        THEN 'Detta är en TESTORDER. Skicka inte varan — riktig betalning saknas ännu.'
        ELSE v_buyer_name || ' har betalat. Förbered plagget för leverans.'
      END,
      NEW.listing_id,
      NEW.buyer_id
    );
  END IF;
  RETURN NEW;
END;
$$;
