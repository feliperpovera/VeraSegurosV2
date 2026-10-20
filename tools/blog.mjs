// Blog (/blog/ y /blog/<slug>/). Cada artículo apunta a una búsqueda que ya está
// en posición 10-30 en Search Console. Los precios salen del cotizador (misma tabla
// que el comparador), así el blog nunca contradice las guías.

import fs from 'node:fs';
import path from 'node:path';
import { cargarCotizador } from './guias-salud.mjs';

export function blog({ ROOT, SITE, HOY, esc, WA, ICON_WA, PRODUCTOS, NOMBRE }) {
  const { DATA, cotizar, fmt, PREPAGADA } = cargarCotizador(ROOT);
  const BASE = `${SITE}/blog/`;
  const plan = (id, k) => DATA.find((c) => c.id === id)[k];
  const precio = (id, k, e) => cotizar(plan(id, k), e, 'medellin', id).price;
  const prepagada = (e) => PREPAGADA.flatMap((c) => ['M', 'F'].map((s) => cotizar(c.mp, e, 'medellin', 'coomeva', s).price)).filter((x) => x != null);
  const rango = (v) => `${fmt(Math.min(...v))} y ${fmt(Math.max(...v))}`;
  // Solo Bolívar: es la única póliza con tarifario oficial publicado por la propia aseguradora.
  const bolivar = (e, k) => fmt(precio('bolivar', k, e));

  const plano = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const fecha = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  const cta = (msg, txt) => `<p class="cta-inline"><a class="btn-wa boton-grande btn-wa-guia" data-seguro="Salud" href="${WA(msg)}" target="_blank" rel="noopener">${ICON_WA} ${txt}</a> <a class="btn-tel" href="/seguros/salud/#cotizador">Ver precios para mi edad</a></p>`;
  const fuente = `<p class="fuente">Precios mensuales de referencia antes de IVA (5 %), tomados de los tarifarios oficiales 2026 de Coomeva Medicina Prepagada y Seguros Bolívar, los mismos de nuestro <a href="/seguros/salud/#cotizador">comparador</a>; no son una cotización en firme. Última revisión: ${fecha(HOY)}.</p>`;

  const FUENTES = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/blog-fuentes.json'), 'utf8'));
  const FUENTES_EXT = () => extranjeros(FUENTES, esc);
  const posts = [];
  const add = (p) => posts.push({ cat: 'salud', ...p });

  // ---------- 1. Cuánto cuesta la medicina prepagada ----------
  add({
    slug: 'cuanto-cuesta-medicina-prepagada-colombia',
    title: '¿Cuánto cuesta la medicina prepagada en Colombia en 2026?',
    description: `Medicina prepagada en Colombia 2026: desde ${fmt(Math.min(...prepagada(25)))} al mes a los 25 años. Precios por edad, qué sube la tarifa y cómo pagar menos.`,
    h1: '¿Cuánto cuesta la medicina prepagada en Colombia en 2026?',
    lead: 'Precios reales por edad, qué hace subir la tarifa y cómo pagar menos sin perder cobertura.',
    publicado: '2026-10-13',
    contenido: `<h2>La respuesta corta</h2>
<p>En 2026 un plan de medicina prepagada de Coomeva cuesta entre <strong>${rango(prepagada(25))}</strong> al mes a los 25 años, y entre <strong>${rango(prepagada(45))}</strong> a los 45. Como referencia, la póliza ${esc(plan('bolivar', 'cla').plan)} de Seguros Bolívar cuesta <strong>${bolivar(35, 'cla')}</strong> al mes a los 35 años.</p>
<div class="tabla-wrap"><table class="dato num">
<caption class="vh">Rango de precio mensual de la medicina prepagada Coomeva por edad, 2026</caption>
<thead><tr><th scope="col">Edad</th><th scope="col">Más barato</th><th scope="col">Más completo</th></tr></thead>
<tbody>${[25, 35, 45, 55].map((e) => { const v = prepagada(e); return `<tr><th scope="row">${e} años</th><td>${fmt(Math.min(...v))}</td><td>${fmt(Math.max(...v))}</td></tr>`; }).join('')}</tbody>
</table></div>
<h2>Qué hace subir el precio</h2>
<ul>
<li><strong>La edad.</strong> Es lo que más pesa: la tarifa sube por rangos de edad.</li>
<li><strong>El programa.</strong> Los planes con más red de clínicas y especialistas cuestan más.</li>
<li><strong>El sexo.</strong> En Coomeva la tarifa cambia entre hombre y mujer en algunas edades.</li>
<li><strong>Cuántas personas afilias.</strong> Cada miembro del grupo familiar paga su propia tarifa.</li>
</ul>
<h2>Cómo pagar menos</h2>
<ul>
<li>Afíliate joven: la tarifa de ingreso es más baja y la permanencia suele ser vitalicia.</li>
<li>Si eres asociado de la cooperativa Coomeva, pide el Plan Asociado: es más barato.</li>
<li>Compara con una póliza de salud: a veces da más cobertura por el mismo valor.</li>
</ul>
<p>Mira la tabla completa por programa en la guía <a href="/seguros/salud/medicina-prepagada/">medicina prepagada en Colombia 2026</a> o compara todo en <a href="/seguros/salud/precios/">precios de seguros de salud por edad</a>.</p>
${cta('Hola Vera Seguros, quiero saber cuánto me cuesta la medicina prepagada.', 'Cotiza tu prepagada gratis')}`,
    faq: [
      ['¿Cuánto vale la medicina prepagada en Colombia?', `<p>En 2026, entre ${rango(prepagada(35))} al mes a los 35 años, antes de IVA, según el programa de Coomeva que elijas.</p>`],
      ['¿La medicina prepagada paga IVA?', '<p>Sí. Los precios de esta página están antes de IVA, que en salud es del 5 %.</p>'],
      ['¿Necesito EPS para tener medicina prepagada?', '<p>Sí. En Colombia la medicina prepagada y las pólizas de salud exigen estar afiliado a una EPS.</p>'],
    ],
  });

  // ---------- 2. Mejor medicina prepagada ----------
  add({
    slug: 'mejor-medicina-prepagada-colombia',
    title: '¿Cuál es la mejor medicina prepagada en Colombia en 2026?',
    description: 'Cómo elegir la mejor medicina prepagada o póliza de salud en Colombia en 2026: 5 criterios, comparativo de aseguradoras y precios por edad.',
    h1: '¿Cuál es la mejor medicina prepagada en Colombia?',
    lead: 'No hay una mejor para todos. Hay una mejor para tu edad, tu ciudad y tu bolsillo. Así se elige.',
    publicado: '2026-10-13',
    contenido: `<h2>La respuesta corta</h2>
<p>La mejor es la que tiene <strong>tus clínicas y médicos en la red</strong>, te acepta <strong>a tu edad</strong> y cuyo precio puedes sostener <strong>toda la vida</strong>. Por eso conviene comparar medicina prepagada y pólizas de salud juntas: SURA, Seguros Bolívar, Allianz, AXA Colpatria y Coomeva.</p>
<h2>5 criterios para elegir</h2>
<ol>
<li><strong>Red de clínicas.</strong> Revisa que tu clínica de confianza esté incluida.</li>
<li><strong>Edad de ingreso y permanencia.</strong> Algunos planes no reciben después de los 59 o 60 años.</li>
<li><strong>Precio a futuro.</strong> La tarifa sube con la edad; mira el precio a los 60, no solo el de hoy.</li>
<li><strong>Preexistencias y carencias.</strong> Lo que ya tienes diagnosticado puede quedar excluido.</li>
<li><strong>Maternidad.</strong> Si planeas hijos, revisa los períodos de espera.</li>
</ol>
<h2>Prepagada o póliza de salud</h2>
<p>La prepagada funciona con una red cerrada de médicos y clínicas. La póliza de salud suele dar más libertad y reembolso. Como referencia, la póliza ${esc(plan('bolivar', 'cla').plan)} de Seguros Bolívar cuesta ${bolivar(35, 'cla')} al mes a los 35 años.</p>
<p>Ve las diferencias completas en <a href="/seguros/salud/medicina-prepagada/">¿prepagada o póliza de salud?</a> y la tabla lado a lado en <a href="/seguros/salud/comparativo-aseguradoras/">SURA vs. Allianz vs. Bolívar vs. AXA</a>.</p>
${cta('Hola Vera Seguros, quiero saber cuál es la mejor medicina prepagada para mí.', 'Te decimos cuál te conviene')}`,
    faq: [
      ['¿Cuál es la mejor prepagada de Colombia?', '<p>Depende de tu edad, tu ciudad y las clínicas que quieres usar. Compara red, edad de permanencia y precio a futuro antes de decidir.</p>'],
      ['¿Es mejor una prepagada o una póliza de salud?', '<p>La prepagada tiene red cerrada y precio más bajo en algunas edades. La póliza da más libertad de elegir médico y reembolso. Las dos exigen EPS.</p>'],
      ['¿Cuesta algo la asesoría?', '<p>No. La asesoría de Vera Seguros es gratis para ti.</p>'],
    ],
  });

  // ---------- 3. Adultos mayores ----------
  add({
    slug: 'medicina-prepagada-adultos-mayores',
    title: 'Medicina prepagada para adultos mayores en Colombia 2026',
    description: `Medicina prepagada y seguros de salud para mayores de 60 en Colombia: hasta qué edad recibe cada plan y precios 2026 a los 60, 65 y 70 años.`,
    h1: 'Medicina prepagada para adultos mayores: qué opciones hay después de los 60',
    lead: 'Hasta qué edad recibe cada plan y cuánto cuesta. Sin letra pequeña.',
    publicado: '2026-10-13',
    contenido: `<h2>La respuesta corta</h2>
<p>La medicina prepagada de Coomeva recibe nuevos afiliados <strong>solo hasta los 59 años</strong>. Después de los 60 la salida son las <strong>pólizas de salud</strong>: Allianz recibe hasta los 69 años y 364 días, SURA Salud Clásico a menores de 70 y Seguros Bolívar Salud a su Medida no tiene límite de edad de ingreso.</p>
<div class="tabla-wrap"><table class="dato">
<caption class="vh">Edad máxima de ingreso a planes de salud para adultos mayores</caption>
<thead><tr><th scope="col">Plan</th><th scope="col">Edad máxima de ingreso</th></tr></thead>
<tbody>
<tr><th scope="row">Seguros Bolívar Salud a su Medida (S y M)</th><td>Sin límite</td></tr>
<tr><th scope="row">SURA Salud Clásico</th><td>Menor de 70 años</td></tr>
<tr><th scope="row">Allianz Gold Plus y Care</th><td>69 años y 364 días</td></tr>
<tr><th scope="row">AXA Colpatria</th><td>63 años</td></tr>
<tr><th scope="row">SURA Salud Global</th><td>Menor de 63 años</td></tr>
<tr><th scope="row">Coomeva Medicina Prepagada</th><td>59 años</td></tr>
</tbody></table></div>
<h2>Cuánto cuesta a los 60, 65 y 70</h2>
<p>Como referencia, en Seguros Bolívar la póliza ${esc(plan('bolivar', 'cla').plan)} cuesta <strong>${bolivar(60, 'cla')}</strong> al mes a los 60 años y <strong>${bolivar(65, 'cla')}</strong> a los 65. Ve el precio de cada plan a los 60, 65 y 70 en la guía <a href="/seguros/salud/adultos-mayores/">seguros de salud para adultos mayores</a>.</p>
<h2>Antes de afiliar a tus papás</h2>
<ul>
<li>Ten a mano los diagnósticos actuales: pueden quedar como preexistencias.</li>
<li>Pregunta si la permanencia es vitalicia (en la mayoría de estos planes lo es).</li>
<li>Compara el precio a 5 años, no solo el primer mes.</li>
</ul>
${cta('Hola Vera Seguros, busco medicina prepagada o seguro de salud para un adulto mayor.', 'Cotiza para tus papás')}`,
    faq: [
      ['¿Hasta qué edad recibe la medicina prepagada?', '<p>La medicina prepagada de Coomeva recibe nuevos afiliados hasta los 59 años. Después de esa edad las opciones son pólizas de salud.</p>'],
      ['¿Hay seguro de salud para mayores de 70?', '<p>Sí. Seguros Bolívar Salud a su Medida no tiene límite de edad de ingreso en sus planes S y M.</p>'],
      ['¿Me sacan del plan cuando cumplo años?', '<p>En la mayoría de planes la permanencia es vitalicia una vez entras. Revisa el clausulado de cada plan.</p>'],
    ],
  });

  // ---------- 4. Agencia de seguros en Medellín ----------
  add({
    slug: 'agencia-de-seguros-medellin',
    title: 'Agencia de seguros en Medellín: qué hace y por qué te ahorra plata',
    description: 'Qué hace una agencia de seguros en Medellín, cuánto cuesta (nada para ti) y cómo te ayuda a comparar SURA, Bolívar, Allianz, AXA y más.',
    h1: 'Agencia de seguros en Medellín: qué hace y cuándo te conviene',
    lead: 'Compara varias aseguradoras en una sola conversación, sin pagar más.',
    publicado: '2026-10-13',
    contenido: `<h2>La respuesta corta</h2>
<p>Una agencia de seguros trabaja con <strong>varias aseguradoras a la vez</strong>. En vez de llamar a cada compañía, le cuentas a un asesor qué necesitas y te muestra las opciones lado a lado. La asesoría no tiene costo para ti.</p>
<h2>Qué hace Vera Seguros por ti</h2>
<ul>
<li><strong>Compara</strong> SURA, Seguros Bolívar, Allianz, AXA Colpatria, MAPFRE, Seguros Mundial y Coomeva.</li>
<li><strong>Explica el clausulado</strong>: exclusiones, carencias y edades, en palabras simples.</li>
<li><strong>Te acompaña en un siniestro</strong>: reclamaciones y trámites con la aseguradora.</li>
<li><strong>Revisa tu póliza cada año</strong> para que no pagues de más en la renovación.</li>
</ul>
<h2>Qué seguros cotizamos</h2>
<p>Salud y medicina prepagada, vida, auto, SOAT, hogar, mascotas y seguros para empresas. Mira todos en <a href="/Seguros.dc.html">nuestros seguros</a> o empieza por el <a href="/seguros/salud/">comparador de seguros de salud</a>.</p>
<p>Somos de Medellín y atendemos en toda Colombia por WhatsApp. Conoce más en <a href="/seguro-de-salud-medellin.html">seguros de salud en Medellín</a>.</p>
${cta('Hola Vera Seguros, quiero asesoría de una agencia de seguros en Medellín.', 'Habla con un asesor')}`,
    faq: [
      ['¿Cuánto cobra una agencia de seguros?', '<p>En Vera Seguros la asesoría no tiene costo para ti.</p>'],
      ['¿Qué diferencia hay entre agencia y aseguradora?', '<p>La aseguradora asume el riesgo y paga los siniestros. La agencia te asesora, compara entre varias aseguradoras y te acompaña en los trámites.</p>'],
      ['¿Atienden fuera de Medellín?', '<p>Sí. Atendemos en toda Colombia por WhatsApp.</p>'],
    ],
  });

  // ---------- Seguro de vida e impuestos ----------
  // Cada cifra verificada contra el texto oficial (secretariasenado, DIAN, Corte) el 2026-10-19.
  // Si cambia la UVT, actualiza UVT y los valores calculados.
  {
    const SS = 'http://www.secretariasenado.gov.co/senado/basedoc/';
    const F = [
      ['Estatuto Tributario, art. 387 (pagos por salud)', `${SS}estatuto_tributario_pr015.html#387`],
      ['Estatuto Tributario, art. 303-1 (indemnizaciones de seguros de vida)', `${SS}estatuto_tributario_pr012.html#303-1`],
      ['Ley 2277 de 2022, art. 29', `${SS}ley_2277_2022.html#29`],
      ['DIAN, Resolución 000238 de 2025 (UVT 2026)', 'https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0238_2025.htm'],
      ['Estatuto Tributario, art. 314 (tarifa de ganancia ocasional)', `${SS}estatuto_tributario_pr013.html#314`],
      ['Corte Constitucional, Sentencia C-317 de 2025', 'https://www.corteconstitucional.gov.co/relatoria/2025/C-317-25.htm'],
      ['Estatuto Tributario, art. 427 (pólizas excluidas de IVA)', `${SS}estatuto_tributario_pr017.html#427`],
      ['Código de Comercio, art. 1142 (designación de beneficiarios)', `${SS}codigo_comercio_pr035.html#1142`],
      ['Estatuto Tributario, art. 126-1 (pensiones voluntarias)', `${SS}estatuto_tributario_pr005.html#126-1`],
      ['Estatuto Tributario, art. 126-4 (cuentas AFC)', `${SS}estatuto_tributario_pr005.html#126-4`],
      ['Estatuto Tributario, art. 336 (límite de rentas exentas)', `${SS}estatuto_tributario_pr014.html#336`],
    ];
    const r = (...n) => n.map((i) => `<sup><a href="#f${i}">[${i}]</a></sup>`).join('');
    add({
      slug: 'seguro-de-vida-impuestos-colombia', cat: 'personas',
      title: 'Seguro de vida e impuestos en Colombia: qué paga y qué no',
      description: 'Primas, indemnización, IVA y el tope de 3.250 UVT: cómo trata el Estatuto Tributario el seguro de vida en Colombia. Con normas oficiales.',
      h1: 'Seguro de vida e impuestos en Colombia',
      lead: 'Qué es deducible, qué está exento y cuánto pagan tus beneficiarios. Con las normas oficiales.',
      publicado: '2026-10-19',
      contenido: `<h2>La respuesta corta</h2>
<p>El seguro de vida no te baja la renta mientras lo pagas. Lo que sí protege es lo que reciben tus beneficiarios. Da igual si es de SURA o de Allianz: las reglas las pone el Estatuto Tributario, no la aseguradora.</p>
<h2>1. Las primas no son deducibles</h2>
<p>El Estatuto Tributario no trae una deducción por primas de seguro de vida para personas naturales. Para seguros, la deducción que sí existe es la de <strong>salud</strong>: medicina prepagada y seguros de salud, hasta 16 UVT al mes. ${r(1)}</p>
<h2>2. La indemnización está exenta hasta 3.250 UVT</h2>
<p>Lo que pague un seguro de vida es ganancia ocasional. Los primeros <strong>3.250 UVT</strong> están exentos; solo se grava lo que pase de ahí. ${r(2, 3)}</p>
<ul>
<li>UVT 2026: <strong>$52.374</strong>. ${r(4)}</li>
<li>Tope exento 2026: 3.250 × $52.374 = <strong>$170.215.500</strong>.</li>
<li>Tarifa sobre el excedente: <strong>15 %</strong>. ${r(5)}</li>
</ul>
<p><strong>Ejemplo:</strong> una póliza de $500 millones pagada a una sola persona en 2026. Exento: $170.215.500. Gravado: $329.784.500. Impuesto: unos <strong>$49,5 millones</strong>.</p>
<p>Con varios beneficiarios, la norma no dice expresamente cómo se aplica el tope. Revísalo con tu contador antes de declarar.</p>
<p>¿Te hablan de 12.500 UVT? Ese límite cambió: la Ley 2277 de 2022 lo dejó en 3.250 UVT. ${r(3)} La Corte Constitucional declaró exequible esa norma en la Sentencia C-317 de 2025, por el cargo de equidad tributaria. ${r(6)}</p>
<h2>3. Las pólizas de vida no pagan IVA</h2>
<p>No son objeto de IVA las pólizas de vida individual, colectivo, grupo y accidentes personales. ${r(7)}</p>
<h2>4. Quién recibe el dinero</h2>
<p>La indemnización se paga a los beneficiarios que tú designas. Si no designas a nadie, o designas “a mis herederos”, la mitad va al cónyuge y la otra mitad a los herederos. ${r(8)}</p>
<h2>5. Lo que sí baja impuestos</h2>
<p>Los aportes voluntarios a <strong>seguros privados de pensiones, fondos de pensiones voluntarias</strong> y cuentas <strong>AFC</strong> son renta exenta. El tope es conjunto: 30 % del ingreso laboral o tributario del año y máximo <strong>3.800 UVT</strong> al año. ${r(9, 10)}</p>
<p>Ojo: además, todas tus rentas exentas y deducciones juntas no pueden pasar del 40 % del ingreso ni de 1.340 UVT al año. ${r(11)}</p>
<p>¿Te ofrecen un “seguro de vida con ahorro”? Pregunta si ese ahorro es un seguro privado de pensiones o un fondo de pensiones voluntarias. Si no, no tiene este beneficio.</p>
<p>Compara pólizas en <a href="/seguros/vida-individual/">seguro de vida</a> o mira las opciones de <a href="/seguros/pension/">pensión voluntaria</a>.</p>
<p class="cta-inline"><a class="btn-wa boton-grande btn-wa-guia" data-seguro="Vida" href="${WA('Hola Vera Seguros, quiero cotizar un seguro de vida.')}" target="_blank" rel="noopener">${ICON_WA} Cotiza tu seguro de vida</a></p>
<p class="fuente">Esto es información general, no asesoría tributaria. Las normas cambian con cada reforma: confirma tu caso con un contador. Última revisión: ${fecha('2026-10-19')}.</p>
<section aria-labelledby="h-fuentes"><h2 id="h-fuentes">Fuentes</h2><ol class="fuente">${F.map(([t, u], i) => `<li id="f${i + 1}">${esc(t)}: <a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 70))}</a></li>`).join('')}</ol></section>`,
      faq: [
        ['¿Puedo deducir el seguro de vida en la declaración de renta?', '<p>No. Como persona natural, la deducción por seguros que trae el Estatuto Tributario es la de salud (art. 387).</p>'],
        ['¿Cuánto de un seguro de vida está exento de impuestos en 2026?', '<p>Hasta 3.250 UVT, es decir $170.215.500 con la UVT de 2026 ($52.374). Lo que pase de ahí paga ganancia ocasional del 15 %.</p>'],
        ['¿El seguro de vida paga IVA?', '<p>No. Las pólizas de vida individual, colectivo, grupo y accidentes personales no son objeto de IVA (art. 427 del Estatuto Tributario).</p>'],
        ['¿Quién recibe el seguro si no hay beneficiario designado?', '<p>La mitad el cónyuge y la otra mitad los herederos del asegurado (art. 1142 del Código de Comercio).</p>'],
      ],
    });
  }

  // ---------- extranjeros en Colombia ----------
  {
    const x = FUENTES_EXT();
    if (x) add({
      slug: 'seguros-para-extranjeros-colombia', cat: 'extranjeros',
      title: 'Seguro de salud para extranjeros en Colombia: visas, EPS y pólizas',
      description: 'Qué visas exigen póliza de salud, cómo se afilia un extranjero a la EPS y qué aseguradoras reciben residentes. Fuentes oficiales. Asesoría en Medellín.',
      h1: 'Seguro de salud para extranjeros en Colombia',
      lead: 'Qué exige tu visa, cómo entrar a la EPS y qué póliza puedes tomar. Con fuentes oficiales.',
      publicado: HOY,
      contenido: x.html('es') + `\n<p>¿Vives en Medellín o vas a mudarte? Te ayudamos a elegir la póliza que pide tu visa. También en inglés.</p>
<p class="cta-inline"><a class="btn-wa boton-grande btn-wa-guia" data-seguro="Salud" href="${WA('Hola Vera Seguros, soy extranjero y busco un seguro de salud en Colombia.')}" target="_blank" rel="noopener">${ICON_WA} Cotiza tu seguro</a> <a class="btn-tel" href="/seguros/salud/#cotizador">Ver precios por edad</a></p>
` + x.fuentes('es'),
      faq: [],
    });
  }

  // ---------- un artículo por producto ----------
  // Datos de tools/blog-fuentes.json: cada frase trae la cita literal y la URL oficial
  // (aseguradora o Estado) donde aparece; tools/verificar-fuentes.py descarta las que no.
  for (const p of PRODUCTOS) {
    const d = FUENTES[p.slug];
    if (!d) continue;
    const nombre = NOMBRE[p.slug] || 'Seguro de ' + p.t;
    const urls = [];
    const ref = (x) => { let i = urls.findIndex((u) => u.url === x.url); if (i < 0) { urls.push({ url: x.url, fuente: x.fuente || x.aseguradora }); i = urls.length - 1; } return `<sup><a href="#f${i + 1}">[${i + 1}]</a></sup>`; };
    const items = (arr, conNombre) => `<ul>${arr.map((x) => `<li>${conNombre ? `<strong>${esc(x.aseguradora)}:</strong> ` : ''}${esc(x.texto)} ${ref(x)}</li>`).join('')}</ul>`;
    const sec = (h, arr, conNombre) => (arr && arr.length ? `<h2>${h}</h2>\n${items(arr, conNombre)}` : '');
    const intro = (d.que_es || []).map((x) => `<p>${esc(x.texto)} ${ref(x)}</p>`).join('');
    const empresa = p.cat === 'empresas';
    add({
      slug: p.slug,
      // Título informativo: no compite con /seguros/<slug>/, que es la página para cotizar.
      title: `${nombre}: qué cubre (guía 2026 con fuentes oficiales)`,
      description: `${nombre}: qué es, qué cubre y qué ofrece cada aseguradora en Colombia, con fuentes oficiales. Asesoría gratis de Vera Seguros en Medellín.`,
      h1: `${nombre}: qué cubre, según las aseguradoras`,
      lead: `Lo esencial, con fuentes oficiales de cada aseguradora. Te asesoramos desde Medellín para toda Colombia.`,
      publicado: HOY, cat: p.cat,
      contenido: `${intro ? `<h2>Qué es</h2>\n${intro}` : ''}
${sec('Qué cubre', d.coberturas)}
${sec('Requisitos y normas', d.requisitos_o_normas)}
${sec('Qué ofrece cada aseguradora', d.por_aseguradora, true)}
<p>Las condiciones exactas dependen de la póliza y del clausulado de cada compañía. ${empresa ? 'Para tu empresa' : 'Para tu caso'}, compara opciones en <a href="/seguros/${p.slug}/">${esc(nombre)}</a>.</p>
<p class="cta-inline"><a class="btn-wa boton-grande btn-wa-guia" data-seguro="${esc(p.t)}" href="${WA(`Hola Vera Seguros, quiero cotizar: ${nombre}.`)}" target="_blank" rel="noopener">${ICON_WA} Cotiza con un asesor</a></p>
<section aria-labelledby="h-fuentes"><h2 id="h-fuentes">Fuentes</h2><ol class="fuente">${urls.map((u, i) => `<li id="f${i + 1}">${esc(u.fuente)}: <a href="${esc(u.url)}" target="_blank" rel="noopener">${esc(u.url.replace(/^https?:\/\/(www\.)?/, ''))}</a></li>`).join('')}</ol></section>`,
      faq: [],
      sinFuentePrecios: true,
    });
  }

  // ---------- páginas ----------
  const migas = (nombre) => `<nav aria-label="Ruta de navegación"><ol class="crumbs"><li><a href="/">Inicio</a></li>${nombre ? `<li><a href="/blog/">Blog</a></li><li aria-current="page">${esc(nombre)}</li>` : '<li aria-current="page">Blog</li>'}</ol></nav>`;
  const org = { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Vera Seguros', logo: { '@type': 'ImageObject', url: `${SITE}/assets/logo-vera.jpg` } };
  const lista = (excluir, cat) => `<ul class="guias-hub">${posts.filter((p) => p.slug !== excluir && (!cat || p.cat === cat)).slice(0, excluir ? 6 : 99).map((p) => `<li><a href="/blog/${p.slug}/"><strong>${esc(p.h1)}</strong><span>${esc(p.lead)}</span></a></li>`).join('')}</ul>`;

  const paginas = posts.map((p) => ({
    slug: p.slug, alt: PAR_EN[p.slug] ? `/en/blog/${PAR_EN[p.slug]}/` : null, title: p.title, description: p.description, canonical: `${BASE}${p.slug}/`,
    ld: [
      { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.h1, description: p.description, url: `${BASE}${p.slug}/`, mainEntityOfPage: `${BASE}${p.slug}/`, inLanguage: 'es-CO', datePublished: p.publicado, dateModified: HOY, author: org, publisher: org },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: BASE },
        { '@type': 'ListItem', position: 3, name: p.h1, item: `${BASE}${p.slug}/` }] },
      ...(p.faq.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: plano(a) } })) }] : []),
    ],
    body: `
  <section class="hero"><div class="wrap">${migas(p.h1)}
    <h1>${esc(p.h1)}</h1>
    <p class="lead">${p.lead}</p>
    <p class="fuente">Publicado el ${fecha(p.publicado)} · Vera Seguros</p>
  </div></section>
  <article class="block"><div class="wrap prosa">
${p.contenido}
${p.faq.length ? `<section class="faq" aria-labelledby="h-faq"><h2 id="h-faq">Preguntas frecuentes</h2>${p.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary>${a}</details>`).join('')}</section>` : ''}
${p.cat === 'salud' || p.cat === 'extranjeros' ? '<p>¿Estás en Medellín? Somos <a href="/seguro-de-salud-medellin.html">agencia de seguros de salud y medicina prepagada en Medellín</a>: comparamos por ti y te asesoramos gratis.</p>' : ''}
${p.cat === 'salud' ? fuente : ''}
<aside aria-labelledby="h-mas"><h2 id="h-mas">Más del blog</h2>${lista(p.slug, p.cat)}</aside>
  </div></article>`,
  }));

  paginas.unshift({
    slug: '', title: 'Blog de seguros en Colombia | Vera Seguros',
    description: 'Precios, comparativos y guías claras sobre seguros de salud, medicina prepagada y más en Colombia. Escrito por asesores de Vera Seguros en Medellín.',
    canonical: BASE,
    ld: [{ '@context': 'https://schema.org', '@type': 'Blog', name: 'Blog de Vera Seguros', url: BASE, inLanguage: 'es-CO', publisher: org,
      blogPost: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.h1, url: `${BASE}${p.slug}/`, datePublished: p.publicado })) }],
    body: `
  <section class="hero"><div class="wrap">${migas()}
    <h1>Blog de seguros</h1>
    <p class="lead">Respuestas claras, con fuentes oficiales, para elegir bien tu seguro. Desde Medellín para toda Colombia.</p>
  </div></section>
