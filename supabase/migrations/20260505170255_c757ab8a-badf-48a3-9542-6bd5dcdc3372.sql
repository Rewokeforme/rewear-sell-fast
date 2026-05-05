-- =========================================
-- Rewear: follows, notifications, blocks, reports, seller_stats, badge logic
-- =========================================

-- 1. FOLLOWS
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null,
  seller_id uuid not null,
  created_at timestamptz not null default now(),
  unique (follower_id, seller_id),
  check (follower_id <> seller_id)
);

alter table public.follows enable row level security;

create policy "follows read all"
  on public.follows for select
  using (true);

create policy "follows insert own"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "follows delete own"
  on public.follows for delete
  using (auth.uid() = follower_id);

create index if not exists follows_seller_idx on public.follows(seller_id);
create index if not exists follows_follower_idx on public.follows(follower_id);

-- 2. NOTIFICATIONS
do $$ begin
  create type public.notification_type as enum ('new_listing', 'new_message', 'new_follower', 'system');
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type public.notification_type not null,
  title text not null,
  body text,
  related_listing_id uuid,
  related_user_id uuid,
  related_conversation_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notif read own"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "notif update own"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "notif delete own"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- Allow anyone authenticated to insert (since triggers also need it; use service role bypass)
create policy "notif insert system"
  on public.notifications for insert
  with check (true);

create index if not exists notif_user_idx on public.notifications(user_id, is_read, created_at desc);

-- 3. BLOCKS
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null,
  blocked_id uuid not null,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

create policy "blocks read own"
  on public.user_blocks for select
  using (auth.uid() = blocker_id);

create policy "blocks insert own"
  on public.user_blocks for insert
  with check (auth.uid() = blocker_id);

create policy "blocks delete own"
  on public.user_blocks for delete
  using (auth.uid() = blocker_id);

-- 4. USER REPORTS (extend existing reports for user/conversation)
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null,
  reported_user_id uuid,
  reported_conversation_id uuid,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.user_reports enable row level security;

create policy "user_reports admin or own"
  on public.user_reports for select
  using (has_role(auth.uid(), 'admin') or auth.uid() = reporter_id);

create policy "user_reports insert"
  on public.user_reports for insert
  with check (auth.uid() = reporter_id);

create policy "user_reports admin update"
  on public.user_reports for update
  using (has_role(auth.uid(), 'admin'));

-- 5. CONVERSATION CONSTRAINTS: prevent duplicate, prevent self-message
-- Unique constraint: one conversation per (listing, buyer, seller)
do $$ begin
  alter table public.conversations
    add constraint conversations_unique_triplet unique (listing_id, buyer_id, seller_id);
exception when duplicate_object then null; end $$;

-- Trigger: prevent buyer == seller
create or replace function public.prevent_self_conversation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.buyer_id = new.seller_id then
    raise exception 'You cannot start a conversation with yourself';
  end if;
  return new;
end; $$;

drop trigger if exists trg_prevent_self_conversation on public.conversations;
create trigger trg_prevent_self_conversation
  before insert on public.conversations
  for each row execute function public.prevent_self_conversation();

