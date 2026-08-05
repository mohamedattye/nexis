-- Nexis V3 Test — module Clients
-- À exécuter une seule fois dans le SQL Editor du projet Supabase TEST.

create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  ninea text,
  rccm text,
  address text,
  city text,
  phone text,
  email text,
  contact_name text,
  payment_terms_days integer not null default 30 check (payment_terms_days >= 0),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_company_name_idx on public.clients (company_name);
create index if not exists clients_is_active_idx on public.clients (is_active);

alter table public.clients enable row level security;

drop policy if exists "authenticated can read clients" on public.clients;
create policy "authenticated can read clients"
on public.clients for select
to authenticated
using (true);

drop policy if exists "authenticated can insert clients" on public.clients;
create policy "authenticated can insert clients"
on public.clients for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update clients" on public.clients;
create policy "authenticated can update clients"
on public.clients for update
to authenticated
using (true)
with check (true);

create or replace function public.set_clients_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_clients_updated_at();