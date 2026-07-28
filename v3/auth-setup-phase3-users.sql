-- =====================================================
-- NEXIS V3 TEST — GESTION DES UTILISATEURS, PHASE 3
-- À exécuter UNIQUEMENT dans le projet Supabase Nexis V3 Test
-- =====================================================

begin;

-- 1. AJOUT DE L'ADRESSE E-MAIL AU PROFIL
alter table public.profiles
  add column if not exists email text;

update public.profiles as profiles
set email = users.email
from auth.users as users
where users.id = profiles.id
  and profiles.email is distinct from users.email;

-- 2. CRÉATION AUTOMATIQUE DES FUTURS PROFILS
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    is_active
  )
  values (
    new.id,
    new.email,
    nullif(
      trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')),
      ''
    ),
    'operator'::public.app_role,
    true
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

-- 3. PROTECTION DU DERNIER ADMINISTRATEUR ACTIF
create or replace function public.protect_last_active_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  other_active_admins integer;
begin
  if old.role = 'admin'::public.app_role
     and old.is_active = true
     and (
       tg_op = 'DELETE'
       or new.role <> 'admin'::public.app_role
       or new.is_active = false
     ) then

    select count(*)
    into other_active_admins
    from public.profiles
    where id <> old.id
      and role = 'admin'::public.app_role
      and is_active = true;

    if other_active_admins = 0 then
      raise exception
        'Nexis doit conserver au moins un administrateur actif.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_last_active_admin
  on public.profiles;

create trigger protect_last_active_admin
before update or delete on public.profiles
for each row
execute function public.protect_last_active_admin();

-- 4. AUTORISATIONS DE GESTION POUR LES ADMINISTRATEURS
revoke update on table public.profiles from authenticated;

grant update (full_name, role, is_active)
  on table public.profiles
  to authenticated;

drop policy if exists "Admins can update profiles"
  on public.profiles;

create policy "Admins can update profiles"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;

-- 5. CONTRÔLE FINAL
-- Résultat attendu : true | true | true
select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'email'
  ) as email_column_ready,

  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Admins can update profiles'
  ) as admin_update_policy_ready,

  exists (
    select 1
    from public.profiles
    where role = 'admin'::public.app_role
      and is_active = true
  ) as active_admin_present;
