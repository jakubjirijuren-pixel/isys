-- Global iSYS module maintenance switches. Run in Supabase SQL Editor.
create table if not exists public.isys_module_availability (
 module text primary key check (module in ('Přehled','Objekty','Kontroly','Evidence klíčů','Úkoly','Wiki')),
 enabled boolean not null default true,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
insert into public.isys_module_availability(module,enabled)
values ('Přehled',true),('Objekty',true),('Kontroly',true),('Evidence klíčů',true),('Úkoly',true),('Wiki',true)
on conflict (module) do nothing;
alter table public.isys_module_availability enable row level security;
revoke all on public.isys_module_availability from anon,authenticated;
grant select on public.isys_module_availability to authenticated;
drop policy if exists isys_module_availability_read on public.isys_module_availability;
create policy isys_module_availability_read on public.isys_module_availability for select to authenticated using (true);
create or replace function public.isys_set_module_availability(target_module text, is_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_isys_admin() then
  raise exception 'Pouze administrátor může měnit dostupnost modulů' using errcode='42501';
 end if;
 if target_module is null or is_enabled is null then raise exception 'Chybí modul nebo stav'; end if;
 update public.isys_module_availability
 set enabled=is_enabled,updated_at=now(),updated_by=auth.uid()
 where module=target_module;
 if not found then raise exception 'Neznámý modul'; end if;
end;$$;
revoke all on function public.isys_set_module_availability(text,boolean) from public,anon;
grant execute on function public.isys_set_module_availability(text,boolean) to authenticated;
notify pgrst, 'reload schema';
