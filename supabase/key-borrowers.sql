-- iSYS key room borrower directory. Run once in Supabase SQL Editor.
create table if not exists public.key_borrowers (
 id uuid primary key default gen_random_uuid(),
 full_name text not null check (char_length(btrim(full_name)) between 2 and 180),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create unique index if not exists key_borrowers_name_unique on public.key_borrowers (lower(btrim(full_name)));
alter table public.key_borrowers enable row level security;
drop policy if exists key_borrowers_read on public.key_borrowers;
create policy key_borrowers_read on public.key_borrowers for select to authenticated using (true);
drop policy if exists key_borrowers_admin_insert on public.key_borrowers;
create policy key_borrowers_admin_insert on public.key_borrowers for insert to authenticated with check (public.is_isys_admin());
drop policy if exists key_borrowers_admin_update on public.key_borrowers;
create policy key_borrowers_admin_update on public.key_borrowers for update to authenticated using (public.is_isys_admin()) with check (public.is_isys_admin());
drop policy if exists key_borrowers_admin_delete on public.key_borrowers;
create policy key_borrowers_admin_delete on public.key_borrowers for delete to authenticated using (public.is_isys_admin());
grant select,insert,update,delete on public.key_borrowers to authenticated;

-- Require the selected borrower to be active in the admin-managed directory.
create or replace function public.isys_kiosk_checkout(p_barcode text,p_borrower text)
returns uuid language plpgsql security definer set search_path='' as $kiosk_checkout$
declare v_key public.keys%rowtype; v_id uuid; v_name text;
begin
 if auth.uid() is null then raise exception 'Je vyžadováno přihlášení.'; end if;
 select full_name into v_name from public.key_borrowers
 where lower(btrim(full_name))=lower(btrim(coalesce(p_borrower,''))) and active=true;
 if v_name is null then raise exception 'Vyberte vypůjčitele ze seznamu oprávněných osob.'; end if;
 select * into v_key from public.keys where barcode=upper(btrim(p_barcode)) for update;
 if not found then raise exception 'Svazek s tímto kódem neexistuje.'; end if;
 if exists(select 1 from public.key_loans where key_id=v_key.id and returned_at is null) then
  raise exception 'Svazek je již vypůjčen.';
 end if;
 insert into public.key_loans(key_id,building_id,key_description,borrower_name,issued_by,loaned_at)
 values(v_key.id,v_key.building_id,v_key.label,v_name,auth.uid(),now()) returning id into v_id;
 return v_id;
end $kiosk_checkout$;
revoke all on function public.isys_kiosk_checkout(text,text) from public,anon;
grant execute on function public.isys_kiosk_checkout(text,text) to authenticated;
notify pgrst,'reload schema';
