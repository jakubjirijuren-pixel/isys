-- iSYS: Feedback and private photo attachments. Safe to run repeatedly.
-- Requires public.user_roles, public.isys_my_roles(), public.notifications.
create table if not exists public.isys_feedback (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 subject text not null check (char_length(btrim(subject)) between 3 and 120),
 message text not null check (char_length(btrim(message)) between 5 and 3000),
 attachment_path text,
 status text not null default 'new' check (status in ('new','in_progress','resolved')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.isys_feedback add column if not exists attachment_path text;
create index if not exists isys_feedback_created_idx on public.isys_feedback(created_at desc);
alter table public.isys_feedback enable row level security;
drop policy if exists isys_feedback_admin_read on public.isys_feedback;
create policy isys_feedback_admin_read on public.isys_feedback
 for select to authenticated using (public.is_isys_admin());
drop policy if exists isys_feedback_admin_update on public.isys_feedback;
create policy isys_feedback_admin_update on public.isys_feedback
 for update to authenticated using (public.is_isys_admin()) with check (public.is_isys_admin());
grant select,update on public.isys_feedback to authenticated;
revoke insert,delete on public.isys_feedback from anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('isys-feedback','isys-feedback',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists isys_feedback_image_upload on storage.objects;
create policy isys_feedback_image_upload on storage.objects
 for insert to authenticated
 with check (
  bucket_id='isys-feedback'
  and (storage.foldername(name))[1]=auth.uid()::text
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
 );
drop policy if exists isys_feedback_image_read on storage.objects;
create policy isys_feedback_image_read on storage.objects
 for select to authenticated
 using (
  bucket_id='isys-feedback'
  and (public.is_isys_admin() or (storage.foldername(name))[1]=auth.uid()::text)
 );
drop policy if exists isys_feedback_image_delete on storage.objects;
create policy isys_feedback_image_delete on storage.objects
 for delete to authenticated
 using (
  bucket_id='isys-feedback'
  and (storage.foldername(name))[1]=auth.uid()::text
  and not exists(select 1 from public.isys_feedback f where f.attachment_path=name)
 );

-- Drop obsolete two-argument overload to avoid ambiguous PostgREST RPC calls.
drop function if exists public.isys_submit_feedback(text,text);
create or replace function public.isys_submit_feedback(
 p_subject text,p_message text,p_attachment_path text default null
) returns uuid language plpgsql security definer set search_path=''
as $feedback_submit$
declare v_id uuid; v_author text;
begin
 if auth.uid() is null then raise exception 'Přihlášení je povinné.'; end if;
 if char_length(btrim(coalesce(p_subject,''))) not between 3 and 120 then
  raise exception 'Předmět musí mít 3 až 120 znaků.';
 end if;
 if char_length(btrim(coalesce(p_message,''))) not between 5 and 3000 then
  raise exception 'Zpráva musí mít 5 až 3000 znaků.';
 end if;
 if p_attachment_path is not null and (
  p_attachment_path !~ ('^'||auth.uid()::text||'/[a-f0-9-]{36}\\.(jpg|jpeg|png|webp)$')
  or not exists (
   select 1 from storage.objects
   where bucket_id='isys-feedback' and name=p_attachment_path
    and owner_id=auth.uid()::text
  )
 ) then raise exception 'Neplatná nebo nenahraná fotografie.'; end if;
 insert into public.isys_feedback(author_id,subject,message,attachment_path)
 values(auth.uid(),btrim(p_subject),btrim(p_message),p_attachment_path)
 returning id into v_id;
 select coalesce(p.display_name,u.email::text,'Uživatel') into v_author
 from auth.users u left join public.profiles p on p.id=u.id
 where u.id=auth.uid();
 insert into public.notifications(user_id,title,body,module)
 select distinct u.id,'Nová zpětná vazba: '||left(btrim(p_subject),95),
  left(coalesce(v_author,'Uživatel')||': '||btrim(p_message),1900),'Zpětná vazba'
 from public.user_roles r join auth.users u on u.id=r.user_id
 where r.role='admin';
 return v_id;
end
$feedback_submit$;
revoke all on function public.isys_submit_feedback(text,text,text) from public,anon;
grant execute on function public.isys_submit_feedback(text,text,text) to authenticated;
notify pgrst,'reload schema';
