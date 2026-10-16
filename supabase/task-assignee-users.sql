-- Assign work requests to stable user IDs instead of names.
alter table public.work_requests add column if not exists assigned_user_id uuid references auth.users(id) on delete set null;
create index if not exists work_requests_assigned_user_idx on public.work_requests(assigned_user_id);
-- Resolve existing assignments only when exactly one profile matches.
with matches as (
 select w.id, (array_agg(distinct p.id))[1] as recipient, count(distinct p.id) as total
 from public.work_requests w join public.profiles p
 on lower(btrim(coalesce(to_jsonb(p)->>'display_name','')))=lower(btrim(w.technician))
 or lower(btrim(coalesce(to_jsonb(p)->>'full_name','')))=lower(btrim(w.technician))
 or lower(btrim(coalesce(to_jsonb(p)->>'name','')))=lower(btrim(w.technician))
 where nullif(btrim(w.technician),'') is not null
 group by w.id
)
update public.work_requests w set assigned_user_id=m.recipient from matches m
where w.id=m.id and m.total=1 and w.assigned_user_id is null;
create or replace function public.isys_notify_work_request_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.assigned_user_id is null then return new; end if;
 if tg_op='UPDATE' and new.assigned_user_id is not distinct from old.assigned_user_id then return new; end if;
 insert into public.notifications(user_id,title,body,module)
 values(new.assigned_user_id,case when tg_op='INSERT' then 'Byl vám přidělen úkol' else 'Byl vám předán úkol' end,
 left(coalesce(new.title,'Úkol')||case when new.due_date is not null then ' · Termín: '||to_char(new.due_date,'DD.MM.YYYY') else '' end,2000),'Úkoly');
 return new;
end;$$;
drop trigger if exists isys_notify_work_request_assignment_trigger on public.work_requests;
create trigger isys_notify_work_request_assignment_trigger
after insert or update of assigned_user_id on public.work_requests
for each row execute function public.isys_notify_work_request_assignment();
notify pgrst,'reload schema';
