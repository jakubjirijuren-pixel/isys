-- iSYS: run once after attendance.sql and attendance-nfc.sql.
-- Adds distinct activity types and auditable administrator entries.
alter table public.attendance_events drop constraint if exists attendance_events_event_type_check;
alter table public.attendance_events add constraint attendance_events_event_type_check
 check(event_type in ('in','out','break_start','break_end','trip_start','trip_end','doctor_start','doctor_end','homeoffice_start','homeoffice_end'));
alter table public.attendance_events add column if not exists recorded_by uuid references auth.users(id);
alter table public.attendance_events add column if not exists entry_note text;
update public.attendance_events set recorded_by=user_id where recorded_by is null;
alter table public.attendance_events alter column recorded_by set default auth.uid();

create or replace function public.isys_attendance_transition(p_previous text,p_next text)
returns boolean language sql immutable set search_path='' as $$
 select case
 when p_previous is null or p_previous in ('out','trip_end','doctor_end','homeoffice_end')
  then p_next in ('in','trip_start','doctor_start','homeoffice_start')
 when p_previous in ('in','break_end') then p_next in ('break_start','out')
 when p_previous='break_start' then p_next='break_end'
 else false end;
$$;

create or replace function public.isys_attendance_mark(p_type text)
returns public.attendance_events language plpgsql security definer set search_path='' as $$
declare v_last text;v_result public.attendance_events;
begin
 if auth.uid() is null then raise exception 'Přihlaste se.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select event_type into v_last from public.attendance_events where user_id=auth.uid() order by occurred_at desc,id desc limit 1;
 if p_type in ('trip_end','doctor_end','homeoffice_end') then
  if v_last is distinct from replace(p_type,'_end','_start') then raise exception 'Neplatné ukončení režimu.'; end if;
 elsif not public.isys_attendance_transition(v_last,p_type) then
  raise exception 'Tato akce nenavazuje na poslední záznam docházky.';
 end if;
 insert into public.attendance_events(user_id,event_type,recorded_by)
 values(auth.uid(),p_type,auth.uid()) returning * into v_result;
 return v_result;
end;$$;
revoke all on function public.isys_attendance_mark(text) from public;
grant execute on function public.isys_attendance_mark(text) to authenticated;

create or replace function public.isys_attendance_admin_mark(p_user_id uuid,p_type text,p_occurred_at timestamptz,p_note text default null)
returns public.attendance_events language plpgsql security definer set search_path='' as $$
declare v_previous text;v_next text;v_result public.attendance_events;
begin
 if not public.is_isys_admin() then raise exception 'Pouze administrátor.'; end if;
 if p_user_id is null or not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Neplatný zaměstnanec.'; end if;
 if p_type not in ('in','out') then raise exception 'Lze doplnit pouze příchod nebo odchod.'; end if;
 if p_occurred_at is null or p_occurred_at>now()+interval '1 minute' then raise exception 'Neplatný čas záznamu.'; end if;
 if length(coalesce(p_note,''))>500 then raise exception 'Poznámka je příliš dlouhá.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 select event_type into v_previous from public.attendance_events where user_id=p_user_id and occurred_at<=p_occurred_at order by occurred_at desc,id desc limit 1;
 select event_type into v_next from public.attendance_events where user_id=p_user_id and occurred_at>p_occurred_at order by occurred_at asc,id asc limit 1;
 if p_type='in' then
  if not public.isys_attendance_transition(v_previous,'in') then raise exception 'Příchod nenavazuje na předchozí událost.'; end if;
  if v_next is not null and v_next not in ('break_start','out') then raise exception 'Příchod není slučitelný s následující událostí.'; end if;
 else
  if v_previous not in ('in','break_end') then raise exception 'Odchod nenavazuje na předchozí událost.'; end if;
  if v_next is not null and not public.isys_attendance_transition('out',v_next) then raise exception 'Odchod není slučitelný s následující událostí.'; end if;
 end if;
 insert into public.attendance_events(user_id,event_type,occurred_at,recorded_by,entry_note)
 values(p_user_id,p_type,p_occurred_at,auth.uid(),nullif(btrim(p_note),'')) returning * into v_result;
 return v_result;
end;$$;
revoke all on function public.isys_attendance_admin_mark(uuid,text,timestamptz,text) from public;
grant execute on function public.isys_attendance_admin_mark(uuid,text,timestamptz,text) to authenticated;

-- NFC kiosk must accept the new statuses as well.
create or replace function public.isys_attendance_card_mark(p_token text,p_type text)
returns public.attendance_events language plpgsql security definer set search_path='' as $$
declare v_user uuid;v_last text;v_time timestamptz;v_result public.attendance_events;
begin
 if auth.uid() is null then raise exception 'Přihlaste se do iSYS.'; end if;
 if p_token is null or p_token !~ '^ISYSATT-[a-f0-9]{64}$' then raise exception 'Neplatný docházkový čip.'; end if;
 select c.user_id into v_user from public.attendance_nfc_cards c where c.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if v_user is null then raise exception 'Čip není přiřazen zaměstnanci.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 select event_type,occurred_at into v_last,v_time from public.attendance_events where user_id=v_user order by occurred_at desc,id desc limit 1;
 if v_time is not null and v_time>now()-interval '10 seconds' then raise exception 'Počkejte 10 sekund.'; end if;
 if p_type in ('trip_end','doctor_end','homeoffice_end') then
  if v_last is distinct from replace(p_type,'_end','_start') then raise exception 'Neplatné ukončení režimu.'; end if;
 elsif not public.isys_attendance_transition(v_last,p_type) then raise exception 'Neplatná návaznost docházky.'; end if;
 insert into public.attendance_events(user_id,event_type,recorded_by) values(v_user,p_type,auth.uid()) returning * into v_result;
 return v_result;
end;$$;
revoke all on function public.isys_attendance_card_mark(text,text) from public;
grant execute on function public.isys_attendance_card_mark(text,text) to authenticated;
notify pgrst, 'reload schema';
