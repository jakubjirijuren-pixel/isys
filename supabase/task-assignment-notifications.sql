-- Link task assignments to user notifications.
-- Requires public.notifications, public.work_requests, public.profiles and public.user_roles.
-- Names used for technician assignments must match a unique user profile name.
create or replace function public.isys_notify_work_request_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
 recipient uuid;
 match_count integer;
 assignee text;
 notification_title text;
begin
 if tg_op = 'UPDATE' and new.technician is not distinct from old.technician then return new; end if;
 assignee := nullif(btrim(new.technician),'');
 if assignee is null then return new; end if;
 -- Never guess the recipient when two accounts share a display name.
 select count(distinct p.id), min(p.id)
 into match_count,recipient
 from public.profiles p
 where lower(btrim(coalesce(to_jsonb(p)->>'display_name','')))=lower(assignee)
    or lower(btrim(coalesce(to_jsonb(p)->>'full_name','')))=lower(assignee)
    or lower(btrim(coalesce(to_jsonb(p)->>'name','')))=lower(assignee);
 if match_count <> 1 or recipient is null then return new; end if;
 notification_title := case when tg_op='INSERT' then 'Byl vám přidělen úkol' else 'Byl vám předán úkol' end;
 insert into public.notifications(user_id,title,body,module)
 values(recipient,notification_title,left(coalesce(new.title,'Úkol')||case when new.due_date is not null then ' · Termín: '||to_char(new.due_date,'DD.MM.YYYY') else '' end,2000),'Úkoly');
 return new;
end;$$;
drop trigger if exists isys_notify_work_request_assignment_trigger on public.work_requests;
create trigger isys_notify_work_request_assignment_trigger
after insert or update of technician on public.work_requests
for each row execute function public.isys_notify_work_request_assignment();
