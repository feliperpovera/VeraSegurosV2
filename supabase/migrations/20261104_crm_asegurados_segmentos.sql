-- Asegurados leídos de las carátulas: una persona puede estar asegurada en la póliza de otro tomador.
create table public.poliza_asegurado (
  ruta text not null, nombre text not null, cedula text, parentesco text, numero text,
  persona_id uuid references public.persona(id) on delete set null, producto text, anio int,
  creado timestamptz not null default now(), primary key (ruta, nombre)
);
create index poliza_asegurado_cedula on public.poliza_asegurado (cedula);
create index poliza_asegurado_persona on public.poliza_asegurado (persona_id);
alter table public.poliza_asegurado enable row level security;
create policy leer on public.poliza_asegurado for select to authenticated using ((select es_empleado()));

-- Una póliza leída dos veces (090001 y 1 son la misma) cuenta una sola vez.
create view public.poliza_vigente with (security_invoker = on) as
select distinct on (persona_id, coalesce(nullif(ltrim(numero, '0'), ''), id::text)) *
from public.poliza
where vigencia_hasta >= current_date and tipo <> 'modificacion' and estado = 'vigente'
order by persona_id, coalesce(nullif(ltrim(numero, '0'), ''), id::text), vigencia_hasta desc, prima_neta desc nulls last;

-- Cliente = tiene carpeta, o es tomador, o aparece asegurado en una carátula. Lo demás es contacto.
-- Segmentos sobre la prima vigente: P85 sale del corte óptimo de 3 grupos sobre ln(prima); P50 es la mediana.
create or replace view public.cliente_resumen with (security_invoker = on) as
with v as (
  select persona_id, count(*) as n, sum(prima_neta) as prima, min(vigencia_hasta) as proximo_vencimiento, string_agg(distinct ramo, ', ') as ramos
  from public.poliza_vigente group by persona_id
), c as (
  select percentile_cont(0.5) within group (order by prima) as p50, percentile_cont(0.85) within group (order by prima) as p85 from v where prima > 0
), t as (
  select per.*, coalesce(v.n, 0::bigint) as n, coalesce(v.prima, 0::numeric) as prima, v.proximo_vencimiento, v.ramos,
    coalesce(v.n, 0::bigint) > 0 or per.carpeta is not null
      or per.id in (select persona_id from public.poliza where persona_id is not null)
      or coalesce(per.cedula in (select cedula from public.poliza_asegurado where cedula is not null), false)
      or lower(per.nombre) in (select lower(nombre) from public.poliza_asegurado) as cliente
  from public.persona per left join v on v.persona_id = per.id
)
select t.id, t.nombre, t.cedula, t.tipo_doc, t.telefono, t.email, t.ciudad, t.asesor_id, t.operativo_id, t.origen, t.no_contactar, t.creado,
  t.n as polizas_vigentes, t.prima as prima_vigente, t.proximo_vencimiento, t.ramos,
  (select max(e.creado) from public.evento e where e.persona_id = t.id) as ultima_actividad,
  t.carpeta, t.cliente as es_cliente,
  case when not t.cliente then null
    when t.prima >= c.p85 then 'Preferencial'
    when t.prima >= c.p50 then 'Plus'
    when t.n > 0 then 'Promedio'
    else 'Falta de vinculación' end as segmento
from t cross join c;

create view public.segmento_resumen with (security_invoker = on) as
select segmento, count(*) as clientes, sum(prima_vigente) as prima from public.cliente_resumen where es_cliente group by segmento;

-- Búsqueda por asegurado: carátulas (nombre completo y cédula) y carpetas de OneDrive.
create view public.asegurado_resumen with (security_invoker = on) as
select initcap(lower(nombre)) as asegurado, max(cedula) as cedula, max(parentesco) as parentesco, persona_id, producto, max(numero) as numero, max(anio) as ultimo_anio, count(*) as documentos
from public.poliza_asegurado where persona_id is not null group by 1, 4, 5
union all
select regexp_replace(asegurado, '^Hoja De Estado ', ''), null, null, persona_id, producto, null, max(anio), count(*)
from public.documento_cliente
where asegurado is not null and persona_id is not null
  and asegurado !~* '^(plan de pagos|firma clientes|solo |propuesta|cotizaci|edificio|bien raiz)'
group by 1, 4, 5;

grant select on public.poliza_vigente, public.asegurado_resumen, public.cliente_resumen, public.segmento_resumen, public.poliza_asegurado to authenticated;
