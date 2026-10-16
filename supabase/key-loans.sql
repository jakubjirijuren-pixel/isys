-- iSYS Evidence klíčů: existing schema compatibility, no tables or data deleted.
-- Expected existing tables: public.keys and public.key_loans.
-- keys: id, building_id, label, identifier, quantity, notes, created_at
-- key_loans: id, key_id, borrower_name, issued_by, loaned_at, returned_at, notes
-- Run once in Supabase SQL Editor.
begin;
-- Free-text loans; keep existing catalog-linked history.
alter table public.key_loans add column if not exists building_id uuid references public.buildings(id);
alter table public.key_loans add column if not exists key_description text;
alter table public.key_loans alter column key_id drop not null;
update public.key_loans l set building_id=k.building_id, key_description=coalesce(nullif(trim(k.label),''),'Evidovaný klíč') from public.keys k where l.key_id=k.id and l.building_id is null;
alter table public.key_loans drop constraint if exists isys_key_loan_location_check;
alter table public.key_loans add constraint isys_key_loan_location_check check ((building_id is not null and nullif(trim(key_description),'') is not null) or key_id is not null);
create index if not exists isys_key_loans_building_idx on public.key_loans(building_id);
create index if not exists isys_keys_building_idx on public.keys(building_id);
create index if not exists isys_key_loans_key_idx on public.key_loans(key_id);
create index if not exists isys_key_loans_loaned_idx on public.key_loans(loaned_at desc);
alter table public.keys enable row level security;
alter table public.key_loans enable row level security;
grant select,insert on public.keys to authenticated;
grant select,insert,update on public.key_loans to authenticated;
drop policy if exists isys_keys_read on public.keys;
create policy isys_keys_read on public.keys for select to authenticated using (true);
drop policy if exists isys_keys_insert on public.keys;
create policy isys_keys_insert on public.keys for insert to authenticated with check (true);
drop policy if exists isys_key_loans_read on public.key_loans;
create policy isys_key_loans_read on public.key_loans for select to authenticated using (true);
drop policy if exists isys_key_loans_insert on public.key_loans;
create policy isys_key_loans_insert on public.key_loans for insert to authenticated with check (returned_at is null and (issued_by is null or issued_by=auth.uid()));
drop policy if exists isys_key_loans_return on public.key_loans;
create policy isys_key_loans_return on public.key_loans for update to authenticated using (returned_at is null) with check (returned_at is not null);
-- A return may only set returned_at, never alter the original checkout data.
create or replace function public.isys_protect_key_loan_return() returns trigger language plpgsql set search_path=public as $$
begin
 if old.returned_at is not null or (new.id,new.key_id,new.building_id,new.key_description,new.borrower_name,new.issued_by,new.loaned_at,new.notes)
 is distinct from (old.id,old.key_id,old.building_id,old.key_description,old.borrower_name,old.issued_by,old.loaned_at,old.notes)
 or new.returned_at is null or new.returned_at < old.loaned_at then
  raise exception 'Only recording a valid return is permitted';
 end if;
 return new;
end $$;
drop trigger if exists isys_protect_key_loan_return on public.key_loans;
create trigger isys_protect_key_loan_return before update on public.key_loans for each row execute function public.isys_protect_key_loan_return();
commit;
