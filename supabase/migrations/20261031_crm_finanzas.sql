-- Ingresos facturados por mes (reporte "Total de base imponible por prefijo": FEL = facturas, NC = notas crédito).
-- Solo acceso total los ve y los actualiza.
create table public.finanzas_mes (
  anio int not null check (anio between 2015 and 2100),
  mes int not null check (mes between 1 and 12),
  facturado numeric(16,2) not null default 0,     -- FEL
  notas_credito numeric(16,2) not null default 0, -- NC (positivo; se resta)
  neto numeric(16,2) generated always as (facturado - notas_credito) stored,
  actualizado timestamptz not null default now(),
  primary key (anio, mes)
);
alter table public.finanzas_mes enable row level security;
create policy gerente on public.finanzas_mes for all to authenticated using (public.es_gerente()) with check (public.es_gerente());
revoke all on public.finanzas_mes from anon;

insert into public.finanzas_mes (anio, mes, facturado, notas_credito)
select a, m, f, n from (values
  (2026, array[93931571,136076855,117319074,86665700,83296626,130735364,95813361,95024263,126961264,97832397]::numeric[],
         array[4400794,55265031,19573542,969073,5992750,2519868,1932775,13546568,4658718,5674261]::numeric[]),
  (2025, array[89979920.20,70067960.13,77940711,76186915,110045730,122651982,92550906,92863372,110905382,79124245,102644000,86784438]::numeric[],
         array[3245105,659831,1742721,4445092,14409271,3990139,9951947,2916122,19676428,1569032,8265155,2996985]::numeric[]),
  (2024, array[63443395.96,54775630.69,47593842.37,75802823.93,82037009.08,106780586.72,122391007.45,82541809.04,70533719.65,73209932.11,64633144.76,74308840.16]::numeric[],
         array[3239231,3977951,2833372,4634405,14897845,37528851,12590116,11895788,3945178,4633869,3450046,583232]::numeric[]),
  (2022, array[44908641.80,66313276.71,34672672.70,35588326.58,48857053.04,38024184.32,85943043.78,40838164.75,44191516,60675970.73,40694210.24,50351481.57]::numeric[],
         array[898201,11225554,3277585,513749,8756794,617464,1142214,3368314,2974433,12452213,2176290,3759746]::numeric[]),
  (2021, array[50782318,22914972,48809174,28478713,32222786,36680156,37483296,40234617,39497622,36400792,37203256,32452535.79]::numeric[],
         array[1643170,1836241,2297263,807945,451614,764737,1092184,1472470,1521823,837656,979960,788447]::numeric[])
) v(a, fs, ns), lateral generate_subscripts(fs, 1) m, lateral (select fs[m] f, ns[m] n) x;
