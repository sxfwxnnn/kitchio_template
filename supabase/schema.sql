-- Kitchio Restaurant Platform Schema
-- Run this against your Supabase project SQL editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- RESTAURANTS
-- ============================================
create table if not exists public.restaurants (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  logo_url text,
  cover_image_url text,
  primary_color text default '#09090b',
  cuisine text,
  rating numeric(2,1) default 0,
  delivery_time_min int default 25,
  delivery_time_max int default 40,
  minimum_order numeric(10,2) default 0,
  delivery_fee numeric(10,2) default 0,
  free_delivery_over numeric(10,2) default 0,
  address text,
  postcode text,
  is_open boolean default true,
  closes_at text default '22:00',
  stripe_account_id text,
  created_at timestamptz default now()
);

-- ============================================
-- ADMIN USERS (defined early for policy dependencies)
-- ============================================
create table if not exists public.admin_users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null unique,
  role text not null default 'staff', -- 'admin', 'manager', 'staff'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security for admin access tracking
alter table public.admin_users enable row level security;

-- ============================================
-- CATEGORIES
-- ============================================
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order int default 0
);

create index if not exists idx_categories_restaurant on public.categories(restaurant_id, sort_order);

-- ============================================
-- MENU ITEMS
-- ============================================
create table if not exists public.menu_items (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  image_url text,
  available boolean default true,
  popular boolean default false,
  calories int default 0
);

create index if not exists idx_menu_items_category on public.menu_items(category_id);

-- ============================================
-- ITEM EXTRAS
-- ============================================
create table if not exists public.item_extras (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0
);

create index if not exists idx_item_extras_item on public.item_extras(item_id);

-- ============================================
-- OPTION GROUPS
-- ============================================
create table if not exists public.option_groups (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  required boolean default false
);

create index if not exists idx_option_groups_item on public.option_groups(item_id);

-- ============================================
-- OPTION CHOICES
-- ============================================
create table if not exists public.option_choices (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.option_groups(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0
);

create index if not exists idx_option_choices_group on public.option_choices(group_id);

-- ============================================
-- PROFILES (linked to auth.users)
-- ============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone_number text,
  default_address text
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- ORDERS
-- ============================================
do $$
begin
  create type order_status as enum (
    'pending',
    'accepted',
    'preparing',
    'courier_arrived',
    'out_for_delivery',
    'delivered',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id),
  user_id uuid references auth.users(id),
  status order_status default 'pending',
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  tip numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  delivery_mode text not null default 'delivery',
  customer_name text,
  customer_phone text,
  delivery_address text,
  special_instructions text,
  stripe_payment_intent text,
  uber_tracking_url text,
  courier_name text,
  courier_phone text,
  created_at timestamptz default now()
);

create index if not exists idx_orders_user on public.orders(user_id, created_at desc);
create index if not exists idx_orders_restaurant on public.orders(restaurant_id, created_at desc);

-- ============================================
-- ORDER ITEMS
-- ============================================
create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id),
  quantity int not null default 1,
  item_name text not null,
  selected_options jsonb default '[]'::jsonb,
  selected_extras jsonb default '[]'::jsonb,
  unit_price numeric(10,2) not null default 0,
  total_price numeric(10,2) not null default 0,
  note text
);

alter table public.order_items add column if not exists note text;

