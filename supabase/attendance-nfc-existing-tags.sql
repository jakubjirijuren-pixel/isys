-- iSYS NFC attendance: assign existing NFC tags by their factory serial number.
-- Run AFTER attendance-source.sql and attendance-admin-backfill.sql.
-- No data is written to NFC tags. Web NFC can read serialNumber only on supported
-- Android/Chrome devices and NFC tags that the browser can actually scan.
-- WARNING: NFC serial numbers are cloneable; not a secure access credential.

create or replace function public.isys_attendance_assign_uid(p_user_id uuid,p_uid text)
returns void language plpgsql security definer set search_path='' as $$
declare v_uid text;
begin
 if not public.is_isys_admin() then raise exception 'Čipy může přiřazovat pouze administrátor.'; end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Zaměstnanec neexistuje.'; end if;
 v_uid:=upper(regexp_replace(coalesce(p_uid,''),'[^0-9A-Fa-f]','','g'));
 if length(v_uid)<8 or length(v_uid)>32 or length(v_uid)%2<>0 then
  raise exception 'Neplatné sériové číslo NFC čipu.';
 end if;
 insert into public.attendance_nfc_cards(user_id,token_hash,issued_at)
 values(p_user_id,encode(sha256(convert_to('UID:'||v_uid,'UTF8')),'hex'),now())
 on conflict(user_id) do update set token_hash=excluded.token_hash,issued_at=now();
exception when unique_violation then
 raise exception 'Tento NFC čip už je přiřazen jinému zaměstnanci.';
end;$$;
revoke all on function public.isys_attendance_assign_uid(uuid,text) from public;
grant execute on function public.isys_attendance_assign_uid(uuid,text) to authenticated;

create or replace function public.isys_attendance_card_status(p_token text)
returns table(user_id uuid,last_event text)
language plpgsql security definer set search_path='' as $$
declare v_token text;v_uid text;
begin
 if auth.uid() is null then raise exception 'Přihlaste se do iSYS.'; end if;
 if p_token like 'UID:%' then
  v_uid:=upper(regexp_replace(substr(p_token,5),'[^0-9A-Fa-f]','','g'));
  if length(v_uid)<8 or length(v_uid)>32 or length(v_uid)%2<>0 then raise exception 'Neplatné sériové číslo NFC.'; end if;
  v_token:='UID:'||v_uid;
 elsif p_token ~ '^ISYSATT-[a-f0-9]{64}$' then
  v_token:=p_token;
 else raise exception 'Neplatný docházkový čip.'; end if;
 return query
 select c.user_id,
 (select e.event_type from public.attendance_events e where e.user_id=c.user_id order by e.occurred_at desc,e.id desc limit 1)
 from public.attendance_nfc_cards c
 where c.token_hash=encode(sha256(convert_to(v_token,'UTF8')),'hex');
end;$$;
revoke all on function public.isys_attendance_card_status(text) from public;
grant execute on function public.isys_attendance_card_status(text) to authenticated;

create or replace function public.isys_attendance_card_mark(p_token text,p_type text)
returns public.attendance_events language plpgsql security definer set search_path='' as $$
declare v_user uuid;v_last text;v_time timestamptz;v_result public.attendance_events;v_token text;v_uid text;
begin
 if auth.uid() is null then raise exception 'Přihlaste se do iSYS.'; end if;
 if p_token like 'UID:%' then
  v_uid:=upper(regexp_replace(substr(p_token,5),'[^0-9A-Fa-f]','','g'));
  if length(v_uid)<8 or length(v_uid)>32 or length(v_uid)%2<>0 then raise exception 'Neplatné sériové číslo NFC.'; end if;
  v_token:='UID:'||v_uid;
 elsif p_token ~ '^ISYSATT-[a-f0-9]{64}$' then v_token:=p_token;
 else raise exception 'Neplatný docházkový čip.'; end if;
 select c.user_id into v_user from public.attendance_nfc_cards c
 where c.token_hash=encode(sha256(convert_to(v_token,'UTF8')),'hex');
 if v_user is null then raise exception 'Čip není přiřazen zaměstnanci.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 select event_type,occurred_at into v_last,v_time from public.attendance_events
 where user_id=v_user order by occurred_at desc,id desc limit 1;
 if v_time is not null and v_time>now()-interval '10 seconds' then raise exception 'Počkejte 10 sekund.'; end if;
 if p_type in ('trip_end','doctor_end','homeoffice_end') then
  if v_last is distinct from replace(p_type,'_end','_start') then raise exception 'Neplatné ukončení režimu.'; end if;
 elsif not public.isys_attendance_transition(v_last,p_type) then raise exception 'Neplatná návaznost docházky.'; end if;
 insert into public.attendance_events(user_id,event_type,recorded_by,source)
 values(v_user,p_type,auth.uid(),'nfc') returning * into v_result;
 return v_result;
end;$$;
revoke all on function public.isys_attendance_card_mark(text,text) from public;
grant execute on function public.isys_attendance_card_mark(text,text) to authenticated;
notify pgrst,'reload schema';
