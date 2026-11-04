-- La ficha del cliente muestra la póliza en PDF: la vista de producción lo expone y todos los empleados pueden abrirlo.
create or replace view public.produccion with (security_invoker = true) as
select p.id, p.aseguradora, p.ramo, p.numero, p.tipo, p.estado, p.prima_neta, p.prima_total, p.creado, p.vigencia_desde, p.vigencia_hasta, p.revision, p.asesor_id, p.operativo_id, p.persona_id, p.renovacion, p.cartera, p.pago_limite, p.saldo, p.origen, p.compromiso_fecha, p.cartera_contacto, p.cartera_fuente, p.cartera_actualizado,
  coalesce(p.comision, round(p.prima_neta * t.pct / 100::numeric)) as comision, p.mora_desde, p.pdf_path
from public.poliza p left join public.comision_tarifa t on t.aseguradora = p.aseguradora and t.ramo = p.ramo;
drop policy caratulas_gerente on storage.objects;
create policy caratulas_empleados on storage.objects for select to authenticated using (bucket_id = 'caratulas' and (select public.es_empleado()));
