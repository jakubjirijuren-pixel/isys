-- FOXA: administrators' feedback ticketing.
alter table public.isys_feedback add column if not exists priority text not null default 'normal' check(priority in ('low','normal','high','urgent'));
alter table public.isys_feedback add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.isys_feedback add column if not exists due_at date;
create table if not exists public.isys_feedback_comments(
 id uuid primary key default gen_random_uuid(),
 feedback_id uuid not null references public.isys_feedback(id) on delete cascade,
 author_id uuid not null references auth.users(id),
 body text not null check(char_length(btrim(body)) between 1 and 3000),
 created_at timestamptz not null default now()
);
create index if not exists isys_feedback_comments_ticket_idx on public.isys_feedback_comments(feedback_id,created_at);
alter table public.isys_feedback_comments enable row level security;
drop policy if exists isys_feedback_comments_admin_read on public.isys_feedback_comments;
create policy isys_feedback_comments_admin_read on public.isys_feedback_comments for select to authenticated using(public.is_isys_admin());
drop policy if exists isys_feedback_comments_admin_insert on public.isys_feedback_comments;
create policy isys_feedback_comments_admin_insert on public.isys_feedback_comments for insert to authenticated with check(public.is_isys_admin() and author_id=(select auth.uid()));
create or replace function public.isys_feedback_ticket_activity()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then new.updated_at=now(); end if;
 return new;
end;
$$;
drop trigger if exists isys_feedback_ticket_touch on public.isys_feedback;
create trigger isys_feedback_ticket_touch before update on public.isys_feedback for each row execute function public.isys_feedback_ticket_activity();
