-- =====================================================
-- NEXIS V3 — MULTI-TENANT PHASE 7
-- Abonnement annuel de lancement
-- 1 à 10 camions actifs : 630 000 FCFA / an
-- 11 camions actifs et plus : 750 000 FCFA / an
-- Paiement enregistré manuellement pour le lancement.
-- =====================================================

begin;

-- -----------------------------------------------------
-- 1. PLAN COMMERCIAL UNIQUE DE LANCEMENT
-- -----------------------------------------------------
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  currency text not null default 'XOF',
  billing_interval text not null default 'year' check (billing_interval = 'year'),
  base_annual_price numeric(14,2) not null check (base_annual_price >= 0),
  included_active_trucks integer not null default 10 check (included_active_trucks >= 0),
  fleet_surcharge_annual numeric(14,2) not null default 0 check (fleet_surcharge_annual >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.subscription_plans(
  code,name,currency,billing_interval,
  base_annual_price,included_active_trucks,fleet_surcharge_annual,is_active
)
values(
  'annual_launch_2026',
  'Nexis Annuel',
  'XOF',
  'year',
  630000,
  10,
  120000,
  true
)
on conflict (code) do update
set name = excluded.name,
    currency = excluded.currency,
    billing_interval = excluded.billing_interval,
    base_annual_price = excluded.base_annual_price,
    included_active_trucks = excluded.included_active_trucks,
    fleet_surcharge_annual = excluded.fleet_surcharge_annual,
    is_active = excluded.is_active,
    updated_at = now();

alter table public.subscription_plans enable row level security;
revoke all on table public.subscription_plans from public, anon, authenticated;
grant select on table public.subscription_plans to authenticated;

drop policy if exists "Authenticated users can read active plans" on public.subscription_plans;
create policy "Authenticated users can read active plans"
  on public.subscription_plans for select to authenticated
  using (is_active = true);

-- -----------------------------------------------------
-- 2. ABONNEMENT D'UNE ENTREPRISE
-- -----------------------------------------------------
create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending','active','expired','suspended','cancelled')),
  starts_on date,
  ends_on date,
  amount_due numeric(14,2) not null default 0 check (amount_due >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','partial','waived')),
  payment_method text,
  payment_reference text,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_subscriptions_org_idx
  on public.organization_subscriptions(organization_id, created_at desc);
create index if not exists organization_subscriptions_status_idx
  on public.organization_subscriptions(status, ends_on);

-- Une seule souscription courante non terminée par entreprise.
create unique index if not exists organization_subscriptions_one_current_idx
  on public.organization_subscriptions(organization_id)
  where status in ('pending','active','suspended');

alter table public.organization_subscriptions enable row level security;
revoke all on table public.organization_subscriptions from public, anon, authenticated;
grant select on table public.organization_subscriptions to authenticated;

-- Les utilisateurs voient uniquement l'abonnement de leur entreprise.
drop policy if exists "Tenant can read own subscription" on public.organization_subscriptions;
create policy "Tenant can read own subscription"
  on public.organization_subscriptions for select to authenticated
  using (organization_id = public.current_organization_id());

-- IMPORTANT : aucune policy INSERT/UPDATE/DELETE pour authenticated.
-- Pour le lancement, seul Nexis (service role / administration interne)
-- enregistre les paiements et active les abonnements.

-- -----------------------------------------------------
-- 3. PRIX ANNUEL CALCULÉ SELON LA FLOTTE ACTIVE
-- -----------------------------------------------------
create or replace function public.active_truck_count(target_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.trucks
  where organization_id = target_organization_id
    and coalesce(is_active,true) = true;
$$;

create or replace function public.calculate_annual_subscription_price(
  target_organization_id uuid,
  target_plan_code text default 'annual_launch_2026'
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  plan_record public.subscription_plans%rowtype;
  truck_count integer;
begin
  select * into plan_record
  from public.subscription_plans
  where code = target_plan_code and is_active = true
  limit 1;

  if not found then
    raise exception 'Plan Nexis introuvable.';
  end if;

  truck_count := public.active_truck_count(target_organization_id);

  if truck_count > plan_record.included_active_trucks then
    return plan_record.base_annual_price + plan_record.fleet_surcharge_annual;
  end if;

  return plan_record.base_annual_price;
end;
$$;

revoke all on function public.active_truck_count(uuid) from public, anon;
revoke all on function public.calculate_annual_subscription_price(uuid,text) from public, anon;
grant execute on function public.active_truck_count(uuid) to authenticated;
grant execute on function public.calculate_annual_subscription_price(uuid,text) to authenticated;

-- -----------------------------------------------------
-- 4. VUE DE L'ABONNEMENT COURANT
-- -----------------------------------------------------
create or replace view public.current_organization_subscription
with (security_invoker = true)
as
select
  s.id,
  s.organization_id,
  p.code as plan_code,
  p.name as plan_name,
  p.currency,
  p.base_annual_price,
  p.included_active_trucks,
  p.fleet_surcharge_annual,
  public.active_truck_count(s.organization_id) as active_trucks,
  public.calculate_annual_subscription_price(s.organization_id,p.code) as current_annual_price,
  s.status,
  s.starts_on,
  s.ends_on,
  s.amount_due,
  s.amount_paid,
  s.payment_status,
  s.payment_method,
  s.payment_reference,
  s.paid_at,
  s.notes
from public.organization_subscriptions s
join public.subscription_plans p on p.id = s.plan_id
where s.organization_id = public.current_organization_id()
order by s.created_at desc
limit 1;

grant select on public.current_organization_subscription to authenticated;

-- -----------------------------------------------------
-- 5. CRÉATION AUTOMATIQUE D'UNE SOUSCRIPTION EN ATTENTE
-- POUR LES ENTREPRISES QUI N'EN ONT PAS ENCORE.
-- Cela ne donne pas de statut actif et n'enregistre aucun paiement.
-- -----------------------------------------------------
insert into public.organization_subscriptions(
  organization_id, plan_id, status, amount_due, amount_paid, payment_status, notes
)
select
  o.id,
  p.id,
  'pending',
  public.calculate_annual_subscription_price(o.id,p.code),
  0,
  'unpaid',
  'Souscription initiale créée par la migration Phase 7.'
from public.organizations o
cross join public.subscription_plans p
where p.code = 'annual_launch_2026'
  and not exists (
    select 1 from public.organization_subscriptions s
    where s.organization_id = o.id
  );

-- -----------------------------------------------------
-- 6. FONCTION INTERNE D'ACTIVATION APRÈS PAIEMENT
-- À utiliser uniquement via service role / administration Nexis.
-- -----------------------------------------------------
create or replace function public.activate_annual_subscription(
  target_organization_id uuid,
  target_start_date date,
  target_amount_paid numeric,
  target_payment_method text default null,
  target_payment_reference text default null,
  target_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_plan public.subscription_plans%rowtype;
  subscription_id uuid;
  calculated_price numeric;
begin
  if auth.uid() is not null then
    raise exception 'Activation réservée à l’administration Nexis.';
  end if;

  select * into target_plan
  from public.subscription_plans
  where code = 'annual_launch_2026' and is_active = true
  limit 1;

  if not found then raise exception 'Plan annuel Nexis introuvable.'; end if;

  calculated_price := public.calculate_annual_subscription_price(target_organization_id,target_plan.code);

  update public.organization_subscriptions
  set status = 'expired'
  where organization_id = target_organization_id
    and status in ('pending','active','suspended');

  insert into public.organization_subscriptions(
    organization_id,plan_id,status,starts_on,ends_on,
    amount_due,amount_paid,payment_status,
    payment_method,payment_reference,paid_at,notes
  ) values (
    target_organization_id,
    target_plan.id,
    'active',
    target_start_date,
    target_start_date + interval '1 year' - interval '1 day',
    calculated_price,
    target_amount_paid,
    case
      when target_amount_paid >= calculated_price then 'paid'
      when target_amount_paid > 0 then 'partial'
      else 'unpaid'
    end,
    target_payment_method,
    target_payment_reference,
    case when target_amount_paid > 0 then now() else null end,
    target_notes
  ) returning id into subscription_id;

  return subscription_id;
end;
$$;

revoke all on function public.activate_annual_subscription(uuid,date,numeric,text,text,text) from public, anon, authenticated;

-- -----------------------------------------------------
-- 7. UPDATED_AT
-- -----------------------------------------------------
create or replace function public.set_subscription_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists subscription_plans_updated_at on public.subscription_plans;
create trigger subscription_plans_updated_at
before update on public.subscription_plans
for each row execute function public.set_subscription_updated_at();

drop trigger if exists organization_subscriptions_updated_at on public.organization_subscriptions;
create trigger organization_subscriptions_updated_at
before update on public.organization_subscriptions
for each row execute function public.set_subscription_updated_at();

commit;

-- -----------------------------------------------------
-- 8. CONTRÔLE
-- -----------------------------------------------------
select code,base_annual_price,included_active_trucks,fleet_surcharge_annual
from public.subscription_plans
where code='annual_launch_2026';

select
  o.name,
  public.active_truck_count(o.id) as active_trucks,
  public.calculate_annual_subscription_price(o.id,'annual_launch_2026') as annual_price
from public.organizations o
order by o.name;
