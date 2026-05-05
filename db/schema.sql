-- ============================================================
-- Rewear — full schema migration
-- Run this in your Supabase project's SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

-- ENUMS
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.listing_status as enum ('active', 'sold', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum ('open', 'resolved');
exception when duplicate_object then null; end $$;

-- TABLES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  city text,
  avatar_url text,
  bio text,
  is_verified boolean not null default false,
  rewear_score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_sv text not null,
  sort_order integer not null default 0
);

create table if not exists public.co2_factors (
  category_id uuid primary key references public.categories(id) on delete cascade,
  kg_saved numeric(6,2) not null default 0
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  brand text,
  size text,
  condition text,
  price_sek integer not null check (price_sek >= 0),
  description text,
  status public.listing_status not null default 'active',
  ai_detected_brand text,
  ai_suggested_price integer,
  ai_generated_description text,
  co2_saved_kg numeric(6,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists listings_status_created_idx on public.listings (status, created_at desc);
create index if not exists listings_seller_idx on public.listings (seller_id);
create index if not exists listings_category_idx on public.listings (category_id);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  position integer not null default 0
);
create index if not exists listing_images_listing_idx on public.listing_images (listing_id, position);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);
create index if not exists conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index if not exists conversations_seller_idx on public.conversations (seller_id, last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (reviewer_id, listing_id)
);
create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  reason text not null,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

