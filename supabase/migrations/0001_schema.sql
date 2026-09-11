-- Glamour Atacado · tabelas
-- Dinheiro sempre em centavos (integer).

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  code_prefix text check (code_prefix ~ '^[A-Z]{2,3}$'),
  image_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  code text not null unique check (char_length(code) between 1 and 30),
  description text,
  material text,
  plating text,
  size text,
  shade text,
  weight_g numeric(8, 2) check (weight_g is null or weight_g > 0),
  price_cents integer not null check (price_cents > 0),
  stock integer check (stock is null or stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_active_created_idx on public.products (active, created_at desc);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path_sm text not null,
  path_lg text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

create type public.order_status as enum (
  'novo', 'em_atendimento', 'confirmado', 'separando', 'pronto', 'retirado', 'cancelado'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  total_cents integer not null check (total_cents >= 0),
  item_count integer not null check (item_count > 0),
  status public.order_status not null default 'novo',
  stock_applied boolean not null default false,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_phone_created_idx on public.orders (customer_phone, created_at desc);

-- Cópia dos dados do produto no momento do pedido (preserva o histórico)
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  product_code text not null,
  size text,
  shade text,
  unit_price_cents integer not null check (unit_price_cents > 0),
  quantity integer not null check (quantity > 0),
  total_cents integer not null check (total_cents > 0)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

-- Numeração diária dos pedidos (GLM-AAAAMMDD-NNN)
create table public.order_counters (
  day date primary key,
  last integer not null default 0
);

create table public.settings (
  id smallint primary key default 1 check (id = 1),
  whatsapp_number text not null check (whatsapp_number ~ '^[0-9]{12,13}$'),
  min_order_cents integer not null check (min_order_cents >= 0),
  pickup_text text not null,
  hours_text text,
  instagram_url text,
  updated_at timestamptz not null default now()
);

create table public.events (
  id bigint generated always as identity primary key,
  type text not null check (type in (
    'product_view', 'add_to_cart', 'remove_from_cart', 'cart_view',
    'checkout_started', 'order_created', 'whatsapp_clicked'
  )),
  product_id uuid references public.products (id) on delete set null,
  session_id text check (char_length(session_id) <= 64),
  meta jsonb check (meta is null or pg_column_size(meta) <= 2048),
  created_at timestamptz not null default now()
);
create index events_type_created_idx on public.events (type, created_at desc);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();
