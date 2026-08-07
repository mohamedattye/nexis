-- =====================================================
-- NEXIS V3 — MULTI-TENANT PHASE 2
-- Isolation complète des données métier par organisation
--
-- PRÉREQUIS : exécuter d'abord multitenant-phase1-organizations.sql
-- IMPORTANT : à tester uniquement sur le projet Supabase TEST avant production.
-- Cette migration conserve les données existantes et les rattache à Nexis Logistics.
-- =====================================================

begin;

-- -----------------------------------------------------
-- 0. GARDE-FOUS
-- -----------------------------------------------------
do $$
begin
  if to_regclass('public.organizations') is null then
    raise exception 'Phase 2 impossible : table organizations absente. Exécuter la Phase 1.';
  end if;

  if not exists (
    select 1 from public.organizations where slug = 'nexis-logistics'
  ) then
    raise exception 'Phase 2 impossible : organisation initiale Nexis Logistics introuvable.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'organization_id'
  ) then
    raise exception 'Phase 2 impossible : profiles.organization_id absent. Exécuter la Phase 1.';
  end if;
end $$;

-- -----------------------------------------------------
-- 1. AJOUT organization_id AUX TABLES MÉTIER
-- La boucle ne touche qu'aux tables réellement présentes.
-- -----------------------------------------------------
do $$
declare
  table_name text;
  initial_org uuid;
  target_tables text[] := array[
    'clients',
    'trucks',
    'trips',
    'trip_expenses',
    'vehicle_charges',
    'invoices',
    'invoice_trips'
  ];
begin
  select id into initial_org
  from public.organizations
  where slug = 'nexis-logistics'
  limit 1;

  foreach table_name in array target_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'alter table public.%I add column if not exists organization_id uuid references public.organizations(id) on delete restrict',
        table_name
      );

      -- Toutes les données historiques appartiennent aujourd'hui à Nexis Logistics.
      execute format(
        'update public.%I set organization_id = $1 where organization_id is null',
        table_name
      ) using initial_org;

      execute format(
        'alter table public.%I alter column organization_id set not null',
        table_name
      );

      execute format(
        'create index if not exists %I on public.%I(organization_id)',
        table_name || '_organization_id_idx',
        table_name
      );
    end if;
  end loop;
end $$;

-- Index utiles pour les lectures filtrées par entreprise.
do $$
begin
  if to_regclass('public.clients') is not null then
    create index if not exists clients_org_company_idx
      on public.clients(organization_id, company_name);
  end if;

  if to_regclass('public.trucks') is not null then
    create index if not exists trucks_org_plate_idx
      on public.trucks(organization_id, plate_number);
  end if;

  if to_regclass('public.trips') is not null then
    create index if not exists trips_org_date_idx
      on public.trips(organization_id, date);
  end if;

  if to_regclass('public.invoices') is not null then
    create index if not exists invoices_org_issue_date_idx
      on public.invoices(organization_id, issue_date);
  end if;
end $$;

-- -----------------------------------------------------
-- 2. FONCTIONS D'AUTORISATION MULTI-TENANT
-- is_admin reste disponible pour le code existant mais devient
-- strictement équivalent à "admin de MON organisation".
-- -----------------------------------------------------
create or replace function public.is_active_user()
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
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_organization_admin();
$$;

revoke all on function public.is_active_user() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- -----------------------------------------------------
-- 3. ATTRIBUTION AUTOMATIQUE DE L'ORGANISATION
-- Le frontend actuel n'a pas besoin d'envoyer organization_id :
-- le trigger l'ajoute automatiquement depuis le profil connecté.
-- -----------------------------------------------------
create or replace function public.assign_current_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_org uuid;
begin
  -- Les scripts serveur/service-role peuvent fournir explicitement organization_id.
  if auth.uid() is null then
    if new.organization_id is null then
      raise exception 'organization_id obligatoire pour une écriture serveur.';
    end if;
    return new;
  end if;

  current_org := public.current_organization_id();

  if current_org is null then
    raise exception 'Utilisateur sans organisation active.';
  end if;

  if new.organization_id is null then
    new.organization_id := current_org;
  elsif new.organization_id <> current_org then
    raise exception 'Écriture interdite dans une autre organisation.';
  end if;

  return new;