${[['salud', 'Salud y medicina prepagada'], ['extranjeros', 'Extranjeros en Colombia'], ['personas', 'Seguros para personas'], ['patrimoniales', 'Seguros patrimoniales'], ['empresas', 'Seguros para empresas']]
    .filter(([c]) => posts.some((p) => p.cat === c))
    .map(([c, t]) => `  <section class="block"><div class="wrap"><h2>${t}</h2>${lista(null, c)}</div></section>`).join('\n')}`,
  });

  return paginas;
}

// Pares ES → EN (hreflang). Solo salud y extranjeros tienen versión en inglés.
const PAR_EN = {
  'cuanto-cuesta-medicina-prepagada-colombia': 'prepaid-medicine-cost-colombia',
  'mejor-medicina-prepagada-colombia': 'best-prepaid-medicine-colombia',
  'medicina-prepagada-adultos-mayores': 'prepaid-medicine-seniors-colombia',
  'agencia-de-seguros-medellin': 'insurance-agency-medellin',
  'seguros-para-extranjeros-colombia': 'health-insurance-foreigners-colombia',
};

// Artículo de extranjeros (ES y EN) a partir de las frases verificadas.
function extranjeros(FUENTES, esc) {
  const d = FUENTES.extranjeros;
  if (!d) return null;
  const T = {
    es: { visas: 'Qué visas exigen póliza de salud', eps: 'Cómo se afilia un extranjero a la EPS', aseguradoras: 'Qué piden las aseguradoras colombianas', turistas: 'Turistas: ¿necesitan seguro?', f: 'Fuentes',
      corta: 'La mayoría de visas de visitante (V) exigen una <strong>póliza de salud con cobertura en Colombia</strong>. Si vas a residir, la ley te pide estar en una <strong>EPS</strong>, y las pólizas privadas casi siempre piden EPS activa. Lo que sigue sale solo de normas oficiales y documentos de cada aseguradora.' },
    en: { visas: 'Which visas require health insurance', eps: 'How foreigners join an EPS', aseguradoras: 'What Colombian insurers require', turistas: 'Tourists: is insurance required?', f: 'Sources',
      corta: 'Most visitor (V) visas require a <strong>health insurance policy with coverage in Colombia</strong>. If you live here, the law requires you to join an <strong>EPS</strong> (public health system), and private policies almost always require an active EPS. Everything below comes only from official regulations and each insurer\'s own documents.' },
  };
  const make = (lang) => {
    const urls = [];
    const ref = (x) => { let i = urls.findIndex((u) => u.url === x.url); if (i < 0) { urls.push(x); i = urls.length - 1; } return `<sup><a href="#f${i + 1}">[${i + 1}]</a></sup>`; };
    const t = T[lang];
    const html = `<h2>${lang === 'es' ? 'La respuesta corta' : 'The short answer'}</h2>\n<p>${t.corta}</p>\n` +
      ['visas', 'eps', 'aseguradoras', 'turistas'].filter((k) => d[k] && d[k].length)
        .map((k) => `<h2>${t[k]}</h2>\n<ul>${d[k].map((x) => `<li>${esc(lang === 'en' && x.texto_en ? x.texto_en : x.texto)} ${ref(x)}</li>`).join('')}</ul>`).join('\n');
    const fuentes = `<section aria-labelledby="h-fuentes"><h2 id="h-fuentes">${t.f}</h2><ol class="fuente">${urls.map((u, i) => `<li id="f${i + 1}">${esc(u.fuente)}: <a href="${esc(u.url)}" target="_blank" rel="noopener">${esc(u.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 70))}</a></li>`).join('')}</ol></section>`;
    return { html, fuentes };
  };
  const cache = {};
  return { html: (l) => (cache[l] ||= make(l)).html, fuentes: (l) => (cache[l] ||= make(l)).fuentes };
}

// ---------- blog en inglés: salud + extranjeros ----------
export function blogEn({ ROOT, SITE, HOY, esc, WA, ICON_WA }) {
  const { DATA, cotizar, fmt, PREPAGADA } = cargarCotizador(ROOT);
  const FUENTES = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/blog-fuentes.json'), 'utf8'));
  const plan = (id, k) => DATA.find((c) => c.id === id)[k];
  const usd = (s) => s.replace('≈ $', '≈ COP ').replace(/\./g, ',');
  const bolivar = (e, k) => usd(fmt(cotizar(plan('bolivar', k), e, 'medellin', 'bolivar').price));
  const prepagada = (e) => PREPAGADA.flatMap((c) => ['M', 'F'].map((s) => cotizar(c.mp, e, 'medellin', 'coomeva', s).price)).filter((x) => x != null);
  const rango = (v) => `${usd(fmt(Math.min(...v)))} and ${usd(fmt(Math.max(...v)))}`;
  const BASE = `${SITE}/en/blog/`;
  const ES = Object.fromEntries(Object.entries(PAR_EN).map(([a, b]) => [b, a]));
  const cta = (msg, txt) => `<p class="cta-inline"><a class="btn-wa boton-grande btn-wa-guia" data-seguro="Salud" href="${WA(msg)}" target="_blank" rel="noopener">${ICON_WA} ${txt}</a> <a class="btn-tel" href="/en/health-insurance/#cotizador">See prices for my age</a></p>`;
  const nota = `<p class="fuente">Monthly reference prices before VAT (5%), from the official 2026 rate tables of Coomeva Medicina Prepagada and Seguros Bolívar, the same ones used in our <a href="/en/health-insurance/">comparison tool</a>. Not a binding quote. Last reviewed: ${HOY}.</p>`;
  const posts = [];
  const add = (p) => posts.push(p);

  add({ slug: 'prepaid-medicine-cost-colombia',
    title: 'How much does prepaid medicine cost in Colombia in 2026?',
    description: `Prepaid medicine (medicina prepagada) in Colombia 2026: from ${usd(fmt(Math.min(...prepagada(25))))} a month at age 25. Prices by age. Advice in English.`,
    h1: 'How much does prepaid medicine cost in Colombia in 2026?',
    lead: 'Real prices by age, what drives the rate up and how to pay less.',
    contenido: `<h2>The short answer</h2>
