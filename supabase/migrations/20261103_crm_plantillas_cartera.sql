-- Plantillas de cobro por zona de cartera. Las de WhatsApp quedan inactivas hasta que Meta las apruebe en Woztell
-- (mismo meta_nombre); al activarlas, el botón de la zona envía por WhatsApp y usa correo solo si no hay celular.
insert into public.plantilla (canal, nombre, asunto, cuerpo) values
('correo', 'Cartera vencida', '{{nombre}}, tienes un pago pendiente de tu seguro',
'Hola {{nombre}}:

Según nuestros registros, tienes un pago pendiente de tu seguro:

{{mensaje}}

Te invitamos a ponerte al día para mantener tu cobertura activa. Si ya pagaste, ignora este mensaje. Si necesitas el link de pago, responde este correo o escríbenos por WhatsApp.

{{asesor}} · Vera Seguros'),
('correo', 'Vencida en peligro', '{{nombre}}, tu seguro necesita tu atención',
'Hola {{nombre}}:

Tu pago sigue pendiente y tu cobertura podría verse afectada:

{{mensaje}}

Paga lo antes posible para evitar inconvenientes si llegas a necesitar tu seguro. Si ya pagaste, ignora este mensaje. Si tienes alguna dificultad, cuéntanos y buscamos una solución.

{{asesor}} · Vera Seguros'),
('correo', 'Riesgo de cancelación', 'Importante, {{nombre}}: tu póliza podría cancelarse',
'Hola {{nombre}}:

Tu póliza está en riesgo de cancelación por falta de pago:

{{mensaje}}

Si se cancela, quedas sin cobertura. Por favor paga hoy o escríbenos para ayudarte. Si ya pagaste, ignora este mensaje y envíanos el comprobante.

{{asesor}} · Vera Seguros');

insert into public.plantilla (canal, nombre, cuerpo, meta_nombre, idioma, variables, activa) values
('whatsapp', 'Cartera vencida', 'Hola {{1}}, según nuestros registros tienes un pago pendiente de tu seguro: {{2}}. Ponte al día para mantener tu cobertura activa. Si ya pagaste, ignora este mensaje. Vera Seguros', 'vera_cartera_vencida', 'es', array['nombre','mensaje'], false),
('whatsapp', 'Vencida en peligro', 'Hola {{1}}, tu pago sigue pendiente y tu cobertura podría verse afectada: {{2}}. Paga lo antes posible o escríbenos si tienes alguna dificultad. Si ya pagaste, ignora este mensaje. Vera Seguros', 'vera_cartera_peligro', 'es', array['nombre','mensaje'], false),
('whatsapp', 'Riesgo de cancelación', 'Hola {{1}}, tu póliza está en riesgo de cancelación por falta de pago: {{2}}. Si se cancela quedas sin cobertura. Paga hoy o escríbenos por aquí para ayudarte. Si ya pagaste, envíanos el comprobante. Vera Seguros', 'vera_cartera_riesgo', 'es', array['nombre','mensaje'], false);
