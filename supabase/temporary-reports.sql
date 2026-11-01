-- iSYS: temporary inspection PDFs, available for 6 hours
create table if not exists public.temporary_reports (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 filename text not null,
 object_label text not null default '',
 storage_path text not null unique,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '6 hours'),
 constraint temporary_report_lifetime check (expires_at <= created_at + interval '6 hours')
);
create index if not exists temporary_reports_expiry_idx on public.temporary_reports(expires_at);
alter table public.temporary_reports enable row level security;
drop policy if exists "Own temporary reports read" on public.temporary_reports;
create policy "Own temporary reports read" on public.temporary_reports for select to authenticated using (user_id=(select auth.uid()) and expires_at>now());
drop policy if exists "Own temporary reports insert" on public.temporary_reports;
create policy "Own temporary reports insert" on public.temporary_reports for insert to authenticated with check (user_id=(select auth.uid()) and expires_at>now() and expires_at<=now()+interval '6 hours' and storage_path like (select auth.uid())::text || '/%');
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('temporary-reports','temporary-reports',false,10485760,array['application/pdf'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf'];
drop policy if exists "Own temporary PDF upload" on storage.objects;
create policy "Own temporary PDF upload" on storage.objects for insert to authenticated
with check (bucket_id='temporary-reports' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Own temporary PDF download" on storage.objects;
create policy "Own temporary PDF download" on storage.objects for select to authenticated
using (bucket_id='temporary-reports' and exists(select 1 from public.temporary_reports r where r.storage_path=name and r.user_id=(select auth.uid()) and r.expires_at>now()));
-- For removing an orphaned PDF if metadata insert fails.
drop policy if exists "Own temporary PDF delete" on storage.objects;
create policy "Own temporary PDF delete" on storage.objects for delete to authenticated
using (bucket_id='temporary-reports' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- IMPORTANT: Physical deletion requires a scheduled Edge Function (see supabase/functions/cleanup-temporary-reports).
