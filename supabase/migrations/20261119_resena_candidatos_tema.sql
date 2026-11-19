-- resena_candidatos devuelve también el tema (producto de la oportunidad o ramo de la póliza) para personalizar el correo.
drop function if exists public.resena_candidatos(integer);
create function public.resena_candidatos(p_dias integer default 7)
returns table(persona_id uuid, email text, nombre text, tema text)
language sql stable security definer set search_path to 'public' as $$
  select c.id, c.email, c.nombre,
    coalesce(
      (select o.producto from oportunidad o where o.persona_id = c.id and o.producto not in ('Por definir','Empresarial') order by o.actualizado desc nulls last limit 1),
      (select p.ramo from poliza p where p.persona_id = c.id and p.ramo not in ('Otro') order by p.vigencia_hasta desc nulls last limit 1)
    )
  from (
    select distinct on (lower(trim(p.email))) p.id, lower(trim(p.email)) email, p.nombre
    from evento e join persona p on p.id = e.persona_id
    where e.canal = 'whatsapp' and e.creado >= now() - make_interval(days => p_dias)
      and p.email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and not coalesce(p.no_contactar, false)
      and lower(trim(p.email)) not like '%veraseguros.com'
      and lower(trim(p.email)) not in (select lower(email) from empleado where email is not null)
      and lower(trim(p.email)) not in (select lower(trim(email)) from persona_retirada_df where email is not null)
      and not exists (select 1 from resena_baja b where b.email = lower(trim(p.email)))
      and not exists (select 1 from resena_envio r where r.email = lower(trim(p.email)) and r.creado > now() - interval '180 days')
    order by lower(trim(p.email)), e.creado desc
  ) c
$$;
