-- Datos de tools/precios-autos.mjs. Correr en Supabase y copiar los resultados (revisar que cada aseguradora tenga 30 o más cotizaciones).
with c as (
  select id, creado, (respuesta#>>'{data,insurable_objects,0,vehicle,vehicle_risk,commercial_price}') val
  from auto_cotizacion
  where estado = 'aceptada' and not (datos ? 'renovacion') and not (datos ? 'valor')
    and respuesta#>>'{data,insurable_objects,0,vehicle,type}' is not null and respuesta#>>'{data,insurable_objects,0,vehicle,type}' !~* 'moto'),
o as (
  select distinct on (c.id, lower(a.data->>'aseguradora'), a.data->>'plan') c.id, c.creado, c.val, lower(a.data->>'aseguradora') a, a.data->>'nivel' n, (a.data->>'precio')::numeric p
  from c join auto_oferta a on a.cotizacion_id = c.id and a.evento = 'oferta'
  where (a.data->>'precio')::numeric > 0 and a.data->>'plan' !~* 'kil[oó]metr|moto|por km'
  order by c.id, lower(a.data->>'aseguradora'), a.data->>'plan', a.id desc),
q as (select id, a, n, min(p) p from o group by 1, 2, 3),
x as (select id, max(p) mx, min(p) mn from q where n = 'Premium' group by 1 having count(*) >= 3)
select (select count(distinct id) from o) cotizaciones, (select min(creado)::date from o) desde, (select max(creado)::date from o) hasta,
  (select jsonb_agg(z) from (select n, round(percentile_cont(0.5) within group (order by p)) mediana from q group by 1) z) niveles,
  (select jsonb_agg(z) from (select a, count(*) n, round(percentile_cont(0.5) within group (order by p)) mediana from q where n = 'Premium' group by 1 order by 3) z) premium,
  (select round((percentile_cont(0.5) within group (order by 1 - mn / mx) * 100)::numeric) from x) brecha_menos_pct,
  (select round((percentile_cont(0.5) within group (order by mx / mn))::numeric, 1) from x) veces,
  (select round(percentile_cont(0.5) within group (order by mx - mn)) from x) brecha_pesos, (select count(*) from x) n_brecha;