end;
$$;

revoke all on function public.assign_current_organization() from public, anon;

-- Triggers d'attribution automatique.
do $$
declare
  table_name text;
  target_tables text[] := array[
    'clients', 'trucks', 'trips', 'trip_expenses',
    'vehicle_charges', 'invoices', 'invoice_trips'
  ];
begin
  foreach table_name in array target_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('drop trigger if exists tenant_assign_organization on public.%I', table_name);
      execute format(
        'create trigger tenant_assign_organization before insert or update of organization_id on public.%I for each row execute function public.assign_current_organization()',
        table_name
      );
    end if;
  end loop;
end $$;

-- -----------------------------------------------------
-- 4. INTÉGRITÉ DES RELATIONS ENTRE TABLES
-- Empêche de rattacher un document de l'entreprise A à une donnée de B,
-- même si un identifiant UUID étranger était connu.
-- -----------------------------------------------------
create or replace function public.validate_tenant_relationships()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb := to_jsonb(new);
  related_uuid uuid;
  related_text text;
begin
  if new.organization_id is null then
    raise exception 'organization_id absent.';
  end if;

  if tg_table_name = 'trips' then
    related_uuid := nullif(payload ->> 'client_id', '')::uuid;
    if related_uuid is not null
       and to_regclass('public.clients') is not null
       and not exists (
         select 1 from public.clients
         where id = related_uuid
           and organization_id = new.organization_id
       ) then
      raise exception 'Le client sélectionné n''appartient pas à cette organisation.';
    end if;

    related_text := nullif(payload ->> 'truck', '');
    if related_text is not null
       and to_regclass('public.trucks') is not null
       and not exists (
         select 1 from public.trucks
         where plate_number = related_text
           and organization_id = new.organization_id
       ) then
      raise exception 'Le camion sélectionné n''appartient pas à cette organisation.';
    end if;

  elsif tg_table_name = 'trip_expenses' then
    related_uuid := nullif(payload ->> 'trip_id', '')::uuid;
    if related_uuid is not null
       and not exists (
         select 1 from public.trips
         where id = related_uuid
           and organization_id = new.organization_id
       ) then
      raise exception 'La mission liée n''appartient pas à cette organisation.';
    end if;

  elsif tg_table_name = 'vehicle_charges' then
    related_text := nullif(payload ->> 'truck', '');
    if related_text is not null
       and not exists (
         select 1 from public.trucks
         where plate_number = related_text
           and organization_id = new.organization_id
       ) then
      raise exception 'Le camion lié à cette charge n''appartient pas à cette organisation.';
    end if;

  elsif tg_table_name = 'invoices' then
    related_uuid := nullif(payload ->> 'client_id', '')::uuid;
    if related_uuid is not null
       and not exists (
         select 1 from public.clients
         where id = related_uuid
           and organization_id = new.organization_id
       ) then
      raise exception 'Le client de la facture n''appartient pas à cette organisation.';
    end if;

  elsif tg_table_name = 'invoice_trips' then
    related_uuid := nullif(payload ->> 'invoice_id', '')::uuid;
    if related_uuid is not null
       and not exists (
         select 1 from public.invoices
         where id = related_uuid
           and organization_id = new.organization_id
       ) then
      raise exception 'La facture liée n''appartient pas à cette organisation.';
    end if;

    related_uuid := nullif(payload ->> 'trip_id', '')::uuid;
    if related_uuid is not null
       and not exists (
         select 1 from public.trips
         where id = related_uuid
           and organization_id = new.organization_id
       ) then
      raise exception 'La mission liée à la facture n''appartient pas à cette organisation.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_tenant_relationships() from public, anon;

do $$
declare
  table_name text;
  relation_tables text[] := array[
    'trips', 'trip_expenses', 'vehicle_charges', 'invoices', 'invoice_trips'
  ];
begin
  foreach table_name in array relation_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('drop trigger if exists tenant_validate_relationships on public.%I', table_name);
      execute format(
        'create trigger tenant_validate_relationships before insert or update on public.%I for each row execute function public.validate_tenant_relationships()',
        table_name
      );
    end if;
  end loop;
end $$;

