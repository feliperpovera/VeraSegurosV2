# WhatsApp con la cotización de autos (Woztell)

Objetivo: cuando un cliente cotiza su carro o moto en veraseguros.com/seguros/auto/, enviarle por WhatsApp un mensaje con sus mejores precios y un enlace para ver todas las ofertas.

## Cómo funciona hoy

1. El cliente llena el cotizador (`cotizador-de-autos/index.html`, embebido en `/seguros/auto/`), confirma su celular con un código SMS (Twilio Verify) y envía.
2. La Edge Function de Supabase **`autos`** (`supabase/functions/autos/index.ts`, proyecto `cwfvqusyvfdohjmgefli`) crea la cotización en Agente Motor.
3. Agente Motor llama a la misma función (`?cb=<id>.<token>`) con cada oferta o error; se guardan en la base.
4. Un cron (`pg_cron`, job `autos-tareas`, cada minuto) llama a la función con `?tareas=1` y hace:
   - reintento a los 5 min si una aseguradora falló por error técnico;
   - correos de seguimiento a las 12 h y 24 h (Resend).

**El lugar natural para WhatsApp es `tareas()`**, igual que los correos: un paso nuevo que envíe el WhatsApp unos minutos después de cotizar, cuando ya llegaron las ofertas.

## Datos disponibles

Tabla `public.auto_cotizacion` (RLS activo, solo service role):

| Columna | Contenido |
|---|---|
| `id` (uuid), `token` | Identifican la cotización; enlace del cliente: `https://veraseguros.com/seguros/auto/?ver=<id>.<token>#cotizador` |
| `creado` | Fecha de la cotización |
| `estado` | `aceptada` (Agente Motor la recibió) o `rechazada` |
| `datos` (jsonb) | `nombre`, `apellido`, `tel` (10 dígitos, sin +57, **verificado por SMS**), `email`, `placa` (vacía si es 0 km), `ciudad`, `utm` |
| `reintentada`, `correo_12h`, `correo_24h` | Control de tareas ya hechas |

Tabla `public.auto_oferta`: `cotizacion_id`, `evento` (`oferta` o `error`), `data` (jsonb).
- Oferta: `aseguradora`, `plan`, `precio` (anual, número), `cuotas`, `coberturas[]`.
- Error: `aseguradora`, `estado` (motivo), `tecnico` (bool).
- Puede haber ofertas repetidas por el reintento: deduplicar por `aseguradora|plan`.

Ejemplo real (placa DXQ095): Quálitas Base $436.969 · Allianz Autos Esencial $1.471.280 · Quálitas Plus $1.586.122.

## Qué hay que construir

1. **Columna de control:** `alter table public.auto_cotizacion add column whatsapp_enviado timestamptz;`
2. **Paso en `tareas()`:** cotizaciones `aceptada`, `whatsapp_enviado is null`, `creado` entre hace 4 y 60 minutos, con al menos 1 oferta → enviar y marcar `whatsapp_enviado = now()`. Si no hay ofertas a los 60 min, no enviar (o enviar plantilla "un asesor te contacta").
3. **Envío por la API de Woztell** desde la función (no desde el navegador). Número destino: `+57` + `datos.tel`.
4. **Secreto en Supabase** (Edge Functions → Secrets), por ejemplo `WOZTELL_TOKEN` y los IDs que pida Woztell (canal / número). Nunca en el código ni en el repositorio.
5. **Desplegar** la función: se despliega pegando el archivo completo con la herramienta `deploy_edge_function` del MCP de Supabase (`verify_jwt: false`). Probar primero con la acción gratuita `{"accion":"auth"}`.

## Requisitos de WhatsApp (importante)

- Es un mensaje que inicia la empresa, así que **debe ser una plantilla aprobada por Meta** (categoría *Utility*, porque responde a una solicitud del cliente). Sin plantilla aprobada, Meta lo rechaza.
- Propuesta de plantilla (variables `{{1}}`…):

  > Hola {{1}}, estas son tus mejores ofertas de seguro todo riesgo para {{2}}:
  > 1. {{3}}
  > 2. {{4}}
  > 3. {{5}}
  > Precios anuales, sujetos a inspección y aceptación de la aseguradora.
  > Botón URL: "Ver todas mis ofertas" → `https://veraseguros.com/seguros/auto/?ver={{1}}`
  > Botón respuesta rápida: "Hablar con un asesor"

  Variables: `{{1}}` nombre, `{{2}}` placa o "tu vehículo 0 km", `{{3}}`–`{{5}}` "Aseguradora · Plan: $precio". Si hay menos de 3 ofertas, usar una plantilla con menos líneas o "—".
- **Consentimiento:** el cotizador ya pide autorización para "contactarme por correo o WhatsApp sobre esta cotización" (casilla obligatoria). Mantenerla.
- El número de WhatsApp de Vera es **+57 315 670 5627**. Si Woztell usa ese mismo número, las respuestas del cliente llegan a la bandeja de Woztell/WhatsApp Business.

## Reglas del negocio

- El costo de cada cotización ($4.790 de Agente Motor) lo asume Vera; **nunca** se menciona al cliente.
- Textos cortos, sin relleno; tono cercano.
- No enviar más de un WhatsApp automático por cotización.

## Archivos y piezas clave

- `supabase/functions/autos/index.ts`: función completa (`tareas()`, `correo()`, `htmlSeguimiento()` sirven de modelo).
- `cotizador-de-autos/index.html`: cotizador (texto de autorización).
- `tools/build-seo.mjs`: genera `/seguros/auto/` (constantes `AUTOS_ACTIVO`, `SOAT_PORTAL`).
- Secretos actuales: `AGM_USER`, `AGM_API_KEY`, `AGM_TENANT`, `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_VERIFY_SID`, `RESEND_API_KEY`.