-- 6. SELLER STATS (materialized via function)
create table if not exists public.seller_stats (
  user_id uuid primary key,
  first_listing_at timestamptz,
  active_listings_count int not null default 0,
  sold_count int not null default 0,
  followers_count int not null default 0,
  average_rating numeric(3,2) not null default 0,
  rating_count int not null default 0,
  rewear_score int not null default 0,
  total_co2_saved numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.seller_stats enable row level security;

create policy "seller_stats read all"
  on public.seller_stats for select
  using (true);

create or replace function public.recompute_seller_stats(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first timestamptz;
  v_active int;
  v_sold int;
  v_followers int;
  v_avg numeric;
  v_rating_count int;
  v_co2 numeric;
  v_score int;
begin
  select min(created_at) into v_first from public.listings where seller_id = _user_id;
  select count(*) into v_active from public.listings where seller_id = _user_id and status = 'active';
  select count(*) into v_sold from public.listings where seller_id = _user_id and status = 'sold';
  select count(*) into v_followers from public.follows where seller_id = _user_id;
  select coalesce(avg(rating),0), count(*) into v_avg, v_rating_count from public.reviews where reviewee_id = _user_id;
  select coalesce(sum(co2_saved_kg),0) into v_co2 from public.listings where seller_id = _user_id and status = 'sold';
  v_score := (v_sold * 10) + (v_rating_count * 5) + floor(v_co2)::int + (v_followers * 2);

  insert into public.seller_stats (user_id, first_listing_at, active_listings_count, sold_count, followers_count, average_rating, rating_count, rewear_score, total_co2_saved, updated_at)
  values (_user_id, v_first, v_active, v_sold, v_followers, v_avg, v_rating_count, v_score, v_co2, now())
  on conflict (user_id) do update set
    first_listing_at = excluded.first_listing_at,
    active_listings_count = excluded.active_listings_count,
    sold_count = excluded.sold_count,
    followers_count = excluded.followers_count,
    average_rating = excluded.average_rating,
    rating_count = excluded.rating_count,
    rewear_score = excluded.rewear_score,
    total_co2_saved = excluded.total_co2_saved,
    updated_at = now();

  update public.profiles set rewear_score = v_score where id = _user_id;
end; $$;

-- Triggers to keep seller_stats fresh
create or replace function public.trg_listing_stats()
returns trigger language plpgsql set search_path = public as $$
begin perform public.recompute_seller_stats(coalesce(new.seller_id, old.seller_id)); return coalesce(new, old); end; $$;

drop trigger if exists trg_listings_stats on public.listings;
create trigger trg_listings_stats
  after insert or update or delete on public.listings
  for each row execute function public.trg_listing_stats();

create or replace function public.trg_review_stats()
returns trigger language plpgsql set search_path = public as $$
begin perform public.recompute_seller_stats(coalesce(new.reviewee_id, old.reviewee_id)); return coalesce(new, old); end; $$;

drop trigger if exists trg_reviews_stats on public.reviews;
create trigger trg_reviews_stats
  after insert or update or delete on public.reviews
  for each row execute function public.trg_review_stats();

create or replace function public.trg_follows_stats()
returns trigger language plpgsql set search_path = public as $$
begin perform public.recompute_seller_stats(coalesce(new.seller_id, old.seller_id)); return coalesce(new, old); end; $$;

drop trigger if exists trg_follows_stats on public.follows;
create trigger trg_follows_stats
  after insert or delete on public.follows
  for each row execute function public.trg_follows_stats();

-- 7. NOTIFICATION TRIGGERS

-- New listing -> notify followers
create or replace function public.notify_followers_new_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare seller_name text;
begin
  if new.status <> 'active' then return new; end if;

  select coalesce(full_name, 'En säljare') into seller_name from public.profiles where id = new.seller_id;

  insert into public.notifications (user_id, type, title, body, related_listing_id, related_user_id)
  select f.follower_id, 'new_listing', seller_name || ' har lagt ut ett nytt plagg', new.title, new.id, new.seller_id
  from public.follows f
  where f.seller_id = new.seller_id;

  return new;
end; $$;

drop trigger if exists trg_notify_followers on public.listings;
create trigger trg_notify_followers
  after insert on public.listings
  for each row execute function public.notify_followers_new_listing();

-- New message -> notify recipient
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_listing_id uuid;
  v_listing_title text;
begin
  select case when c.buyer_id = new.sender_id then c.seller_id else c.buyer_id end,
         c.listing_id
    into v_recipient, v_listing_id
  from public.conversations c
  where c.id = new.conversation_id;

  select title into v_listing_title from public.listings where id = v_listing_id;

  insert into public.notifications (user_id, type, title, body, related_listing_id, related_user_id, related_conversation_id)
  values (v_recipient, 'new_message', 'Nytt meddelande om ' || coalesce(v_listing_title, 'plagget'), left(new.body, 120), v_listing_id, new.sender_id, new.conversation_id);

  return new;
end; $$;

drop trigger if exists trg_notify_message on public.messages;
create trigger trg_notify_message
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- New follower -> notify seller
create or replace function public.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare follower_name text;
begin
  select coalesce(full_name, 'Någon') into follower_name from public.profiles where id = new.follower_id;
  insert into public.notifications (user_id, type, title, body, related_user_id)
  values (new.seller_id, 'new_follower', follower_name || ' följer dig nu', null, new.follower_id);
  return new;
end; $$;

drop trigger if exists trg_notify_follower on public.follows;
create trigger trg_notify_follower
  after insert on public.follows
  for each row execute function public.notify_new_follower();

-- 8. DYNAMIC SELLER BADGE
create or replace function public.compute_seller_badge(_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_first timestamptz;
  v_sold int;
  v_avg numeric;
begin
  select first_listing_at, sold_count, average_rating
    into v_first, v_sold, v_avg
  from public.seller_stats where user_id = _user_id;

  if v_sold is null then v_sold := 0; end if;
  if v_avg is null then v_avg := 0; end if;

  if v_sold >= 25 and v_avg >= 4.7 then
    return 'Premium Seller';
  elsif v_sold >= 10 then
    return 'Betrodd säljare';
  elsif v_first is not null and v_first > now() - interval '30 days' then
    return 'Ny säljare';
  else
    return null;
  end if;
end; $$;

-- Backfill seller_stats for existing users
do $$
declare r record;
begin
  for r in select distinct seller_id from public.listings loop
    perform public.recompute_seller_stats(r.seller_id);
  end loop;
end $$;
