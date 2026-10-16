-- Run AFTER supabase/attendance.sql. NFC terminal uses a logged-in iSYS operator.
create table if not exists public.attendance_nfc_cards (
 user_id uuid primary key references auth.users(id) on delete cascade,
 token_hash text not null unique,
 issued_at timestamptz not null default now()
);
alter table public.attendance_nfc_cards enable row level security;
revoke all on public.attendance_nfc_cards from anon,authenticated;

create or replace function public.isys_attendance_issue_card(p_user_id uuid)
returns text language plpgsql security definer set search_path=''
as $$
declare v_token text;
begin
 if not public.is_isys_admin() then raise exception 'Pouze administrátor může vydávat čipy.'; end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Uživatel neexistuje.'; end if;
 v_token:='ISYSATT-'||replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into public.attendance_nfc_cards(user_id,token_hash,issued_at)
 values(p_user_id,encode(sha256(convert_to(v_token,'UTF8')),'hex'),now())
 on conflict(user_id) do update set token_hash=excluded.token_hash,issued_at=now();
 return v_token;
end;$$;
revoke all on function public.isys_attendance_issue_card(uuid) from public;
grant execute on function public.isys_attendance_issue_card(uuid) to authenticated;

create or replace function public.isys_attendance_card_status(p_token text)
returns table(user_id uuid,last_event text)
language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null then raise exception 'Přihlaste se do iSYS.'; end if;
 if p_token is null or p_token !~ '^ISYSATT-[a-f0-9]{64}$' then raise exception 'Neplatný docházkový čip.'; end if;
 return query
 select c.user_id,
  (select e.event_type from public.attendance_events e where e.user_id=c.user_id order by e.occurred_at desc,e.id desc limit 1)
 from public.attendance_nfc_cards c
 where c.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
end;$$;
revoke all on function public.isys_attendance_card_status(text) from public;
grant execute on function public.isys_attendance_card_status(text) to authenticated;

create or replace function public.isys_attendance_card_mark(p_token text,p_type text)
returns public.attendance_events
language plpgsql security definer set search_path=''
as $$
declare v_user uuid;v_last text;v_time timestamptz;v_result public.attendance_events;
begin
 if auth.uid() is null then raise exception 'Přihlaste se do iSYS.'; end if;
 if p_token is null or p_token !~ '^ISYSATT-[a-f0-9]{64}$' then raise exception 'Neplatný docházkový čip.'; end if;
 if p_type not in ('in','break_start','break_end','out') then raise exception 'Neplatná akce.'; end if;
 select c.user_id into v_user from public.attendance_nfc_cards c where c.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if v_user is null then raise exception 'Čip není přiřazen zaměstnanci.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 select event_type,occurred_at into v_last,v_time from public.attendance_events
 where user_id=v_user order by occurred_at desc,id desc limit 1;
 if v_time is not null and v_time>now()-interval '10 seconds' then raise exception 'Před další akcí počkejte alespoň 10 sekund.'; end if;
 if not ((p_type='in' and (v_last is null or v_last='out'))
 or (p_type='break_start' and v_last in ('in','break_end'))
 or (p_type='break_end' and v_last='break_start')
 or (p_type='out' and v_last in ('in','break_end')))
 then raise exception 'Tato akce nenavazuje na poslední záznam.'; end if;
 insert into public.attendance_events(user_id,event_type) values(v_user,p_type) returning * into v_result;
 return v_result;
end;$$;
revoke all on function public.isys_attendance_card_mark(text,text) from public;
grant execute on function public.isys_attendance_card_mark(text,text) to authenticated;
