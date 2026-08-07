-- =====================================================
-- NEXIS V3 — MULTI-TENANT PHASE 3B
-- Identité technique des camions par UUID + immatriculation par entreprise
--
-- PRÉREQUIS : Phase 1 + Phase 2 appliquées sur Supabase TEST.
-- IMPORTANT : migration à valider sur TEST avant production.
-- Objectif : deux entreprises peuvent avoir la même immatriculation sans collision.
-- =====================================================

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------
-- 0. GARDE-FOUS
-- -----------------------------------------------------
do $$
begin
  if to_regclass('public.trucks') is null then
    raise exception 'Phase 3B impossible : table trucks absente.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='trucks' and column_name='organization_id'
  ) then
    raise exception 'Phase 3B impossible : trucks.organization_id absent. Exécuter la Phase 2.';
  end if;
end $$;

-- -----------------------------------------------------
-- 1. AJOUT D'UN VRAI IDENTIFIANT UUID AUX CAMIONS
-- -----------------------------------------------------
alter table public.trucks
  add column if not exists id uuid;

update public.trucks
set id = gen_random_uuid()
where id is null;

alter table public.trucks
  alter column id set default gen_random_uuid();

alter table public.trucks
  alter column id set not null;

create unique index if not exists trucks_id_unique
  on public.trucks(id);

-- -----------------------------------------------------
-- 2. AJOUT truck_id AUX TABLES QUI UTILISENT AUJOURD'HUI
-- L'IMMATRICULATION TEXTE
-- -----------------------------------------------------
do $$
begin
  if to_regclass('public.trips') is not null then
    alter table public.trips add column if not exists truck_id uuid;

    update public.trips t
    set truck_id = tr.id
    from public.trucks tr
    where t.truck_id is null
      and tr.organization_id = t.organization_id
      and tr.plate_number = t.truck;
  end if;

  if to_regclass('public.vehicle_charges') is not null then
    alter table public.vehicle_charges add column if not exists truck_id uuid;

    update public.vehicle_charges vc
    set truck_id = tr.id
    from public.trucks tr
    where vc.truck_id is null
      and tr.organization_id = vc.organization_id
      and tr.plate_number = vc.truck;
  end if;
end $$;

-- -----------------------------------------------------
-- 3. CONTRÔLE AVANT MODIFICATION DES CONTRAINTES
-- -----------------------------------------------------
do $$
begin
  if to_regclass('public.trips') is not null
     and exists (
       select 1 from public.trips
       where nullif(trim(coalesce(truck,'')), '') is not null
         and truck_id is null
     ) then
    raise exception 'Migration annulée : certaines missions ne correspondent à aucun camion de leur organisation.';
  end if;

  if to_regclass('public.vehicle_charges') is not null
     and exists (
       select 1 from public.vehicle_charges
       where nullif(trim(coalesce(truck,'')), '') is not null
         and truck_id is null
     ) then
    raise exception 'Migration annulée : certaines charges véhicule ne correspondent à aucun camion de leur organisation.';
  end if;
end $$;

-- -----------------------------------------------------
-- 4. RETRAIT DES FK QUI DÉPENDENT DIRECTEMENT DE plate_number
-- On les remplace ensuite par des FK sur truck_id.
-- -----------------------------------------------------
do $$
declare
  fk record;
begin
  for fk in
    select
      conrelid::regclass::text as source_table,
      conname
    from pg_constraint
    where contype = 'f'
      and confrelid = 'public.trucks'::regclass
  loop
    execute format('alter table %s drop constraint if exists %I', fk.source_table, fk.conname);
  end loop;
end $$;

-- -----------------------------------------------------
-- 5. RETRAIT DE L'UNICITÉ GLOBALE DE plate_number
-- Si plate_number est actuellement la PK, elle est remplacée par id.
-- -----------------------------------------------------
do $$
declare
  constraint_record record;
  index_record record;
begin
  -- Contraintes PK/UNIQUE basées uniquement sur plate_number.
  for constraint_record in
    select c.conname, c.contype
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname='public'
      and t.relname='trucks'
      and c.contype in ('p','u')
      and pg_get_constraintdef(c.oid) ~* '\(plate_number\)'
      and pg_get_constraintdef(c.oid) !~* 'organization_id'
  loop
    execute format('alter table public.trucks drop constraint if exists %I', constraint_record.conname);
  end loop;

  -- Index uniques autonomes sur plate_number seul.
  for index_record in
    select indexname
    from pg_indexes
    where schemaname='public'
      and tablename='trucks'
      and indexdef ilike '%unique%'
      and indexdef ~* '\(plate_number\)'
      and indexdef not ilike '%organization_id%'
  loop
    execute format('drop index if exists public.%I', index_record.indexname);
  end loop;
