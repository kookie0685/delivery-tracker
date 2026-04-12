create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null check (role in ('admin', 'driver', 'finance')),
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_number text not null unique,
  driver_id text,
  driver_name text not null,
  driver_phone text not null,
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  location text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_stops (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  location text not null,
  arrival_time text not null,
  departure_time text not null,
  delivery_status text not null default 'Delivered',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create table if not exists public.goods_delivered (
  id uuid primary key default gen_random_uuid(),
  stop_id uuid not null references public.delivery_stops(id) on delete cascade,
  product_name text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  delivery_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_references (
  id uuid primary key default gen_random_uuid(),
  stop_id uuid not null unique references public.delivery_stops(id) on delete cascade,
  invoice_reference text not null,
  invoice_amount numeric(14,2) not null check (invoice_amount >= 0),
  invoice_date date not null,
  payment_status text not null default 'Pending',
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoice_references(id) on delete cascade,
  payment_method text not null check (payment_method in ('Cash', 'UPI', 'Bank Transfer', 'Card', 'Credit')),
  amount_received numeric(14,2) not null check (amount_received >= 0),
  payment_date date not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create table if not exists public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoice_references(id) on delete cascade,
  credit_amount numeric(14,2) not null check (credit_amount >= 0),
  reason text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create table if not exists public.delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  stop_id uuid not null references public.delivery_stops(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create or replace view public.customer_ledger as
select
  gen_random_uuid() as id,
  c.id as customer_id,
  coalesce(sum(ir.invoice_amount), 0) as total_invoice,
  coalesce(sum(p.amount_received), 0) as total_paid,
  coalesce(sum(cn.credit_amount), 0) as credit_amount,
  greatest(
    coalesce(sum(ir.invoice_amount), 0)
    - coalesce(sum(p.amount_received), 0)
    - coalesce(sum(cn.credit_amount), 0),
    0
  ) as outstanding_balance
from public.customers c
left join public.delivery_stops ds on ds.customer_id = c.id
left join public.invoice_references ir on ir.stop_id = ds.id
left join public.payments p on p.invoice_id = ir.id
left join public.credit_notes cn on cn.invoice_id = ir.id
group by c.id;

alter table public.vehicles enable row level security;
alter table public.customers enable row level security;
alter table public.delivery_stops enable row level security;
alter table public.goods_delivered enable row level security;
alter table public.invoice_references enable row level security;
alter table public.payments enable row level security;
alter table public.credit_notes enable row level security;
alter table public.delivery_proofs enable row level security;
alter table public.profiles enable row level security;

create policy "authenticated users can read vehicles"
on public.vehicles for select to authenticated using (true);

create policy "admins can manage vehicles"
on public.vehicles for all to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

create policy "authenticated users can read customers"
on public.customers for select to authenticated using (true);

create policy "admins can manage customers"
on public.customers for all to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

create policy "authenticated users can read delivery data"
on public.delivery_stops for select to authenticated using (true);

create policy "admins and drivers can create delivery stops"
on public.delivery_stops for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'driver')
  )
);

create policy "authenticated users can read goods delivered"
on public.goods_delivered for select to authenticated using (true);

create policy "admins and drivers can create goods delivered"
on public.goods_delivered for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'driver')
  )
);

create policy "authenticated users can read invoice references"
on public.invoice_references for select to authenticated using (true);

create policy "admins and drivers can create invoice references"
on public.invoice_references for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'driver')
  )
);

create policy "authenticated users can read payments"
on public.payments for select to authenticated using (true);

create policy "admins drivers and finance can create payments"
on public.payments for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'driver', 'finance')
  )
);

create policy "authenticated users can read credit notes"
on public.credit_notes for select to authenticated using (true);

create policy "admins drivers and finance can create credit notes"
on public.credit_notes for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'driver', 'finance')
  )
);

create policy "authenticated users can read delivery proofs"
on public.delivery_proofs for select to authenticated using (true);

create policy "admins and drivers can create delivery proofs"
on public.delivery_proofs for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'driver')
  )
);
