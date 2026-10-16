-- Allow signed-in users to delete only their own notifications.
create or replace function public.isys_delete_my_notifications()
returns integer language plpgsql security definer set search_path = ''
as $$
declare deleted_count integer;
begin
 if auth.uid() is null then
  raise exception 'Přihlášení je vyžadováno.';
 end if;
 delete from public.notifications where user_id = auth.uid();
 get diagnostics deleted_count = row_count;
 return deleted_count;
end;
$$;
revoke all on function public.isys_delete_my_notifications() from public, anon;
grant execute on function public.isys_delete_my_notifications() to authenticated;
notify pgrst, 'reload schema';
