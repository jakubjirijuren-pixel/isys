create table if not exists public.key_loan_partial_returns(
 id uuid primary key default gen_random_uuid(),
 loan_id uuid not null references public.key_loans(id) on delete cascade,
 returned_description text not null check(length(btrim(returned_description)) between 1 and 2000),
 remaining_description text not null check(length(btrim(remaining_description)) between 1 and 2000),
 returned_at timestamptz not null,
 recorded_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists key_loan_partial_returns_loan_idx on public.key_loan_partial_returns(loan_id,returned_at);
alter table public.key_loan_partial_returns enable row level security;
drop policy if exists key_loan_partial_returns_read on public.key_loan_partial_returns;
create policy key_loan_partial_returns_read on public.key_loan_partial_returns for select to authenticated using(true);
create or replace function public.isys_key_loan_partial_return(p_loan_id uuid,p_returned text,p_remaining text,p_returned_at timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare v_loan public.key_loans%rowtype;
begin
 if auth.uid() is null then raise exception 'Přihlášení je vyžadováno.'; end if;
 if length(btrim(coalesce(p_returned,''))) not between 1 and 2000
 or length(btrim(coalesce(p_remaining,''))) not between 1 and 2000
 or btrim(p_returned)=btrim(p_remaining) then
  raise exception 'Uveďte zvlášť vrácené a dosud zapůjčené klíče.';
 end if;
 select * into v_loan from public.key_loans where id=p_loan_id for update;
 if not found then raise exception 'Výpůjčka neexistuje.'; end if;
 if v_loan.returned_at is not null then raise exception 'Výpůjčka již byla vrácena.'; end if;
 if p_returned_at is null or p_returned_at<v_loan.loaned_at or p_returned_at>now()+interval '5 minutes' then
  raise exception 'Neplatný datum a čas vrácení.';
 end if;
 if btrim(p_remaining)=btrim(coalesce(v_loan.key_description,'')) then
  raise exception 'Seznam zbývajících klíčů se nezměnil.';
 end if;
 update public.key_loans set key_description=btrim(p_remaining) where id=p_loan_id;
 insert into public.key_loan_partial_returns(loan_id,returned_description,remaining_description,returned_at,recorded_by)
 values(p_loan_id,btrim(p_returned),btrim(p_remaining),p_returned_at,auth.uid());
end;
$$;
revoke all on function public.isys_key_loan_partial_return(uuid,text,text,timestamptz) from public,anon;
grant execute on function public.isys_key_loan_partial_return(uuid,text,text,timestamptz) to authenticated;
