# Método Top 2: "seguro de salud" (Colombia, español)

Fecha: 10-nov-2026 · Cliente: veraseguros.com · URL objetivo: https://veraseguros.com/seguros/salud/

## 1. Snapshot

| | URL | Posición hoy* |
|---|---|---|
| #1 | https://www.sura.co/seguros/personas/salud/poliza | 1 |
| #2 (dado) | https://queseguro.co/Comparar | 3 (hoy el #2 es Davivienda) |
| Vera | /seguros/salud/ | 19,8 (GSC, 3 meses; 177 impresiones, 0 clics) |

*Captura del 10-nov-2026 en el Chrome del usuario con `gl=co&hl=es&pws=0` (no es incógnito: hay algo de personalización). Ubicación: Medellín.

Canibalización: casi nula. El 97% de las impresiones de esta keyword va a /seguros/salud/. Otras URLs: home (3), /seguros/salud/precios/ (2), /seguro-de-salud-medellin.html (1).

## 2. SERP (Fase 1)

- **Intención:** comercial-transaccional. 7 de los 8 orgánicos son páginas de producto de aseguradoras (SURA, Davivienda, Bolívar, Mapfre, Positiva, Falabella, AXA). Solo uno es un comparador (QueSeguro). **Hueco: el formato comparador está poco servido.**
- **Orgánicos:** 1 SURA · 2 Davivienda · 3 QueSeguro (estrellas 9,7/10 con 50 opiniones) · 4 Bolívar (fechado 3-mar-2026) · 5 Mapfre · 6 Positiva · 7 Falabella · 8 AXA Colpatria.
- **Anuncios:** Coomeva (revendedor), Colsanitas. El anuncio de Vera puede mostrarse.
- **Local Pack:** QueSeguro (5,0 · 61 reseñas), Seguralia Medellín (5,0 · 125 reseñas), centro médico Allianz. **Vera no aparece**, aunque tiene 4,9 con 100 reseñas.
- **AI Overview:** no apareció en esta captura.
- **Otras preguntas (PAA):** ¿Qué costo tiene un seguro de salud? · ¿Cuál es el mejor seguro de salud en Colombia? · ¿Cuál es la mejor compañía de seguros de salud? · ¿Cuánto cuesta un seguro de salud al mes?
- **También se buscó:** precios · cuál es el mejor · seguro de salud EPS · seguros de salud en Colombia · SURA · Bancolombia · póliza de salud SURA tarifas.

## 3. On-page (Fase 2)

| | SURA #1 | QueSeguro #2 | Vera |
|---|---|---|---|
| Title | Pólizas de salud SURA - Compara nuestros Seguros de Salud | Seguros de salud en Colombia: compara precios \| QueSeguro.co | Seguros de salud en Colombia 2026: compara pólizas y precios |
| Meta description | No tiene | Compara medicina prepagada y pólizas… precio directo | Compara seguros de salud y medicina prepagada… precios 2026 por edad |
| H1 | La Póliza de Salud | Seguros de Salud en Colombia | Seguros de salud y medicina prepagada en Colombia |
| Palabras | ~2.800 (mucho menú) | ~1.200 (versión prerenderizada para bots) | ~1.600 |
| Precios visibles | No | Sí: 50 planes, de $16.860 a $722.100 | Sí: 15 planes a los 35 años, con IVA aparte |
| Herramienta | Asesoría | Comparador con filtros (precio, clínicas, tipo, compañía) | Cotizador en iframe y tabla comparativa |
| Schema | Ninguno | Product, AggregateRating, AggregateOffer, ItemList, FAQPage | InsuranceAgency, Service, FAQPage, BreadcrumbList |
| Canonical | No tiene | Autorreferente | Autorreferente |
| Contenido sin JS | Sí | No: app Angular; a Googlebot le sirve una versión prerenderizada | Sí |
| Autor | Marca | Marca | Marca |

**Lectura:**
1. **Mínimo obligatorio:** qué cubre (hospitalización, especialistas, urgencias, internacional), precio y opciones de deducible o copago.
2. **Dos formas de ganar:** la marca (SURA) o el comparador con precios (QueSeguro). Vera ya juega el segundo partido, y con más evidencia: precio por edad, tabla de coberturas y "no somos una EPS".
3. **Title:** el de Vera es casi igual al de QueSeguro. No se diferencia y está en plural; la búsqueda es en singular.