<p>In 2026 a Coomeva prepaid medicine plan costs between <strong>${rango(prepagada(25))}</strong> a month at age 25, and between <strong>${rango(prepagada(45))}</strong> at 45. For reference, Seguros Bolívar's ${esc(plan('bolivar', 'cla').plan)} health policy costs <strong>${bolivar(35, 'cla')}</strong> a month at 35.</p>
<div class="tabla-wrap"><table class="dato num"><caption class="vh">Monthly price range of Coomeva prepaid medicine by age, 2026</caption>
<thead><tr><th scope="col">Age</th><th scope="col">Lowest</th><th scope="col">Most complete</th></tr></thead>
<tbody>${[25, 35, 45, 55].map((e) => { const v = prepagada(e); return `<tr><th scope="row">${e}</th><td>${usd(fmt(Math.min(...v)))}</td><td>${usd(fmt(Math.max(...v)))}</td></tr>`; }).join('')}</tbody></table></div>
<h2>What drives the price</h2>
<ul><li><strong>Age</strong>: rates go up by age band.</li><li><strong>The program</strong>: plans with a wider network cost more.</li><li><strong>Sex</strong>: at Coomeva the rate differs between men and women at some ages.</li></ul>
<p>Both prepaid medicine and health policies require you to be enrolled in an EPS. See the full tables in <a href="/en/health-insurance/prepaid-medicine/">prepaid medicine in Colombia</a>.</p>
${cta('Hi Vera Seguros! (English, please) I want to know how much prepaid medicine costs for me.', 'Get a quote in English')}${nota}` });

  add({ slug: 'best-prepaid-medicine-colombia',
    title: 'Best prepaid medicine in Colombia (2026): how to choose',
    description: 'How to choose the best prepaid medicine or health insurance in Colombia in 2026: 5 criteria, insurers compared and prices by age. Advice in English.',
    h1: 'What is the best prepaid medicine in Colombia?',
    lead: 'There is no single best plan. There is a best plan for your age, city and budget.',
    contenido: `<h2>The short answer</h2>