-- HELPERS (security definer; avoid RLS recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_conversation_member(_conv_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversations
    where id = _conv_id and (buyer_id = _user_id or seller_id = _user_id));
$$;

-- TRIGGERS
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare user_count int;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  select count(*) into user_count from public.user_roles;
  if user_count = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.apply_listing_co2()
returns trigger language plpgsql as $$
begin
  if new.category_id is not null then
    select coalesce(kg_saved, 0) into new.co2_saved_kg
      from public.co2_factors where category_id = new.category_id;
  end if;
  return new;
end; $$;
drop trigger if exists trg_listing_co2 on public.listings;
create trigger trg_listing_co2 before insert or update of category_id on public.listings
  for each row execute function public.apply_listing_co2();

create or replace function public.recompute_rewear_score(_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare sold_count int; positive_reviews int; total_co2 numeric; score int;
begin
  select count(*) into sold_count from public.listings where seller_id = _user_id and status = 'sold';
  select count(*) into positive_reviews from public.reviews where reviewee_id = _user_id and rating >= 4;
  select coalesce(sum(co2_saved_kg), 0) into total_co2 from public.listings where seller_id = _user_id and status = 'sold';
  score := (sold_count * 10) + (positive_reviews * 5) + floor(total_co2)::int;
  update public.profiles set rewear_score = score where id = _user_id;
end; $$;

create or replace function public.trg_listing_score()
returns trigger language plpgsql as $$
begin perform public.recompute_rewear_score(coalesce(new.seller_id, old.seller_id)); return coalesce(new, old); end; $$;
drop trigger if exists trg_listing_score on public.listings;
create trigger trg_listing_score after insert or update or delete on public.listings
  for each row execute function public.trg_listing_score();

create or replace function public.trg_review_score()
returns trigger language plpgsql as $$
begin perform public.recompute_rewear_score(coalesce(new.reviewee_id, old.reviewee_id)); return coalesce(new, old); end; $$;
drop trigger if exists trg_review_score on public.reviews;
create trigger trg_review_score after insert or update or delete on public.reviews
  for each row execute function public.trg_review_score();

create or replace function public.touch_conversation()
returns trigger language plpgsql as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end; $$;
drop trigger if exists trg_touch_conv on public.messages;
create trigger trg_touch_conv after insert on public.messages
  for each row execute function public.touch_conversation();

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.co2_factors enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;

drop policy if exists "profiles read all" on public.profiles;
create policy "profiles read all" on public.profiles for select using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "roles read own" on public.user_roles;
create policy "roles read own" on public.user_roles for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
drop policy if exists "roles admin manage" on public.user_roles;
create policy "roles admin manage" on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "cats read" on public.categories;
create policy "cats read" on public.categories for select using (true);
drop policy if exists "cats admin" on public.categories;
create policy "cats admin" on public.categories for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "co2 read" on public.co2_factors;
create policy "co2 read" on public.co2_factors for select using (true);
drop policy if exists "co2 admin" on public.co2_factors;
create policy "co2 admin" on public.co2_factors for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "listings read active" on public.listings;
create policy "listings read active" on public.listings for select
  using (status <> 'removed' or seller_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
drop policy if exists "listings insert own" on public.listings;
create policy "listings insert own" on public.listings for insert with check (auth.uid() = seller_id);
drop policy if exists "listings update own" on public.listings;
create policy "listings update own" on public.listings for update
  using (auth.uid() = seller_id or public.has_role(auth.uid(), 'admin'));
drop policy if exists "listings delete own or admin" on public.listings;
create policy "listings delete own or admin" on public.listings for delete
  using (auth.uid() = seller_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "images read" on public.listing_images;
create policy "images read" on public.listing_images for select using (true);
drop policy if exists "images write own listing" on public.listing_images;
create policy "images write own listing" on public.listing_images for all
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

drop policy if exists "fav own" on public.favorites;
create policy "fav own" on public.favorites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "conv participants" on public.conversations;
create policy "conv participants" on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
drop policy if exists "conv buyer creates" on public.conversations;
create policy "conv buyer creates" on public.conversations for insert with check (auth.uid() = buyer_id);

drop policy if exists "msg read members" on public.messages;
create policy "msg read members" on public.messages for select
  using (public.is_conversation_member(conversation_id, auth.uid()));
drop policy if exists "msg send members" on public.messages;
create policy "msg send members" on public.messages for insert
  with check (auth.uid() = sender_id and public.is_conversation_member(conversation_id, auth.uid()));
drop policy if exists "msg update read" on public.messages;
create policy "msg update read" on public.messages for update
  using (public.is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "reviews read" on public.reviews;
create policy "reviews read" on public.reviews for select using (true);
drop policy if exists "reviews insert own" on public.reviews;
create policy "reviews insert own" on public.reviews for insert with check (auth.uid() = reviewer_id);

drop policy if exists "reports insert" on public.reports;
create policy "reports insert" on public.reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "reports admin read" on public.reports;
create policy "reports admin read" on public.reports for select
  using (public.has_role(auth.uid(), 'admin') or auth.uid() = reporter_id);
drop policy if exists "reports admin update" on public.reports;
create policy "reports admin update" on public.reports for update using (public.has_role(auth.uid(), 'admin'));

-- STORAGE bucket
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

drop policy if exists "listing images public read" on storage.objects;
create policy "listing images public read" on storage.objects for select using (bucket_id = 'listing-images');
drop policy if exists "listing images auth upload" on storage.objects;
create policy "listing images auth upload" on storage.objects for insert
  with check (bucket_id = 'listing-images' and auth.role() = 'authenticated');
drop policy if exists "listing images own delete" on storage.objects;
create policy "listing images own delete" on storage.objects for delete
  using (bucket_id = 'listing-images' and owner = auth.uid());

-- SEED
insert into public.categories (slug, name_sv, sort_order) values
  ('jackor', 'Jackor', 1),
  ('toppar', 'Toppar', 2),
  ('byxor', 'Byxor', 3),
  ('klanningar', 'Klänningar', 4),
  ('skor', 'Skor', 5),
  ('accessoarer', 'Accessoarer', 6),
  ('vintage', 'Vintage', 7),
  ('barn', 'Barn', 8)
on conflict (slug) do nothing;

insert into public.co2_factors (category_id, kg_saved)
select id, case slug
  when 'jackor' then 15 when 'byxor' then 10 when 'klanningar' then 8
  when 'skor' then 12 when 'toppar' then 5 when 'accessoarer' then 3
  when 'vintage' then 10 when 'barn' then 4
end from public.categories
on conflict (category_id) do nothing;

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
