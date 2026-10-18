-- FOXA: second key-loan form with borrower contact and printable handover protocol.
-- Run once in Supabase SQL Editor before using the protocol form.
begin;
alter table public.key_loans add column if not exists borrower_phone text;
alter table public.key_loans add column if not exists protocol_type text not null default 'standard';
alter table public.key_loans drop constraint if exists key_loans_protocol_type_check;
alter table public.key_loans add constraint key_loans_protocol_type_check check(protocol_type in ('standard','handover'));
alter table public.key_loans drop constraint if exists key_loans_handover_contact_check;
alter table public.key_loans add constraint key_loans_handover_contact_check check (
 protocol_type <> 'handover' or
 (length(btrim(coalesce(borrower_name,''))) between 3 and 180 and
  borrower_name ~ '^[^[:space:]]+[[:space:]]+[^[:space:]]+' and
  borrower_phone ~ '^\\+?[0-9][0-9 ()-]{7,19}$')
);
-- Preserve the existing append-only semantics: only returned_at may change.
create or replace function public.isys_protect_key_loan_return()
returns trigger language plpgsql set search_path=public as $$
begin
 if old.returned_at is not null or
 (new.id,new.key_id,new.building_id,new.key_description,new.borrower_name,
  new.borrower_phone,new.protocol_type,new.issued_by,new.loaned_at,new.notes)
 is distinct from
 (old.id,old.key_id,old.building_id,old.key_description,old.borrower_name,
  old.borrower_phone,old.protocol_type,old.issued_by,old.loaned_at,old.notes)
 or new.returned_at is null or new.returned_at < old.loaned_at then
  raise exception 'Only recording a valid return is permitted';
 end if;
 return new;
end $$;
notify pgrst,'reload schema';
commit;
