-- Comisión y prima por compañía y mes, leídas de los informes de la carpeta Finanzas/Comisiones. Reemplaza a Data Finanzas.
create table public.comision_mes (
  anio int not null check (anio between 2015 and 2100),
  mes int not null check (mes between 1 and 12),
  compania text not null,
  linea text not null default 'general' check (linea in ('general','ARL')),
  prima numeric(16,2),
  comision numeric(16,2),
  cuadra boolean not null default false,
  archivos text[],
  nota text,
  actualizado timestamptz not null default now(),
  primary key (anio, mes, compania, linea)
);
alter table public.comision_mes enable row level security;
create policy gerente on public.comision_mes for all to authenticated using ((select public.es_gerente())) with check ((select public.es_gerente()));
create policy junta on public.comision_mes for select to authenticated using ((select (public.mi_empleado()).rol) = 'junta');
revoke all on public.comision_mes from anon;
