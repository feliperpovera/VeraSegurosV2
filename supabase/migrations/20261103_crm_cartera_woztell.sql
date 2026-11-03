-- Cartera (modelo tipo Salesforce Collections / Zoho Books, ajustado a intermediario "direct bill"):
-- por cobrar → compromiso de pago → vencida (en gracia) → pagada, o cancelada por mora (art. 1068 C. Co.).
-- La fecha límite es por póliza (cada aseguradora da su plazo). El estado se actualiza con el archivo semanal de cada aseguradora.
alter table public.poliza drop constraint poliza_cartera_check;
alter table public.poliza add constraint poliza_cartera_check check (cartera in ('sin_dato','al_dia','pendiente','compromiso','vencida','cancelada'));
alter table public.poliza
  add column compromiso_fecha date,                  -- el cliente prometió pagar ese día
  add column cartera_contacto timestamptz,           -- último recordatorio o llamada
  add column cartera_fuente text,                    -- archivo de la aseguradora o "manual"
  add column cartera_actualizado timestamptz;
create index on public.poliza (cartera, pago_limite);

drop view public.produccion;
create view public.produccion with (security_invoker = true) as
select p.id, p.aseguradora, p.ramo, p.numero, p.tipo, p.prima_neta, p.prima_total, p.creado,
       p.vigencia_desde, p.vigencia_hasta, p.revision, p.asesor_id, p.operativo_id, p.persona_id, p.renovacion, p.cartera, p.pago_limite, p.saldo, p.origen,
       p.compromiso_fecha, p.cartera_contacto, p.cartera_fuente, p.cartera_actualizado,
       coalesce(p.comision, round(p.prima_neta * t.pct / 100)) as comision
from public.poliza p
left join public.comision_tarifa t on t.aseguradora = p.aseguradora and t.ramo = p.ramo;
revoke all on public.produccion from anon;

