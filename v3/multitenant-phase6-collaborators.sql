-- =====================================================
-- NEXIS V3 — MULTI-TENANT PHASE 6
-- Collaborateurs, invitations et permissions par rôle
-- PRÉREQUIS : Phases 1 à 5
-- =====================================================

-- Le rôle accountant est ajouté à l'enum existant.
alter type public.app_role add value if not exists 'accountant';

begin;

-- -----------------------------------------------------
-- 1. INVITATIONS ENTREPRISE
-- -----------------------------------------------------
create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.app_role not null default 'operator',
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists organization_invitations_pending_email_unique
  on public.organization_invitations(organization_id, lower(email))
  where status = 'pending';

create index if not exists organization_invitations_org_idx
  on public.organization_invitations(organization_id, created_at desc);
create index if not exists organization_invitations_token_idx
  on public.organization_invitations(token);

alter table public.organization_invitations enable row level security;
revoke all on table public.organization_invitations from public, anon, authenticated;
grant select, insert, update on table public.organization_invitations to authenticated;

-- -----------------------------------------------------
-- 2. FONCTIONS DE RÔLE
-- -----------------------------------------------------
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

create or replace function public.can_manage_operations()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin'::public.app_role,'operator'::public.app_role), false);
$$;

create or replace function public.can_manage_billing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin'::public.app_role,'accountant'::public.app_role), false);
$$;

create or replace function public.can_manage_team()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin'::public.app_role, false);
$$;

revoke all on function public.current_user_role() from public, anon;
revoke all on function public.can_manage_operations() from public, anon;
revoke all on function public.can_manage_billing() from public, anon;
revoke all on function public.can_manage_team() from public, anon;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.can_manage_operations() to authenticated;
grant execute on function public.can_manage_billing() to authenticated;
grant execute on function public.can_manage_team() to authenticated;

-- -----------------------------------------------------
-- 3. RLS INVITATIONS
-- -----------------------------------------------------
drop policy if exists "Organization admins can view invitations" on public.organization_invitations;
create policy "Organization admins can view invitations"
  on public.organization_invitations for select to authenticated
  using (organization_id = public.current_organization_id() and public.can_manage_team());

drop policy if exists "Organization admins can create invitations" on public.organization_invitations;
create policy "Organization admins can create invitations"
  on public.organization_invitations for insert to authenticated
  with check (
    organization_id = public.current_organization_id()
    and public.can_manage_team()
    and invited_by = auth.uid()
    and role in ('admin'::public.app_role,'operator'::public.app_role,'accountant'::public.app_role)
  );

drop policy if exists "Organization admins can update invitations" on public.organization_invitations;
create policy "Organization admins can update invitations"
  on public.organization_invitations for update to authenticated
  using (organization_id = public.current_organization_id() and public.can_manage_team())
  with check (organization_id = public.current_organization_id() and public.can_manage_team());

create or replace function public.set_organization_invitation_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists organization_invitations_updated_at on public.organization_invitations;
create trigger organization_invitations_updated_at
before update on public.organization_invitations
for each row execute function public.set_organization_invitation_updated_at();