<p>The best plan is the one that has <strong>your clinics and doctors in its network</strong>, accepts you <strong>at your age</strong>, and whose price you can afford <strong>for life</strong>. That's why it pays to compare prepaid medicine and health policies side by side.</p>
<h2>5 criteria</h2>
<ol><li><strong>Clinic network.</strong> Check that your preferred clinic is included.</li><li><strong>Entry and renewal age.</strong> Some plans don't accept new members after 59 or 60.</li><li><strong>Future price.</strong> Rates rise with age; look at the price at 60, not just today.</li><li><strong>Pre-existing conditions and waiting periods.</strong></li><li><strong>Maternity</strong> waiting periods, if you plan children.</li></ol>
<p>For reference, Seguros Bolívar's ${esc(plan('bolivar', 'cla').plan)} costs ${bolivar(35, 'cla')} a month at 35. Compare insurers in <a href="/en/health-insurance/compare-insurers/">SURA vs. Allianz vs. Bolívar vs. AXA</a>.</p>
${cta('Hi Vera Seguros! (English, please) Which prepaid medicine is best for me?', 'Ask an advisor in English')}${nota}` });

  add({ slug: 'prepaid-medicine-seniors-colombia',
    title: 'Prepaid medicine and health insurance for seniors in Colombia',
    description: 'Health insurance for people over 60 in Colombia: entry age limits per insurer and 2026 reference prices. Advice in English from Medellín.',
    h1: 'Prepaid medicine for seniors: options after 60',
    lead: 'Entry age by plan and what it costs.',
    contenido: `<h2>The short answer</h2>
