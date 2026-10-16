-- Run once in Supabase SQL Editor before importing Objekt.xlsx.
-- Existing rows are preserved; nullable columns allow older records.
alter table public.buildings
 add column if not exists object_number text,
 add column if not exists street text,
 add column if not exists city text,
 add column if not exists manager text,
 add column if not exists economist text,
 add column if not exists accountant text,
 add column if not exists legal_entity text,
 add column if not exists company_id text,
 add column if not exists external_id text,
 add column if not exists flats_count integer,
 add column if not exists nonresidential_count integer,
 add column if not exists garages_count integer,
 add column if not exists shared_spaces_count integer,
 add column if not exists invoice_approvers_count integer,
 add column if not exists manager_flag integer,
 add column if not exists economist_flag integer;
create unique index if not exists buildings_object_number_unique
 on public.buildings (object_number) where object_number is not null;
-- Existing RLS policies remain in effect.
