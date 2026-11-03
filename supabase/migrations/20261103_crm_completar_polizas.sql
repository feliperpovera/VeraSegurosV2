-- Completa pólizas ya cargadas con el reporte "Pólizas vigentes" de Data Finanzas (Dataseguros):
-- prima sin IVA, prima con IVA y asesor. Une por número de póliza sin ceros a la izquierda (la vigencia más reciente).
create function public.completar_polizas(filas jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; pid uuid; ase uuid; num text; n_ok int := 0; sin jsonb := '[]'::jsonb;
begin
  if not public.es_gerente() then raise exception 'Solo acceso total puede importar'; end if;
  for r in select * from jsonb_array_elements(filas) loop
    num := ltrim(regexp_replace(coalesce(r->>'numero', ''), '\D', '', 'g'), '0');
    if num = '' then continue; end if;
    select id into pid from public.poliza
      where ltrim(regexp_replace(numero, '\D', '', 'g'), '0') = num and tipo <> 'modificacion'
      order by (estado = 'vigente') desc, vigencia_hasta desc nulls last limit 1;
    if pid is null then sin := sin || jsonb_build_array(r->>'numero'); continue; end if;
    select id into ase from public.empleado where codigo = upper(trim(coalesce(r->>'asesor', ''))) limit 1;
    update public.poliza set prima_neta = coalesce(nullif(r->>'prima_neta', '')::numeric, prima_neta),
      prima_total = coalesce(nullif(r->>'prima_total', '')::numeric, prima_total),
      asesor_id = coalesce(ase, asesor_id), datos = coalesce(datos, '{}'::jsonb) || coalesce(r->'datos', '{}'::jsonb)
    where id = pid;
    n_ok := n_ok + 1;
  end loop;
  return jsonb_build_object('unidas', n_ok, 'sin_unir', sin);
end $$;
revoke execute on function public.completar_polizas from public, anon;
grant execute on function public.completar_polizas to authenticated;