-- -----------------------------------------------------
-- 5. RLS : SUPPRESSION DES ANCIENNES POLITIQUES MÉTIER
-- -----------------------------------------------------
do $$
declare
  policy_record record;
  target_tables text[] := array[
    'clients', 'trucks', 'trips', 'trip_expenses',
    'vehicle_charges', 'invoices', 'invoice_trips'
  ];
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(target_tables)
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

-- Active RLS, enlève l'accès anonyme, puis redonne les privilèges SQL
-- aux utilisateurs authentifiés. Les policies filtrent ensuite les lignes.
do $$
declare
  table_name text;
  target_tables text[] := array[
    'clients', 'trucks', 'trips', 'trip_expenses',
    'vehicle_charges', 'invoices', 'invoice_trips'
  ];
begin
  foreach table_name in array target_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
      execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------
-- 6. POLITIQUES GÉNÉRIQUES PAR ORGANISATION
-- -----------------------------------------------------
do $$
declare
  table_name text;
  active_write_tables text[] := array['clients', 'trips', 'trip_expenses', 'invoices', 'invoice_trips'];
  admin_write_tables text[] := array['trucks', 'vehicle_charges'];
begin
  -- Tables où opérateurs actifs peuvent lire / créer / modifier.
  foreach table_name in array active_write_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'create policy %I on public.%I for select to authenticated using (organization_id = public.current_organization_id() and public.is_active_user())',
        'Tenant read ' || table_name, table_name
      );
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (organization_id = public.current_organization_id() and public.is_active_user())',
        'Tenant insert ' || table_name, table_name
      );
      execute format(
        'create policy %I on public.%I for update to authenticated using (organization_id = public.current_organization_id() and public.is_active_user()) with check (organization_id = public.current_organization_id() and public.is_active_user())',
        'Tenant update ' || table_name, table_name
      );

      -- invoice_trips doit pouvoir supprimer ses liens lors d'une modification de facture/note.
      if table_name = 'invoice_trips' then
        execute format(
          'create policy %I on public.%I for delete to authenticated using (organization_id = public.current_organization_id() and public.is_active_user())',
          'Tenant delete ' || table_name, table_name
        );
      else
        execute format(
          'create policy %I on public.%I for delete to authenticated using (organization_id = public.current_organization_id() and public.is_organization_admin())',
          'Tenant delete ' || table_name, table_name
        );
      end if;
    end if;
  end loop;

  -- Tables sensibles réservées aux admins pour les écritures.
  foreach table_name in array admin_write_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'create policy %I on public.%I for select to authenticated using (organization_id = public.current_organization_id() and public.is_active_user())',
        'Tenant read ' || table_name, table_name
      );
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (organization_id = public.current_organization_id() and public.is_organization_admin())',
        'Tenant insert ' || table_name, table_name
      );
      execute format(
        'create policy %I on public.%I for update to authenticated using (organization_id = public.current_organization_id() and public.is_organization_admin()) with check (organization_id = public.current_organization_id() and public.is_organization_admin())',
        'Tenant update ' || table_name, table_name
      );
      execute format(
        'create policy %I on public.%I for delete to authenticated using (organization_id = public.current_organization_id() and public.is_organization_admin())',
        'Tenant delete ' || table_name, table_name
      );
    end if;
  end loop;
end $$;

-- -----------------------------------------------------
-- 7. PROFILS : UN ADMIN NE VOIT PLUS QUE SON ENTREPRISE
-- -----------------------------------------------------
revoke all on table public.profiles from public, anon;
grant select on table public.profiles to authenticated;
grant update (full_name, role, is_active) on table public.profiles to authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', policy_record.policyname);
  end loop;
end $$;

create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "Organization admins can view organization profiles"
  on public.profiles
  for select
  to authenticated
  using (
    organization_id = public.current_organization_id()
    and public.is_organization_admin()
  );

create policy "Organization admins can update organization profiles"
  on public.profiles
  for update
  to authenticated
  using (
    organization_id = public.current_organization_id()
    and public.is_organization_admin()
  )
  with check (
    organization_id = public.current_organization_id()
    and public.is_organization_admin()
  );

-- -----------------------------------------------------
-- 8. PROTECTION DU DERNIER ADMIN, PAR ORGANISATION
-- -----------------------------------------------------
create or replace function public.protect_last_active_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  other_active_admins integer;
  removing_admin boolean := false;
