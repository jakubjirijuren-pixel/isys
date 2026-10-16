-- Run after vacation.sql and vacation-holidays-attendance.sql
-- Sick days: 3 working days per calendar year, independent of vacation.
begin;
create table if not exists public.sick_days (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null,
 status text not null default 'used' check(status in ('used','cancelled')),
 created_at timestamptz not null default now(),
 cancelled_at timestamptz,
 cancelled_by uuid references auth.users(id),
 unique(user_id,day)
);
create index if not exists sick_days_user_day on public.sick_days(user_id,day);
alter table public.sick_days enable row level security;
drop policy if exists sick_days_read on public.sick_days;
create policy sick_days_read on public.sick_days for select to authenticated
 using (user_id=(select auth.uid()) or public.is_isys_admin());
revoke insert,update,delete on public.sick_days from anon,authenticated;
grant select on public.sick_days to authenticated;

create or replace function public.isys_sick_day_use(p_day date)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_count int;
begin
 if auth.uid() is null then raise exception 'Je vyžadováno přihlášení.'; end if;
 if p_day is null then raise exception 'Vyberte datum.'; end if;
 if extract(isodow from p_day)>=6 or public.isys_cz_public_holiday(p_day) then
  raise exception 'Sick day lze čerpat pouze v pracovní den mimo státní svátky.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('sick:'||auth.uid()::text||':'||extract(year from p_day)::text,0));
 select count(*) into v_count from public.sick_days
 where user_id=auth.uid() and status='used' and extract(year from day)=extract(year from p_day);
 if v_count>=3 then raise exception 'Roční limit 3 sick days je vyčerpán.'; end if;
 if exists(select 1 from public.vacation_requests r where r.user_id=auth.uid()
   and r.status in ('pending','approved') and p_day between r.starts_on and r.ends_on)
 then raise exception 'V tento den již existuje žádost o dovolenou.'; end if;
 insert into public.sick_days(user_id,day,status) values(auth.uid(),p_day,'used')
 on conflict(user_id,day) do update set status='used',cancelled_at=null,cancelled_by=null
 returning id into v_id;
 return v_id;
end $$;

create or replace function public.isys_sick_day_cancel(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v public.sick_days;
begin
 select * into v from public.sick_days where id=p_id for update;
 if not found then raise exception 'Záznam nenalezen.'; end if;
 if auth.uid() is distinct from v.user_id and not public.is_isys_admin() then
  raise exception 'Nedostatečné oprávnění.';
 end if;
 if v.status<>'used' then raise exception 'Záznam již byl zrušen.'; end if;
 update public.sick_days set status='cancelled',cancelled_at=now(),cancelled_by=auth.uid() where id=p_id;
end $$;
revoke all on function public.isys_sick_day_use(date),public.isys_sick_day_cancel(uuid) from public;
grant execute on function public.isys_sick_day_use(date),public.isys_sick_day_cancel(uuid) to authenticated;

create or replace view public.isys_sick_attendance with (security_invoker=true) as
select id,user_id,day from public.sick_days where status='used';
grant select on public.isys_sick_attendance to authenticated;
commit;
