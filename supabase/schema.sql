-- ==============================================================================
-- KALE BİBER — SUPABASE TÜM VERİTABANI ŞEMASI (SQL EDITOR İÇİN HATA VERMEYEN KODLAR)
-- ==============================================================================
-- Bu SQL script'ini Supabase Dashboard -> SQL Editor kısmına yapıştırıp RUN diyerek çalıştırın.

-- 1. UZANTILAR VE TETİKLEYİCİ FONKSİYONLAR
create extension if not exists "uuid-ossp";

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. KULLANICI PROFİLLERİ (auth.users tablosu ile ilişkili)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text not null default '',
  phone text not null default '',
  address text not null default '',
  city text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- Yeni üye kaydolduğunda otomatik profil oluşturma trigger'ı
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 3. ÜRÜNLER TABLOSU (products.json karşılığı)
create table if not exists public.products (
  id text primary key,
  name text not null,
  "desc" text default '',
  price numeric(10,2) not null default 0 check (price >= 0),
  unit text not null default 'kg',
  emoji text default '🫑',
  theme text not null default 'sweet' check (theme in ('hot', 'sweet', 'dry', 'mixed')),
  badge text default '',
  category text not null default 'genel',
  image_url text default '',
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists update_products_updated_at on public.products;
create trigger update_products_updated_at
  before update on public.products
  for each row execute function public.update_updated_at_column();

alter table public.products enable row level security;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products for select using (true);

drop policy if exists "products_service_role_all" on public.products;
create policy "products_service_role_all" on public.products for all using (true);


-- 4. SİPARİŞLER TABLOSU (data/orders.json karşılığı)
create table if not exists public.orders (
  id text primary key,
  user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'yeni' check (status in ('yeni', 'hazirlaniyor', 'kargoda', 'teslim_edildi', 'iptal')),
  status_history jsonb not null default '[]'::jsonb,
  customer jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0,
  shipping_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method text not null default 'kapida' check (payment_method in ('kapida', 'havale', 'kart')),
  note text default '',
  tracking_code text default '',
  admin_note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists update_orders_updated_at on public.orders;
create trigger update_orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at_column();

alter table public.orders enable row level security;

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders for select using (auth.uid() = user_id or user_id is null);

drop policy if exists "orders_insert_any" on public.orders;
create policy "orders_insert_any" on public.orders for insert with check (true);

drop policy if exists "orders_service_role_all" on public.orders;
create policy "orders_service_role_all" on public.orders for all using (true);


-- 5. YORUMLAR TABLOSU (data/reviews.json karşılığı)
create table if not exists public.reviews (
  id text primary key,
  product_id text references public.products(id) on delete cascade,
  author text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  text text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "reviews_select_approved" on public.reviews;
create policy "reviews_select_approved" on public.reviews for select using (approved = true);

drop policy if exists "reviews_insert_public" on public.reviews;
create policy "reviews_insert_public" on public.reviews for insert with check (true);

drop policy if exists "reviews_service_role_all" on public.reviews;
create policy "reviews_service_role_all" on public.reviews for all using (true);


-- 6. GELİR-GİDER / FİNANS TABLOSU (data/finance.json karşılığı)
create table if not exists public.finance_transactions (
  id text primary key,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric(10,2) not null default 0 check (amount >= 0),
  description text default '',
  date date not null default current_date,
  order_id text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists update_finance_updated_at on public.finance_transactions;
create trigger update_finance_updated_at
  before update on public.finance_transactions
  for each row execute function public.update_updated_at_column();

alter table public.finance_transactions enable row level security;

drop policy if exists "finance_service_role_all" on public.finance_transactions;
create policy "finance_service_role_all" on public.finance_transactions for all using (true);


-- 7. MAĞAZA VE SİTE AYARLARI TABLOSU (data/settings.json karşılığı)
create table if not exists public.settings (
  id text primary key default 'default',
  store_name text not null default 'Yarımca Kale Bibercisi',
  tagline text default 'Bahçeden sofraya taze ve doğal biber',
  phone text default '',
  email text default '',
  shipping_fee numeric(10,2) not null default 49,
  free_shipping_over numeric(10,2) not null default 500,
  announcement text default '',
  address text default '',
  instagram text default '',
  whatsapp text default '',
  about jsonb not null default '{}'::jsonb,
  navbar jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists update_settings_updated_at on public.settings;
create trigger update_settings_updated_at
  before update on public.settings
  for each row execute function public.update_updated_at_column();

alter table public.settings enable row level security;

drop policy if exists "settings_select_public" on public.settings;
create policy "settings_select_public" on public.settings for select using (true);

drop policy if exists "settings_service_role_all" on public.settings;
create policy "settings_service_role_all" on public.settings for all using (true);


-- 8. ANALİTİK VE ZİYARETÇİ İSTATİSTİKLERİ TABLOLARI (data/analytics.json karşılığı)
create table if not exists public.analytics_sessions (
  visitor_id text primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  page_views integer not null default 1,
  last_path text default '/',
  user_agent text default ''
);

create table if not exists public.analytics_hits (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  path text not null default '/',
  user_agent text default '',
  created_at timestamptz not null default now()
);

alter table public.analytics_sessions enable row level security;
alter table public.analytics_hits enable row level security;

drop policy if exists "analytics_sessions_service" on public.analytics_sessions;
create policy "analytics_sessions_service" on public.analytics_sessions for all using (true);

drop policy if exists "analytics_hits_service" on public.analytics_hits;
create policy "analytics_hits_service" on public.analytics_hits for all using (true);


-- 9. İNDEKS KONTROLLERİ VE HIZLANDIRMALAR
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_active on public.products(active);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_reviews_product_id on public.reviews(product_id);
create index if not exists idx_reviews_approved on public.reviews(approved);
create index if not exists idx_finance_date on public.finance_transactions(date);
create index if not exists idx_finance_type on public.finance_transactions(type);
create index if not exists idx_analytics_hits_created_at on public.analytics_hits(created_at);

-- ==============================================================================
-- BAŞLANGIÇ VERİLERİ (SEED DATA) — PROJEDEKİ MEVCUT JSON DOSYALARINDAN AKTARIM
-- ==============================================================================

-- Ürünler (products.json)
insert into public.products (id, name, "desc", price, unit, emoji, theme, badge, category, image_url, stock, active, featured)
values 
('kurutulmus-balon-biber', 'Kurutulmuş Balon Biber', 'Kışlık, ev yapımı kahvaltılık. Doğal kurutma ile yoğun aroma.', 300, 'kg', '🌶️', 'dry', 'Çok Satan', 'kurutulmus', '/uploads/1781217375828-c05eb8bc.jpg', 29, true, true),
('kale-biberi-yas', 'Kale Biberi (Yaş)', 'Bahçeden yeni toplanmış, taze ve kıtır tarladan sofranıza Kale biberi.', 200, 'kg', '🫑', 'sweet', 'Taze Hasat', 'taze', '/uploads/1781217455027-8babc92a.jpg', 98, true, false)
on conflict (id) do update set
  name = excluded.name,
  "desc" = excluded."desc",
  price = excluded.price,
  unit = excluded.unit,
  emoji = excluded.emoji,
  theme = excluded.theme,
  badge = excluded.badge,
  category = excluded.category,
  image_url = excluded.image_url,
  stock = excluded.stock,
  active = excluded.active,
  featured = excluded.featured;

-- Ayarlar (data/settings.json)
insert into public.settings (id, store_name, tagline, phone, email, shipping_fee, free_shipping_over, announcement, address, instagram, whatsapp, about, navbar)
values (
  'default',
  'Yarımca Kale Bibercisi',
  'Bahçeden sofraya taze ve doğal biber',
  '+905384478410',
  'siparis@kalebiber.com',
  50,
  0,
  '',
  'Türkiye — yerel üretim',
  '',
  '905384478410',
  '{"title": "Hakkımızda", "content": "Yarımca Kale Bibercisi, Kale köyünün verimli topraklarında yetişen biberleri özenle seçerek sizlere ulaştırır. Taze, kurutulmuş ve özel çeşitlerimizle sofranıza doğallık katıyoruz. Ailemizin yıllardır sürdürdüğü üretim geleneğini modern paketleme ve hızlı teslimatla birleştiriyoruz.", "photos": [{"url": "/uploads/1783037335811-fa7789f9.png", "caption": "Büyüme aşaması"}]}'::jsonb,
  '{"eyebrow": "Bahçeden sofraya", "title": "Taze biber,", "titleAccent": "gerçek lezzet", "heroLead": "", "imageUrl": "/uploads/1783037299290-923cbde8.png", "imageAlt": "Taze kale biber", "logoUrl": "/images/logo-yuvarlak.png", "trustItems": ["✓ Güvenli sipariş", "✓ Hızlı kargo", "✓ Yerli üretim"]}'::jsonb
)
on conflict (id) do update set
  store_name = excluded.store_name,
  tagline = excluded.tagline,
  phone = excluded.phone,
  email = excluded.email,
  shipping_fee = excluded.shipping_fee,
  free_shipping_over = excluded.free_shipping_over,
  announcement = excluded.announcement,
  address = excluded.address,
  instagram = excluded.instagram,
  whatsapp = excluded.whatsapp,
  about = excluded.about,
  navbar = excluded.navbar;

-- Finans (data/finance.json)
insert into public.finance_transactions (id, type, category, amount, description, date, order_id)
values 
('TX-MR468N9Y', 'expense', 'malzeme', 1200, 'gübre', '2026-07-03', '0000'),
('TX-MQRX5U48', 'expense', 'malzeme', 1900, 'ilaç', '2026-06-24', '0000'),
('TX-MQA2B1OV', 'expense', 'malzeme', 330, 'ek-tıpa-hortum', '2026-06-11', '0000'),
('TX-MQA26D5R', 'expense', 'malzeme', 5000, 'fidan', '2026-06-11', ''),
('TX-MPD4HNBN', 'expense', 'malzeme', 1000, 'damlama hortumu', '2026-05-19', ''),
('TX-MPD4FWSS', 'expense', 'malzeme', 630, 'mazot', '2026-05-19', '')
on conflict (id) do nothing;

-- ==============================================================================
-- SUPABASE STORAGE (GÖRSEL VE DOSYA YÜKLEME KOVASI VE ERİŞİM İZİNLERİ)
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

drop policy if exists "Public Read Uploads" on storage.objects;
create policy "Public Read Uploads"
  on storage.objects for select
  using (bucket_id = 'uploads');

drop policy if exists "Service Role Uploads" on storage.objects;
create policy "Service Role Uploads"
  on storage.objects for all
  using (bucket_id = 'uploads');

