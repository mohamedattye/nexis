-- =====================================================
-- NEXIS V3 — MULTI-TENANT PHASE 3A
-- Numérotation des factures / notes de prix par entreprise
-- + modèle documentaire propre et compatible avec l'existant
--
-- PRÉREQUIS : Phase 1 + Phase 2 appliquées sur Supabase TEST.
-- =====================================================

begin;

-- -----------------------------------------------------
-- 0. GARDE-FOUS
-- -----------------------------------------------------
do $$
begin
  if to_regclass('public.invoices') is null then
    raise exception 'Phase 3A impossible : table invoices absente.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoices'
      and column_name = 'organization_id'
  ) then
    raise exception 'Phase 3A impossible : invoices.organization_id absent. Exécuter la Phase 2.';
  end if;
end $$;

-- -----------------------------------------------------
-- 1. TYPE DE DOCUMENT + NUMÉRO COMMERCIAL
-- On ne supprime aucune ancienne colonne pour garder la compatibilité.
-- -----------------------------------------------------
alter table public.invoices
  add column if not exists document_type text;

alter table public.invoices
  add column if not exists document_number text;

alter table public.invoices
  add column if not exists source_document_id uuid references public.invoices(id) on delete set null;

-- Migration des anciennes notes de prix stockées via le marqueur notes.
update public.invoices
set document_type = case
  when coalesce(notes, '') ~ '\[\[NEXIS_PRICE_NOTE:' then 'price_note'
  else 'invoice'
end
where document_type is null;

-- Numéro des anciennes notes : récupéré depuis [[NEXIS_PRICE_NOTE:NP-....]].
update public.invoices
set document_number = substring(notes from '\[\[NEXIS_PRICE_NOTE:([^]]+)\]')
where document_type = 'price_note'
  and document_number is null;

-- Numéro des factures existantes : on conserve le numéro historique.
update public.invoices
set document_number = invoice_number
where document_type = 'invoice'
  and document_number is null;

-- Sécurité : aucun document ne doit rester sans type.
update public.invoices
set document_type = 'invoice'
where document_type is null;

alter table public.invoices
  alter column document_type set not null;

alter table public.invoices
  add constraint invoices_document_type_check
  check (document_type in ('invoice', 'price_note')) not valid;

alter table public.invoices
  validate constraint invoices_document_type_check;

create index if not exists invoices_org_type_idx
  on public.invoices(organization_id, document_type);

create index if not exists invoices_source_document_idx
  on public.invoices(source_document_id)
  where source_document_id is not null;

-- -----------------------------------------------------
-- 2. SUPPRESSION UNIQUEMENT DES CONTRAINTES UNIQUES
-- GLOBALES SUR invoice_number / document_number
-- Les PK et autres contraintes ne sont jamais touchées.
-- -----------------------------------------------------
do $$
declare
  constraint_record record;
  index_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'invoices'
      and c.contype = 'u'
      and (
        pg_get_constraintdef(c.oid) ~* '\(invoice_number\)'
        or pg_get_constraintdef(c.oid) ~* '\(document_number\)'
      )
      and pg_get_constraintdef(c.oid) !~* 'organization_id'
  loop
    execute format('alter table public.invoices drop constraint if exists %I', constraint_record.conname);
  end loop;

  -- Index uniques indépendants des contraintes.
  for index_record in
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'invoices'
      and indexdef ilike '%unique%'
      and (
        indexdef ilike '%(invoice_number)%'
        or indexdef ilike '%(document_number)%'
      )
      and indexdef not ilike '%organization_id%'
  loop
    execute format('drop index if exists public.%I', index_record.indexname);
  end loop;
end $$;

-- Un même numéro peut exister dans deux entreprises différentes,
-- mais jamais deux fois dans la même entreprise pour le même type de document.
create unique index if not exists invoices_org_document_number_unique
  on public.invoices(organization_id, document_type, document_number)
  where document_number is not null;

-- Compatibilité de invoice_number : uniqueness seulement dans l'entreprise.
create unique index if not exists invoices_org_invoice_number_unique
  on public.invoices(organization_id, invoice_number)
  where invoice_number is not null;

