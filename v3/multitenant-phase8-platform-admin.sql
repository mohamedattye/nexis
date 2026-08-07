-- =====================================================
-- NEXIS V3 — MULTI-TENANT PHASE 8
-- Administration plateforme Nexis
-- Vue globale sociétés clientes + abonnements + CA SaaS
-- PRÉREQUIS : Phases 1 à 7
-- =====================================================

begin;

-- -----------------------------------------------------
-- 1. ADMINISTRATEURS DE LA PLATEFORME NEXIS
-- Distincts des admins propres à chaque entreprise cliente.
-- -----------------------------------------------------
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  notes text
);

alter table public.platform_admins enable row level security;
revoke all on table public.platform_admins from public, anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.is_active = true
  );
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- Bootstrap sécurisé : utilisable une seule fois, uniquement par
-- un admin actif de l'organisation historique Nexis Logistics.
create or replace function public.bootstrap_first_platform_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_slug text;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if exists (select 1 from public.platform_admins) then
    raise exception 'Un administrateur plateforme existe déjà.';
  end if;

  select o.slug into current_slug
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where p.id = auth.uid()
    and p.is_active = true
    and p.role = 'admin'::public.app_role
  limit 1;

  if current_slug is distinct from 'nexis-logistics' then
    raise exception 'Initialisation réservée à Nexis Logistics.';
  end if;

  insert into public.platform_admins(user_id,notes)
  values(auth.uid(),'Premier administrateur plateforme Nexis.');

  return true;
end;
$$;

revoke all on function public.bootstrap_first_platform_admin() from public, anon;
grant execute on function public.bootstrap_first_platform_admin() to authenticated;

