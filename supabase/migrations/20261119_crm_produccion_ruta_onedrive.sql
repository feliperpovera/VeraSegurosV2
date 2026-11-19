-- La carátula se queda en OneDrive (no se sube el PDF): poliza.datos.ruta_onedrive guarda su ruta relativa a _Comercial/Clientes
-- y la vista produccion la expone como ruta_onedrive para mostrarla en la ficha del cliente. Aplicada el 2026-11-19.
-- create or replace view public.produccion with (security_invoker = true) as … , p.datos ->> 'ruta_onedrive' AS ruta_onedrive from poliza p …

-- recalcular_cancelaciones, paso 2 (avisos por correo): se agregó "and c.de is distinct from 'OneDrive'". Las carátulas de OneDrive ya cuentan
-- por su carpeta (paso 1) y, sin el filtro, la función pasaba de 2 minutos (statement_timeout) y el cron diario fallaba. Aplicada el 2026-11-19.
