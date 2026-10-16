-- iSYS attendance: run in Supabase SQL Editor before opening the module.
create table if not exists public.attendance_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 event_type text not null check (event_type in ('in','break_start','break_end','out')),
 occurred_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create index if not exists attendance_events_user_time on public.attendance_events(user_id,occurred_at desc);
alter table public.attendance_events enable row level security;
drop policy if exists attendance_events_select on public.attendance_events;
create policy attendance_events_select on public.attendance_events for select to authenticated
 using (user_id=(select auth.uid()) or public.is_isys_admin());
-- No client-side INSERT/UPDATE/DELETE: events are append-only through validated RPC.
revoke insert,update,delete on public.attendance_events from anon,authenticated;
grant select on public.attendance_events to authenticated;

create or replace function public.isys_attendance_mark(p_type text)
returns public.attendance_events
language plpgsql security definer set search_path=''
as $$
declare v_last text; v_result public.attendance_events;
begin
 if auth.uid() is null then raise exception 'Je vyžadováno přihlášení.'; end if;
 if p_type not in ('in','break_start','break_end','out') then raise exception 'Neplatný typ události.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select event_type into v_last from public.attendance_events
 where user_id=auth.uid() order by occurred_at desc,id desc limit 1;
 if not (
   (p_type='in' and (v_last is null or v_last='out')) or
   (p_type='break_start' and v_last in ('in','break_end')) or
   (p_type='break_end' and v_last='break_start') or
   (p_type='out' and v_last in ('in','break_end'))
 ) then raise exception 'Tato akce nenavazuje na poslední záznam docházky.'; end if;
 insert into public.attendance_events(user_id,event_type) values(auth.uid(),p_type) returning * into v_result;
 return v_result;
end;
$$;
revoke all on function public.isys_attendance_mark(text) from public;
grant execute on function public.isys_attendance_mark(text) to authenticated;
