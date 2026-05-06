-- Auto-cancel unpaid orders after 24 hours
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count int := 0;
  v_listing_title text;
BEGIN
  FOR r IN
    SELECT id, listing_id, buyer_id, seller_id
    FROM public.orders
    WHERE status = 'pending_payment'
      AND created_at < now() - interval '24 hours'
  LOOP
    UPDATE public.orders
       SET status = 'cancelled', updated_at = now()
     WHERE id = r.id;

    SELECT title INTO v_listing_title FROM public.listings WHERE id = r.listing_id;

    -- Notify buyer
    INSERT INTO public.notifications (user_id, type, title, body, related_listing_id)
    VALUES (
      r.buyer_id,
      'system',
      'Din order har avbrutits',
      'Tiden för att betala "' || COALESCE(v_listing_title, 'plagget') || '" har gått ut (24 timmar). Ordern har avbrutits automatiskt.',
      r.listing_id
    );

    -- Notify seller
    INSERT INTO public.notifications (user_id, type, title, body, related_listing_id)
    VALUES (
      r.seller_id,
      'system',
      'Annons åter tillgänglig',
      'Köparen betalade inte i tid. "' || COALESCE(v_listing_title, 'Ditt plagg') || '" är nu åter tillgängligt för andra köpare.',
      r.listing_id
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup to run every 15 minutes
SELECT cron.schedule(
  'expire-unpaid-orders',
  '*/15 * * * *',
  $$ SELECT public.expire_unpaid_orders(); $$
);