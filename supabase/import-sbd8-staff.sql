-- iSYS staff directory from supplied SBD Praha 8 contact list.
-- Matches ONLY existing auth.users accounts by exact e-mail. Does not create accounts.
-- The shared mailbox info@sbd8.cz is deliberately excluded from automatic profile naming.
begin;
create temporary table isys_staff_import(name text,email text,is_technical boolean) on commit drop;
insert into isys_staff_import(name,email,is_technical) values
 ('Švarc Miroslav','svarc@sbd8.cz',false),
 ('Šimková Markéta','simkova@sbd8.cz',false),
 ('Slovins Igor','sois@sbd8.cz',false),
 ('Zitová Iveta','zitova@sbd8.cz',false),
 ('Stejčková Simona','stejckova@sbd8.cz',false),
 ('Plevková Lenka','plevkova@sbd8.cz',false),
 ('Štrejčková / Zitová','info@sbd8.cz',false),
 ('Šourková Iva Ing.','sourkova@sbd8.cz',false),
 ('Storková Petra','storkova@sbd8.cz',false),
 ('Turková Yvona Ing.','turkova@sbd8.cz',false),
 ('Doubalová Jana','doubalova@sbd8.cz',false),
 ('Horáková Jaroslava','horakova@sbd8.cz',false),
 ('Jíchová Jana','jichova@sbd8.cz',false),
 ('Heráková Michaela Ing.','herakova@sbd8.cz',false),
 ('Machutová Petra Ing.','mzdy@sbd8.cz',false),
 ('Poncerová Veronika Ing.','poncerova@sbd8.cz',false),
 ('Laubová Karolína Bc.','laubova@sbd8.cz',false),
 ('Šefová Vladimíra DiS.','sefova@sbd8.cz',false),
 ('Rousová Lenka','rousova@sbd8.cz',false),
 ('Veníčková Věra','venickova@sbd8.cz',false),
 ('Polák Jan Ing.','polak@sbd8.cz',false),
 ('Fialová Miroslava Ing.','fialova@sbd8.cz',false),
 ('Šeráková Martina','serakova@sbd8.cz',false),
 ('Červená Ivana','cervena@sbd8.cz',true),
 ('Juren Jakub Jiří','juren@sbd8.cz',true),
 ('Němec Libor','nemec@sbd8.cz',true),
 ('Křeček Ladislav Bc.','krecek@sbd8.cz',true),
 ('Pončarová Monika','poncarova@sbd8.cz',true),
 ('Fofín David','fofin@sbd8.cz',true),
 ('Vaněk Jaroslav','vanek@sbd8.cz',true),
 ('Hromádka Vladimír','hromadka@sbd8.cz',true),
 ('Švarcová Veronika','svarcova@sbd8.cz',true),
 ('Toman Pavel Ing.','toman@sbd8.cz',true),
 ('Jan Dopita','jan@dopita.org',false);
-- Update display names only for verified, uniquely matched user emails.
update public.profiles p set display_name=s.name
from auth.users u join isys_staff_import s on lower(u.email)=lower(s.email)
where p.id=u.id and s.email<>'info@sbd8.cz'
 and (select count(*) from auth.users a where lower(a.email)=lower(s.email))=1;
-- Fill building links from either full name, reversed name or email, without overwriting links.
with directory as (
 select u.id,s.name,s.email,
 lower(btrim(s.name)) as full_name,
 lower(btrim(regexp_replace(s.name,' (Ing\\.|Bc\\.|DiS\\.)$','','g'))) as plain_name
 from auth.users u join isys_staff_import s on lower(u.email)=lower(s.email)
 where s.email<>'info@sbd8.cz'
), candidate as (
 select b.id,
 (select d.id from directory d where lower(btrim(coalesce(b.manager,''))) in (d.full_name,d.plain_name,lower(d.email)) and
 (select count(*) from directory x where lower(btrim(coalesce(b.manager,''))) in (x.full_name,x.plain_name,lower(x.email)))=1 limit 1) as manager_id,
 (select d.id from directory d where lower(btrim(coalesce(b.referent,''))) in (d.full_name,d.plain_name,lower(d.email)) and
 (select count(*) from directory x where lower(btrim(coalesce(b.referent,''))) in (x.full_name,x.plain_name,lower(x.email)))=1 limit 1) as referent_id
 from public.buildings b
)
update public.buildings b set
 manager_user_id=coalesce(b.manager_user_id,c.manager_id),
 referent_user_id=coalesce(b.referent_user_id,c.referent_id)
from candidate c where b.id=c.id and (c.manager_id is not null or c.referent_id is not null);
update public.work_requests w set referent_user_id=b.referent_user_id
from public.buildings b where w.building_id=b.id and w.referent_user_id is null and b.referent_user_id is not null;
commit;
-- Diagnostic: accounts absent from Supabase remain unmapped, and must be created by an admin.
select u.email,p.display_name,u.id from auth.users u left join public.profiles p on p.id=u.id order by u.email;
