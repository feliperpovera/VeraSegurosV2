# Método Top 2: "agencias de seguros en Medellín" (Colombia, español)

Fecha: 18-nov-2026 · Cliente: veraseguros.com

## 1. Snapshot

La keyword genérica "agencias de seguros" es local: Google muestra resultados según la ciudad de quien busca (la captura sin ciudad salió con Cartagena). Por eso el caso se trabaja con "agencias de seguros en Medellín".

| | URL | Tipo |
|---|---|---|
| #1 | https://www.kolau.es/negocios/colombia/antioquia/medellin/corredor-de-seguros | Directorio |
| #2 | https://www.jjseguros.com.co/directorios-aseguradoras/ | Agencia con página "directorio" |
| #3 | paginasamarillas.com.co/medellin/servicios/agencias-de-seguros | Directorio |
| #4 | poliseguros.com.co | Agencia (home) |
| #5 | visionsegura.com | Agencia (home) |

Captura del 18-nov-2026 en el Chrome del usuario con `gl=co&hl=es&pws=0` (sesión iniciada, no incógnito).

Vera en Search Console (3 meses):

| Consulta | Impresiones | Clics | Posición |
|---|---|---|---|
| agencia de seguros | 594 | 3 | 27,0 |
| agencias de seguros en colombia | 172 | 0 | 42,1 |
| agencia de seguros cerca de mi | 133 | 0 | 28,2 |
| agencias de seguros | 98 | 0 | 35,0 |
| agencia de seguros en medellin | 60 | 0 | 19,3 |

## 2. SERP (Fase 1)

- **Intención:** local + comercial. Arriba va el mapa (Local Pack) y los 3 primeros orgánicos son **listados**. Para el plural, Google quiere una lista de agencias, no la home de una.
- **Local Pack:** Piedad Botero (5,0 · 321 reseñas), Magenta Seguros (4,8 · 1.400), AQA (4,9 · 48). Vera aparece en el mapa pero no entre las 3 (4,9 · 111 reseñas).
- **Otras preguntas:** ¿Cuáles son las 5 mejores compañías de seguros en Colombia? · ¿Qué aseguradora es la más recomendable? · ¿Qué compañías de seguros recomiendan? · ¿Cuál es la mejor aseguradora todo riesgo?
- **También se buscó:** Piedad Botero, Poliseguros, A&S Seguros, Daniel Arango Seguros.
- **AI Overview:** no apareció.

## 3. On-page (Fase 2)

| | Kolau #1 | JJ Seguros #2 | Vera (home) | Vera (blog) |
|---|---|---|---|---|
| Title | Listado de Corredores de seguros en Medellín, CO — Actualizado 2026 | Directorio de Agencias de Seguros en Medellín | Agencia de seguros en Medellín y Colombia | Agencia de seguros en Medellín: qué hace y por qué te ahorra plata |
| Contenido real | **3 negocios listados**, 0 reseñas | 228 palabras; lista 7 **aseguradoras**, no agencias | 687 palabras | 530 palabras |
| Contenido sin JS | No (56 palabras en el HTML) | Sí | Sí | Sí |
| Schema | Ninguno | Ninguno | InsuranceAgency, FAQPage | BlogPosting, FAQPage |
| Keyword en plural | Sí (corredores) | Sí | No | No |

**Lectura:** los dos primeros ganan por **formato** (prometen una lista en el título), no por calidad. Kolau tiene 3 fichas y JJ lista aseguradoras bajo el nombre de "agencias". Ninguna página de Vera ofrece una lista ni usa el plural.

## 4. Técnica (Fase 3)

| | Datos de campo | Laboratorio |
|---|---|---|
| JJ Seguros | Sin datos (poco tráfico) | Rendimiento 69 |
| Visión Segura | Sin datos | No cargó |
| Vera (home) | **Aprueba**: LCP 1,4 s · INP 197 ms · CLS 0 | — |

Vera es la única con datos de campo y aprueba Core Web Vitals. La velocidad no es la palanca.

## 5. Enlaces (Fase 4)

- `backlinks_bot.py` sobre 10 directorios candidatos: **0 enlaces verificados** para los tres. 5 directorios bloquearon al bot (403) y Kolau carga por JavaScript, así que el resultado es parcial.
- Revisión manual en el navegador: **Páginas Amarillas lista a Visión Segura y no a Vera**. Kolau no lista a Vera (solo tiene 3 negocios).
- Lectura: la brecha de autoridad frente a JJ y Kolau es baja. La brecha real está en el mapa (reseñas y ficha) y en las citas en directorios.

## 6. Vulnerabilidad (Fase 6.1), sobre 16

| Criterio | Kolau | JJ Seguros |
|---|---|---|
| Ajuste a la intención | 1 | 1 |
| Frescura | 0 | 1 |
| Profundidad | 2 | 2 |
| Experiencia propia | 2 | 2 |
| Autor y confianza | 2 | 1 |
| Enlaces a la página | 1 | 2 |
| Experiencia de página | 1 | 1 |
| Conversión y utilidad | 1 | 1 |
| **Total** | **10: atacable** | **11: vulnerable** |

## 7. Ángulo y decisión

**Atacar de frente** con cambio de formato (ángulos 1 + 2 + 6): competidores vulnerables y brecha de autoridad baja.

## 8. Brief

**URL objetivo:** `/blog/agencia-de-seguros-medellin/` (mejorar la existente; la home sigue apuntando al singular).

1. **Title:** "Agencias de seguros en Medellín: cómo elegir y dónde encontrarlas (2026)"
2. **H1:** "Agencias de seguros en Medellín: guía para elegir bien"
3. **Primer bloque:** qué es una agencia, que no cobra al cliente y cómo verificar que es idónea.
4. **Secciones:**
   - Cómo verificar una agencia: consulta en el SUCIS o registro de intermediarios de la aseguradora (verificar la fuente oficial antes de publicar).
   - Agencia vs. corredor vs. aseguradora directa (tabla).
   - 7 preguntas para hacerle a una agencia antes de contratar.
   - Oficinas de las aseguradoras en Medellín (dirección y teléfono oficiales, con fuente): es lo que hoy ofrece JJ, hecho mejor.
   - Zonas: El Poblado, Laureles, Envigado, Sabaneta (dónde atiende Vera).
   - Qué aseguradoras maneja Vera y sus 111 reseñas.
5. **Local (lo que más pesa):**
   - Ficha de Google: categoría principal "Agencia de seguros", servicios, fotos de la oficina, publicaciones semanales.
   - Seguir pidiendo reseñas: Piedad Botero tiene 321 y Magenta 1.400.
   - Alta gratuita en Páginas Amarillas, Kolau, Cylex e Infoisinfo, con nombre, dirección y teléfono idénticos a los de la ficha.
6. **No hacer:** listar agencias competidoras con juicios de valor, ni inventar un "ranking".

## 9. KPIs (línea base)

- "agencia de seguros en medellin": posición 19,3 · 60 impresiones.
- "agencias de seguros": posición 35,0 · 98 impresiones.
- "agencia de seguros": posición 27,0 · 594 impresiones.
- Local Pack en Medellín: fuera del top 3.

## Pendiente

- Prueba GEO/AEO en 5 motores.
- Captura en incógnito real y desde Medellín (la de hoy se hizo con ubicación Cartagena para la keyword genérica).
- Enlaces: exportar Bing Webmaster y GSC → Enlaces para darle más candidatos al bot.

## Limitaciones

Google no publica pesos de ranking; la SERP local cambia según la ubicación de quien busca; no se garantizan posiciones ni plazos.
