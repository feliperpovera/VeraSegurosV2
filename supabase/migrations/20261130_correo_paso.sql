-- Estructura de correos por solución (CRM → Correos). activo solo manda en los pasos con interruptor (los lee la función).
alter table public.auto_cotizacion add column if not exists correo_16d timestamptz;
create table if not exists public.correo_paso (
  id text primary key, solucion text not null, orden int not null, cuando text not null, para text not null,
  remitente text not null, asunto text not null, objetivo text not null, funcion text not null,
  interruptor boolean not null default false, activo boolean not null default true, actualizado timestamptz not null default now());
alter table public.correo_paso enable row level security;
create policy leer on public.correo_paso for select using ((select es_empleado()));
create policy gerente on public.correo_paso for update using ((select es_gerente())) with check ((select es_gerente()));
insert into public.correo_paso (id, solucion, orden, cuando, para, remitente, asunto, objetivo, funcion, interruptor) values
 ('autos_propuesta', 'Autos', 1, 'Al llegar las ofertas de todas las compañías (máx. 15 min)', 'Cliente y equipo (info@)', 'cotizaciones@veraseguros.com', '{nombre}, tus ofertas de seguro todo riesgo para {placa}', 'Propuesta con las mejores ofertas y el comparativo en PDF', 'autos', true),
 ('autos_24h', 'Autos', 2, 'A las 24 horas, si no ha expedido', 'Cliente', 'cotizaciones@veraseguros.com', '{nombre}, no pierdas la oferta de tu seguro todo riesgo', 'Cierre: que no pierda la oportunidad de tomar el seguro', 'autos', true),
 ('autos_16d', 'Autos', 3, 'Día 16 (nada entre el día 2 y el 15), si no ha expedido', 'Cliente', 'Felipe Restrepo (Outlook, Azure)', '{nombre}, hoy podemos mejorar el precio de tu seguro todo riesgo', 'Volver a cotizar: las tarifas cambian y hay mejores alternativas', 'autos-semanal', true),
 ('autos_expedicion', 'Autos', 4, 'Cuando envía los documentos para expedir', 'Cliente y equipo', 'cotizaciones@veraseguros.com', '{nombre}, tu póliza quedó en proceso de expedición', 'Confirmar que recibimos todo', 'autos', false),
 ('renovacion', 'Renovaciones autos', 1, 'Cuando el asesor toca «Enviar» en el CRM', 'Cliente (cc info@ y operaciones2@)', 'comunicaciones@veraseguros.com', '{nombre}, la renovación de tu seguro {placa} está lista', 'Renovación con comparativo; nunca automático', 'autos-renovacion', false),
 ('salud', 'Salud', 1, 'Sin correos automáticos', 'Cliente', '—', '—', 'Salud se atiende por WhatsApp y asesor', '—', false),
 ('plan_caida', 'Clientes sin seguro vigente', 1, 'Envío por lista aprobada', 'Excliente', 'Felipe Restrepo', '{nombre}, ¿te ayudo a retomar {seguro}?', 'Recuperar clientes que ya no tienen seguro con Vera', 'correo-caida', false),
 ('resena', 'Reseñas Google', 1, 'Sábados y domingos 11 a. m.', 'Quien escribió por WhatsApp en la semana', 'Felipe Restrepo', 'Reseña en Google', 'Pedir reseña', 'resena-semanal', false),
 ('prospectos', 'Empresas (prospección)', 1, 'Lunes a viernes 8 a. m., 10 a. m. y 2 p. m.', 'Empresas', 'Felipe Restrepo (Outlook, Azure)', 'Según el sector', 'Conseguir reunión comercial', 'prospectar', false)
on conflict (id) do nothing;
-- El correo del día 16 sale todos los días a las 9 a. m. (Bogotá) por el Outlook de Felipe.
select cron.unschedule('autos-retoma-semanal');
select cron.schedule('autos-dia16', '0 14 * * *', $$select net.http_post(url:='https://cwfvqusyvfdohjmgefli.supabase.co/functions/v1/autos-semanal?modo=enviar', headers:=jsonb_build_object('x-tarea',(select v from public.config_interna where k='tareas_token')), timeout_milliseconds:=150000)$$);
-- Cuántos salieron en los últimos 30 días por paso (solo el gerente).
create or replace function public.correos_cuenta() returns jsonb language sql stable security definer set search_path = public as $$
  select case when es_gerente() then jsonb_build_object(
    'autos_propuesta', count(*) filter (where correo_cliente > now() - interval '30 days' and datos->'renovacion' is null and estado = 'aceptada'),
    'autos_24h', count(*) filter (where correo_24h > now() - interval '30 days' and datos->'renovacion' is null),
    'autos_16d', count(*) filter (where correo_16d > now() - interval '30 days')) end
  from auto_cotizacion where coalesce(datos->>'email', '') <> '' $$; -- ponytail: cuenta marcas, no confirma entrega
revoke all on function public.correos_cuenta() from public, anon;
grant execute on function public.correos_cuenta() to authenticated;
