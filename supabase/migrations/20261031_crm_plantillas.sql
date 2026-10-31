-- CRM: plantillas de correo (diseño Vera) y de WhatsApp (aprobadas por Meta en Woztell).
-- Variables disponibles: {{nombre}} {{nombre_completo}} {{asesor}} {{asesor_correo}} {{mensaje}}

create table public.plantilla (
  id uuid primary key default gen_random_uuid(),
  canal text not null check (canal in ('correo', 'whatsapp')),
  nombre text not null,                 -- lo que ve el empleado
  asunto text,                          -- correo
  cuerpo text,                          -- correo: HTML (si empieza por <html o <!doctype se envía tal cual, si no va dentro del diseño Vera)
  meta_nombre text,                     -- whatsapp: nombre exacto de la plantilla aprobada en Meta/Woztell
  idioma text not null default 'es',
  variables text[] not null default '{}', -- whatsapp: variables en el orden {{1}}, {{2}}…
  activa boolean not null default true,
  creado timestamptz not null default now(),
  check (canal = 'correo' and asunto is not null and cuerpo is not null or canal = 'whatsapp' and meta_nombre is not null)
);
alter table public.plantilla enable row level security;
create policy leer on public.plantilla for select to authenticated using (public.es_empleado());
create policy gerente on public.plantilla for all to authenticated using (public.es_gerente()) with check (public.es_gerente());
revoke all on public.plantilla from anon;

insert into public.plantilla (canal, nombre, asunto, cuerpo) values
('correo', 'Saludo y presentación', '{{nombre}}, soy {{asesor}} de Vera Seguros',
 '<p>Hola {{nombre}},</p><p>Soy {{asesor}}, tu asesor en Vera Seguros. Estoy para ayudarte a elegir, comprar y usar tus seguros, sin costo adicional para ti.</p><p>{{mensaje}}</p><p>Puedes responder este correo o escribirme por WhatsApp cuando quieras.</p>'),
('correo', 'Cotización enviada', '{{nombre}}, aquí está tu cotización',
 '<p>Hola {{nombre}},</p><p>Te comparto la cotización que hablamos. Revisa las opciones con calma y cuéntame cuál te gusta más; yo me encargo del resto.</p><p>{{mensaje}}</p><p>Los precios están sujetos a inspección y aceptación de la aseguradora.</p>'),
('correo', 'Documentos pendientes', '{{nombre}}, nos faltan unos documentos',
 '<p>Hola {{nombre}},</p><p>Para terminar tu proceso necesitamos lo siguiente:</p><p>{{mensaje}}</p><p>Puedes responder este correo con los archivos adjuntos.</p>'),
('correo', 'Renovación de póliza', '{{nombre}}, tu póliza está próxima a renovarse',
 '<p>Hola {{nombre}},</p><p>Tu póliza vence pronto. Ya estamos revisando las condiciones de renovación para que sigas protegido sin interrupciones.</p><p>{{mensaje}}</p><p>Si cambió algo (vehículo, dirección, beneficiarios), respóndeme este correo.</p>'),
('correo', 'Gracias por confiar en Vera', '¡Bienvenido a Vera Seguros, {{nombre}}!',
 '<p>Hola {{nombre}},</p><p>Gracias por confiar en nosotros. Tu póliza quedó expedida y te acompañamos durante toda la vigencia: reclamaciones, certificados, pagos y renovaciones.</p><p>{{mensaje}}</p><p>Guarda este correo: aquí tienes a tu asesor, {{asesor}}.</p>');

-- Registro de envíos para el límite diario por empleado (anti-abuso).
create table public.envio (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleado,
  persona_id uuid not null references public.persona on delete cascade,
  plantilla_id uuid references public.plantilla on delete set null,
  canal text not null,
  ok boolean not null,
  detalle text,
  creado timestamptz not null default now()
);
create index on public.envio (empleado_id, creado);
alter table public.envio enable row level security;
create policy gerente on public.envio for select to authenticated using (public.es_gerente());
revoke all on public.envio from anon;

-- Campos para la base de clientes (importación de Woztell y de la base de la compañía).
alter table public.persona
  add column origen text,
  add column nacimiento date,
  add column direccion text,
  add column notas text,
  add column woztell_id text unique,
  add column actualizado timestamptz not null default now();
create index on public.persona (asesor_id);
create index on public.persona (lower(nombre));
