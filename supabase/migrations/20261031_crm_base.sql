-- CRM Vera: base (fase 0). Todos los empleados ven todos los clientes (equipo pequeño);
-- solo el gerente edita empleados y la tabla de comisiones.

create table public.empleado (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  nombre text not null,
  rol text not null default 'asesor' check (rol in ('gerente','asesor')),
  activo boolean not null default true
);

create table public.persona (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cedula text unique,
  telefono text unique check (telefono ~ '^\d{10}$'),
  email text,
  ciudad text,
  asesor_id uuid references public.empleado,
  creado timestamptz not null default now()
);

create table public.oportunidad (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.persona on delete cascade,
  producto text not null,
  origen text,
  etapa text not null default 'nuevo' check (etapa in ('nuevo','contactado','cotizado','emitido','perdido')),
  asesor_id uuid references public.empleado,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

create table public.evento (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.persona on delete cascade,
  oportunidad_id uuid references public.oportunidad on delete set null,
  canal text not null,          -- whatsapp, web, correo, llamada, nota
  texto text not null,
  enlace text,
  empleado_id uuid references public.empleado,
  creado timestamptz not null default now()
);

create table public.comision_tarifa (
  aseguradora text not null,
  ramo text not null,
  pct numeric(5,2) not null check (pct between 0 and 100),
  primary key (aseguradora, ramo)
);

create table public.poliza (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references public.persona on delete set null,
  aseguradora text not null,
  ramo text not null,
  numero text not null,
  anexo text not null default '0',
  tipo text not null default 'nueva' check (tipo in ('nueva','renovacion','modificacion')),
  vigencia_desde date,
  vigencia_hasta date,
  prima_neta numeric(14,0),
  prima_total numeric(14,0),
  comision numeric(14,0),       -- vacía = se calcula con comision_tarifa
  asesor_id uuid references public.empleado,
  pdf_path text,
  revision text not null default 'ok' check (revision in ('ok','pendiente')),
  datos jsonb,
  creado timestamptz not null default now(),
  unique (aseguradora, numero, anexo)
);

create table public.tarea (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references public.persona on delete cascade,
  oportunidad_id uuid references public.oportunidad on delete set null,
  asignada_a uuid not null references public.empleado,
  titulo text not null,
  vence date not null default current_date,
  resultado text check (resultado in ('vendido','sigue','perdido','hecho')),
  cerrada_at timestamptz,
  creado timestamptz not null default now()
);

create index on public.oportunidad (persona_id);
create index on public.evento (persona_id, creado desc);
create index on public.poliza (persona_id);
create index on public.poliza (creado);
create index on public.tarea (asignada_a, cerrada_at, vence);

-- Quién es el usuario conectado (por su correo de Supabase Auth)
create function public.mi_empleado() returns public.empleado
language sql stable security definer set search_path = '' as $$
  select e.* from public.empleado e
  where e.email = lower(auth.jwt() ->> 'email') and e.activo
$$;
create function public.es_empleado() returns boolean
language sql stable security definer set search_path = '' as $$
  select (public.mi_empleado()).id is not null
$$;
create function public.es_gerente() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((public.mi_empleado()).rol = 'gerente', false)
$$;
revoke execute on function public.mi_empleado, public.es_empleado, public.es_gerente from public, anon;
grant execute on function public.mi_empleado, public.es_empleado, public.es_gerente to authenticated;

alter table public.empleado enable row level security;
alter table public.persona enable row level security;
alter table public.oportunidad enable row level security;
alter table public.evento enable row level security;
alter table public.comision_tarifa enable row level security;
alter table public.poliza enable row level security;
alter table public.tarea enable row level security;

create policy leer on public.empleado for select to authenticated using (public.es_empleado());
create policy gerente on public.empleado for all to authenticated using (public.es_gerente()) with check (public.es_gerente());
create policy leer on public.comision_tarifa for select to authenticated using (public.es_empleado());
create policy gerente on public.comision_tarifa for all to authenticated using (public.es_gerente()) with check (public.es_gerente());
create policy equipo on public.persona for all to authenticated using (public.es_empleado()) with check (public.es_empleado());
create policy equipo on public.oportunidad for all to authenticated using (public.es_empleado()) with check (public.es_empleado());
create policy equipo on public.evento for all to authenticated using (public.es_empleado()) with check (public.es_empleado());
create policy equipo on public.poliza for all to authenticated using (public.es_empleado()) with check (public.es_empleado());
create policy equipo on public.tarea for all to authenticated using (public.es_empleado()) with check (public.es_empleado());

-- Producción con comisión calculada (manual si existe; si no, prima neta × % de la tabla)
create view public.produccion with (security_invoker = true) as
select p.id, p.aseguradora, p.ramo, p.numero, p.tipo, p.prima_neta, p.prima_total, p.creado,
       p.vigencia_desde, p.revision, p.asesor_id, p.persona_id,
       coalesce(p.comision, round(p.prima_neta * t.pct / 100)) as comision
from public.poliza p
left join public.comision_tarifa t on t.aseguradora = p.aseguradora and t.ramo = p.ramo;

insert into public.empleado (email, nombre, rol) values
  ('info@veraseguros.com', 'Gerencia', 'gerente'),
  ('comercial@veraseguros.com', 'Comercial', 'asesor');
