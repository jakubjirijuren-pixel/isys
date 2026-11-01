-- Run once in Supabase SQL Editor. Only administrators may send notifications.
create or replace function public.isys_admin_send_notification(
  target_user uuid, notification_title text, notification_body text
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare notification_id uuid;
begin
  if auth.uid() is null or not ('admin' = any(public.isys_my_roles())) then
    raise exception 'Pouze administrátor může odesílat oznámení.';
  end if;
  if target_user is null or not exists(select 1 from auth.users where id=target_user) then
    raise exception 'Uživatel neexistuje.';
  end if;
  if length(btrim(coalesce(notification_title,''))) < 1 or length(notification_title) > 120 then
    raise exception 'Předmět musí obsahovat 1 až 120 znaků.';
  end if;
  if length(btrim(coalesce(notification_body,''))) < 1 or length(notification_body) > 2000 then
    raise exception 'Text musí obsahovat 1 až 2000 znaků.';
  end if;
  insert into public.notifications(user_id,title,body,module)
  values(target_user,btrim(notification_title),btrim(notification_body),'Přehled')
  returning id into notification_id;
  return notification_id;
end;
$$;
revoke all on function public.isys_admin_send_notification(uuid,text,text) from public, anon;
grant execute on function public.isys_admin_send_notification(uuid,text,text) to authenticated;