## 4. Técnica (Fase 3): Core Web Vitals de campo (CrUX, móvil, 28 días)

| | LCP | INP | CLS | Resultado |
|---|---|---|---|---|
| SURA | 2,5 s | **284 ms** | 0 | Falla |
| QueSeguro | **4,6 s** | **689 ms** | **0,44** | Falla grave |
| Vera | 1,4 s | **240 ms** | 0 | Falla solo por INP |

Indexación de Vera: la página está en Google (tiene impresiones en GSC). Canonical bien, www redirige con 301 y robots.txt no bloquea nada. **Arreglar el INP de Vera (240 ms) es un desempate barato:** sería la única de las tres que pasa Core Web Vitals. El sospechoso es el iframe del cotizador.

## 5. Autoridad y confianza (Fase 4)

- **Enlaces: pendiente.** No hay acceso a Ahrefs, Semrush ni Moz en esta sesión. Sin ese dato, la brecha se estima así: SURA tiene autoridad de marca nacional (alta); QueSeguro es un corredor digital con más de 5 años (media).
- **E-E-A-T:**
  - SURA es la aseguradora.
  - QueSeguro muestra reseñas y tiene ficha de Google con 5,0.
  - Vera tiene oficina en Medellín, 4,9 en Google con 100 reseñas y "Aliados oficiales de SURA", pero **las reseñas no se ven en esta página**.

## 6. Brecha de contenido (Fase 5)

Escala: 0 = no lo trata, 1 = lo menciona, 2 = lo resuelve con evidencia.

| Subtema | SURA | QueSeguro | Vera |
|---|---|---|---|
| Cuánto cuesta (por edad) | 0 | 2 | 2 |
| Cuánto cuesta **al mes**, respuesta directa | 0 | 1 | 1 |
| Cuál es el mejor seguro de salud (criterio) | 0 | 0 | 0 |
| Diferencia con la EPS y la prepagada | 1 | 1 | 2 |
| Preexistencias | 1 | 1 | 0 |
| Edad límite y mayores de 60 | 2 | 1 | 2 |
| Deducible o copago | 2 | 2 | 1 |
| Red de clínicas por ciudad | 1 | 2 | 1 |
| Cómo contratar y requisitos | 0 | 0 | 1 |
| Beneficio tributario (deducción en renta) | 0 | 0 | 0 |

- **Ventaja diferencial disponible (0 o 1 en ambos competidores):** criterio de "mejor seguro de salud", respuesta directa de "cuánto cuesta al mes", preexistencias, cómo contratar y beneficio tributario.
- **Datos que solo Vera tiene:**
  - Más de 1.300 pólizas vigentes administradas: se puede sacar un precio promedio real por rango de edad, anonimizado, con fecha y método.
  - Tiempos reales de expedición.
  - Asesores con nombre.
  - Oficina en Medellín.

## 7. Vulnerabilidad (Fase 6.1)

Escala de cada criterio: 0 = fuerte, 2 = vulnerable.

| Criterio | SURA | QueSeguro |
|---|---|---|
| Ajuste a la intención | 0 | 0 |
| Frescura | 1 | 0 |
| Profundidad en subtemas | 1 | 1 |
| Experiencia propia | 0 | 1 |
| Autor y confianza | 1 | 1 |
| Enlaces a la página | 0 | 1 (estimado) |
| Experiencia de página | 1 | 2 |
| Conversión y utilidad | 1 | 0 |
| **Total (sobre 16)** | **5: sólido** | **6: atacable** |

## 8. Ángulo y decisión (Fase 6.3)

- **SURA:** sólido, y la brecha de autoridad es alta. **No se ataca de frente.** Es la marca que Vera vende: competir por su posición #1 no tiene sentido comercial.
- **QueSeguro y Davivienda:** atacables, con brecha baja o media. **Ataque frontal por los puestos 2 y 3** con los ángulos 1, 3 y 4:
  - comparador con datos frescos,
  - dato propio,
  - experiencia de asesor con nombre.
- **Más el ángulo 6 (local):** el Local Pack aparece en Medellín y Vera no entra, a pesar de tener 100 reseñas.

## 9. Brief para /seguros/salud/ (mejorar la URL existente, no crear otra)

