-- Aplicada 2026-11-23 como crm_whatsapp_sin_prospectos (pedido de Felipe).
-- Los WhatsApp nuevos ya no crean prospectos en el tablero de ventas. Se conserva todo lo demás:
-- la persona, la vinculación por cédula o correo y el mensaje en su historial (enlazado a su oportunidad abierta, si tiene una).
do $$
declare d text := pg_get_functiondef('public.wa_entrante(text,text,text)'::regprocedure);
        a text := $q$  if op is null and not exists (select 1 from public.poliza where persona_id = per and vigencia_hasta >= current_date and ramo = prod) then
    insert into public.oportunidad (persona_id, producto, origen, etapa, asesor_id)
    values (per, prod, 'whatsapp', 'nuevo', (select asesor_id from public.persona where id = per)) returning id into op;
  end if;
$q$;
        b text := $q$  prod := case when p_texto ~* 'salud|medic|eps|prepagad' then 'Salud' when p_texto ~* 'vida' then 'Vida' when p_texto ~* 'hogar|casa|apartamento' then 'Hogar'
               when p_texto ~* 'soat' then 'SOAT' when p_texto ~* 'auto|carro|veh[ií]culo|moto' then 'Autos' when p_texto ~* 'mascota|perro|gato' then 'Mascotas'
               when p_texto ~* 'empresa|pyme|negocio' then 'Empresarial' else 'Por definir' end;
$q$;
begin
  if position(a in d) = 0 or position(b in d) = 0 then raise exception 'wa_entrante cambió'; end if;
  execute replace(replace(d, a, ''), b, '');
end $$;
