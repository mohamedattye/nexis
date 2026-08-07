-- =====================================================
-- NEXIS V3 — MULTI-TENANT PHASE 1
-- Fondation organisations + rattachement utilisateurs
--
-- IMPORTANT :
-- 1) À exécuter d'abord sur le projet Supabase TEST.
-- 2) Cette phase est volontairement non destructive.
-- 3) Elle ne modifie PAS encore les politiques RLS des tables métier.
-- 4) Les données existantes sont rattachées à une organisation Nexis initiale.
-- =====================================================

begin;

-- -----------------------------------------------------
-- 1. TABLE DES ENTREPRISES / ORGANISATIONS
-- -----------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  legal_name text,
  ninea text,
  rccm text,
  address text,
  city text,
  country text not null default 'Sénégal',
  phone text,
  email text,
  logo_url text,
  currency text not null default 'XOF',
  default_vat_rate numeric(5,2) not null default 18,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- -----------------------------------------------------
-- 2. ORGANISATION INITIALE POUR LES DONNÉES EXISTANTES
-- -----------------------------------------------------
insert into public.organizations (name, slug, legal_name, country, currency, default_vat_rate)
select 'Nexis Logistics', 'nexis-logistics', 'Nexis Logistics', 'Sénégal', 'XOF', 18
where not exists (
  select 1 from public.organizations where slug = 'nexis-logistics'
);

-- -----------------------------------------------------
-- 3. RATTACHEMENT DES PROFILS À UNE ORGANISATION
-- -----------------------------------------------------
alter table public.profiles
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

update public.profiles
set organization_id = (
  select id from public.organizations where slug = 'nexis-logistics' limit 1
)
where organization_id is null;

-- On ne force NOT NULL que si tous les profils ont pu être rattachés.
do $$
begin
  if exists (select 1 from public.profiles where organization_id is null) then
    raise exception 'Multi-tenant Nexis : certains profils n''ont pas d''organisation. Migration annulée.';
  end if;
end $$;

alter table public.profiles
  alter column organization_id set not null;

create index if not exists profiles_organization_id_idx
  on public.profiles(organization_id);

-- -----------------------------------------------------
-- 4. FONCTIONS DE CONTEXTE MULTI-TENANT
-- -----------------------------------------------------
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.belongs_to_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_organization_id() = target_organization_id, false);
$$;

create or replace function public.is_organization_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
      and organization_id = public.current_organization_id()
      and role = 'admin'::public.app_role
  );
$$;

revoke all on function public.current_organization_id() from public, anon;
revoke all on function public.belongs_to_organization(uuid) from public, anon;
revoke all on function public.is_organization_admin() from public, anon;

grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.belongs_to_organization(uuid) to authenticated;
grant execute on function public.is_organization_admin() to authenticated;

-- -----------------------------------------------------
-- 5. RLS ORGANISATIONS
-- Un utilisateur voit uniquement son entreprise.
-- Un admin de l'entreprise pourra plus tard modifier ses paramètres.
-- -----------------------------------------------------
revoke all on table public.organizations from public, anon, authenticated;
grant select, update on table public.organizations to authenticated;

drop policy if exists "Users can view own organization" on public.organizations;
create policy "Users can view own organization"
  on public.organizations
  for select
  to authenticated
  using (id = public.current_organization_id());

drop policy if exists "Organization admins can update own organization" on public.organizations;
create policy "Organization admins can update own organization"
  on public.organizations
  for update
  to authenticated
  using (
    id = public.current_organization_id()
    and public.is_organization_admin()
  )
  with check (
    id = public.current_organization_id()
    and public.is_organization_admin()
  );

-- -----------------------------------------------------
-- 6. MISE À JOUR AUTOMATIQUE DE updated_at
-- -----------------------------------------------------
create or replace function public.set_organizations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at
before update on public.organizations
for each row execute function public.set_organizations_updated_at();

commit;

-- -----------------------------------------------------
-- 7. CONTRÔLE FINAL
-- Résultat attendu :
-- organization_count >= 1
-- profiles_without_organization = 0
-- -----------------------------------------------------
select
  (select count(*) from public.organizations) as organization_count,
  (select count(*) from public.profiles where organization_id is null) as profiles_without_organization,
  (select id from public.organizations where slug = 'nexis-logistics' limit 1) as initial_organization_id;
