-- iSYS: oprava chyby profiles_role_check při ukládání více rolí.
-- Spusť v Supabase SQL Editoru po migraci admin-multiple-roles.sql.
-- Původní profiles.role se nemění; skutečné přiřazení rolí je v user_roles.
create or replace function public.isys_update_user(target_user uuid,new_roles text[],new_display_name text)
returns void language plpgsql security definer set search_path = ''
as $$
declare normalized text[];
begin
 if not public.is_isys_admin() then
  raise exception 'Pouze administrátor' using errcode='42501';
 end if;
 if not exists(select 1 from auth.users where id=target_user) then
  raise exception 'Uživatel neexistuje';
 end if;
 select coalesce(array_agg(distinct r),array[]::text[]) into normalized
 from unnest(new_roles) r;
 if cardinality(normalized)=0 or exists(
  select 1 from unnest(normalized) r where r not in ('admin','technician','referent')
 ) then raise exception 'Vyber alespoň jednu platnou roli'; end if;
 if target_user=(select auth.uid()) and not ('admin'=any(normalized)) then
  raise exception 'Nelze odebrat vlastní administrátorskou roli';
 end if;
 if exists(select 1 from public.user_roles where user_id=target_user and role='admin')
  and not ('admin'=any(normalized))
  and (select count(*) from public.user_roles where role='admin')<=1 then
  raise exception 'Nelze odebrat posledního administrátora';
 end if;
 if length(coalesce(new_display_name,''))>120 then
  raise exception 'Jméno je příliš dlouhé';
 end if;

 delete from public.user_roles where user_id=target_user and role<>all(normalized);
 insert into public.user_roles(user_id,role)
 select target_user,unnest(normalized) on conflict do nothing;

 -- Nezapisovat do profiles.role: starší instalace mají jiné CHECK omezení.
 -- Profil musí existovat; při chybě transakce se změny rolí vrátí zpět.
 update public.profiles
 set display_name=nullif(trim(new_display_name),'')
 where id=target_user;
 if not found then
  raise exception 'Profil uživatele neexistuje. Nejdříve vytvoř profil v public.profiles.';
 end if;
end;
$$;
revoke all on function public.isys_update_user(uuid,text[],text) from public;
grant execute on function public.isys_update_user(uuid,text[],text) to authenticated;