<p>Coomeva prepaid medicine accepts new members <strong>only up to age 59</strong>. After 60, the options are <strong>health insurance policies</strong>: Allianz accepts up to 69 years and 364 days, SURA Salud Clásico under 70, and Seguros Bolívar Salud a su Medida has no entry age limit.</p>
<div class="tabla-wrap"><table class="dato"><caption class="vh">Maximum entry age</caption><thead><tr><th scope="col">Plan</th><th scope="col">Maximum entry age</th></tr></thead><tbody>
<tr><th scope="row">Seguros Bolívar Salud a su Medida (S and M)</th><td>No limit</td></tr><tr><th scope="row">SURA Salud Clásico</th><td>Under 70</td></tr><tr><th scope="row">Allianz Gold Plus and Care</th><td>69 years and 364 days</td></tr><tr><th scope="row">AXA Colpatria</th><td>63</td></tr><tr><th scope="row">SURA Salud Global</th><td>Under 63</td></tr><tr><th scope="row">Coomeva Prepaid Medicine</th><td>59</td></tr></tbody></table></div>
<p>For reference, Seguros Bolívar's ${esc(plan('bolivar', 'cla').plan)} costs <strong>${bolivar(60, 'cla')}</strong> a month at 60. More in <a href="/en/health-insurance/seniors/">health insurance for seniors</a>.</p>
${cta('Hi Vera Seguros! (English, please) I am looking for health insurance for someone over 60.', 'Get a quote in English')}${nota}` });

  add({ slug: 'insurance-agency-medellin',
    title: 'Insurance agency in Medellín with advice in English',
    description: 'Vera Seguros, insurance agency in Medellín: we compare SURA, Bolívar, Allianz, AXA Colpatria, MAPFRE and more for you. Free advice in English.',
    h1: 'Insurance agency in Medellín, in English',
    lead: 'Compare several insurers in one conversation. Free advice.',
    contenido: `<h2>The short answer</h2>
