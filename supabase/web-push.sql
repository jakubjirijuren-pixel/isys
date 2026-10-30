-- iSYS Web Push: execute after notifications.sql
begin;
create table if not exists public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique,
 p256dh text not null,
 auth text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions for select to authenticated using(user_id=auth.uid());
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own" on public.push_subscriptions for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete to authenticated using(user_id=auth.uid());
grant select,insert,update,delete on public.push_subscriptions to authenticated;
revoke all on public.push_subscriptions from anon;
commit;
-- Configure a Supabase Database Webhook separately:
-- Table: public.notifications, Event: INSERT
-- Type: Supabase Edge Functions, Function: isys-web-push
-- HTTP header: x-isys-webhook-secret = same random secret as ISYS_WEBHOOK_SECRET.
-- Deploy the function with JWT verification disabled; it authenticates this secret itself.
