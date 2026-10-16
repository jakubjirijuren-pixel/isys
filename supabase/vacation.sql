-- iSYS dovolené: spusť v Supabase SQL Editoru
create table if not exists public.vacation_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 manager_id uuid references auth.users(id) on delete set null,
 annual_days numeric(6,2) not null default 20 check (annual_days>=0),
 updated_at timestamptz not null default now(),
 check (manager_id is distinct from user_id)
);
create table if not exists public.vacation_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 manager_id uuid not null references auth.users(id),
 starts_on date not null,
 ends_on date not null,
 days numeric(6,2) not null check (days>0),
 note text not null default '',
 status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
 decided_by uuid references auth.users(id),
 decided_at timestamptz,
 decision_note text,
 created_at timestamptz not null default now(),
 check (ends_on>=starts_on)
);
create index if not exists vacation_requests_user_dates on public.vacation_requests(user_id,starts_on,ends_on);
create index if not exists vacation_requests_manager_status on public.vacation_requests(manager_id,status);
create table if not exists public.vacation_audit (
 id bigint generated always as identity primary key,
 request_id uuid not null references public.vacation_requests(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 action text not null,
 occurred_at timestamptz not null default now(),
 detail text
);
alter table public.vacation_settings enable row level security;
alter table public.vacation_requests enable row level security;
alter table public.vacation_audit enable row level security;
drop policy if exists vacation_settings_read on public.vacation_settings;
create policy vacation_settings_read on public.vacation_settings for select to authenticated using (user_id=auth.uid() or manager_id=auth.uid() or public.is_isys_admin());
drop policy if exists vacation_requests_read on public.vacation_requests;
create policy vacation_requests_read on public.vacation_requests for select to authenticated using (user_id=auth.uid() or manager_id=auth.uid() or public.is_isys_admin());
drop policy if exists vacation_audit_read on public.vacation_audit;
create policy vacation_audit_read on public.vacation_audit for select to authenticated using (exists(select 1 from public.vacation_requests r where r.id=request_id and (r.user_id=auth.uid() or r.manager_id=auth.uid() or public.is_isys_admin())));
revoke insert,update,delete on public.vacation_settings,public.vacation_requests,public.vacation_audit from anon,authenticated;
grant select on public.vacation_settings,public.vacation_requests,public.vacation_audit to authenticated;
create or replace function public.isys_vacation_settings_save(p_user uuid,p_manager uuid,p_days numeric)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_isys_admin() then raise exception 'Pouze administrátor.'; end if;
 if p_days<0 or p_days>366 or p_manager=p_user then raise exception 'Neplatné nastavení.'; end if;
 insert into public.vacation_settings(user_id,manager_id,annual_days) values(p_user,p_manager,p_days)
 on conflict(user_id) do update set manager_id=excluded.manager_id,annual_days=excluded.annual_days,updated_at=now();
end $$;
create or replace function public.isys_vacation_submit(p_start date,p_end date,p_note text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare v_manager uuid;v_days numeric;v_id uuid;
begin
 if auth.uid() is null then raise exception 'Přihlášení je vyžadováno.'; end if;
 select manager_id into v_manager from public.vacation_settings where user_id=auth.uid();
 if v_manager is null then raise exception 'Administrátor musí nejprve nastavit nadřízeného.'; end if;
 if p_start is null or p_end is null or p_end<p_start or p_end-p_start>365 then raise exception 'Neplatné období.'; end if;
 select count(*) into v_days from generate_series(p_start,p_end,'1 day'::interval) d where extract(isodow from d)<6;
 if v_days=0 then raise exception 'Období neobsahuje pracovní den.'; end if;
 if exists(select 1 from public.vacation_requests where user_id=auth.uid() and status in ('pending','approved') and starts_on<=p_end and ends_on>=p_start) then raise exception 'Žádost se překrývá s existující dovolenou.'; end if;
 insert into public.vacation_requests(user_id,manager_id,starts_on,ends_on,days,note)
 values(auth.uid(),v_manager,p_start,p_end,v_days,left(coalesce(p_note,''),2000)) returning id into v_id;
 insert into public.vacation_audit(request_id,actor_id,action) values(v_id,auth.uid(),'submitted');
 return v_id;
end $$;
create or replace function public.isys_vacation_decide(p_id uuid,p_status text,p_note text default '')
returns void language plpgsql security definer set search_path='' as $$
declare v public.vacation_requests;
begin
 select * into v from public.vacation_requests where id=p_id for update;
 if not found then raise exception 'Žádost neexistuje.'; end if;
 if v.status<>'pending' then raise exception 'Žádost již byla vyřízena.'; end if;
 if p_status='cancelled' then
   if auth.uid()<>v.user_id and not public.is_isys_admin() then raise exception 'Nedostatečné oprávnění.'; end if;
 elsif p_status in ('approved','rejected') then
   if auth.uid()<>v.manager_id and not public.is_isys_admin() then raise exception 'Nedostatečné oprávnění.'; end if;
   if auth.uid()=v.user_id then raise exception 'Nelze schválit vlastní dovolenou.'; end if;
 else raise exception 'Neplatný stav.'; end if;
 update public.vacation_requests set status=p_status,decided_by=auth.uid(),decided_at=now(),decision_note=left(coalesce(p_note,''),2000) where id=p_id;
 insert into public.vacation_audit(request_id,actor_id,action,detail) values(p_id,auth.uid(),p_status,left(coalesce(p_note,''),2000));
end $$;
revoke all on function public.isys_vacation_settings_save(uuid,uuid,numeric),public.isys_vacation_submit(date,date,text),public.isys_vacation_decide(uuid,text,text) from public;
grant execute on function public.isys_vacation_settings_save(uuid,uuid,numeric),public.isys_vacation_submit(date,date,text),public.isys_vacation_decide(uuid,text,text) to authenticated;

-- Notifications are created server-side, so clients cannot forge them.
create or replace function public.isys_vacation_notify()
returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid; title text; body text;
begin
 if tg_op='INSERT' then
  recipient:=new.manager_id;
  title:='Nová žádost o dovolenou';
  body:='Žádost ke schválení: '||to_char(new.starts_on,'DD.MM.YYYY')||' – '||to_char(new.ends_on,'DD.MM.YYYY');
 elsif new.status is distinct from old.status then
  recipient:=new.user_id;
  title:=case new.status when 'approved' then 'Dovolená schválena' when 'rejected' then 'Dovolená zamítnuta' else 'Žádost o dovolenou zrušena' end;
  body:=to_char(new.starts_on,'DD.MM.YYYY')||' – '||to_char(new.ends_on,'DD.MM.YYYY');
 else return new; end if;
 if recipient is not null then
  insert into public.notifications(user_id,title,body,module) values(recipient,title,body,'Dovolené');
 end if;
 return new;
end $$;
drop trigger if exists isys_vacation_notify_trigger on public.vacation_requests;
create trigger isys_vacation_notify_trigger after insert or update of status on public.vacation_requests
for each row execute function public.isys_vacation_notify();
