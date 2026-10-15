-- Stable account references for people assigned to buildings and work requests.
alter table public.buildings
 add column if not exists manager_user_id uuid references auth.users(id) on delete set null,
 add column if not exists referent_user_id uuid references auth.users(id) on delete set null;
create index if not exists isys_buildings_manager_user_idx on public.buildings(manager_user_id);
create index if not exists isys_buildings_referent_user_idx on public.buildings(referent_user_id);
alter table public.work_requests
 add column if not exists referent_user_id uuid references auth.users(id) on delete set null;
create index if not exists isys_work_requests_referent_user_idx on public.work_requests(referent_user_id);
-- Backfill only unambiguous exact names; keep old display text for legacy records.
with people as (
 select p.id,
 lower(btrim(coalesce(nullif(p.display_name,''),nullif(to_jsonb(p)->>'full_name',''),nullif(to_jsonb(p)->>'name',''),''))) as person_name
 from public.profiles p
), candidates as (
 select b.id,
 (select min(p.id::text)::uuid from people p where p.person_name=lower(btrim(b.manager))) as manager_id,
 (select count(*) from people p where p.person_name=lower(btrim(b.manager))) as manager_count,
 (select min(p.id::text)::uuid from people p where p.person_name=lower(btrim(b.referent))) as referent_id,
 (select count(*) from people p where p.person_name=lower(btrim(b.referent))) as referent_count
 from public.buildings b
)
update public.buildings b set
 manager_user_id=case when c.manager_count=1 then c.manager_id else b.manager_user_id end,
 referent_user_id=case when c.referent_count=1 then c.referent_id else b.referent_user_id end
from candidates c where b.id=c.id;
update public.work_requests w set referent_user_id=b.referent_user_id
from public.buildings b where w.building_id=b.id and w.referent_user_id is null;
notify pgrst,'reload schema';
