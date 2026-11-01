create or replace function public.isys_task_assignees()
returns table(id uuid, display_name text)
language sql stable security definer set search_path = ''
as $$
 select u.id,
 coalesce(nullif(btrim(p.display_name),''),
 nullif(btrim(u.raw_user_meta_data->>'full_name'),''),
 nullif(btrim(split_part(u.email,'@',1)),''),
 'Uživatel')::text
 from auth.users u
 left join public.profiles p on p.id=u.id
 where u.email_confirmed_at is not null
 order by 2,1;
$$;
revoke all on function public.isys_task_assignees() from public,anon;
grant execute on function public.isys_task_assignees() to authenticated;
notify pgrst,'reload schema';
