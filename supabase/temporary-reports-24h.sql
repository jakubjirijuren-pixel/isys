-- iSYS: extend temporary PDF retention from 6 to 24 hours.
-- Run once in Supabase SQL Editor. The existing hourly cleanup job needs no change.
begin;
alter table public.temporary_reports alter column expires_at set default (now() + interval '24 hours');
alter table public.temporary_reports drop constraint if exists temporary_report_lifetime;
alter table public.temporary_reports add constraint temporary_report_lifetime
 check (expires_at <= created_at + interval '24 hours');
drop policy if exists "Own temporary reports insert" on public.temporary_reports;
create policy "Own temporary reports insert" on public.temporary_reports
 for insert to authenticated
 with check (
  user_id=(select auth.uid())
  and expires_at>now()
  and expires_at<=now()+interval '24 hours'
  and storage_path like (select auth.uid())::text || '/%'
 );
-- Extend still-active reports, but never restore already expired or deleted ones.
update public.temporary_reports
 set expires_at=created_at+interval '24 hours'
 where expires_at>now() and expires_at<created_at+interval '24 hours';
commit;