end $$;

-- Une PK technique stable sur UUID.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public'
      and t.relname='trucks'
      and c.contype='p'
  ) then
    alter table public.trucks
      add constraint trucks_pkey primary key (id);
  end if;
end $$;

-- L'immatriculation devient unique seulement à l'intérieur d'une entreprise.
create unique index if not exists trucks_org_plate_unique
  on public.trucks(organization_id, plate_number);

-- -----------------------------------------------------
-- 6. NOUVELLES FK SUR truck_id
-- -----------------------------------------------------
do $$
begin
  if to_regclass('public.trips') is not null then
    alter table public.trips
      alter column truck_id set not null;

    if not exists (
      select 1 from pg_constraint
      where conrelid='public.trips'::regclass
        and conname='trips_truck_id_fkey'
    ) then
      alter table public.trips
        add constraint trips_truck_id_fkey
        foreign key (truck_id) references public.trucks(id)
        on update cascade on delete restrict;
    end if;

    create index if not exists trips_truck_id_idx
      on public.trips(truck_id);
  end if;

  if to_regclass('public.vehicle_charges') is not null then
    alter table public.vehicle_charges
      alter column truck_id set not null;

    if not exists (
      select 1 from pg_constraint
      where conrelid='public.vehicle_charges'::regclass
        and conname='vehicle_charges_truck_id_fkey'
    ) then
      alter table public.vehicle_charges
        add constraint vehicle_charges_truck_id_fkey
        foreign key (truck_id) references public.trucks(id)
        on update cascade on delete restrict;
    end if;

    create index if not exists vehicle_charges_truck_id_idx
      on public.vehicle_charges(truck_id);
  end if;
end $$;

-- -----------------------------------------------------
-- 7. CONTRAINTES MÉTIER COMPOSITES
-- Les charges mensuelles sont uniques par camion UUID + mois,
-- pas globalement par texte d'immatriculation.
-- -----------------------------------------------------
do $$
declare
  constraint_record record;
begin
  if to_regclass('public.vehicle_charges') is not null then
    for constraint_record in
      select conname
      from pg_constraint c
      where conrelid='public.vehicle_charges'::regclass
        and contype='u'
        and pg_get_constraintdef(c.oid) ~* '\(truck, month\)'
    loop
      execute format('alter table public.vehicle_charges drop constraint if exists %I', constraint_record.conname);
    end loop;

    if not exists (
      select 1 from pg_constraint
      where conrelid='public.vehicle_charges'::regclass
        and conname='vehicle_charges_truck_id_month_unique'
    ) then
      alter table public.vehicle_charges
        add constraint vehicle_charges_truck_id_month_unique
        unique (truck_id, month);
    end if;
  end if;
end $$;

-- -----------------------------------------------------
-- 8. SYNCHRONISATION DE COMPATIBILITÉ
-- Le frontend actuel continue à lire/écrire `truck` en texte.
-- Le trigger maintient truck_id et truck cohérents pendant la transition.
-- -----------------------------------------------------
create or replace function public.sync_truck_identity()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  resolved_id uuid;
  resolved_plate text;
begin
  -- Si le nouveau frontend envoie truck_id, on remplit le texte historique.
  if new.truck_id is not null then
    select id, plate_number
    into resolved_id, resolved_plate
    from public.trucks
    where id = new.truck_id
      and organization_id = new.organization_id;

    if resolved_id is null then
      raise exception 'Camion introuvable dans cette organisation.';
    end if;

    new.truck := resolved_plate;
    return new;
  end if;

  -- Si l'ancien frontend envoie seulement l'immatriculation, on résout truck_id.
  if nullif(trim(coalesce(new.truck,'')), '') is not null then
    select id, plate_number
    into resolved_id, resolved_plate
    from public.trucks
    where organization_id = new.organization_id
      and plate_number = new.truck
    limit 1;

    if resolved_id is null then
      raise exception 'Camion introuvable dans cette organisation.';
    end if;

    new.truck_id := resolved_id;
    new.truck := resolved_plate;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_truck_identity() from public, anon;

