-- iSYS: bezpečná správa uživatelských rolí. Spustit v Supabase SQL Editoru.
-- Funkce jsou SECURITY DEFINER, ale každá ověřuje admin roli volajícího.
create or replace function public.is_isys_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;
revoke all on function public.is_isys_admin() from public;
grant execute on function public.is_isys_admin() to authenticated;

create or replace function public.isys_list_users()
returns table(id uuid, email text, role text)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if not public.is_isys_admin() then raise exception 'Přístup pouze pro administrátora' using errcode = '42501'; end if;
 return query
 select u.id, u.email::text, coalesce(p.role::text,'technician')
 from auth.users u left join public.profiles p on p.id=u.id
 order by u.email;
end;
$$;
revoke all on function public.isys_list_users() from public;
grant execute on function public.isys_list_users() to authenticated;

create or replace function public.isys_set_user_role(target_user uuid, new_role text)
returns void language plpgsql security definer set search_path = ''
as $$
declare current_role text;
begin
 if not public.is_isys_admin() then raise exception 'Přístup pouze pro administrátora' using errcode = '42501'; end if;
 if new_role not in ('admin','technician','referent') then raise exception 'Neplatná role'; end if;
 if target_user = (select auth.uid()) then raise exception 'Vlastní roli nelze změnit v tomto modulu'; end if;
 if not exists(select 1 from auth.users where id=target_user) then raise exception 'Uživatel neexistuje'; end if;
 select role::text into current_role from public.profiles where id=target_user;
 if current_role='admin' and new_role<>'admin' and
    (select count(*) from public.profiles where role='admin') <= 1
 then raise exception 'Nelze odebrat posledního administrátora'; end if;
 insert into public.profiles(id,role) values(target_user,new_role)
 on conflict(id) do update set role=excluded.role;
end;
$$;
revoke all on function public.isys_set_user_role(uuid,text) from public;
grant execute on function public.isys_set_user_role(uuid,text) to authenticated;
