-- FOXA: GPS at manual web clock-in / clock-out only; no continuous tracking.
-- Run in Supabase SQL Editor AFTER attendance-source.sql.
begin;
alter table public.attendance_events add column if not exists gps_latitude double precision;
alter table public.attendance_events add column if not exists gps_longitude double precision;
alter table public.attendance_events add column if not exists gps_accuracy_m double precision;
alter table public.attendance_events add column if not exists gps_captured_at timestamptz;
alter table public.attendance_events drop constraint if exists attendance_gps_valid;
alter table public.attendance_events add constraint attendance_gps_valid check (
 (gps_latitude is null and gps_longitude is null and gps_accuracy_m is null and gps_captured_at is null)
 or (gps_latitude between -90 and 90 and gps_longitude between -180 and 180 and gps_accuracy_m between 0 and 100000 and gps_captured_at is not null)
);
-- Keep the established attendance transition rules and source=web, but enforce
-- a fresh GPS reading for new browser arrival/departure events.
create or replace function public.isys_attendance_mark_geo(
 p_type text,p_latitude double precision default null,p_longitude double precision default null,
 p_accuracy_m double precision default null,p_captured_at timestamptz default null
) returns public.attendance_events
language plpgsql security definer set search_path='' as $$
declare v_result public.attendance_events;
begin
 if auth.uid() is null then raise exception 'Přihlaste se.'; end if;
 if p_type in ('in','out') then
  if p_latitude is null or p_longitude is null or p_accuracy_m is null or p_captured_at is null then
   raise exception 'Pro příchod a odchod přes web je vyžadována aktuální poloha GPS.';
  end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180
    or p_accuracy_m not between 0 and 100000
    or p_captured_at < now()-interval '2 minutes'
    or p_captured_at > now()+interval '30 seconds' then
   raise exception 'Poloha není platná nebo je příliš stará. Zkuste ji načíst znovu.';
  end if;
 else
  p_latitude:=null;p_longitude:=null;p_accuracy_m:=null;p_captured_at:=null;
 end if;
 -- The existing function checks attendance transitions and stamps trusted source.
 v_result:=public.isys_attendance_mark(p_type);
 if p_type in ('in','out') then
  update public.attendance_events set gps_latitude=p_latitude,gps_longitude=p_longitude,
    gps_accuracy_m=p_accuracy_m,gps_captured_at=p_captured_at
   where id=v_result.id returning * into v_result;
 end if;
 return v_result;
end;$$;
revoke all on function public.isys_attendance_mark_geo(text,double precision,double precision,double precision,timestamptz) from public;
grant execute on function public.isys_attendance_mark_geo(text,double precision,double precision,double precision,timestamptz) to authenticated;
-- Disallow bypass of GPS from direct browser RPC. The wrapper still calls this
-- SECURITY DEFINER function internally. NFC/admin use separate RPCs.
revoke execute on function public.isys_attendance_mark(text) from public,anon,authenticated;
-- No separate public table; GPS is protected by existing attendance_events RLS.
notify pgrst,'reload schema';
commit;
