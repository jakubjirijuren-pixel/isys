-- FOXA: doplnění nových modulů do přepínačů dostupnosti.
-- Spustit jednou v Supabase SQL Editoru; zachovává současné stavy existujících modulů.
begin;
alter table public.isys_module_availability drop constraint if exists isys_module_availability_module_check;
alter table public.isys_module_availability add constraint isys_module_availability_module_check
 check (module in ('Přehled','Objekty','Kontroly','Technické kontroly','Evidence klíčů','Docházka','Dovolené','Tiskopisy','Kniha odchozí pošty','Úkoly','Wiki'));
insert into public.isys_module_availability(module,enabled) values
 ('Technické kontroly',true),
 ('Dovolené',true),
 ('Tiskopisy',true),
 ('Kniha odchozí pošty',true)
on conflict (module) do nothing;
commit;