do $$
begin
  if to_regclass('public.trips') is not null then
    drop trigger if exists tenant_sync_truck_identity on public.trips;
    create trigger tenant_sync_truck_identity
    before insert or update of truck, truck_id, organization_id on public.trips
    for each row execute function public.sync_truck_identity();
  end if;

  if to_regclass('public.vehicle_charges') is not null then
    drop trigger if exists tenant_sync_truck_identity on public.vehicle_charges;
    create trigger tenant_sync_truck_identity
    before insert or update of truck, truck_id, organization_id on public.vehicle_charges
    for each row execute function public.sync_truck_identity();
  end if;
end $$;

-- -----------------------------------------------------
-- 9. MISE À JOUR DU CONTRÔLE MULTI-TENANT DES RELATIONS
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
begin
  if new.organization_id is null then
    raise exception 'organization_id absent.';
  end if;

  if tg_table_name = 'trips' then
    related_uuid := nullif(payload ->> 'client_id', '')::uuid;
    if related_uuid is not null
       and not exists (
         select 1 from public.clients
         where id=related_uuid and organization_id=new.organization_id
       ) then
      raise exception 'Le client sélectionné n''appartient pas à cette organisation.';
    end if;

    related_uuid := nullif(payload ->> 'truck_id', '')::uuid;
    if related_uuid is not null
       and not exists (
         select 1 from public.trucks
         where id=related_uuid and organization_id=new.organization_id
       ) then
      raise exception 'Le camion sélectionné n''appartient pas à cette organisation.';
    end if;

  elsif tg_table_name = 'trip_expenses' then
    related_uuid := nullif(payload ->> 'trip_id', '')::uuid;
    if related_uuid is not null
       and not exists (
         select 1 from public.trips
         where id=related_uuid and organization_id=new.organization_id
       ) then
      raise exception 'La mission liée n''appartient pas à cette organisation.';
    end if;

  elsif tg_table_name = 'vehicle_charges' then
    related_uuid := nullif(payload ->> 'truck_id', '')::uuid;
    if related_uuid is not null
       and not exists (
         select 1 from public.trucks
         where id=related_uuid and organization_id=new.organization_id
       ) then
      raise exception 'Le camion lié n''appartient pas à cette organisation.';
    end if;

  elsif tg_table_name = 'invoices' then
    related_uuid := nullif(payload ->> 'client_id', '')::uuid;
    if related_uuid is not null
       and not exists (
         select 1 from public.clients
         where id=related_uuid and organization_id=new.organization_id
       ) then
      raise exception 'Le client de la facture n''appartient pas à cette organisation.';
    end if;

  elsif tg_table_name = 'invoice_trips' then
    related_uuid := nullif(payload ->> 'invoice_id', '')::uuid;
    if related_uuid is not null
       and not exists (
         select 1 from public.invoices
         where id=related_uuid and organization_id=new.organization_id
       ) then
      raise exception 'Le document lié n''appartient pas à cette organisation.';
    end if;

    related_uuid := nullif(payload ->> 'trip_id', '')::uuid;
    if related_uuid is not null
       and not exists (
         select 1 from public.trips
         where id=related_uuid and organization_id=new.organization_id
       ) then
      raise exception 'La mission liée au document n''appartient pas à cette organisation.';
    end if;
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------
-- 10. CONTRÔLES AVANT COMMIT
-- -----------------------------------------------------
do $$
begin
  if exists (
    select 1
    from public.trucks
    group by organization_id, plate_number
    having count(*) > 1
  ) then
    raise exception 'Migration annulée : doublon d''immatriculation dans une même organisation.';
  end if;

  if to_regclass('public.trips') is not null
     and exists (
       select 1
       from public.trips t
       left join public.trucks tr
         on tr.id=t.truck_id and tr.organization_id=t.organization_id
       where tr.id is null
     ) then
    raise exception 'Migration annulée : mission liée à un camion invalide.';
  end if;

  if to_regclass('public.vehicle_charges') is not null
     and exists (
       select 1
       from public.vehicle_charges vc
       left join public.trucks tr
         on tr.id=vc.truck_id and tr.organization_id=vc.organization_id
       where tr.id is null
     ) then
    raise exception 'Migration annulée : charge liée à un camion invalide.';
  end if;
end $$;

commit;

-- -----------------------------------------------------
-- 11. RAPPORT FINAL
-- -----------------------------------------------------
select
  count(*) as trucks,
  count(*) filter (where id is null) as trucks_without_id,
  count(distinct organization_id) as organizations_with_trucks
from public.trucks;

select
  organization_id,
  plate_number,
  id
from public.trucks
order by organization_id, plate_number;
