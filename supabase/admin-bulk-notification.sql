-- iSYS: hromadná oznámení pouze pro administrátory.
-- Každému vybranému účtu vznikne vlastní záznam v notifications.
create or replace function public.isys_admin_send_bulk_notification(
 target_users uuid[], notification_title text, notification_body text
) returns integer
language plpgsql security definer set search_path = ''
as $$
declare recipient_count integer;
begin
 if auth.uid() is null or not ('admin' = any(public.isys_my_roles())) then
  raise exception 'Pouze administrátor může odesílat oznámení.';
 end if;
 if coalesce(array_length(target_users,1),0)=0 then
  raise exception 'Vyber alespoň jednoho příjemce.';
 end if;
 if length(btrim(coalesce(notification_title,''))) not between 1 and 120 then
  raise exception 'Předmět musí obsahovat 1 až 120 znaků.';
 end if;
 if length(btrim(coalesce(notification_body,''))) not between 1 and 2000 then
  raise exception 'Text musí obsahovat 1 až 2000 znaků.';
 end if;
 if exists(select 1 from unnest(target_users) t(id)
   where t.id is null or not exists(select 1 from auth.users u where u.id=t.id)) then
  raise exception 'Seznam obsahuje neexistujícího uživatele.';
 end if;
 insert into public.notifications(user_id,title,body,module)
 select distinct t.id,btrim(notification_title),btrim(notification_body),'Přehled'
 from unnest(target_users) t(id);
 get diagnostics recipient_count=row_count;
 return recipient_count;
end;
$$;
revoke all on function public.isys_admin_send_bulk_notification(uuid[],text,text) from public,anon;
grant execute on function public.isys_admin_send_bulk_notification(uuid[],text,text) to authenticated;
notify pgrst,'reload schema';