1. **Title (58 caracteres):** "Seguro de salud en Colombia: precios 2026 de 7 aseguradoras"
2. **Meta description:** "¿Cuánto cuesta un seguro de salud? Desde $97.000 al mes + IVA. Compara SURA, Bolívar, Allianz, AXA, Coomeva y más por edad. Asesoría gratis en Medellín."
3. **H1:** "Seguro de salud en Colombia: compara precios y coberturas". La medicina prepagada pasa a un H2, porque tiene su propia página.
4. **Primer bloque visible, respuesta directa de 40 a 60 palabras:** "Un seguro de salud en Colombia cuesta desde unos $97.000 al mes + IVA (plan liviano) hasta $746.000 (premium), para una persona de 35 años. Complementa tu EPS, no la reemplaza: te da especialistas sin remisión, clínicas privadas y, en planes premium, cobertura internacional."
5. **H2 nuevos o ampliados:**
   - ¿Cuánto cuesta un seguro de salud al mes? Tabla por edad: 25, 35, 45, 55 y 65 años.
   - ¿Cuál es el mejor seguro de salud en Colombia? Criterio propio de Vera: red de clínicas por ciudad, preexistencias, edad de ingreso, deducible y precio. Se dice explícitamente que depende del perfil.
   - Seguro de salud vs. EPS vs. medicina prepagada.
   - Preexistencias, edad límite y periodos de carencia.
   - Cómo contratarlo: requisitos, declaración de salud y tiempos reales de Vera.
   - Beneficio tributario: deducción en renta por pagos de salud. **Verificar la cifra en UVT con la fuente de la DIAN y el Estatuto Tributario antes de publicar.**
6. **Dato propio:** "Precio promedio que pagan los clientes de Vera por rango de edad (n pólizas, corte nov-2026)", con la metodología en una línea.
7. **Confianza:**
   - mostrar "4,9 en Google · 100 reseñas" con el enlace a la ficha;
   - asesor con nombre y foto, y una cita con su cargo;
   - "Vera Asesores Ltda., NIT 901.039.892-0".
   - **No** agregar schema AggregateRating propio: las reseñas propias no son elegibles para estrellas.
8. **Enlaces internos entrantes con anclas descriptivas:** home → "seguro de salud"; blog/mejor-medicina-prepagada-colombia, blog/medicina-prepagada-adultos-mayores, /seguros/salud/precios/, /seguros/salud/adultos-mayores/ y /seguro-de-salud-medellin.html → "seguro de salud en Colombia" o "comparar seguros de salud".
9. **Técnica:**
   - bajar el INP a menos de 200 ms (cargar el iframe del cotizador de forma diferida y revisar los manejadores de eventos);
   - pedir la indexación en GSC después de publicar.
10. **CTA principal:** el cotizador en la página. La alternativa es WhatsApp.

## 10. Plan de 90 días

- **Días 1 a 30:**
  - title, meta, H1 y primer bloque;
  - secciones nuevas y dato propio;
  - INP;
  - enlaces internos;
  - **GBP:** revisar categorías de salud, fotos, publicaciones y respuestas a reseñas.
- **Días 31 a 60:**
  - 2 o 3 páginas long tail enlazadas a la principal: "seguro de salud precios" (ya existe /seguros/salud/precios/), "seguro de salud EPS" y "póliza de salud SURA tarifas";
  - un video corto del asesor explicando la diferencia entre EPS, póliza y prepagada;
  - outreach a enlaces intersección cuando haya acceso a Ahrefs o Semrush.
- **Días 61 a 90:**
  - leer las consultas en GSC y ampliar las secciones con impresiones y sin clics;
  - ajustar title y meta si el CTR está por debajo del 2% en el top 10;
  - segunda ola de reseñas en GBP.

**KPIs:**
- posición media en GSC, semanal (línea base 19,8);
- impresiones, semanal (177 en 3 meses);
- CTR, quincenal (0%);
- posición con captura, mensual;
- leads orgánicos de salud en GA4 (`generate_lead` con fuente orgánica), mensual.

## Pendiente para cerrar el checklist

- Enlaces: dominios de referencia y enlaces intersección (falta acceso a Ahrefs, Semrush o Moz).
- Prueba GEO/AEO en 5 motores con 7 u 8 repeticiones por pregunta.
- Captura de la SERP en incógnito real. La de hoy se hizo en una sesión iniciada, con pws=0.

## Limitaciones

- Google no publica los pesos de ranking.
- La SERP es personalizada y cambia; este caso vale para la fecha indicada.
- No se garantizan posiciones ni plazos.
