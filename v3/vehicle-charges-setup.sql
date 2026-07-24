-- =====================================================
-- NEXIS V3 TEST — CHARGES VEHICULES ET ENTRETIEN
-- À exécuter uniquement dans le projet Supabase Nexis V3 Test
-- =====================================================

create table if not exists public.vehicle_charges (
  id uuid primary key default gen_random_uuid(),
  truck text not null references public.trucks(plate_number)
    on update cascade on delete restrict,
  month date not null,
  maintenance numeric(14, 2) not null default 0 check (maintenance >= 0),
  repairs numeric(14, 2) not null default 0 check (repairs >= 0),
  insurance numeric(14, 2) not null default 0 check (insurance >= 0),
  technical_visit numeric(14, 2) not null default 0 check (technical_visit >= 0),
  driver_cost numeric(14, 2) not null default 0 check (driver_cost >= 0),
  financing numeric(14, 2) not null default 0 check (financing >= 0),
  other numeric(14, 2) not null default 0 check (other >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_charges_truck_month_unique unique (truck, month),
  constraint vehicle_charges_month_first_day check (
    month = date_trunc('month', month)::date
  )
);

create index if not exists vehicle_charges_month_idx
  on public.vehicle_charges(month);

create index if not exists vehicle_charges_truck_idx
  on public.vehicle_charges(truck);

alter table public.vehicle_charges enable row level security;

grant select, insert, update, delete
  on public.vehicle_charges
  to anon, authenticated;

drop policy if exists "Nexis test access vehicle charges"
  on public.vehicle_charges;

create policy "Nexis test access vehicle charges"
  on public.vehicle_charges
  for all
  to anon, authenticated
  using (true)
  with check (true);

create or replace function public.set_vehicle_charges_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vehicle_charges_updated_at
  on public.vehicle_charges;

create trigger vehicle_charges_updated_at
before update on public.vehicle_charges
for each row execute function public.set_vehicle_charges_updated_at();
