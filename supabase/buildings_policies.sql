-- iSYS: building permissions. Run in Supabase SQL Editor.
-- First promote your own existing account to admin, replacing the email.
-- UPDATE public.profiles SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com');
-- Verify exactly one profile was updated before enabling write access.

create or replace function public.is_isys_admin()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function public.is_isys_admin() from public;
grant execute on function public.is_isys_admin() to authenticated;

drop policy if exists "Authenticated users read buildings" on public.buildings;
create policy "Authenticated users read buildings"
on public.buildings for select to authenticated
using (true);

drop policy if exists "Admins insert buildings" on public.buildings;
create policy "Admins insert buildings"
on public.buildings for insert to authenticated
with check (public.is_isys_admin());

drop policy if exists "Admins update buildings" on public.buildings;
create policy "Admins update buildings"
on public.buildings for update to authenticated
using (public.is_isys_admin())
with check (public.is_isys_admin());