-- -----------------------------------------------------
-- 3. PARAMÈTRES DE NUMÉROTATION PAR ENTREPRISE
-- -----------------------------------------------------
alter table public.organizations
  add column if not exists invoice_prefix text not null default 'FAC';

alter table public.organizations
  add column if not exists price_note_prefix text not null default 'NP';

alter table public.organizations
  add column if not exists document_number_padding integer not null default 5;

alter table public.organizations
  add constraint organizations_document_number_padding_check
  check (document_number_padding between 3 and 8) not valid;

alter table public.organizations
  validate constraint organizations_document_number_padding_check;

-- -----------------------------------------------------
-- 4. COMPTEURS PAR ENTREPRISE / TYPE / ANNÉE
-- -----------------------------------------------------
create table if not exists public.document_sequences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type text not null check (document_type in ('invoice', 'price_note')),
  document_year integer not null check (document_year between 2000 and 2200),
  last_number integer not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, document_type, document_year)
);

alter table public.document_sequences enable row level security;
revoke all on table public.document_sequences from public, anon, authenticated;

-- Les utilisateurs n'ont pas besoin de lire ou modifier directement les compteurs.
-- La fonction SECURITY DEFINER ci-dessous est le seul point d'accès.

-- -----------------------------------------------------
-- 5. INITIALISATION DES COMPTEURS À PARTIR DE L'HISTORIQUE
-- -----------------------------------------------------
insert into public.document_sequences (organization_id, document_type, document_year, last_number)
select
  i.organization_id,
  i.document_type,
  extract(year from coalesce(i.issue_date, i.created_at::date, current_date))::integer as document_year,
  max(
    coalesce(
      nullif(substring(i.document_number from '([0-9]+)$'), '')::integer,
      0
    )
  ) as last_number
from public.invoices i
where i.document_number is not null
group by
  i.organization_id,
  i.document_type,
  extract(year from coalesce(i.issue_date, i.created_at::date, current_date))::integer
on conflict (organization_id, document_type, document_year)
do update
set last_number = greatest(public.document_sequences.last_number, excluded.last_number),
    updated_at = now();

