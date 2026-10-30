-- Multiple referents per building, linked to authenticated users.
create table if not exists public.building_referents (
 building_id uuid not null references public.buildings(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(building_id,user_id)
);
create index if not exists building_referents_user_idx on public.building_referents(user_id);
alter table public.building_referents enable row level security;
drop policy if exists building_referents_read on public.building_referents;
create policy building_referents_read on public.building_referents for select to authenticated using(true);
drop policy if exists building_referents_admin_insert on public.building_referents;
create policy building_referents_admin_insert on public.building_referents for insert to authenticated with check(public.is_isys_admin());
drop policy if exists building_referents_admin_delete on public.building_referents;
create policy building_referents_admin_delete on public.building_referents for delete to authenticated using(public.is_isys_admin());
grant select,insert,delete on public.building_referents to authenticated;
insert into public.building_referents(building_id,user_id)
select id,referent_user_id from public.buildings where referent_user_id is not null
on conflict do nothing;
notify pgrst,'reload schema';
