create table if not exists stores (
  id serial primary key,
  name text not null,
  location text not null,
  description text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id serial primary key,
  store_id integer references stores(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null,
  status text not null default 'active',
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staff (
  id serial primary key,
  store_id integer references stores(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null,
  status text not null default 'active',
  shift text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists spaces (
  id serial primary key,
  store_id integer references stores(id) on delete cascade,
  label text not null,
  kind text not null,
  capacity integer not null,
  qr_token text not null unique,
  status text not null default 'available',
  assigned_waiter text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists menu_items (
  id serial primary key,
  store_id integer references stores(id) on delete cascade,
  name text not null,
  category text not null,
  description text not null,
  price numeric(10,2) not null,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bookings (
  id serial primary key,
  store_id integer references stores(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  space_kind text not null,
  space_label text not null,
  party_size integer not null,
  booking_time timestamptz not null,
  notes text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id serial primary key,
  store_id integer references stores(id) on delete cascade,
  space_id integer references spaces(id) on delete set null,
  waiter_name text not null,
  customer_name text not null,
  customer_email text not null,
  channel text not null,
  status text not null,
  payment_status text not null,
  notes text not null default '',
  total numeric(10,2) not null,
  items jsonb not null,
  history jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id serial primary key,
  store_id integer references stores(id) on delete cascade,
  order_id integer references orders(id) on delete cascade,
  target_role text not null,
  type text not null,
  message text not null,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);
