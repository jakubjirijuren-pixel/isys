-- iSYS: Czech public holidays and approved vacation attendance.
-- Run AFTER supabase/vacation.sql. No synthetic clock-in/out events are created.
create or replace function public.isys_cz_easter_sunday(p_year integer)
returns date language plpgsql immutable set search_path='' as $$
declare a int; b int; c int; d int; e int; f int; g int; h int; i int; k int; l int; m int; mon int; dy int;
begin
 a:=p_year%19;b:=p_year/100;c:=p_year%100;d:=b/4;e:=b%4;f:=(b+8)/25;g:=(b-f+1)/3;
 h:=(19*a+b-d-g+15)%30;i:=c/4;k:=c%4;l:=(32+2*e+2*i-h-k)%7;
 m:=(a+11*h+22*l)/451;mon:=(h+l-7*m+114)/31;dy:=((h+l-7*m+114)%31)+1;
 return make_date(p_year,mon,dy);
end $$;
create or replace function public.isys_cz_public_holiday(p_day date)
returns boolean language sql immutable set search_path='' as $$
 select (extract(month from p_day)::int,extract(day from p_day)::int) in
 ((1,1),(5,1),(5,8),(7,5),(7,6),(9,28),(10,28),(11,17),(12,24),(12,25),(12,26))
 or p_day=public.isys_cz_easter_sunday(extract(year from p_day)::int)-2
 or p_day=public.isys_cz_easter_sunday(extract(year from p_day)::int)+1
$$;
create or replace function public.isys_vacation_workdays(p_start date,p_end date)
returns numeric language sql immutable set search_path='' as $$
 select count(*)::numeric from generate_series(p_start,p_end,'1 day'::interval) d
 where extract(isodow from d)<6 and not public.isys_cz_public_holiday(d::date)
$$;
-- Recalculate historic requests as well as future ones; keep an audit trail.
with changed as (
 update public.vacation_requests r set days=public.isys_vacation_workdays(r.starts_on,r.ends_on)
 where r.days is distinct from public.isys_vacation_workdays(r.starts_on,r.ends_on)
   and public.isys_vacation_workdays(r.starts_on,r.ends_on)>0
 returning r.id,r.user_id
)
insert into public.vacation_audit(request_id,actor_id,action,detail)
select id,user_id,'recalculated','Počet dnů upraven podle českých státních svátků' from changed;
create or replace function public.isys_vacation_count_days()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.days:=public.isys_vacation_workdays(new.starts_on,new.ends_on);
 if new.days<=0 then raise exception 'Období neobsahuje pracovní den mimo svátky.'; end if;
 return new;
end $$;
drop trigger if exists isys_vacation_count_days_trigger on public.vacation_requests;
create trigger isys_vacation_count_days_trigger before insert or update of starts_on,ends_on
on public.vacation_requests for each row execute function public.isys_vacation_count_days();
-- Read-only calendar view. The attendance report reads approved leave directly,
-- not as fake attendance events (worked hours remain separate).
create or replace view public.isys_vacation_attendance with (security_invoker=true) as
select r.id as request_id,r.user_id,d::date as day,r.status,r.days as request_days
from public.vacation_requests r
cross join lateral generate_series(r.starts_on,r.ends_on,'1 day'::interval) d
where r.status='approved' and extract(isodow from d)<6
and not public.isys_cz_public_holiday(d::date);
grant select on public.isys_vacation_attendance to authenticated;
