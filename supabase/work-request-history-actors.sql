-- iSYS: identify the person who made each change in request history.
alter table public.work_request_events add column if not exists actor_email text;
-- Prevent clients from writing a false actor identity. The actor UUID is still
-- protected by the existing RLS policy; email is stamped from the JWT.
create or replace function public.stamp_work_request_actor_email()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
 new.actor_email := (select email from auth.users where id = auth.uid());
 return new;
end;
$$;
drop trigger if exists stamp_work_request_actor_email on public.work_request_events;
create trigger stamp_work_request_actor_email
before insert on public.work_request_events
for each row execute function public.stamp_work_request_actor_email();
-- Older history rows may not contain an email. Their actor_id remains available.