-- -----------------------------------------------------
-- 4. LECTURE PUBLIQUE MINIMALE D'UNE INVITATION
-- -----------------------------------------------------
create or replace function public.get_public_invitation(invitation_token uuid)
returns table(
  email text,
  organization_name text,
  role text,
  expires_at timestamptz,
  valid boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.email,
    o.name,
    i.role::text,
    i.expires_at,
    (i.status = 'pending' and i.expires_at > now())
  from public.organization_invitations i
  join public.organizations o on o.id = i.organization_id
  where i.token = invitation_token
  limit 1;
$$;

revoke all on function public.get_public_invitation(uuid) from public;
grant execute on function public.get_public_invitation(uuid) to anon, authenticated;

-- -----------------------------------------------------
-- 5. CRÉATION D'UTILISATEUR : INVITÉ OU NOUVELLE ENTREPRISE
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
  invitation_token uuid;
  invitation_record public.organization_invitations%rowtype;
begin
  if exists (select 1 from public.profiles where id = new.id) then
    update public.profiles set email = new.email where id = new.id;
    return new;
  end if;

  begin
    invitation_token := nullif(new.raw_user_meta_data ->> 'invitation_token','')::uuid;
  exception when others then
    invitation_token := null;
  end;

  if invitation_token is not null then
    select * into invitation_record
    from public.organization_invitations
    where token = invitation_token
      and status = 'pending'
      and expires_at > now()
    for update;

    if not found then
      raise exception 'Invitation Nexis invalide ou expirée.';
    end if;

    if lower(trim(invitation_record.email)) <> lower(trim(coalesce(new.email,''))) then
      raise exception 'Cette invitation est destinée à une autre adresse e-mail.';
    end if;

    insert into public.profiles(id,email,full_name,role,is_active,organization_id)
    values(
      new.id,
      new.email,
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name','')),''),
      invitation_record.role,
      true,
      invitation_record.organization_id
    );

    update public.organization_invitations
    set status='accepted', accepted_by=new.id, accepted_at=now()
    where id=invitation_record.id;

    return new;
  end if;

  organization_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'company_name'),''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'),''),
    nullif(split_part(coalesce(new.email,''),'@',1),''),
    'Nouvelle entreprise'
  );

  insert into public.organizations(name,legal_name,email,country,currency,default_vat_rate,is_active)
  values(organization_name,organization_name,new.email,'Sénégal','XOF',18,true)
  returning id into new_org_id;

  insert into public.profiles(id,email,full_name,role,is_active,organization_id)
  values(
    new.id,new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name','')),''),
    'admin'::public.app_role,true,new_org_id
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- -----------------------------------------------------
-- 6. PERMISSIONS MÉTIER PAR RÔLE
-- -----------------------------------------------------
-- Suppression des policies Phase 2 sur les tables concernées.
do $$
declare r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname='public'
      and tablename in ('clients','trips','trip_expenses','trucks','vehicle_charges','invoices','invoice_trips')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Lecture : tout utilisateur actif de son organisation.
do $$
declare t text;
begin
  foreach t in array array['clients','trips','trip_expenses','trucks','vehicle_charges','invoices','invoice_trips'] loop
    if to_regclass(format('public.%I',t)) is not null then
      execute format(
        'create policy %I on public.%I for select to authenticated using (organization_id = public.current_organization_id() and public.is_active_user())',
        'Role tenant read '||t,t
      );
    end if;
  end loop;
end $$;

-- Exploitation : clients, missions et dépenses de mission.
do $$
declare t text;
begin
  foreach t in array array['clients','trips','trip_expenses'] loop
    if to_regclass(format('public.%I',t)) is not null then
      execute format('create policy %I on public.%I for insert to authenticated with check (organization_id = public.current_organization_id() and public.can_manage_operations())','Operations insert '||t,t);
      execute format('create policy %I on public.%I for update to authenticated using (organization_id = public.current_organization_id() and public.can_manage_operations()) with check (organization_id = public.current_organization_id() and public.can_manage_operations())','Operations update '||t,t);
      execute format('create policy %I on public.%I for delete to authenticated using (organization_id = public.current_organization_id() and public.is_organization_admin())','Admin delete '||t,t);
    end if;
  end loop;
end $$;

-- Facturation : admin + comptable.
do $$
declare t text;
begin
  foreach t in array array['invoices','invoice_trips'] loop
    if to_regclass(format('public.%I',t)) is not null then
      execute format('create policy %I on public.%I for insert to authenticated with check (organization_id = public.current_organization_id() and public.can_manage_billing())','Billing insert '||t,t);
      execute format('create policy %I on public.%I for update to authenticated using (organization_id = public.current_organization_id() and public.can_manage_billing()) with check (organization_id = public.current_organization_id() and public.can_manage_billing())','Billing update '||t,t);
      execute format('create policy %I on public.%I for delete to authenticated using (organization_id = public.current_organization_id() and public.can_manage_billing())','Billing delete '||t,t);
    end if;
  end loop;
end $$;

-- Flotte / charges véhicules : admin uniquement pour les écritures.
do $$
declare t text;
begin
  foreach t in array array['trucks','vehicle_charges'] loop
    if to_regclass(format('public.%I',t)) is not null then
      execute format('create policy %I on public.%I for insert to authenticated with check (organization_id = public.current_organization_id() and public.is_organization_admin())','Admin insert '||t,t);
      execute format('create policy %I on public.%I for update to authenticated using (organization_id = public.current_organization_id() and public.is_organization_admin()) with check (organization_id = public.current_organization_id() and public.is_organization_admin())','Admin update '||t,t);
      execute format('create policy %I on public.%I for delete to authenticated using (organization_id = public.current_organization_id() and public.is_organization_admin())','Admin delete '||t,t);
    end if;
  end loop;
end $$;

commit;

-- Contrôle final
select role, count(*) from public.profiles group by role order by role;
select status, count(*) from public.organization_invitations group by status order by status;