-- Gestión de cartera desde el CRM (acceso total y limitado), con historial en el cliente.
create function public.gestionar_cartera(p_id uuid, p_estado text, p_pago_limite date, p_saldo numeric, p_compromiso date, p_contacto boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare x public.poliza;
begin
  if not public.es_empleado() then raise exception 'Sin acceso'; end if;
  update public.poliza set cartera = coalesce(p_estado, cartera), pago_limite = p_pago_limite, saldo = p_saldo,
    compromiso_fecha = case when coalesce(p_estado, cartera) = 'compromiso' then p_compromiso end,
    cartera_contacto = case when p_contacto then now() else cartera_contacto end,
    cartera_fuente = 'manual', cartera_actualizado = now()
  where id = p_id returning * into x;
  if x.persona_id is not null then
    insert into public.evento (persona_id, canal, texto, empleado_id)
    values (x.persona_id, 'cartera', 'Cartera ' || x.aseguradora || ' N.º ' || x.numero || ': ' || x.cartera
      || coalesce(' · compromiso ' || to_char(x.compromiso_fecha, 'DD/MM/YYYY'), '') || case when p_contacto then ' · cliente contactado' else '' end,
      (public.mi_empleado()).id);
  end if;
end $$;
revoke execute on function public.gestionar_cartera from public, anon;
grant execute on function public.gestionar_cartera to authenticated;

-- Archivo semanal de la aseguradora: filas { numero, saldo, pago_limite, aseguradora? }. Une por número de póliza
-- (la vigencia más reciente). Saldo 0 = pagada. Lo que no encuentra vuelve en "sin_unir" para revisarlo.
create function public.importar_cartera(filas jsonb, fuente text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; pid uuid; sal numeric; lim date; n_ok int := 0; sin jsonb := '[]'::jsonb; num text;
begin
  if not public.es_gerente() then raise exception 'Solo acceso total puede importar'; end if;
  for r in select * from jsonb_array_elements(filas) loop
    num := regexp_replace(coalesce(r->>'numero', ''), '[^0-9A-Za-z]', '', 'g');
    if num = '' then continue; end if;
    sal := nullif(regexp_replace(coalesce(r->>'saldo', ''), '[^0-9-]', '', 'g'), '')::numeric;
    lim := case when r->>'pago_limite' ~ '^\d{4}-\d{2}-\d{2}$' then (r->>'pago_limite')::date end;
    select id into pid from public.poliza
      where regexp_replace(numero, '[^0-9A-Za-z]', '', 'g') = num and tipo <> 'modificacion'
        and (coalesce(r->>'aseguradora', '') = '' or aseguradora ilike '%' || (r->>'aseguradora') || '%')
      order by vigencia_hasta desc nulls last limit 1;
    if pid is null then sin := sin || jsonb_build_array(r); continue; end if;
    update public.poliza set saldo = sal, pago_limite = coalesce(lim, pago_limite),
      cartera = case when coalesce(sal, 0) <= 0 then 'al_dia'
                     when cartera = 'compromiso' and compromiso_fecha >= current_date then 'compromiso'
                     when coalesce(lim, pago_limite) < current_date then 'vencida' else 'pendiente' end,
      cartera_fuente = left(fuente, 120), cartera_actualizado = now()
    where id = pid;
    n_ok := n_ok + 1;
  end loop;
  return jsonb_build_object('unidas', n_ok, 'sin_unir', sin);
end $$;
revoke execute on function public.importar_cartera from public, anon;
grant execute on function public.importar_cartera to authenticated;

-- Cada mañana: lo que pasó la fecha límite (o el compromiso incumplido) queda vencido.
create function public.cartera_diaria() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.poliza set cartera = 'vencida', cartera_actualizado = now()
  where (cartera = 'pendiente' and pago_limite < current_date) or (cartera = 'compromiso' and compromiso_fecha < current_date);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.cartera_diaria from public, anon, authenticated;
select cron.schedule('crm-cartera', '5 11 * * *', 'select public.cartera_diaria()'); -- 6:05 a.m. Bogotá

insert into public.plantilla (canal, nombre, asunto, cuerpo) values ('correo', 'Recordatorio de pago',
  '{{nombre}}, recuerda el pago de tu póliza',
  'Hola {{nombre}}:

Te escribimos para recordarte el pago de tu póliza. Si no se paga antes de la fecha límite, la aseguradora la cancela y quedas sin cobertura.

Si ya pagaste, ignora este mensaje. Si necesitas el link de pago o tienes alguna duda, responde este correo o escríbenos por WhatsApp.

{{mensaje}}

{{asesor}} · Vera Seguros');

-- WhatsApp que llega por Woztell → cliente (por celular), oportunidad abierta e historial. Lo llama solo la función wa-conv.
insert into public.config_interna (k, v) select 'woztell_key', encode(extensions.gen_random_bytes(24), 'hex') where not exists (select 1 from public.config_interna where k = 'woztell_key');
create function public.wa_entrante(p_tel text, p_nombre text, p_texto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare tel text := right(regexp_replace(coalesce(p_tel, ''), '\D', '', 'g'), 10); per uuid; op uuid; prod text; nuevo boolean := false;
begin
  if tel !~ '^3\d{9}$' then return jsonb_build_object('ok', false, 'motivo', 'celular'); end if;
  select id into per from public.persona where telefono = tel or telefono2 = tel order by (telefono = tel) desc limit 1;
  if per is null then
    insert into public.persona (nombre, telefono, origen) values (coalesce(nullif(trim(p_nombre), ''), 'Sin nombre (WhatsApp)'), tel, 'whatsapp') returning id into per;
    nuevo := true;
  else
    update public.persona set nombre = trim(p_nombre) where id = per and nombre like 'Sin nombre%' and nullif(trim(p_nombre), '') is not null;
  end if;
  prod := case when p_texto ~* 'salud|medic|eps|prepagad' then 'Salud' when p_texto ~* 'vida' then 'Vida' when p_texto ~* 'hogar|casa|apartamento' then 'Hogar'
               when p_texto ~* 'soat' then 'SOAT' when p_texto ~* 'auto|carro|veh[ií]culo|moto' then 'Autos' when p_texto ~* 'mascota|perro|gato' then 'Mascotas'
               when p_texto ~* 'empresa|pyme|negocio' then 'Empresarial' else 'Por definir' end;
  -- Una oportunidad abierta por cliente: si ya tiene una de los últimos 60 días, el mensaje solo va al historial.
  select id into op from public.oportunidad where persona_id = per and etapa not in ('emitido', 'perdido') and creado > now() - interval '60 days' order by creado desc limit 1;
  if op is null and not exists (select 1 from public.poliza where persona_id = per and vigencia_hasta >= current_date and ramo = prod) then
    insert into public.oportunidad (persona_id, producto, origen, etapa, asesor_id)
    values (per, prod, 'whatsapp', 'nuevo', (select asesor_id from public.persona where id = per)) returning id into op;
  end if;
  insert into public.evento (persona_id, oportunidad_id, canal, texto) values (per, op, 'whatsapp', 'WhatsApp: ' || left(coalesce(p_texto, '(archivo)'), 280));
  return jsonb_build_object('ok', true, 'nuevo', nuevo, 'oportunidad', op);
end $$;
revoke execute on function public.wa_entrante from public, anon, authenticated;
grant execute on function public.wa_entrante to service_role;

-- Ajustes: el gerente ve la URL del webhook (con su clave) para pegarla en Woztell.
create function public.woztell_webhook() returns text
language sql stable security definer set search_path = '' as $$
  select 'https://cwfvqusyvfdohjmgefli.supabase.co/functions/v1/wa-conv?clave=' || v from public.config_interna where k = 'woztell_key' and public.es_gerente()
$$;
revoke execute on function public.woztell_webhook from public, anon;
grant execute on function public.woztell_webhook to authenticated;
