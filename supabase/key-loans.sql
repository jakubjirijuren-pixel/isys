-- Run in Supabase SQL Editor before using the Evidence klíčů module.
create table if not exists public.key_loans (
 id uuid primary key default gen_random_uuid(),
 building_id uuid not null references public.buildings(id) on delete restrict,
 borrower text not null check (length(trim(borrower)) between 1 and 180),
 key_description text not null check (length(trim(key_description)) between 1 and 500),
 borrowed_at timestamptz not null,
 returned_at timestamptz,
 note text,
 created_by uuid not null references auth.users(id),
 returned_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 constraint key_loans_return_after_borrow check (returned_at is null or returned_at>=borrowed_at),
 constraint key_loans_return_actor check ((returned_at is null and returned_by is null) or (returned_at is not null and returned_by is not null))
);
create index if not exists key_loans_building_id_idx on public.key_loans(building_id);
create index if not exists key_loans_borrowed_at_idx on public.key_loans(borrowed_at desc);
alter table public.key_loans enable row level security;
grant select,insert,update on public.key_loans to authenticated;
drop policy if exists key_loans_read on public.key_loans;
create policy key_loans_read on public.key_loans for select to authenticated using (true);
drop policy if exists key_loans_create on public.key_loans;
create policy key_loans_create on public.key_loans for insert to authenticated with check (created_by=auth.uid() and returned_at is null and returned_by is null);
drop policy if exists key_loans_return on public.key_loans;
create policy key_loans_return on public.key_loans for update to authenticated using (returned_at is null) with check (returned_at is not null and returned_by=auth.uid());
-- Prevent editing loan details during a return; only returned_at and returned_by may change.
create or replace function public.isys_protect_key_loans() returns trigger language plpgsql set search_path=public as $$
begin
 if old.returned_at is not null or (new.id,new.building_id,new.borrower,new.key_description,new.borrowed_at,new.note,new.created_by,new.created_at) is distinct from (old.id,old.building_id,old.borrower,old.key_description,old.borrowed_at,old.note,old.created_by,old.created_at) then
  raise exception 'Only returning an active key loan is allowed';
 end if;
 return new;
end $$;
drop trigger if exists protect_key_loans on public.key_loans;
create trigger protect_key_loans before update on public.key_loans for each row execute function public.isys_protect_key_loans();
