-- ARL por mes y compañía: se cobra por nómina, así que no vive en las pólizas. Sale de la facturación.
create table public.arl_mes (
  anio int not null check (anio between 2015 and 2100),
  mes int not null check (mes between 1 and 12),
  aseguradora text not null,
  prima numeric(16,2),
  comision numeric(16,2),
  actualizado timestamptz not null default now(),
  primary key (anio, mes, aseguradora)
);
alter table public.arl_mes enable row level security;
create policy gerente on public.arl_mes for all to authenticated using ((select public.es_gerente())) with check ((select public.es_gerente()));
create policy junta on public.arl_mes for select to authenticated using ((select (public.mi_empleado()).rol) = 'junta');
revoke all on public.arl_mes from anon;