<p>An insurance agency works with <strong>several insurers at once</strong>. Tell an advisor what you need and you get the options side by side. Advice from Vera Seguros is free for you.</p>
<h2>What we do</h2>
<ul><li><strong>Compare</strong> SURA, Seguros Bolívar, Allianz, AXA Colpatria, MAPFRE, Seguros Mundial and Coomeva.</li><li><strong>Explain the policy terms</strong> in plain English.</li><li><strong>Help with claims</strong> with the insurer.</li></ul>
<p>We are based in Medellín and serve all of Colombia on WhatsApp. Start with <a href="/en/health-insurance/">health insurance in Colombia</a>.</p>
${cta('Hi Vera Seguros! (English, please) I would like advice from an insurance agency in Medellín.', 'Talk to an advisor')}` });

  const x = extranjeros(FUENTES, esc);
  if (x) add({ slug: 'health-insurance-foreigners-colombia',
    title: 'Health insurance for foreigners in Colombia: visas, EPS, policies',
    description: 'Which Colombian visas require health insurance, how foreigners join an EPS and which insurers accept residents. Official sources. Advice in English, Medellín.',
    h1: 'Health insurance for foreigners and expats in Colombia',
    lead: 'What your visa requires, how to join the EPS and which policy you can buy. Official sources only.',
    contenido: x.html('en') + `\n<p>Living in Medellín or moving here? We help you pick the policy your visa requires, in English.</p>
