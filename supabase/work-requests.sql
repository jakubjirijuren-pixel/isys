-- iSYS – požadavky referentů a kontrola provedené práce
create table if not exists public.work_requests (
 id uuid primary key default gen_random_uuid(),
 building_id uuid references public.buildings(id) on delete set null,
 title text not null,
 description text not null default '',
 priority text not null default 'běžná' check (priority in ('nízká','běžná','vysoká','urgentní')),
 technician text not null default '',
 referent text not null default '',
 status text not null default 'nový' check (status in ('nový','přidělený','v řešení','čeká na kontrolu','vráceno k dopracování','uzavřený')),
 resolution text not null default '',
 review_note text not null default '',
 due_date date,
 created_by uuid not null references auth.users(id),
 updated_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 finished_at timestamptz,
 reviewed_at timestamptz
);
create table if not exists public.work_request_events (
 id bigint generated always as identity primary key,
 request_id uuid not null references public.work_requests(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 status text not null,
 note text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists work_requests_building_idx on public.work_requests(building_id);
create index if not exists work_requests_status_idx on public.work_requests(status);
create index if not exists work_request_events_request_idx on public.work_request_events(request_id,created_at);
alter table public.work_requests enable row level security;
alter table public.work_request_events enable row level security;
drop policy if exists "Authenticated staff can read work requests" on public.work_requests;
create policy "Authenticated staff can read work requests" on public.work_requests for select to authenticated using (true);
drop policy if exists "Authenticated staff can create work requests" on public.work_requests;
create policy "Authenticated staff can create work requests" on public.work_requests for insert to authenticated with check (created_by=(select auth.uid()));
drop policy if exists "Authenticated staff can update work requests" on public.work_requests;
create policy "Authenticated staff can update work requests" on public.work_requests for update to authenticated using (true) with check (updated_by=(select auth.uid()));
drop policy if exists "Authenticated staff can read request history" on public.work_request_events;
create policy "Authenticated staff can read request history" on public.work_request_events for select to authenticated using (true);
drop policy if exists "Authenticated staff can add request history" on public.work_request_events;
create policy "Authenticated staff can add request history" on public.work_request_events for insert to authenticated with check (actor_id=(select auth.uid()));
-- First iteration: all authenticated iSYS users can read/update tasks.
-- For production, restrict writes by roles and assignment using authenticated profile user IDs.
