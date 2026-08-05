-- Nexis V3 Test — module Clients
-- À exécuter une seule fois dans le SQL Editor du projet Supabase TEST.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  ninea text,
  rccm text,
  address text,
  city text,
  phone text,
  email text,
  contact_name text,
  payment_terms_days integer not null default 30 check (payment_terms_days >= 0),
  notes text,
  is_active boolean not