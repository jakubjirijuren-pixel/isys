-- iSYS key room: one barcode per physical key bundle.
-- Execute after supabase/key-loans.sql.
alter table public.keys add column if not exists barcode text;
update public.keys set barcode='ISYS-'+upper(left(replace(id::text,'-',''),16)) where barcode is null or btrim(barcode)='';
create or replace function public.isys_assign_key_barcode() returns trigger
language plpgsql set search_path='' as $key_barcode_body$
begin
 if new.id is null then new.id=gen_random_uuid(); end if;
 if new.barcode is null or btrim(new.barcode)='' then
  new.barcode='ISYS-'+upper(left(replace(new.id::text,'-',''),16));
 end if;
 return new;
end $key_barcode_body$;
drop trigger if exists isys_assign_key_barcode on public.keys;
create trigger isys_assign_key_barcode before insert on public.keys for each row execute function public.isys_assign_key_barcode();
alter table public.keys alter column barcode set not null;
create unique index if not exists isys_keys_barcode_unique on public.keys(barcode);
create unique index if not exists isys_one_active_loan_per_bundle on public.key_loans(key_id) where returned_at is null and key_id is not null;

create or replace function public.isys_kiosk_checkout(p_barcode text,p_borrower text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_key public.keys%rowtype; v_id uuid;
begin
 if auth.uid() is null then raise exception 'Je vyžadováno přihlášení.'; end if;
 if length(btrim(coalesce(p_borrower,''))) not between 2 and 180 then raise exception 'Zadejte jméno vypůjčitele.'; end if;
 select * into v_key from public.keys where barcode=upper(btrim(p_barcode)) for update;
 if not found then raise exception 'Svazek s tímto kódem neexistuje.'; end if;
 if exists(select 1 from public.key_loans where key_id=v_key.id and returned_at is null) then
  raise exception 'Svazek je již vypůjčen.';
 end if;
 insert into public.key_loans(key_id,building_id,key_description,borrower_name,issued_by,loaned_at)
 values(v_key.id,v_key.building_id,v_key.label,btrim(p_borrower),auth.uid(),now()) returning id into v_id;
 return v_id;
end $$;
create or replace function public.isys_kiosk_return(p_barcode text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_key_id uuid; v_loan_id uuid;
begin
 if auth.uid() is null then raise exception 'Je vyžadováno přihlášení.'; end if;
 select id into v_key_id from public.keys where barcode=upper(btrim(p_barcode));
 if v_key_id is null then raise exception 'Svazek s tímto kódem neexistuje.'; end if;
 select id into v_loan_id from public.key_loans where key_id=v_key_id and returned_at is null order by loaned_at desc limit 1 for update;
 if v_loan_id is null then raise exception 'Svazek není evidován jako vypůjčený.'; end if;
 update public.key_loans set returned_at=now() where id=v_loan_id;
 return v_loan_id;
end $$;
revoke all on function public.isys_kiosk_checkout(text,text) from public,anon;
revoke all on function public.isys_kiosk_return(text) from public,anon;
grant execute on function public.isys_kiosk_checkout(text,text),public.isys_kiosk_return(text) to authenticated;
notify pgrst,'reload schema';