-- -----------------------------------------------------
-- 6. GÉNÉRATEUR ATOMIQUE DE NUMÉROS
-- Exemple : FAC-2026-00001 / NP-2026-00001
-- -----------------------------------------------------
create or replace function public.next_document_number(
  target_organization_id uuid,
  target_document_type text,
  target_date date default current_date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_year integer;
  next_value integer;
  prefix_value text;
  padding_value integer;
begin
  if target_document_type not in ('invoice', 'price_note') then
    raise exception 'Type de document invalide : %', target_document_type;
  end if;

  if target_organization_id is null then
    raise exception 'Organisation obligatoire pour générer un numéro.';
  end if;

  -- Un utilisateur connecté ne peut générer que pour sa propre entreprise.
  if auth.uid() is not null
     and target_organization_id <> public.current_organization_id() then
    raise exception 'Génération de numéro interdite pour une autre organisation.';
  end if;

  target_year := extract(year from coalesce(target_date, current_date))::integer;

  select
    case
      when target_document_type = 'invoice' then invoice_prefix
      else price_note_prefix
    end,
    document_number_padding
  into prefix_value, padding_value
  from public.organizations
  where id = target_organization_id
    and is_active = true;

  if prefix_value is null then
    raise exception 'Organisation introuvable ou inactive.';
  end if;

  insert into public.document_sequences (
    organization_id,
    document_type,
    document_year,
    last_number
  )
  values (
    target_organization_id,
    target_document_type,
    target_year,
    1
  )
  on conflict (organization_id, document_type, document_year)
  do update
    set last_number = public.document_sequences.last_number + 1,
        updated_at = now()
  returning last_number into next_value;

  return upper(trim(prefix_value))
    || '-' || target_year::text
    || '-' || lpad(next_value::text, padding_value, '0');
end;
$$;

revoke all on function public.next_document_number(uuid, text, date) from public, anon;
grant execute on function public.next_document_number(uuid, text, date) to authenticated;

-- -----------------------------------------------------
-- 7. ATTRIBUTION AUTOMATIQUE DU NUMÉRO À L'INSERTION
-- -----------------------------------------------------
create or replace function public.assign_document_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Compatibilité avec les anciennes notes de prix utilisant le marqueur.
  if new.document_type is null then
    if coalesce(new.notes, '') ~ '\[\[NEXIS_PRICE_NOTE:' then
      new.document_type := 'price_note';
    else
      new.document_type := 'invoice';
    end if;
  end if;

  -- Si l'ancien frontend fournit déjà un numéro de note dans notes,
  -- on le récupère au lieu d'en générer un second.
  if new.document_type = 'price_note'
     and new.document_number is null
     and coalesce(new.notes, '') ~ '\[\[NEXIS_PRICE_NOTE:' then
    new.document_number := substring(new.notes from '\[\[NEXIS_PRICE_NOTE:([^]]+)\]');
  end if;

  if new.document_number is null or trim(new.document_number) = '' then
    new.document_number := public.next_document_number(
      new.organization_id,
      new.document_type,
      coalesce(new.issue_date, current_date)
    );
  end if;

  -- Pour les factures, invoice_number reste alimenté pour compatibilité
  -- avec tout le frontend actuel.
  if new.document_type = 'invoice'
     and (new.invoice_number is null or trim(new.invoice_number) = '') then
    new.invoice_number := new.document_number;
  end if;

  return new;
end;
$$;

revoke all on function public.assign_document_number() from public, anon;

drop trigger if exists tenant_assign_document_number on public.invoices;
create trigger tenant_assign_document_number
before insert on public.invoices
for each row execute function public.assign_document_number();

-- -----------------------------------------------------
-- 8. CONVERSION NOTE DE PRIX -> FACTURE
-- Fonction serveur sûre : crée une vraie facture distincte,
-- conserve la note d'origine et copie les missions associées.
-- -----------------------------------------------------
create or replace function public.convert_price_note_to_invoice(price_note_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_note public.invoices%rowtype;
  new_invoice_id uuid;
begin
  select *
  into source_note
  from public.invoices
  where id = price_note_id
    and organization_id = public.current_organization_id()
    and document_type = 'price_note';

  if not found then
    raise exception 'Note de prix introuvable.';
  end if;

  insert into public.invoices (
    organization_id,
    client_id,
    issue_date,
    due_date,
    status,
    subtotal_ht,
    vat_rate,
    vat_amount,
    total_ttc,
    notes,
    document_type,
    source_document_id
  )
  values (
    source_note.organization_id,
    source_note.client_id,
    current_date,
    source_note.due_date,
    'draft',
    source_note.subtotal_ht,
    source_note.vat_rate,
    source_note.vat_amount,
    source_note.total_ttc,
    regexp_replace(coalesce(source_note.notes, ''), '\[\[NEXIS_PRICE_NOTE:[^]]+\]\]\s*', '', 'g'),
    'invoice',
    source_note.id
  )
  returning id into new_invoice_id;

  if to_regclass('public.invoice_trips') is not null then
    insert into public.invoice_trips (organization_id, invoice_id, trip_id)
    select organization_id, new_invoice_id, trip_id
    from public.invoice_trips
    where invoice_id = source_note.id
      and organization_id = source_note.organization_id;
  end if;

  return new_invoice_id;
end;
$$;

revoke all on function public.convert_price_note_to_invoice(uuid) from public, anon;
grant execute on function public.convert_price_note_to_invoice(uuid) to authenticated;

-- -----------------------------------------------------
-- 9. CONTRÔLES
-- -----------------------------------------------------
do $$
begin
  if exists (
    select 1
    from public.invoices
    where document_type not in ('invoice', 'price_note')
  ) then
    raise exception 'Migration annulée : type documentaire invalide détecté.';
  end if;

  if exists (
    select 1
    from public.invoices
    where document_number is not null
    group by organization_id, document_type, document_number
    having count(*) > 1
  ) then
    raise exception 'Migration annulée : doublon de numéro documentaire dans une organisation.';
  end if;
end $$;

commit;

-- -----------------------------------------------------
-- 10. RAPPORT FINAL
-- -----------------------------------------------------
select
  document_type,
  count(*) as documents,
  count(*) filter (where document_number is null) as without_document_number
from public.invoices
group by document_type
order by document_type;

select
  organization_id,
  document_type,
  document_year,
  last_number
from public.document_sequences
order by organization_id, document_type, document_year;
