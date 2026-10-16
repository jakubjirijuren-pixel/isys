-- iSYS feedback: user submissions, admin-only review and notifications.
-- Requires public.isys_my_roles() and public.notifications.
create table if not exists public.isys_feedback (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 subject text not null check(char_length(btrim(subject)) between 3 and 120),
 message text not null check(char_length(btrim(message)) between 5 and 3000),
 status text not null default 'new' check(status in ('new','in_progress','resolved')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists isys_feedback_created_idx on public.isys_feedback(created_at desc);
alter table public.isys_feedback enable row level security;
drop policy if exists isys_feedback_admin_read on public.isys_feedback;
create policy isys_feedback_admin_read on public.isys_feedback for select to authenticated using ('admin'=any(public.isys_my_roles()));
drop policy if exists isys_feedback_admin_update on public.isys_feedback;
create policy isys_feedback_admin_update on public.isys_feedback for update to authenticated using ('admin'=any(public.isys_my_roles())) with check ('admin'=any(public.isys_my_roles()));
grant select,update on public.isys_feedback to authenticated;
revoke insert,delete on public.isys_feedback from anon,authenticated;

create or replace function public.isys_submit_feedback(p_subject text,p_message text)
returns uuid language plpgsql security definer set search_path='' as $feedback_submit$
declare v_id uuid; v_author text;
begin
 if auth.uid() is null then raise exception 'Přihlášení je povinné.'; end if;
 if char_length(btrim(coalesce(p_subject,''))) not between 3 and 120 then raise exception 'Předmět musí mít 3 až 120 znaků.'; end if;
 if char_length(btrim(coalesce(p_message,''))) not between 5 and 3000 then raise exception 'Zpráva musí mít 5 až 3000 znaků.'; end if;
 insert into public.isys_feedback(author_id,subject,message)
 values(auth.uid(),btrim(p_subject),btrim(p_message)) returning id into v_id;
 select coalesce(p.display_name,u.email::text,'Uživatel') into v_author
 from auth.users u left join public.profiles p on p.id=u.id where u.id=auth.uid();
 insert into public.notifications(user_id,title,body,module)
 select u.id,'Nová zpětná vazba: '||left(btrim(p_subject),95),
 left(coalesce(v_author,'Uživatel')||': '||btrim(p_message),1900),'Zpětná vazba'
 from auth.users u where 'admin'=any(public.isys_roles_for_user(u.id));
 return v_id;
end $feedback_submit$;
revoke all on function public.isys_submit_feedback(text,text) from public,anon;
grant execute on function public.isys_submit_feedback(text,text) to authenticated;
notify pgrst,'reload schema';
