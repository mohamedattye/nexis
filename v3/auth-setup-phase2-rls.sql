-- =====================================================
-- NEXIS V3 TEST — SÉCURITÉ UTILISATEURS, PHASE 2
-- Verrouillage RLS des données métier
-- À exécuter UNIQUEMENT dans le projet Supabase Nexis V3 Test
-- =====================================================

begin;

-- 1. SÉCURITÉ ANTI-VERROUILLAGE
-- Le script s'arrête et annule tout s'il n'existe aucun administrateur actif.
do $$
begin
  if not exists (
    select 1
    from public.profiles
    where role = 'admin'::public.app_role
      and is_active = true
  ) then
    raise exception 'Sécurité Nexis : aucun administrateur actif. Script annulé.';
  end if;
end $$;

-- 2. FONCTIONS D'AUTORISATION
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
      and role in (
        'admin'::public.app_role,
        'operator'::public.app_role
      )
  );
$$;

create or replace function public.is_admin()
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
      and role = 'admin'::public.app_role
  );
$$;

revoke all on function public.current_user_role() from public, anon;
revoke all on function public.is_active_user() from public, anon;
revoke all on function public.is_admin() from public, anon;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- 3. ACTIVATION RLS
alter table public.trips enable row level security;
alter table public.trip_expenses enable row level security;
alter table public.trucks enable row level security;
alter table public.vehicle_charges enable row level security;

-- 4. SUPPRESSION DE TOUTES LES ANCIENNES POLITIQUES PERMISSIVES
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'trips',
        'trip_expenses',
        'trucks',
        'vehicle_charges'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

-- 5. SUPPRESSION DES DROITS ANONYMES
revoke all on table public.trips from public, anon, authenticated;
revoke all on table public.trip_expenses from public, anon, authenticated;
revoke all on table public.trucks from public, anon, authenticated;
revoke all on table public.vehicle_charges from public, anon, authenticated;
revoke all on table public.profiles from public, anon;

-- Les utilisateurs authentifiés reçoivent les droits SQL.
-- Les politiques RLS ci-dessous déterminent ce qu'ils peuvent réellement faire.
grant select, insert, update, delete on table public.trips to authenticated;
grant select, insert, update, delete on table public.trip_expenses to authenticated;
grant select, insert, update, delete on table public.trucks to authenticated;
grant select, insert, update, delete on table public.vehicle_charges to authenticated;
grant select on table public.profiles to authenticated;

-- 6. POLITIQUES : MISSIONS
create policy "Active users can read trips"
  on public.trips
  for select
  to authenticated
  using (public.is_active_user());

create policy "Active users can create trips"
  on public.trips
  for insert
  to authenticated
  with check (public.is_active_user());

create policy "Active users can update trips"
  on public.trips
  for update
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

create policy "Admins can delete trips"
  on public.trips
  for delete
  to authenticated
  using (public.is_admin());

-- 7. POLITIQUES : DÉPENSES DE MISSION
create policy "Active users can read trip expenses"
  on public.trip_expenses
  for select
  to authenticated
  using (public.is_active_user());

create policy "Active users can create trip expenses"
  on public.trip_expenses
  for insert
  to authenticated
  with check (public.is_active_user());

create policy "Active users can update trip expenses"
  on public.trip_expenses
  for update
  to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

create policy "Admins can delete trip expenses"
  on public.trip_expenses
  for delete
  to authenticated
  using (public.is_admin());

-- 8. POLITIQUES : FLOTTE
create policy "Active users can read trucks"
  on public.trucks
  for select
  to authenticated
  using (public.is_active_user());

create policy "Admins can create trucks"
  on public.trucks
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update trucks"
  on public.trucks
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete trucks"
  on public.trucks
  for delete
  to authenticated
  using (public.is_admin());

-- 9. POLITIQUES : CHARGES VÉHICULES
create policy "Active users can read vehicle charges"
  on public.vehicle_charges
  for select
  to authenticated
  using (public.is_active_user());

create policy "Admins can create vehicle charges"
  on public.vehicle_charges
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update vehicle charges"
  on public.vehicle_charges
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete vehicle charges"
  on public.vehicle_charges
  for delete
  to authenticated
  using (public.is_admin());

commit;

-- 10. CONTRÔLE FINAL
-- Le résultat attendu est : true | true | true
select
  (
    select count(*) = 16
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'trips',
        'trip_expenses',
        'trucks',
        'vehicle_charges'
      )
  ) as policies_created,
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'trips',
        'trip_expenses',
        'trucks',
        'vehicle_charges'
      )
      and lower(grantee) in ('anon', 'public')
  ) as anonymous_access_removed,
  exists (
    select 1
    from public.profiles
    where role = 'admin'::public.app_role
      and is_active = true
  ) as active_admin_present;
