-- Base de la compañía: más datos del cliente e importación de pólizas (producción, vigencias, primas).
alter table public.persona
  add column tipo_doc text,
  add column genero text,
  add column email2 text,
  add column telefono2 text,
  add column empresa text;

-- Campos extra del cliente sin tocar importar_personas: se completan después de importar.
create function public.completar_persona(filas jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare r jsonb; n int := 0;
begin
  if not public.es_gerente() then raise exception 'Solo acceso total puede importar'; end if;
  for r in select * from jsonb_array_elements(filas) loop
    update public.persona set
      tipo_doc = coalesce(nullif(r->>'tipo_doc', ''), tipo_doc), genero = coalesce(nullif(r->>'genero', ''), genero),
      email2 = coalesce(nullif(lower(r->>'email2'), ''), email2), telefono2 = coalesce(nullif(r->>'telefono2', ''), telefono2),
      empresa = coalesce(nullif(r->>'empresa', ''), empresa)
    where cedula = regexp_replace(coalesce(r->>'cedula', ''), '\D', '', 'g') and cedula <> '';
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.completar_persona from public, anon;
grant execute on function public.completar_persona to authenticated;

-- Pólizas de la base: una fila por vigencia (anexo = "V" + año de inicio), unida al cliente por cédula.
-- La fecha de producción (creado) es el inicio de vigencia o la expedición. Los datos nuevos completan, no borran.
create function public.importar_polizas(filas jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb; n_nuevas int := 0; n_act int := 0; n_err int := 0;
  per uuid; ase uuid; desde date; hasta date; expd date; anx text; pid uuid;
begin
  if not public.es_gerente() then raise exception 'Solo acceso total puede importar'; end if;
  for r in select * from jsonb_array_elements(filas) loop
    begin
      if coalesce(r->>'numero', '') = '' or coalesce(r->>'aseguradora', '') = '' then n_err := n_err + 1; continue; end if;
      desde := case when r->>'vigencia_desde' ~ '^\d{4}-\d{2}-\d{2}$' then (r->>'vigencia_desde')::date end;
      hasta := case when r->>'vigencia_hasta' ~ '^\d{4}-\d{2}-\d{2}$' then (r->>'vigencia_hasta')::date end;
      expd := case when r->>'expedicion' ~ '^\d{4}-\d{2}-\d{2}$' then (r->>'expedicion')::date end;
      anx := coalesce(nullif(r->>'anexo', ''), 'V' || coalesce(to_char(desde, 'YYYY'), '0'));
      select id into per from public.persona where cedula = nullif(regexp_replace(coalesce(r->>'cedula', ''), '\D', '', 'g'), '');
      select id into ase from public.empleado where email = lower(trim(r->>'asesor'));
      select id into pid from public.poliza where aseguradora = r->>'aseguradora' and numero = r->>'numero' and anexo = anx;
      if pid is null then
        insert into public.poliza (persona_id, aseguradora, ramo, numero, anexo, tipo, vigencia_desde, vigencia_hasta, prima_neta, prima_total,
          asesor_id, revision, origen, datos, creado)
        values (per, r->>'aseguradora', coalesce(nullif(r->>'ramo', ''), 'Otro'), r->>'numero', anx, 'nueva', desde, hasta,
          nullif(r->>'prima_neta', '')::numeric, nullif(r->>'prima_total', '')::numeric, coalesce(ase, (select asesor_id from public.persona where id = per)),
          'ok', 'base', r->'datos', coalesce(desde, expd, now())::timestamptz);
        n_nuevas := n_nuevas + 1;
      else
        update public.poliza set persona_id = coalesce(persona_id, per), ramo = coalesce(nullif(r->>'ramo', ''), ramo),
          vigencia_desde = coalesce(vigencia_desde, desde), vigencia_hasta = coalesce(hasta, vigencia_hasta),
          prima_neta = coalesce(nullif(r->>'prima_neta', '')::numeric, prima_neta), asesor_id = coalesce(asesor_id, ase),
          datos = coalesce(datos, '{}'::jsonb) || coalesce(r->'datos', '{}'::jsonb)
        where id = pid;
        n_act := n_act + 1;
      end if;
      if per is not null then update public.persona set asesor_id = coalesce(asesor_id, ase) where id = per; end if;
    exception when others then n_err := n_err + 1;
    end;
  end loop;
  return jsonb_build_object('nuevas', n_nuevas, 'actualizadas', n_act, 'errores', n_err);
end $$;
revoke execute on function public.importar_polizas from public, anon;
grant execute on function public.importar_polizas to authenticated;
