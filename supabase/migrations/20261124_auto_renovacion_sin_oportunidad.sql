-- Las renovaciones cotizadas en el CRM no son ventas nuevas: no crean persona ni oportunidad.
create or replace function public.trg_auto_crm() returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if old.estado = 'enviada' and new.estado in ('aceptada', 'rechazada') and not (coalesce(new.datos, '{}'::jsonb) ? 'renovacion') then perform public.crm_desde_auto(new); end if;
  return new;
end $function$;
