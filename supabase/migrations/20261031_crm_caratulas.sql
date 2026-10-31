-- CRM fase 2: carátulas que llegan a info@ (Outlook → Logic App → función caratulas → Claude).
-- Cada PDF queda registrado una sola vez (hash), guardado en Storage privado y, si es póliza, convertido en poliza.

create table public.caratula (
  id uuid primary key default gen_random_uuid(),
  hash text not null unique,              -- sha256 del PDF: el mismo archivo nunca se procesa dos veces
  mensaje text,                           -- id del correo en Outlook
  de text,
  asunto text,
  recibido timestamptz,
  nombre text,
  pdf_path text,
  estado text not null default 'recibida' check (estado in ('recibida','poliza','no_es_poliza','error')),
  poliza_id uuid references public.poliza on delete set null,
  datos jsonb,
  error text,
  creado timestamptz not null default now()
);
alter table public.caratula enable row level security;
create policy gerente on public.caratula for select to authenticated using (public.es_gerente());
revoke all on public.caratula from anon;

-- PDFs privados: solo acceso total los abre (con enlace firmado de 5 min desde el CRM).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('caratulas', 'caratulas', false, 15728640, array['application/pdf']);
create policy caratulas_gerente on storage.objects for select to authenticated
  using (bucket_id = 'caratulas' and public.es_gerente());

-- Llave que la Logic App manda en la cabecera x-clave (se copia desde config_interna, nunca va en el código).
insert into public.config_interna (k, v) values ('caratulas_key', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (k) do nothing;
