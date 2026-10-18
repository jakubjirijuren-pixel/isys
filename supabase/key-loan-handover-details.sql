-- FOXA: optional borrower company/email and signer name captured with a handover loan.
begin;
alter table public.key_loans add column if not exists borrower_company text;
alter table public.key_loans add column if not exists borrower_email text;
alter table public.key_loans add column if not exists handover_signer_name text;
alter table public.key_loans drop constraint if exists key_loans_handover_contact_length;
alter table public.key_loans add constraint key_loans_handover_contact_length check (
 length(coalesce(borrower_company,'')) <= 200 and
 length(coalesce(borrower_email,'')) <= 254 and
 length(coalesce(handover_signer_name,'')) <= 150
);
-- Recreate existing return protection with the newly persisted fields.
create or replace function public.isys_protect_key_loan_return()
returns trigger language plpgsql set search_path=public as $$
begin
 if old.returned_at is not null or
 (new.id,new.key_id,new.building_id,new.key_description,new.borrower_name,
  new.borrower_phone,new.protocol_type,new.borrower_company,new.borrower_email,
  new.handover_signer_name,new.issued_by,new.loaned_at,new.notes)
 is distinct from
 (old.id,old.key_id,old.building_id,old.key_description,old.borrower_name,
  old.borrower_phone,old.protocol_type,old.borrower_company,old.borrower_email,
  old.handover_signer_name,old.issued_by,old.loaned_at,old.notes)
 or new.returned_at is null or new.returned_at < old.loaned_at then
  raise exception 'Only recording a valid return is permitted';
 end if;
 return new;
end $$;
notify pgrst,'reload schema';
commit;
