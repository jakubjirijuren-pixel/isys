-- Run after attendance-source.sql.
-- Administrators may add historical arrival/departure events even when later
-- events already exist. Keep every event and record who made the adjustment.
create or replace function public.isys_attendance_admin_mark(
 p_user_id uuid,
 p_type text,
 p_occurred_at timestamptz,
 p_note text default null
)
returns public.attendance_events
language plpgsql security definer set search_path=''
as $$
declare v_result public.attendance_events;
begin
 if not public.is_isys_admin() then
  raise exception 'Pouze administrátor může doplňovat docházku.';
 end if;
 if p_user_id is null or not exists(select 1 from auth.users where id=p_user_id) then
  raise exception 'Vyberte platného zaměstnance.';
 end if;
 if p_type not in ('in','out') then
  raise exception 'Lze doplnit pouze příchod nebo odchod.';
 end if;
 if p_occurred_at is null or p_occurred_at > now()+interval '1 minute' then
  raise exception 'Datum a čas nesmí být v budoucnosti.';
 end if;
 if length(coalesce(p_note,'')) > 500 then
  raise exception 'Poznámka může mít nejvýše 500 znaků.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 if exists(
  select 1 from public.attendance_events
  where user_id=p_user_id and event_type=p_type and occurred_at=p_occurred_at
 ) then
  raise exception 'Stejná událost již pro tento čas existuje.';
 end if;
 insert into public.attendance_events(
  user_id,event_type,occurred_at,recorded_by,entry_note,source
 ) values (
  p_user_id,p_type,p_occurred_at,auth.uid(),nullif(btrim(p_note),''),'admin'
 ) returning * into v_result;
 return v_result;
end;
$$;
revoke all on function public.isys_attendance_admin_mark(uuid,text,timestamptz,text) from public;
grant execute on function public.isys_attendance_admin_mark(uuid,text,timestamptz,text) to authenticated;
notify pgrst, 'reload schema';
