-- =====================================================
-- NEXIS V3 TEST — SÉCURITÉ UTILISATEURS, PHASE 1
-- À exécuter uniquement dans le projet Supabase Nexis V3 Test
-- Cette phase crée les profils et les rôles sans modifier encore
-- les politiques permissives actuelles des données métier.
-- =====================================================

-- 1. RÔLES DISPONIBLES

do $$
begin
  create type public.app_role as enum ('admin', 'operator');
exception
  when duplicate_object then null;
end $$;

-- 2. PROFILS UTILISATEURS
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'operator',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

grant select on public.profiles to authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;

-- 3. FONCTIONS DE LECTURE DU RÔLE
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- 4. POLITIQUES DE LECTURE DES PROFILS

drop policy if exists "Users can view own profile"
  on public.profiles;

create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Admins can view all profiles"
  on public.profiles;

create policy "Admins can view all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

-- 5. CRÉATION AUTOMATIQUE DU PROFIL À L'INSCRIPTION
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, is_active)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    'operator',
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created
  on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 6. DATE DE MISE À JOUR AUTOMATIQUE
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at
  on public.profiles;

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_profiles_updated_at();

-- 7. RÉTROCRÉATION DES PROFILS POUR D'ÉVENTUELS UTILISATEURS EXISTANTS
insert into public.profiles (id, full_name, role, is_active)
select
  users.id,
  nullif(trim(coalesce(users.raw_user_meta_data ->> 'full_name', '')), ''),
  'operator',
  true
from auth.users as users
on conflict (id) do nothing;
