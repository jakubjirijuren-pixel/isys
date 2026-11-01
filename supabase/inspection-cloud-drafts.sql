create table if not exists public.isys_inspection_drafts(
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('referent','technician')),
 content jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 primary key(user_id,kind)
);
alter table public.isys_inspection_drafts enable row level security;
drop policy if exists inspection_drafts_select_own on public.isys_inspection_drafts;
create policy inspection_drafts_select_own on public.isys_inspection_drafts for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists inspection_drafts_insert_own on public.isys_inspection_drafts;
create policy inspection_drafts_insert_own on public.isys_inspection_drafts for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists inspection_drafts_update_own on public.isys_inspection_drafts;
create policy inspection_drafts_update_own on public.isys_inspection_drafts for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists inspection_drafts_delete_own on public.isys_inspection_drafts;
create policy inspection_drafts_delete_own on public.isys_inspection_drafts for delete to authenticated using(user_id=(select auth.uid()));
grant select,insert,update,delete on public.isys_inspection_drafts to authenticated;
