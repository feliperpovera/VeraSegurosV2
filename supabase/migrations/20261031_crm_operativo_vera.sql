-- "Vera" (sin usuario): operativo por defecto de todos los clientes y pólizas hasta que se repartan.
-- También es el comercial de la casa (código VERA en la base de la compañía). DAG y EBM no se usan.
do $$
declare v uuid;
begin
  insert into public.empleado (email, nombre, rol, codigo) values ('vera@sin-usuario.vera', 'Vera', 'comercial', 'VERA') returning id into v;
  execute format('alter table public.persona alter column operativo_id set default %L::uuid', v);
  execute format('alter table public.poliza alter column operativo_id set default %L::uuid', v);
  update public.persona set operativo_id = v where operativo_id is null;
  update public.poliza set operativo_id = v where operativo_id is null;
end $$;

-- Si alguien inserta un operativo vacío explícito (importadores), queda Vera igual que con el valor por defecto.
create function public.operativo_por_defecto() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.operativo_id is null then select id into new.operativo_id from public.empleado where codigo = 'VERA'; end if;
  return new;
end $$;
revoke execute on function public.operativo_por_defecto from public, anon, authenticated;
create trigger operativo_vera before insert on public.persona for each row execute function public.operativo_por_defecto();
create trigger operativo_vera before insert on public.poliza for each row execute function public.operativo_por_defecto();