-- -----------------------------------------------------
-- 2. VUE GLOBALE DES SOCIÉTÉS
-- -----------------------------------------------------
create or replace function public.platform_admin_organizations()
returns table(
  organization_id uuid,
  organization_name text,
  legal_name text,
  email text,
  phone text,
  city text,
  organization_active boolean,
  created_at timestamptz,
  active_trucks integer,
  users_count integer,
  subscription_id uuid,
  subscription_status text,
  starts_on date,
  ends_on date,
  amount_due numeric,
  amount_paid numeric,
  payment_status text,
  payment_method text,
  payment_reference text,
  current_annual_price numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Accès réservé à l’administration Nexis.';
  end if;

  return query
  select
    o.id,
    o.name,
    o.legal_name,
    o.email,
    o.phone,
    o.city,
    o.is_active,
    o.created_at,
    public.active_truck_count(o.id),
    (select count(*)::integer from public.profiles p where p.organization_id=o.id),
    s.id,
    s.status,
    s.starts_on,
    s.ends_on,
    s.amount_due,
    s.amount_paid,
    s.payment_status,
    s.payment_method,
    s.payment_reference,
    public.calculate_annual_subscription_price(o.id,'annual_launch_2026')
  from public.organizations o
  left join lateral (
    select os.*
    from public.organization_subscriptions os
    where os.organization_id=o.id
    order by os.created_at desc
    limit 1
  ) s on true
  order by o.created_at desc;
end;
$$;

revoke all on function public.platform_admin_organizations() from public, anon;
grant execute on function public.platform_admin_organizations() to authenticated;

-- -----------------------------------------------------
-- 3. KPI PLATEFORME
-- -----------------------------------------------------
create or replace function public.platform_admin_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Accès réservé à l’administration Nexis.';
  end if;

  select jsonb_build_object(
    'organizations_total', (select count(*) from public.organizations),
    'organizations_active', (select count(*) from public.organizations where is_active=true),
    'subscriptions_active', (select count(*) from public.organization_subscriptions where status='active' and coalesce(ends_on,current_date)>=current_date),
    'subscriptions_pending', (select count(*) from public.organization_subscriptions where status='pending'),
    'subscriptions_expiring_30d', (select count(*) from public.organization_subscriptions where status='active' and ends_on between current_date and current_date+30),
    'total_active_trucks', (select count(*) from public.trucks where coalesce(is_active,true)=true),
    'cash_collected_total', (select coalesce(sum(amount_paid),0) from public.organization_subscriptions),
    'cash_collected_current_year', (select coalesce(sum(amount_paid),0) from public.organization_subscriptions where extract(year from coalesce(paid_at,created_at))=extract(year from current_date)),
    'annual_contract_value_active', (select coalesce(sum(amount_due),0) from public.organization_subscriptions where status='active' and coalesce(ends_on,current_date)>=current_date)
  ) into result;

  return result;
end;
$$;

revoke all on function public.platform_admin_kpis() from public, anon;
grant execute on function public.platform_admin_kpis() to authenticated;

-- -----------------------------------------------------
-- 4. ACTIVATION / RENOUVELLEMENT APRÈS PAIEMENT
-- -----------------------------------------------------
create or replace function public.platform_admin_activate_subscription(
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
  if not public.is_platform_admin() then
    raise exception 'Accès réservé à l’administration Nexis.';
  end if;

  if target_start_date is null then target_start_date := current_date; end if;
  if target_amount_paid is null or target_amount_paid < 0 then
    raise exception 'Montant payé invalide.';
  end if;

  select * into target_plan
  from public.subscription_plans
  where code='annual_launch_2026' and is_active=true
  limit 1;

  if not found then raise exception 'Plan annuel Nexis introuvable.'; end if;

  calculated_price := public.calculate_annual_subscription_price(target_organization_id,target_plan.code);

  update public.organization_subscriptions
  set status='expired', updated_at=now()
  where organization_id=target_organization_id
    and status in ('pending','active','suspended');

  insert into public.organization_subscriptions(
    organization_id,plan_id,status,starts_on,ends_on,
    amount_due,amount_paid,payment_status,payment_method,
    payment_reference,paid_at,notes
  ) values (
    target_organization_id,
    target_plan.id,
    'active',
    target_start_date,
    (target_start_date + interval '1 year' - interval '1 day')::date,
    calculated_price,
    target_amount_paid,
    case
      when target_amount_paid >= calculated_price then 'paid'
      when target_amount_paid > 0 then 'partial'
      else 'unpaid'
    end,
    nullif(trim(target_payment_method),''),
    nullif(trim(target_payment_reference),''),
    case when target_amount_paid>0 then now() else null end,
    nullif(trim(target_notes),'')
  ) returning id into subscription_id;

  return subscription_id;
end;
$$;

revoke all on function public.platform_admin_activate_subscription(uuid,date,numeric,text,text,text) from public, anon;
grant execute on function public.platform_admin_activate_subscription(uuid,date,numeric,text,text,text) to authenticated;

-- -----------------------------------------------------
-- 5. SUSPENDRE / RÉACTIVER UNE SOUSCRIPTION
-- -----------------------------------------------------
create or replace function public.platform_admin_set_subscription_status(
  target_subscription_id uuid,
  target_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Accès réservé à l’administration Nexis.';
  end if;

  if target_status not in ('active','suspended','cancelled','expired') then
    raise exception 'Statut invalide.';
  end if;

  update public.organization_subscriptions
  set status=target_status, updated_at=now()
  where id=target_subscription_id;

  if not found then raise exception 'Abonnement introuvable.'; end if;
  return true;
end;
$$;

revoke all on function public.platform_admin_set_subscription_status(uuid,text) from public, anon;
grant execute on function public.platform_admin_set_subscription_status(uuid,text) to authenticated;

-- -----------------------------------------------------
-- 6. ACTIVER / DÉSACTIVER UNE SOCIÉTÉ CLIENTE
-- -----------------------------------------------------
create or replace function public.platform_admin_set_organization_active(
  target_organization_id uuid,
  target_active boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Accès réservé à l’administration Nexis.';
  end if;

  update public.organizations
  set is_active=target_active, updated_at=now()
  where id=target_organization_id;

  if not found then raise exception 'Entreprise introuvable.'; end if;
  return true;
end;
$$;

revoke all on function public.platform_admin_set_organization_active(uuid,boolean) from public, anon;
grant execute on function public.platform_admin_set_organization_active(uuid,boolean) to authenticated;

commit;

-- Après migration, le premier admin Nexis Logistics peut appeler :
-- select public.bootstrap_first_platform_admin();
