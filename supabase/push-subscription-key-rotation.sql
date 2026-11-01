-- Allow the signed-in owner to rotate browser keys for their existing endpoint.
-- Another user's endpoint may only be reassigned when both keys match.
create or replace function public.isys_register_push_subscription(p_endpoint text,p_p256dh text,p_auth text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
 if v_user is null then raise exception 'Přihlášení je vyžadováno.' using errcode='28000'; end if;
 if p_endpoint is null or left(p_endpoint,8)<>'https://' or length(p_endpoint)>4096
    or nullif(p_p256dh,'') is null or nullif(p_auth,'') is null
    or length(p_p256dh)>1024 or length(p_auth)>1024 then
   raise exception 'Neplatná registrace push oznámení.' using errcode='22023';
 end if;
 insert into public.push_subscriptions(user_id,endpoint,p256dh,auth,updated_at)
 values(v_user,p_endpoint,p_p256dh,p_auth,now())
 on conflict(endpoint) do update
 set user_id=v_user,p256dh=excluded.p256dh,auth=excluded.auth,updated_at=now()
 where public.push_subscriptions.user_id=v_user
    or (public.push_subscriptions.p256dh=excluded.p256dh
        and public.push_subscriptions.auth=excluded.auth);
 if not found then
   raise exception 'Registrace zařízení se změnila. Je potřeba vytvořit novou push registraci.' using errcode='P0001';
 end if;
end;
$$;
revoke all on function public.isys_register_push_subscription(text,text,text) from public,anon;
grant execute on function public.isys_register_push_subscription(text,text,text) to authenticated;
