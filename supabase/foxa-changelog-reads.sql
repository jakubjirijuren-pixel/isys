create table if not exists public.foxa_changelog_reads (
 user_id uuid not null references auth.users(id) on delete cascade,
 release_id text not null,
 read_at timestamptz not null default now(),
 primary key(user_id,release_id)
);
alter table public.foxa_changelog_reads enable row level security;
drop policy if exists foxa_changelog_reads_select on public.foxa_changelog_reads;
create policy foxa_changelog_reads_select on public.foxa_changelog_reads for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists foxa_changelog_reads_insert on public.foxa_changelog_reads;
create policy foxa_changelog_reads_insert on public.foxa_changelog_reads for insert to authenticated with check(user_id=(select auth.uid()));
grant select,insert on public.foxa_changelog_reads to authenticated;
