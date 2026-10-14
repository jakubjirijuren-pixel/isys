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
create or replace function public.isys_notify_key_loan() returns trigger language plpgsql security definer set search_path=public as $$
declare recipient uuid;
begin
 recipient:=new.issued_by;
 if recipient is null then return new; end if;
 if tg_op='INSERT' then
   insert into public.notifications(user_id,title,body,module) values(recipient,'Nová výpůjčka klíčů',coalesce(new.borrower_name,'Uživatel')||' si vypůjčil klíče.','Evidence klíčů');
 elsif tg_op='UPDATE' and old.returned_at is null and new.returned_at is not null then
   insert into public.notifications(user_id,title,body,module) values(recipient,'Vrácení klíčů',coalesce(new.borrower_name,'Uživatel')||' vrátil vypůjčené klíče.','Evidence klíčů');
 end if;
 return new;
end $$;
drop trigger if exists isys_notify_key_loan_trigger on public.key_loans;
create trigger isys_notify_key_loan_trigger after insert or update of returned_at on public.key_loans for each row execute function public.isys_notify_key_loan();
commit;
-- Realtime: enable notifications table in Database > Publications > supabase_realtime.
-- If absent, run: alter publication supabase_realtime add table public.notifications;
