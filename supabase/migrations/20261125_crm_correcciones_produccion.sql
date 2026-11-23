-- Correcciones de producción con evidencia (aplicada 2026-11-23 como crm_correcciones_produccion_23nov). Nada se borra.
update public.poliza set aseguradora = 'AssistCard', ramo = 'Viajes' where aseguradora = 'Sin leer' and datos->>'ruta_onedrive' ~* 'assist ?card';
-- Los 388 números 9000######## del CRM son de SURA: estas dos también.
update public.poliza set aseguradora = 'SURA' where aseguradora = 'Sin leer' and numero in ('900000599074', '900001059013');
-- Misma póliza y misma vigencia en dos carátulas (renovación y renovación modificada): queda la última.
update public.poliza set estado = 'no_vigente', datos = coalesce(datos, '{}'::jsonb) || jsonb_build_object('duplicado_de', '55d7984a-fbb2-4b61-a7df-6a4ea4388418')
where id = '13c07f6d-8788-4950-a380-e8fc89da5652';
-- Cesión Arkadia: el fin de vigencia se leyó 2026-05-12; el otrosí siguiente de las mismas pólizas dice 2029-05-12.
update public.poliza set vigencia_hasta = '2029-05-12', datos = coalesce(datos, '{}'::jsonb) || jsonb_build_object('fecha_corregida', 'fin leído 2026-05-12; el otrosí 3 dice 2029-05-12')
where id in ('4203b24f-0a4d-4bfa-a48b-6006fa3aa549', 'ccec2ea5-b399-40dd-9368-850c17cbc35f') and vigencia_hasta = '2026-05-12';
-- Asesor vacío: se toma el de las demás pólizas del cliente cuando todas tienen el mismo (marca asesor_deducido).
update public.poliza p set asesor_id = h.a, datos = coalesce(p.datos, '{}'::jsonb) || jsonb_build_object('asesor_deducido', true)
from (select q.persona_id, min(q.asesor_id::text)::uuid a from public.poliza q where q.persona_id is not null and q.asesor_id is not null group by 1 having count(distinct q.asesor_id) = 1) h
where h.persona_id = p.persona_id and p.asesor_id is null and p.estado = 'vigente' and p.tipo <> 'modificacion' and p.vigencia_desde >= '2025-01-01'
  and not coalesce(p.datos ?| array['duplicado_de','cotizacion','cambio_asesor'], false);
-- Las notificaciones usan el mismo nombre de etapa que el tablero.
do $$
declare d text := pg_get_functiondef('public.avisar_movimiento()'::regprocedure);
begin
  if position('"emitido":"Terminado"' in d) = 0 then raise exception 'no encontré la etapa'; end if;
  execute replace(replace(d, '"emitido":"Terminado"', '"emitido":"Expedido"'), '"contactado":"Prospecto"', '"contactado":"Contactado"');
end $$;
