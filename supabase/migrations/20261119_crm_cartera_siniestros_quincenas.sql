-- Aplicado en producción el 19 nov 2026 (vía MCP): cartera desde el correo, cierre de prospectos a 10 días,
-- siniestro por cliente (póliza opcional) y vista de comisiones por quincena.
-- aplicar_cartera(filas, fuente, tipo) y cartera_pagada_por_informe(desde): ver la función en la base (security definer, sin acceso para authenticated).
-- La función cartera-correo (supabase/functions/cartera-correo) corre cada 15 min por cron.
create or replace function public.cerrar_prospectos_quietos() returns integer language plpgsql security definer set search_path to '' as $$
declare n int;
begin
  update public.oportunidad set etapa = 'perdido', actualizado = now()
  where etapa in ('nuevo', 'contactado', 'cotizado', 'expedicion') and actualizado < now() - interval '10 days';
  get diagnostics n = row_count; return n;
end $$;
-- cron: 'cerrar-prospectos-quietos' 0 11 * * * (6 a. m. Bogotá); 'cartera-correo' */15 * * * *.
alter table public.siniestro add column if not exists persona_id uuid references public.persona(id) on delete set null;
alter table public.siniestro alter column poliza_id drop not null;
-- trigger siniestro_cliente: persona_id sale de la póliza si no viene. avisar_caso usa persona_id cuando no hay póliza.
-- vista produccion: nueva columna cancela_por_mora (datos->>'cancelacion_por_mora').
create or replace view public.comision_quincena with (security_invoker = true) as
select anio, mes, quincena, compania, linea, sum(prima) prima, sum(comision) comision, count(*) filas
from public.comision_detalle where linea is distinct from 'ARL' group by 1, 2, 3, 4, 5;
-- calcular_mora(): si cartera_fuente empieza por 'SURA' y trae mora_desde, se respeta la fecha del informe.
-- aplicar_cartera(): en informes de vencida/candidatos agrupa por póliza (suma saldos, mora más antigua).