create index if not exists idx_order_items_order on public.order_items(order_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Restaurants: public read
alter table public.restaurants enable row level security;
drop policy if exists "Restaurants are publicly readable" on public.restaurants;
create policy "Restaurants are publicly readable"
  on public.restaurants for select using (true);

-- Categories: public read
alter table public.categories enable row level security;
drop policy if exists "Categories are publicly readable" on public.categories;
create policy "Categories are publicly readable"
  on public.categories for select using (true);
drop policy if exists "Admins can manage all categories" on public.categories;
create policy "Admins can manage all categories"
  on public.categories for all
  using (exists (select 1 from public.admin_users where admin_users.id = auth.uid()));

-- Menu items: public read
alter table public.menu_items enable row level security;
drop policy if exists "Menu items are publicly readable" on public.menu_items;
create policy "Menu items are publicly readable"
  on public.menu_items for select using (true);
drop policy if exists "Admins can manage all menu items" on public.menu_items;
create policy "Admins can manage all menu items"
  on public.menu_items for all
  using (exists (select 1 from public.admin_users where admin_users.id = auth.uid()));

-- Item extras: public read
alter table public.item_extras enable row level security;
drop policy if exists "Item extras are publicly readable" on public.item_extras;
create policy "Item extras are publicly readable"
  on public.item_extras for select using (true);

-- Option groups: public read
alter table public.option_groups enable row level security;
drop policy if exists "Option groups are publicly readable" on public.option_groups;
create policy "Option groups are publicly readable"
  on public.option_groups for select using (true);

-- Option choices: public read
alter table public.option_choices enable row level security;
drop policy if exists "Option choices are publicly readable" on public.option_choices;
create policy "Option choices are publicly readable"
  on public.option_choices for select using (true);

-- Profiles: users can read/update own profile
alter table public.profiles enable row level security;
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Orders: users can read own orders, service role can insert, anyone can read by ID
alter table public.orders enable row level security;
drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
  on public.orders for select using (auth.uid() = user_id);
drop policy if exists "Anyone can select an order by its ID" on public.orders;
create policy "Anyone can select an order by its ID"
  on public.orders for select using (true);
drop policy if exists "Users can insert own orders" on public.orders;
create policy "Users can insert own orders"
  on public.orders for insert with check (auth.uid() = user_id);
drop policy if exists "Service role can insert orders" on public.orders;
create policy "Service role can insert orders"
  on public.orders for insert with check (true);

-- Order items: users can read items from own orders, anyone can read order items
alter table public.order_items enable row level security;
drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items"
  on public.order_items for select using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );
drop policy if exists "Anyone can select order items" on public.order_items;
create policy "Anyone can select order items"
  on public.order_items for select using (true);
drop policy if exists "Service role can insert order items" on public.order_items;
create policy "Service role can insert order items"
  on public.order_items for insert with check (true);

-- ============================================
-- REALTIME (for order tracking)
-- ============================================
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;
end $$;

-- ============================================
-- SEED DATA
-- ============================================
insert into public.restaurants (
  id,
  slug,
  name,
  logo_url,
  cover_image_url,
  primary_color,
  cuisine,
  rating,
  delivery_time_min,
  delivery_time_max,
  minimum_order,
  delivery_fee,
  free_delivery_over,
  address,
  postcode,
  is_open,
  closes_at,
  stripe_account_id
) values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'kitchio',
  'Kitchio',
  '/img/logo.png',
  '/img/cover.jpg',
  '#FF5C1A',
  'Modern Tech Kitchen & Gourmet Delivery',
  4.8,
  25,
  40,
  15.00,
  3.00,
  30.00,
  '123 Brick Lane, London E1 6QL',
  'E1 6QL',
  true,
  '23:00',
  null
) on conflict (id) do nothing;

-- ============================================
-- PROMO CODES & ADMIN CONTEXT
-- ============================================
drop policy if exists "Allow public read access to verify admin profiles" on public.admin_users;
create policy "Allow public read access to verify admin profiles" 
  on public.admin_users for select using (true);

-- Update the main orders table security policies to look up admin table
drop policy if exists "Admins can manage all orders" on public.orders;
create policy "Admins can manage all orders" 
  on public.orders for all 
  using (exists (select 1 from public.admin_users where admin_users.id = auth.uid()));

drop policy if exists "Admins can manage all order items" on public.order_items;
create policy "Admins can manage all order items"
  on public.order_items for all
  using (exists (select 1 from public.admin_users where admin_users.id = auth.uid()));

create table if not exists public.promo_codes (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  amount numeric(10,2) not null,
  min_order_value numeric(10,2) default 0,
  active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table public.promo_codes enable row level security;
drop policy if exists "Promo codes are publicly readable" on public.promo_codes;
create policy "Promo codes are publicly readable"
  on public.promo_codes for select using (true);

drop policy if exists "Admins can manage all promo codes" on public.promo_codes;
create policy "Admins can manage all promo codes"
  on public.promo_codes for all
  using (exists (select 1 from public.admin_users where admin_users.id = auth.uid()));

insert into public.promo_codes (code, discount_type, amount, min_order_value)
values ('20SPECIAL', 'percentage', 20.00, 15.00)
on conflict (code) do nothing;

insert into public.promo_codes (code, discount_type, amount, min_order_value)
values ('SAVE5', 'fixed', 5.00, 20.00)
on conflict (code) do nothing;
