-- Lector del correo: reemplaza a Data Finanzas como fuente. Las facturas electrónicas de Vera salen del ZIP (XML DIAN) y
-- los extractos de comisiones quedan en caratula con estado 'comisiones'; los PDF con clave esperan en 'con_clave'.
alter table public.caratula drop constraint caratula_estado_check;
alter table public.caratula add constraint caratula_estado_check check (estado in ('recibida','poliza','no_es_poliza','comisiones','con_clave','error'));

create table public.factura (
  numero text primary key,                -- FEL1121
  tipo text not null default 'factura' check (tipo in ('factura','nota_credito')),
  fecha date,
  cliente text,                           -- compañía a la que Vera le factura
  nit text,
  subtotal numeric(16,2),
  total numeric(16,2),
  nota text,
  lineas jsonb,
  mensaje text,
  asunto text,
  recibido timestamptz,
  creado timestamptz not null default now()
);
alter table public.factura enable row level security;
create policy gerente on public.factura for select to authenticated using ((select public.es_gerente()));
create policy junta on public.factura for select to authenticated using ((select (public.mi_empleado()).rol) = 'junta');
revoke all on public.factura from anon;

-- Por dónde va el recorrido del correo (día|carpeta) y cuántos PDF puede leer Claude al mes.
insert into public.config_interna (k, v) values ('correo_cursor', '2026-01-01|Inbox'), ('correo_tope', '1000') on conflict (k) do nothing;