${cta('Hi Vera Seguros! (English, please) I am a foreigner looking for health insurance in Colombia.', 'Get a quote in English')}` + x.fuentes('en') });

  const org = { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Vera Seguros' };
  const lista = (excluir) => `<ul class="guias-hub">${posts.filter((p) => p.slug !== excluir).map((p) => `<li><a href="/en/blog/${p.slug}/"><strong>${esc(p.h1)}</strong><span>${esc(p.lead)}</span></a></li>`).join('')}</ul>`;
  const migas = (n) => `<nav aria-label="Breadcrumb"><ol class="crumbs"><li><a href="/en/">Home</a></li>${n ? `<li><a href="/en/blog/">Blog</a></li><li aria-current="page">${esc(n)}</li>` : '<li aria-current="page">Blog</li>'}</ol></nav>`;
  const out = posts.map((p) => ({
    ruta: `/en/blog/${p.slug}/`, alt: `/blog/${ES[p.slug]}/`, activo: 'salud', ogType: 'article',
    title: p.title, description: p.description,
    ld: [{ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.h1, description: p.description, url: `${BASE}${p.slug}/`, inLanguage: 'en', datePublished: HOY, dateModified: HOY, author: org, publisher: org }],
    body: `
  <section class="hero"><div class="wrap">${migas(p.h1)}
    <h1>${esc(p.h1)}</h1>
    <p class="lead">${p.lead}</p>
  </div></section>
  <article class="block"><div class="wrap prosa">
${p.contenido}
<aside aria-labelledby="h-more"><h2 id="h-more">More from the blog</h2>${lista(p.slug)}</aside>
  </div></article>`,
  }));
  out.unshift({ ruta: '/en/blog/', alt: '/blog/', activo: 'salud', title: 'Insurance blog for Colombia, in English | Vera Seguros',
    description: 'Health insurance, prepaid medicine and insurance for foreigners in Colombia, explained in English with official sources. Vera Seguros, Medellín.',
    ld: [{ '@context': 'https://schema.org', '@type': 'Blog', name: 'Vera Seguros Blog', url: BASE, inLanguage: 'en', publisher: org }],
    body: `
  <section class="hero"><div class="wrap">${migas()}
    <h1>Insurance blog</h1>
    <p class="lead">Clear answers about health insurance in Colombia, in English. From Medellín.</p>
  </div></section>
  <section class="block"><div class="wrap">${lista()}</div></section>` });
  return out;
}