begin
  if old.role = 'admin'::public.app_role and old.is_active = true then
    if tg_op = 'DELETE' then
      removing_admin := true;
    elsif tg_op = 'UPDATE' and (
      new.role <> 'admin'::public.app_role
      or new.is_active = false
      or new.organization_id <> old.organization_id
    ) then
      removing_admin := true;
    end if;
  end if;

  if removing_admin then
    select count(*)
      into other_active_admins
    from public.profiles
    where id <> old.id
      and organization_id = old.organization_id
      and role = 'admin'::public.app_role
      and is_active = true;

    if other_active_admins = 0 then
      raise exception 'Cette entreprise doit conserver au moins un administrateur actif.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------
-- 9. FUTURES INSCRIPTIONS DIRECTES
-- Tant que le système d'invitations n'est pas encore livré,
-- chaque nouvelle inscription directe crée sa propre entreprise isolée.
-- Cela évite qu'un nouvel utilisateur soit rattaché à Nexis Logistics.
-- -----------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  organization_name text;
begin
  -- Si le profil existe déjà, on synchronise seulement l'email.
  if exists (select 1 from public.profiles where id = new.id) then
    update public.profiles
    set email = new.email
    where id = new.id;
    return new;
  end if;

  organization_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'company_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Nouvelle entreprise'
  );

  insert into public.organizations (
    name,
    legal_name,
    email,
    country,
    currency,
    default_vat_rate,
    is_active
  )
  values (
    organization_name,
    organization_name,
    new.email,
    'Sénégal',
    'XOF',
    18,
    true
  )
  returning id into new_org_id;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    organization_id
  )
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    'admin'::public.app_role,
    true,
    new_org_id
  );

  return new;
end;
$$;

-- Le trigger auth existant garde le même nom, seule sa logique change.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- -----------------------------------------------------
-- 10. CONTRÔLES AVANT COMMIT
-- -----------------------------------------------------
do $$
declare
  table_name text;
  null_count bigint;
  target_tables text[] := array[
    'clients', 'trucks', 'trips', 'trip_expenses',
    'vehicle_charges', 'invoices', 'invoice_trips'
  ];
begin
  if exists (select 1 from public.profiles where organization_id is null) then
    raise exception 'Migration annulée : un profil reste sans organisation.';
  end if;

  foreach table_name in array target_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('select count(*) from public.%I where organization_id is null', table_name)
        into null_count;
      if null_count > 0 then
        raise exception 'Migration annulée : % contient % ligne(s) sans organisation.', table_name, null_count;
      end if;
    end if;
  end loop;
end $$;

commit;

-- -----------------------------------------------------
-- 11. RAPPORT DE CONTRÔLE
-- Tous les *_without_organization doivent être à 0.
-- anonymous_business_grants doit être à 0.
-- -----------------------------------------------------
select
  (select count(*) from public.organizations) as organizations,
  (select count(*) from public.profiles where organization_id is null) as profiles_without_organization,
  case when to_regclass('public.clients') is not null then (select count(*) from public.clients where organization_id is null) else 0 end as clients_without_organization,
  case when to_regclass('public.trucks') is not null then (select count(*) from public.trucks where organization_id is null) else 0 end as trucks_without_organization,
  case when to_regclass('public.trips') is not null then (select count(*) from public.trips where organization_id is null) else 0 end as trips_without_organization,
  case when to_regclass('public.trip_expenses') is not null then (select count(*) from public.trip_expenses where organization_id is null) else 0 end as trip_expenses_without_organization,
  case when to_regclass('public.vehicle_charges') is not null then (select count(*) from public.vehicle_charges where organization_id is null) else 0 end as vehicle_charges_without_organization,
  case when to_regclass('public.invoices') is not null then (select count(*) from public.invoices where organization_id is null) else 0 end as invoices_without_organization,
  case when to_regclass('public.invoice_trips') is not null then (select count(*) from public.invoice_trips where organization_id is null) else 0 end as invoice_trips_without_organization,
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('clients','trucks','trips','trip_expenses','vehicle_charges','invoices','invoice_trips')
      and lower(grantee) in ('anon','public')
  ) as anonymous_business_grants;
