
-- Uppdaterad seller-badge: prioriterad topp-badge inkl. verifiering
CREATE OR REPLACE FUNCTION public.compute_seller_badge(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_first timestamptz;
  v_sold int;
  v_avg numeric;
  v_email boolean;
  v_phone boolean;
  v_identity boolean;
  v_full_name text;
  v_city text;
begin
  select first_listing_at, sold_count, average_rating
    into v_first, v_sold, v_avg
  from public.seller_stats where user_id = _user_id;

  select email_verified, phone_verified, identity_verified, full_name, city
    into v_email, v_phone, v_identity, v_full_name, v_city
  from public.profiles where id = _user_id;

  if v_sold is null then v_sold := 0; end if;
  if v_avg is null then v_avg := 0; end if;

  if v_sold >= 25 and v_avg >= 4.7 and coalesce(v_identity, false) then
    return 'Premium Seller';
  elsif v_sold >= 10 and v_avg >= 4.7 then
    return 'Betrodd säljare';
  elsif coalesce(v_identity, false) then
    return 'ID-verifierad';
  elsif coalesce(v_email, false) and coalesce(v_phone, false)
        and v_full_name is not null and v_city is not null then
    return 'Verifierad profil';
  elsif v_first is not null and v_first > now() - interval '30 days' then
    return 'Ny säljare';
  else
    return null;
  end if;
end; $function$;

-- Ny funktion: returnera ALLA badges säljaren kvalificerar för
CREATE OR REPLACE FUNCTION public.compute_seller_badges(_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_first timestamptz;
  v_sold int;
  v_avg numeric;
  v_email boolean;
  v_phone boolean;
  v_identity boolean;
  v_full_name text;
  v_city text;
  v_out text[] := '{}';
begin
  select first_listing_at, sold_count, average_rating
    into v_first, v_sold, v_avg
  from public.seller_stats where user_id = _user_id;

  select email_verified, phone_verified, identity_verified, full_name, city
    into v_email, v_phone, v_identity, v_full_name, v_city
  from public.profiles where id = _user_id;

  if v_sold is null then v_sold := 0; end if;
  if v_avg is null then v_avg := 0; end if;

  if v_sold >= 25 and v_avg >= 4.7 and coalesce(v_identity, false) then
    v_out := array_append(v_out, 'Premium Seller');
  end if;
  if v_sold >= 10 and v_avg >= 4.7 then
    v_out := array_append(v_out, 'Betrodd säljare');
  end if;
  if coalesce(v_identity, false) then
    v_out := array_append(v_out, 'ID-verifierad');
  end if;
  if coalesce(v_email, false) and coalesce(v_phone, false)
     and v_full_name is not null and v_city is not null then
    v_out := array_append(v_out, 'Verifierad profil');
  end if;
  if array_length(v_out, 1) is null
     and v_first is not null and v_first > now() - interval '30 days' then
    v_out := array_append(v_out, 'Ny säljare');
  end if;

  return v_out;
end; $function$;
