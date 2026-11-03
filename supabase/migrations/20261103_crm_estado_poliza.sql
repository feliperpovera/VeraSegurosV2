-- Estado de la póliza según la aseguradora / Data Finanzas: una póliza cancelada deja de contar como vigente
-- aunque su fin de vigencia sea futuro.
alter table public.poliza add column estado text not null default 'vigente' check (estado in ('vigente', 'cancelada', 'no_vigente'));

drop view public.cliente_resumen;
create view public.cliente_resumen with (security_invoker = true) as
select per.id, per.nombre, per.cedula, per.tipo_doc, per.telefono, per.email, per.ciudad, per.asesor_id, per.operativo_id, per.origen,
       per.no_contactar, per.creado,
       coalesce(v.n, 0) as polizas_vigentes, coalesce(v.prima, 0) as prima_vigente, v.proximo_vencimiento, v.ramos,
       (select max(e.creado) from public.evento e where e.persona_id = per.id) as ultima_actividad
from public.persona per
left join lateral (
  select count(*) n, sum(p.prima_neta) prima, min(p.vigencia_hasta) proximo_vencimiento, string_agg(distinct p.ramo, ', ') ramos
  from public.poliza p where p.persona_id = per.id and p.vigencia_hasta >= current_date and p.tipo <> 'modificacion' and p.estado <> 'cancelada'
) v on true;
revoke all on public.cliente_resumen from anon;

drop view public.produccion;
create view public.produccion with (security_invoker = true) as
select p.id, p.aseguradora, p.ramo, p.numero, p.tipo, p.estado, p.prima_neta, p.prima_total, p.creado,
       p.vigencia_desde, p.vigencia_hasta, p.revision, p.asesor_id, p.operativo_id, p.persona_id, p.renovacion, p.cartera, p.pago_limite, p.saldo, p.origen,
       p.compromiso_fecha, p.cartera_contacto, p.cartera_fuente, p.cartera_actualizado,
       coalesce(p.comision, round(p.prima_neta * t.pct / 100)) as comision
from public.poliza p
left join public.comision_tarifa t on t.aseguradora = p.aseguradora and t.ramo = p.ramo;
revoke all on public.produccion from anon;

-- importar_polizas acepta "estado" (Vigente / Cancelada / No Vigente). Cancelada = no renueva.
create or replace function public.importar_polizas(filas jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb; n_nuevas int := 0; n_act int := 0; n_err int := 0;
  per uuid; ase uuid; ope uuid; desde date; hasta date; expd date; anx text; pid uuid; est text;
begin
  if not public.es_gerente() then raise exception 'Solo acceso total puede importar'; end if;
  for r in select * from jsonb_array_elements(filas) loop
    begin
      if coalesce(r->>'numero', '') = '' or coalesce(r->>'aseguradora', '') = '' then n_err := n_err + 1; continue; end if;
      desde := case when r->>'vigencia_desde' ~ '^\d{4}-\d{2}-\d{2}$' then (r->>'vigencia_desde')::date end;
      hasta := case when r->>'vigencia_hasta' ~ '^\d{4}-\d{2}-\d{2}$' then (r->>'vigencia_hasta')::date end;
      expd := case when r->>'expedicion' ~ '^\d{4}-\d{2}-\d{2}$' then (r->>'expedicion')::date end;
      est := case lower(coalesce(r->>'estado', '')) when 'cancelada' then 'cancelada' when 'no vigente' then 'no_vigente' when 'vigente' then 'vigente' end;
      anx := coalesce(nullif(r->>'anexo', ''), 'V' || coalesce(to_char(desde, 'YYYY'), '0'));
      select id into per from public.persona where cedula = nullif(regexp_replace(coalesce(r->>'cedula', ''), '\D', '', 'g'), '');
      select id into ase from public.empleado where email = lower(trim(r->>'asesor')) or codigo = upper(trim(r->>'asesor')) limit 1;
      select id into ope from public.empleado where email = lower(trim(r->>'operativo')) or codigo = upper(trim(r->>'operativo')) limit 1;
      select id into pid from public.poliza where aseguradora = r->>'aseguradora' and numero = r->>'numero' and anexo = anx;
      if pid is null then
        insert into public.poliza (persona_id, aseguradora, ramo, numero, anexo, tipo, estado, vigencia_desde, vigencia_hasta, prima_neta, prima_total,
          asesor_id, operativo_id, revision, origen, datos, creado, renovacion)
        values (per, r->>'aseguradora', coalesce(nullif(r->>'ramo', ''), 'Otro'), r->>'numero', anx, 'nueva', coalesce(est, 'vigente'), desde, hasta,
          nullif(r->>'prima_neta', '')::numeric, nullif(r->>'prima_total', '')::numeric, coalesce(ase, (select asesor_id from public.persona where id = per)), ope,
          'ok', 'base', r->'datos', coalesce(desde, expd, now())::timestamptz, case when est = 'cancelada' then 'no_renueva' else 'pendiente' end)
        returning id into pid;
        n_nuevas := n_nuevas + 1;
      else
        update public.poliza set persona_id = coalesce(persona_id, per), ramo = coalesce(nullif(r->>'ramo', ''), ramo),
          vigencia_desde = coalesce(vigencia_desde, desde), vigencia_hasta = coalesce(hasta, vigencia_hasta), estado = coalesce(est, estado),
          renovacion = case when est = 'cancelada' and renovacion <> 'renovada' then 'no_renueva' else renovacion end,
          prima_neta = coalesce(nullif(r->>'prima_neta', '')::numeric, prima_neta),
          asesor_id = coalesce(asesor_id, ase, (select asesor_id from public.persona where id = coalesce(persona_id, per))), operativo_id = coalesce(operativo_id, ope),
          datos = coalesce(datos, '{}'::jsonb) || coalesce(r->'datos', '{}'::jsonb)
        where id = pid;
        n_act := n_act + 1;
      end if;
      if per is not null then update public.persona set asesor_id = coalesce(asesor_id, ase), operativo_id = coalesce(operativo_id, ope) where id = per; end if;
    exception when others then n_err := n_err + 1;
    end;
  end loop;
  return jsonb_build_object('nuevas', n_nuevas, 'actualizadas', n_act, 'errores', n_err);
end $$;
