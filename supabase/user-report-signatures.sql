-- Run once in Supabase SQL Editor for iSYS report signatures.
create table if not exists public.user_report_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  signature_name text not null default '',
  signature_path text,
  updated_at timestamptz not null default now(),
  constraint signature_name_length check (char_length(signature_name) <= 120)
);
alter table public.user_report_settings enable row level security;
drop policy if exists "Users read own report settings" on public.user_report_settings;
create policy "Users read own report settings" on public.user_report_settings for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own report settings" on public.user_report_settings;
create policy "Users insert own report settings" on public.user_report_settings for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own report settings" on public.user_report_settings;
create policy "Users update own report settings" on public.user_report_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('report-signatures','report-signatures',false,2097152,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=false,file_size_limit=2097152,allowed_mime_types=array['image/png','image/jpeg','image/webp'];

-- File path: <auth.uid()>/signature.png (or .jpg/.webp)
drop policy if exists "Users read own signature" on storage.objects;
create policy "Users read own signature" on storage.objects for select to authenticated
using (bucket_id='report-signatures' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users upload own signature" on storage.objects;
create policy "Users upload own signature" on storage.objects for insert to authenticated
with check (bucket_id='report-signatures' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users replace own signature" on storage.objects;
create policy "Users replace own signature" on storage.objects for update to authenticated
using (bucket_id='report-signatures' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id='report-signatures' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users delete own signature" on storage.objects;
create policy "Users delete own signature" on storage.objects for delete to authenticated
using (bucket_id='report-signatures' and (storage.foldername(name))[1] = (select auth.uid())::text);
