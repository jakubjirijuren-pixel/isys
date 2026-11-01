-- Personal Web Push preferences; in-app notification history remains available.
create table if not exists public.notification_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 key_loans boolean not null default true,
 tasks boolean not null default true,
 inspections boolean not null default true,
 defects boolean not null default true,
 admin_messages boolean not null default true,
 other boolean not null default true,
 updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
drop policy if exists "notification_preferences_select" on public.notification_preferences;
create policy "notification_preferences_select" on public.notification_preferences for select to authenticated using (user_id=auth.uid());
drop policy if exists "notification_preferences_insert" on public.notification_preferences;
create policy "notification_preferences_insert" on public.notification_preferences for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "notification_preferences_update" on public.notification_preferences;
create policy "notification_preferences_update" on public.notification_preferences for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
grant select,insert,update on public.notification_preferences to authenticated;
