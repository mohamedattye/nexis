-- =====================================================
-- NEXIS V3 — VALIDATION MULTI-TENANT PHASE 2
-- Script de contrôle en lecture seule après exécution des phases 1 et 2.
-- Aucun DELETE / UPDATE / INSERT.
-- =====================================================

-- 1. Organisations et profils
select
  o.id,
  o.name,
  o.slug,
  o.is_active,
  count(p.id) as users,
  count(*) filter (where p.role = 'admin'::public.app_role and p.is_active) as active_admins
from public.organizations o
left join public.profiles p on p.organization_id = o.id
group by o.id, o.name, o.slug, o.is_active
order by o.created_at;

-- 2. Aucune ligne métier ne doit être sans organisation
select 'profiles' as table_name, count(*) as rows_without_org from public.profiles where organization_id is null
union all
select 'clients', count(*) from public.clients where organization_id is null
union all
select 'trucks', count(*) from public.trucks where organization_id is null
union all
select 'trips', count(*) from public.trips where organization_id is null
union all
select 'trip_expenses', count(*) from public.trip_expenses where organization_id is null
union all
select 'vehicle_charges', count(*) from public.vehicle_charges where organization_id is null
union all
select 'invoices', count(*) from public.invoices where organization_id is null
union all
select 'invoice_trips', count(*) from public.invoice_trips where organization_id is null;

-- 3. Vérification des relations inter-entreprises : tous les résultats doivent être 0.
select
  'trips_client_cross_tenant' as check_name,
  count(*) as violations
from public.trips t
join public.clients c on c.id = t.client_id
where t.client_id is not null
  and t.organization_id <> c.organization_id

union all

select
  'trip_expenses_cross_tenant',
  count(*)
from public.trip_expenses e
join public.trips t on t.id = e.trip_id
where e.organization_id <> t.organization_id

union all

select
  'invoices_client_cross_tenant',
  count(*)
from public.invoices i
join public.clients c on c.id = i.client_id
where i.client_id is not null
  and i.organization_id <> c.organization_id

union all

select
  'invoice_links_invoice_cross_tenant',
  count(*)
from public.invoice_trips it
join public.invoices i on i.id = it.invoice_id
where it.organization_id <> i.organization_id

union all

select
  'invoice_links_trip_cross_tenant',
  count(*)
from public.invoice_trips it
join public.trips t on t.id = it.trip_id
where it.organization_id <> t.organization_id;

-- 4. RLS doit être actif sur toutes les tables ci-dessous.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'organizations','profiles','clients','trucks','trips','trip_expenses',
    'vehicle_charges','invoices','invoice_trips'
  )
order by c.relname;

-- 5. Liste des politiques tenant actives.
select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'organizations','profiles','clients','trucks','trips','trip_expenses',
    'vehicle_charges','invoices','invoice_trips'
  )
order by tablename, cmd, policyname;

-- 6. Aucun droit métier direct pour anon/public.
select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'organizations','profiles','clients','trucks','trips','trip_expenses',
    'vehicle_charges','invoices','invoice_trips'
  )
  and lower(grantee) in ('anon','public')
order by table_name, grantee, privilege_type;

-- 7. Contrôle de l'organisation Nexis initiale et de ses volumes.
select
  o.name,
  o.id as organization_id,
  (select count(*) from public.clients c where c.organization_id = o.id) as clients,
  (select count(*) from public.trucks t where t.organization_id = o.id) as trucks,
  (select count(*) from public.trips t where t.organization_id = o.id) as trips,
  (select count(*) from public.invoices i where i.organization_id = o.id) as invoices
from public.organizations o
where o.slug = 'nexis-logistics';

-- Résultats attendus :
-- - aucune ligne sans organization_id
-- - aucune violation inter-entreprises
-- - RLS = true sur toutes les tables
-- - aucune ligne dans la requête des droits anon/public
-- - Nexis Logistics conserve les volumes historiques existants
