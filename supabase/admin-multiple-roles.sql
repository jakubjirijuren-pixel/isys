-- iSYS: migrace na více rolí a správu uživatelského profilu.
-- Spustit jednou v Supabase SQL Editoru.
begin;
create table if not exists public.user_roles (
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('admin','technician','referent')),
 primary key(user_id,role)
);
alter table public.user_roles enable row level security;
insert into public.user_roles(user_id,role)
select id,role::text from public.profiles where role::text in ('admin','technician','referent')
on conflict do nothing;
alter table public.profiles add column if not exists display_name text;

create or replace function public.is_isys_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin'); $$;
revoke all on function public.is_isys_admin() from public;
grant execute on function public.is_isys_admin() to authenticated;

create or replace function public.isys_my_roles()
returns text[] language sql stable security definer set search_path = ''
as $$ select coalesce(array_agg(role order by role),array[]::text[]) from public.user_roles where user_id=(select auth.uid()); $$;
revoke all on function public.isys_my_roles() from public;
grant execute on function public.isys_my_roles() to authenticated;

drop function if exists public.isys_list_users();
create function public.isys_list_users()
returns table(id uuid,email text,role text,roles text[],display_name text,confirmed_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if not public.is_isys_admin() then raise exception 'Pouze administrátor' using errcode='42501'; end if;
 return query
 select u.id,u.email::text,coalesce(p.role::text,'technician'),
 coalesce((select array_agg(r.role order by r.role) from public.user_roles r where r.user_id=u.id),array[]::text[]),
 p.display_name,u.email_confirmed_at
 from auth.users u left join public.profiles p on p.id=u.id order by u.email;
end;$$;
revoke all on function public.isys_list_users() from public;
grant execute on function public.isys_list_users() to authenticated;

create or replace function public.isys_update_user(target_user uuid,new_roles text[],new_display_name text)
returns void language plpgsql security definer set search_path = ''
as $$
declare role_item text; normalized text[]; current_admins integer;
begin
 if not public.is_isys_admin() then raise exception 'Pouze administrátor' using errcode='42501'; end if;
 if not exists(select 1 from auth.users where id=target_user) then raise exception 'Uživatel neexistuje'; end if;
 select coalesce(array_agg(distinct r),array[]::text[]) into normalized from unnest(new_roles) r;
 if cardinality(normalized)=0 or exists(select 1 from unnest(normalized) r where r not in ('admin','technician','referent'))
 then raise exception 'Vyber alespoň jednu platnou roli'; end if;
 if target_user=(select auth.uid()) and not ('admin'=any(normalized)) then raise exception 'Nelze odebrat vlastní administrátorskou roli'; end if;
 if exists(select 1 from public.user_roles where user_id=target_user and role='admin')
    and not ('admin'=any(normalized))
    and (select count(*) from public.user_roles where role='admin')<=1
 then raise exception 'Nelze odebrat posledního administrátora'; end if;
 if length(coalesce(new_display_name,''))>120 then raise exception 'Jméno je příliš dlouhé'; end if;
 delete from public.user_roles where user_id=target_user and role<>all(normalized);
 insert into public.user_roles(user_id,role) select target_user,unnest(normalized) on conflict do nothing;
 insert into public.profiles(id,role,display_name)
 values(target_user,case when 'admin'=any(normalized) then 'admin' when 'technician'=any(normalized) then 'technician' else 'referent' end,nullif(trim(new_display_name),''))
 on conflict(id) do update set role=excluded.role,display_name=excluded.display_name;
end;$$;
revoke all on function public.isys_update_user(uuid,text[],text) from public;
grant execute on function public.isys_update_user(uuid,text[],text) to authenticated;

-- Starší API ponecháno kvůli kompatibilitě, ale sjednotí přiřazené role.
create or replace function public.isys_set_user_role(target_user uuid,new_role text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
 perform public.isys_update_user(target_user,array[new_role],coalesce((select display_name from public.profiles where id=target_user),''));
end;$$;
revoke all on function public.isys_set_user_role(uuid,text) from public;
grant execute on function public.isys_set_user_role(uuid,text) to authenticated;
commit;