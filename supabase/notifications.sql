-- Run in Supabase SQL Editor. Creates per-user in-app notifications.
begin;
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 body text not null default '',
 module text,
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index if not exists notifications_user_created_idx on public.notifications(user_id,created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "isys_notifications_select" on public.notifications;
create policy "isys_notifications_select" on public.notifications for select to authenticated using (user_id=auth.uid());
drop policy if exists "isys_notifications_update" on public.notifications;
create policy "isys_notifications_update" on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
grant select,update on public.notifications to authenticated;
revoke insert,delete on public.notifications from anon,authenticated;
create or replace function public.isys_notify_key_loan()
returns trigger language plpgsql security definer set search_path=''
as $notify_key_loan$
declare
 v_building_id uuid;
 v_building_name text;
 v_title text;
 v_body text;
begin
 if tg_op='INSERT' then
  v_title:='Nová výpůjčka klíčů';
 elsif tg_op='UPDATE' and old.returned_at is null and new.returned_at is not null then
  v_title:='Vrácení klíčů';
 else
  return new;
 end if;

 -- Both catalog-linked and manually entered loans resolve to the building.
 v_building_id:=new.building_id;
 if v_building_id is null and new.key_id is not null then
  select k.building_id into v_building_id from public.keys k where k.id=new.key_id;
 end if;

 select coalesce(nullif(b.address,''),nullif(b.name,''),'Objekt') into v_building_name
 from public.buildings b where b.id=v_building_id;
 v_body:=coalesce(new.borrower_name,'Uživatel')
  ||case when v_title='Nová výpůjčka klíčů' then ' si vypůjčil(a) klíče' else ' vrátil(a) klíče' end
  ||case when v_building_name is not null then ' – '||v_building_name else '' end
  ||case when nullif(new.key_description,'') is not null then ' ('||new.key_description||')' else '' end||'.';

 -- DISTINCT avoids duplicates when the issuer is also a building referent,
 -- or when the primary referent is listed in building_referents.
 insert into public.notifications(user_id,title,body,module)
 select distinct recipients.user_id,v_title,v_body,'Evidence klíčů'
 from (
  select new.issued_by as user_id
  union
  select b.referent_user_id from public.buildings b
   where b.id=v_building_id
  union
  select br.user_id from public.building_referents br
   where br.building_id=v_building_id
 ) recipients
 where recipients.user_id is not null;
 return new;
end
$notify_key_loan$;
drop trigger if exists isys_notify_key_loan_trigger on public.key_loans;
create trigger isys_notify_key_loan_trigger after insert or update of returned_at on public.key_loans for each row execute function public.isys_notify_key_loan();
commit;
-- Realtime: enable notifications table in Database > Publications > supabase_realtime.
-- If absent, run: alter publication supabase_realtime add table public.notifications;
