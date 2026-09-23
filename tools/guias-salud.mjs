// Guías del clúster de salud (/seguros/salud/<tema>/).
// Los precios se leen del propio cotizador (misma tabla y misma función de cálculo),
// así una guía nunca contradice al comparador. Las reglas de edad y maternidad
// vienen de los clausulados oficiales revisados en agosto de 2026.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function guiasSalud({ ROOT, SITE, HOY, esc, WA, ICON_WA, MSG_60 }) {
  // ---- tarifas y cálculo, tomados del cotizador sin copiarlos ----
  const h = fs.readFileSync(path.join(ROOT, 'cotizador-de-salud/index.html'), 'utf8');
  const tomar = (desde, hasta) => {
    const i = h.indexOf(desde), j = h.indexOf(hasta, i);
    if (i < 0 || j < 0) throw new Error('No se encontró en el cotizador: ' + desde);
    return h.slice(i, j);
  };
  const ctx = {};
  vm.runInNewContext(
    tomar('const DATA = [', '\nconst COB_ROWS').replace('const DATA =', 'DATA =') +
    tomar('const fmt =', '\nconst WA_ICON').replace('const fmt =', 'fmt =').replace('const lookup =', 'lookup =') +
    '\nthis.cotizar = cotizar;', ctx);
  const { DATA, cotizar, fmt } = ctx;
  const plan = (id, k) => DATA.find((c) => c.id === id)[k];
  const precio = (id, k, edad, ciudad = 'medellin') => cotizar(plan(id, k), edad, ciudad, id);
  const celda = (q) => (q.price != null ? fmt(q.price) : `<span class="na-txt">${esc(q.na)}</span>`);

  const PLANES = [
    ['sura', 'sup', 'SURA'], ['sura', 'cla', 'SURA'], ['sura', 'liv', 'SURA'],
    ['bolivar', 'sup', 'Bolívar'], ['bolivar', 'cla', 'Bolívar'], ['bolivar', 'liv', 'Bolívar'],
    ['allianz', 'sup', 'Allianz'], ['allianz', 'cla', 'Allianz'], ['allianz', 'liv', 'Allianz'],
    ['axa', 'sup', 'AXA Colpatria'], ['axa', 'cla', 'AXA Colpatria'],
  ];
  const NIVEL = { sup: 'Premium', cla: 'Completo', liv: 'Liviano' };

  const HUB = `${SITE}/seguros/salud/`;
  const cta = (msg, txt) => `<p class="cta-inline"><a class="btn-wa boton-grande btn-wa-guia" data-seguro="Salud" href="${WA(msg)}" target="_blank" rel="noopener">${ICON_WA} ${txt}</a> <a class="btn-tel" href="/seguros/salud/#cotizador">Ver precios para mi edad</a></p>`;
  const faqHtml = (faq) => `<section class="faq" aria-labelledby="h-faq"><h2 id="h-faq">Preguntas frecuentes</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary>${a}</details>`).join('')}</section>`;
  const plano = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const fuente = `<p class="fuente"><strong>Fuentes y vigencia.</strong> Reglas de edad y maternidad tomadas de los clausulados y documentos oficiales de cada compañía (SURA, Seguros Bolívar, Allianz, AXA Colpatria, MAPFRE y Seguros Mundial), revisados entre agosto y septiembre de 2026; puedes consultarlos todos en <a href="/seguros/salud/clausulados/">clausulados de seguros de salud</a>. Precios de referencia: tarifario oficial de Seguros Bolívar (Salud a su Medida actualizado el 15 de septiembre de 2026), tablas 2026 de intermediarios autorizados de SURA y Allianz, y tabla 2025 de un intermediario autorizado de AXA Colpatria (AXA no publica tarifa 2026). MAPFRE y Seguros Mundial no publican tarifas. Son valores aproximados, no una cotización en firme: la tarifa definitiva la fija cada aseguradora según tu perfil. Última revisión: ${HOY}.</p>`;

  const ARTICULO = (slug, titulo, desc) => ({
    '@context': 'https://schema.org', '@type': 'Article', headline: titulo, description: desc,
    url: `${HUB}${slug}/`, mainEntityOfPage: `${HUB}${slug}/`, inLanguage: 'es-CO',
    datePublished: '2026-09-23', dateModified: HOY,
    author: { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Vera Seguros' },
    publisher: { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Vera Seguros', logo: { '@type': 'ImageObject', url: `${SITE}/assets/logo-vera.jpg` } },
  });
  const MIGAS = (slug, nombre) => ({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Seguros', item: `${SITE}/Seguros.dc.html` },
      { '@type': 'ListItem', position: 3, name: 'Seguro de salud', item: HUB },
      { '@type': 'ListItem', position: 4, name: nombre, item: `${HUB}${slug}/` }],
  });
  const FAQLD = (faq) => ({ '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: plano(a) } })) });
  const migasHtml = (nombre) => `<nav aria-label="Ruta de navegación"><ol class="crumbs"><li><a href="/">Inicio</a></li><li><a href="/Seguros.dc.html">Seguros</a></li><li><a href="/seguros/salud/">Seguro de salud</a></li><li aria-current="page">${esc(nombre)}</li></ol></nav>`;

  const GUIAS = [
    { slug: 'adultos-mayores', corto: 'Adultos mayores' },
    { slug: 'embarazo', corto: 'Embarazo y maternidad' },
    { slug: 'precios', corto: 'Precios 2026' },
    { slug: 'comparativo-aseguradoras', corto: 'SURA vs. Allianz vs. Bolívar vs. AXA' },
    { slug: 'medicina-prepagada', corto: '¿Prepagada o póliza de salud?' },
    { slug: 'clausulados', corto: 'Clausulados oficiales (PDF)' },
  ];
  const cluster = (actual) => `<aside class="cluster" aria-labelledby="h-cluster"><h2 id="h-cluster">Más guías de seguros de salud</h2><ul class="relacionados">${
    GUIAS.filter((g) => g.slug !== actual).map((g) => `<li><a href="/seguros/salud/${g.slug}/">${esc(g.corto)}</a></li>`).join('')
  }<li><a href="/seguros/salud/">Seguro de salud: comparador</a></li><li><a href="/seguro-de-salud-medellin.html">Seguros de salud en Medellín</a></li></ul></aside>`;

  const paginas = [];
  const add = (slug, nombre, title, description, h1, lead, contenido, faq) => {
    paginas.push({ slug, title, description, canonical: `${HUB}${slug}/`,
      ld: [ARTICULO(slug, h1, description), MIGAS(slug, nombre), FAQLD(faq)],
      body: `
  <section class="hero"><div class="wrap">${migasHtml(nombre)}
    <h1>${esc(h1)}</h1>
    <p class="lead">${lead}</p>
  </div></section>
  <article class="block"><div class="wrap prosa">
${contenido}
${faqHtml(faq)}
${fuente}
${cluster(slug)}
  </div></article>` });
  };

  // ================= 1. ADULTOS MAYORES =================
  {
    const EDADES = [
      ['SURA', 'Salud Global', 'Menor de 63 años', 'Vitalicia', 'Clausulado Salud Global, sección 2'],
      ['SURA', 'Salud Clásico', 'Menor de 70 años', 'Vitalicia', 'Clausulado Salud Clásico, sección 2'],
      ['SURA', 'PAC «Salud Para Todos»', 'De 3 meses a 59 años', 'Sin expulsión por edad', 'Clausulado, cláusula 2.2'],
      ['Seguros Bolívar', 'Salud Integral', 'Sin haber cumplido 60 años', 'Vitalicia', 'Condiciones PH-028, cláusula 4.5'],
      ['Seguros Bolívar', 'Salud a su Medida (planes S y M)', 'Sin límite de edad', 'Vitalicia', 'Clausulado, cláusula 4.2'],
      ['Seguros Bolívar', 'Salud a su Medida (plan L)', 'Sin límite de edad, con evaluación médica', 'Vitalicia', 'Clausulado, cláusula 4.5'],
      ['Allianz', 'Gold Plus y Care', 'Hasta 69 años y 364 días', 'Ilimitada', 'Guía técnica de suscripción, numeral 2.1.1'],
      ['AXA Colpatria', 'Fesalud y Original', 'Hasta 63 años', 'Sin edad máxima', 'Página oficial de cada plan'],
      ['Seguros Mundial', 'Salud Mundial 360 y Esencial', 'De 0 a 59 años', 'Ilimitada', 'Clausulados, cláusulas 3.11 y 3.10'],
      ['Seguros Mundial', 'Mundial Silver (solo ambulatorio)', 'Desde los 55 años, sin edad máxima', 'Ilimitada', 'Clausulado, cláusula 3.5'],
      ['MAPFRE', 'Excelencia, Preferencial y Vital', 'Hasta 59 años y 364 días', 'Sin límite', 'Clausulados, cláusula 7'],
    ];
    const edades = [60, 65, 70];
    const filasPrecio = PLANES.map(([id, k, co]) => `<tr><th scope="row">${esc(co)} — ${esc(plan(id, k).plan)}</th>${edades.map((e) => `<td>${celda(precio(id, k, e))}</td>`).join('')}</tr>`).join('');
    const faq = [
      ['¿Hasta qué edad puedo afiliarme a un seguro de salud en Colombia?',
        '<p>Depende del plan. Los límites más amplios los tienen Allianz (hasta los 69 años y 364 días) y SURA Salud Clásico (menores de 70). Seguros Bolívar Salud a su Medida no tiene límite de edad de ingreso, y Mundial Silver acepta desde los 55 sin edad máxima (solo servicios ambulatorios). SURA Salud Global acepta menores de 63 años, AXA Colpatria hasta los 63, Bolívar Salud Integral hasta antes de los 60 y MAPFRE hasta los 59 años y 364 días.</p>'],
      ['¿Me pueden sacar del seguro de salud cuando cumpla cierta edad?',
        '<p>No en los planes que comparamos: una vez adentro, la permanencia es vitalicia o ilimitada según sus clausulados. Lo que sí cambia con la edad es la tarifa, que se ajusta en cada renovación por rango de edad.</p>'],
      ['¿Qué exámenes me piden para afiliarme después de los 55?',
        '<p>Varía por compañía. En Allianz, por ejemplo, la guía técnica de suscripción exige valoración médica desde los 55 años; entre los 60 y los 69 pide exámenes aunque vengas con continuidad de otra compañía, y a las mujeres mayores de 55 les solicita mamografía, ecografía pélvica y citología recientes.</p>'],
      ['¿Cuál es la opción más económica para una persona mayor de 70?',
        '<p>Entre los planes que comparamos, los que aceptan nuevos afiliados después de los 70 son Seguros Bolívar Salud a su Medida y Mundial Silver (este último es ambulatorio y no publica tarifa). El plan M tiene tarifa única de ' + fmt(precio('bolivar', 'liv', 75).price) + ' al mes a cualquier edad, pero es ambulatorio (no cubre hospitalización). El plan L sí incluye hospitalización y exige evaluación médica.</p>'],
    ];
    add('adultos-mayores', 'Adultos mayores',
      'Seguro de salud para adultos mayores: edades de ingreso 2026',
      'Hasta qué edad te puedes afiliar a un seguro de salud en Colombia: límites de SURA, Bolívar, Allianz y AXA según clausulado y precios a los 60, 65 y 70.',
      'Seguro de salud para adultos mayores: hasta qué edad te puedes afiliar',
      'Después de los 60 las opciones se reducen, pero no desaparecen. Revisamos el clausulado de cada compañía para decirte, con fuente, hasta qué edad acepta nuevos afiliados y cuánto cuesta.',
      `<h2>La respuesta corta</h2>
<p>En Colombia puedes contratar un seguro de salud después de los 60 años con <strong>Allianz</strong> (hasta los 69 años y 364 días), <strong>SURA Salud Clásico</strong> (menores de 70) o <strong>Seguros Bolívar Salud a su Medida</strong>, que no tiene límite de edad de ingreso. En todos los casos la permanencia es vitalicia: una vez adentro, no te retiran por cumplir años.</p>
<h2>Edad máxima de ingreso por aseguradora</h2>
<div class="tabla-wrap"><table class="dato">
<caption class="vh">Edad máxima de ingreso y permanencia de cada plan de salud</caption>
<thead><tr><th scope="col">Compañía</th><th scope="col">Plan</th><th scope="col">Ingreso</th><th scope="col">Permanencia</th><th scope="col">Fuente</th></tr></thead>
<tbody>${EDADES.map((r) => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td><td><strong>${esc(r[2])}</strong></td><td>${esc(r[3])}</td><td class="src">${esc(r[4])}</td></tr>`).join('')}</tbody>
</table></div>
<h2>Cuánto cuesta a los 60, 65 y 70 años</h2>
<p>Valores mensuales aproximados en Medellín. Cuando un plan no acepta nuevos afiliados a esa edad, lo indicamos.</p>
<div class="tabla-wrap"><table class="dato num">
<caption class="vh">Precio mensual aproximado por plan y edad</caption>
<thead><tr><th scope="col">Plan</th>${edades.map((e) => `<th scope="col">${e} años</th>`).join('')}</tr></thead>
<tbody>${filasPrecio}</tbody>
</table></div>
<h2>Lo que conviene saber antes de afiliarte</h2>
<ul>
<li><strong>Entre más tarde, menos opciones.</strong> A los 59 tienes las seis compañías disponibles; a los 64, Allianz, SURA Clásico, Bolívar Salud a su Medida y Mundial Silver; después de los 70, solo Bolívar Salud a su Medida y Mundial Silver.</li>
<li><strong>Las preexistencias pesan.</strong> Con la edad aumentan los diagnósticos previos, y cada compañía decide si los acepta, los excluye o les pone condiciones. Declararlos con honestidad es obligatorio (artículo 1058 del Código de Comercio).</li>
<li><strong>Hay planes sin evaluación de salud.</strong> Los planes S y M de Bolívar Salud a su Medida no tienen en cuenta el estado de salud para afiliarse, pero son ambulatorios: cubren consultas y exámenes, no hospitalización.</li>
<li><strong>Asegúrate antes del cumpleaños clave.</strong> Si estás cerca de un límite (60, 63 o 70 años), la fecha de afiliación decide si puedes entrar al plan que quieres.</li>
</ul>
${cta(MSG_60, 'Seguro para mayores de 60')}`, faq);
  }

  // ================= 2. EMBARAZO =================
  {
    const REGLAS = [
      ['SURA', 'Salud Global y Clásico', 'El embarazo debe iniciar después del día 60 del ingreso si eres la única asegurada (en pólizas familiares o colectivas, después del ingreso).', 'No', 'Cláusula 1.4'],
      ['SURA', 'PAC «Salud Para Todos»', 'La fecha probable de parto debe ser posterior a 300 días desde el ingreso.', 'No', 'Cláusula 1.1.2'],
      ['Seguros Bolívar', 'Salud Integral', 'El embarazo debe iniciar después del segundo mes de permanencia (tercer mes si eres la única asegurada).', 'No', 'Cláusula 4.2, PH-028'],
      ['Seguros Bolívar', 'Salud a su Medida plan L', 'Período de carencia de maternidad de 12 meses.', 'No', 'Cláusula 4.1'],
      ['Seguros Bolívar', 'Salud a su Medida planes S y M', 'No incluyen maternidad: son planes ambulatorios.', 'No', 'Clausulado planes S y M'],
      ['Allianz', 'Gold Plus y Care 4', 'El embarazo debe iniciar después de 60 días de la inclusión.', 'Sí, con anexo', 'Condicionado Gold Plus y guía técnica'],
      ['AXA Colpatria', 'Fesalud y Original', 'El embarazo debe iniciar después de 90 días de vigencia.', 'Sí, con anexo', 'Cláusula de maternidad'],
      ['Seguros Mundial', 'Salud Mundial 360', 'El embarazo debe iniciar 60 días después del ingreso (30 días en póliza familiar o colectiva).', 'No', 'Cláusulas 1.1.3 y 3.6'],
      ['Seguros Mundial', 'Mundial Esencial y Silver', 'No incluyen maternidad.', 'No', 'Exclusiones del clausulado'],
      ['MAPFRE', 'Excelencia, Preferencial y Vital', 'El embarazo debe iniciar 30 días después del ingreso si hay 2 o más asegurados, o desde el segundo año si eres la única asegurada.', 'No', 'Cláusulas 5.13 (5.9 en Vital) y 2.1.21'],
    ];
    const faq = [
      ['¿Puedo afiliarme a un seguro de salud si ya estoy embarazada?',
        '<p>Sí, puedes afiliarte, pero en la mayoría de planes ese embarazo y su parto no quedarán cubiertos, porque el clausulado exige que el embarazo inicie después del ingreso o fija un período de carencia. Las excepciones son Allianz y AXA Colpatria, que ofrecen anexos de maternidad con costo adicional.</p>'],
      ['¿Cuánto cuesta el anexo de maternidad en curso de Allianz?',
        '<p>Según la guía técnica de suscripción de Allianz, aproximadamente $10.500.000 más IVA del 5 % entre las semanas 13 y 24 de gestación, y $14.500.000 más IVA entre las semanas 24 y 36. Se paga de contado con la póliza anual, aplica solo para embarazo único y gestantes de 18 a 38 años. Como el documento puede haberse actualizado, confírmalo con un asesor antes de decidir.</p>'],
      ['¿Me cubren al bebé si nace estando yo asegurada?',
        '<p>Sí, si el embarazo estaba cubierto por la póliza y lo incluyes a tiempo: 30 días después del nacimiento en SURA, Seguros Bolívar y AXA Colpatria, y 60 días en Allianz. Ojo: el anexo de maternidad de AXA para embarazos en curso excluye la atención neonatal del recién nacido.</p>'],
      ['¿Con cuánta anticipación debo afiliarme si planeo un embarazo?',
        '<p>Como mínimo, dos a tres meses antes de buscarlo en SURA, Bolívar Salud Integral o Allianz, y tres meses en AXA Colpatria. Para el plan L de Bolívar se necesitan 12 meses y para el complementario de EPS SURA la fecha de parto debe caer después de 300 días del ingreso.</p>'],
    ];
    add('embarazo', 'Embarazo y maternidad',
      'Seguro de salud si estás embarazada: qué cubre cada aseguradora',
      '¿Te cubre el seguro de salud si ya estás embarazada? Reglas de maternidad de SURA, Bolívar, Allianz y AXA y qué anexos cubren el embarazo en curso.',
      '¿Me cubre el seguro de salud si ya estoy embarazada?',
      'Es una de las dudas más frecuentes y la que más sorpresas genera. Revisamos la cláusula de maternidad de cada compañía para que sepas qué esperar antes de firmar.',
      `<h2>La respuesta corta</h2>
<p>Por regla general, <strong>no</strong>. Los seguros de salud exigen que el embarazo inicie después de la fecha de ingreso o fijan un período de carencia de maternidad, así que un embarazo en curso queda sin cobertura de parto. Las dos excepciones son <strong>Allianz</strong> y <strong>AXA Colpatria</strong>, que ofrecen anexos para cubrir el embarazo en curso pagando una prima adicional.</p>
<h2>Regla de maternidad de cada aseguradora</h2>
<div class="tabla-wrap"><table class="dato">
<caption class="vh">Regla de maternidad y cobertura del embarazo en curso por plan</caption>
<thead><tr><th scope="col">Compañía</th><th scope="col">Plan</th><th scope="col">Regla de maternidad</th><th scope="col">¿Cubre un embarazo en curso?</th><th scope="col">Fuente</th></tr></thead>
<tbody>${REGLAS.map((r) => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td><strong>${esc(r[3])}</strong></td><td class="src">${esc(r[4])}</td></tr>`).join('')}</tbody>
</table></div>
<h2>Las dos opciones si ya estás embarazada</h2>
<h3>Allianz: anexo de maternidad en curso</h3>
<ul>
<li>Aplica entre las semanas 13 y 36 de gestación, para embarazo único y gestantes de 18 a 38 años.</li>
<li>Costo aproximado según la guía técnica de Allianz: <strong>$10.500.000 + IVA</strong> (semanas 13 a 24) o <strong>$14.500.000 + IVA</strong> (semanas 24 a 36), de contado y con póliza de pago anual.</li>
<li>Debes ingresar acompañada de otra persona asegurada y presentar la historia clínica obstétrica y los exámenes del embarazo.</li>
</ul>
<h3>AXA Colpatria: asistencia opcional de maternidad</h3>
<ul>
<li>Cubre los controles y el parto del embarazo que tengas al ingresar, pagando una prima adicional.</li>
<li>No es automática: AXA se reserva el derecho de otorgarla después de valorar el riesgo.</li>
<li><strong>Excluye la atención neonatal del recién nacido</strong>, algo clave para planear gastos.</li>
</ul>
<h2>Si estás planeando un embarazo</h2>
<p>Afíliate antes de buscarlo. Con el tiempo de espera cumplido, el embarazo, el parto y las coberturas del recién nacido (incluidas enfermedades congénitas) quedan amparadas sin anexos ni recargos. El requisito más corto es de 60 días (SURA y Allianz) y el más largo, 12 meses (Bolívar plan L).</p>
${cta('Hola Vera Seguros, estoy embarazada o planeo un embarazo y quiero asesoría de seguro de salud.', 'Asesoría de maternidad')}`, faq);
  }

  // ================= 3. PRECIOS =================
  {
    const edades = [25, 35, 45, 55, 62];
    const filas = PLANES.map(([id, k, co]) => `<tr><th scope="row">${esc(co)} — ${esc(plan(id, k).plan)}<br><span class="nivel">Plan ${NIVEL[k].toLowerCase()}</span></th>${edades.map((e) => `<td>${celda(precio(id, k, e))}</td>`).join('')}</tr>`).join('');
    const rango = (k, e) => {
      const v = PLANES.filter((x) => x[1] === k).map(([id]) => precio(id, k, e).price).filter((x) => x != null);
      return [Math.min(...v), Math.max(...v)];
    };
    const [c1, c2] = rango('cla', 35), [p1, p2] = rango('sup', 35);
    const bq = precio('bolivar', 'sup', 55, 'barranquilla').price, md = precio('bolivar', 'sup', 55).price;
    const faq = [
      ['¿Cuánto cuesta un seguro de salud para una persona de 35 años?',
        `<p>Aproximadamente entre ${fmt(c1)} y ${fmt(c2)} al mes en un plan completo, y entre ${fmt(p1)} y ${fmt(p2)} en un plan premium, según la aseguradora.</p>`],
      ['¿Por qué sube tanto el precio con la edad?',
        '<p>Las tarifas se definen por rangos de edad porque el riesgo de uso de servicios médicos crece con los años. El salto suele notarse al pasar de los 40 y de los 50, y se aplica en cada renovación.</p>'],
      ['¿El precio del seguro de salud cambia según la ciudad?',
        `<p>En algunos planes sí. En Seguros Bolívar Salud Integral, Barranquilla tiene una tarifa más alta desde los 45 años: a los 55 cuesta ${fmt(bq)} frente a ${fmt(md)} en Medellín. SURA también ajusta por ciudad, aunque no publica esa tabla.</p>`],
      ['¿Los precios incluyen IVA?',
        '<p>Depende de la fuente. Las tarifas de Seguros Bolívar Salud a su Medida ya incluyen IVA, mientras que las de Salud Integral se publican antes de IVA. En el comparador indicamos la vigencia y el tipo de tarifa de cada columna.</p>'],
    ];
    add('precios', 'Precios 2026',
      'Precios de seguros de salud en Colombia 2026 por edad',
      'Cuánto cuesta un seguro de salud en Colombia en 2026: precios mensuales por edad de SURA, Bolívar, Allianz y AXA en planes premium, completos y livianos.',
      '¿Cuánto cuesta un seguro de salud en Colombia en 2026?',
      'Casi nadie publica precios, así que los reunimos: valores mensuales aproximados por edad para los planes de las cuatro aseguradoras que más cotizamos.',
      `<h2>La respuesta corta</h2>
<p>A los 35 años, un seguro de salud completo cuesta aproximadamente entre <strong>${fmt(c1)} y ${fmt(c2)} al mes</strong>, y uno premium entre <strong>${fmt(p1)} y ${fmt(p2)}</strong>. Los planes livianos parten de unos <strong>${fmt(precio('bolivar', 'liv', 35).price)}</strong>. El factor que más mueve el precio es la edad.</p>
<h2>Precio mensual por edad y plan</h2>
<p>Valores aproximados en Medellín. Si un plan no acepta nuevos afiliados a esa edad, lo indicamos.</p>
<div class="tabla-wrap"><table class="dato num">
<caption class="vh">Precio mensual aproximado de cada plan de salud por edad</caption>
<thead><tr><th scope="col">Plan</th>${edades.map((e) => `<th scope="col">${e} años</th>`).join('')}</tr></thead>
<tbody>${filas}</tbody>
</table></div>
<p>MAPFRE (Excelencia, Preferencial y Vital) y Seguros Mundial (360 y Esencial) no publican tarifas: su valor se cotiza directamente con el asesor.</p>
<h2>Qué hace variar el precio</h2>
<ul>
<li><strong>La edad</strong>, sobre todo al pasar de los 40 y de los 50 años.</li>
<li><strong>El nivel del plan:</strong> los premium suman habitación individual o suite, libre elección o cobertura internacional.</li>
<li><strong>Los deducibles y copagos:</strong> los planes Salud a su Medida de Bolívar cuestan menos porque cobran un deducible por evento.</li>
<li><strong>La ciudad:</strong> en Bolívar Salud Integral, Barranquilla es más costosa desde los 45 años.</li>
<li><strong>El estado de salud:</strong> las preexistencias pueden generar exclusiones o condiciones especiales.</li>
</ul>
<p>Para ver el valor exacto de tu edad, con coberturas lado a lado, usa el <a href="/seguros/salud/#cotizador">comparador de seguros de salud</a>.</p>
${cta('Hola Vera Seguros, quiero conocer el precio de un seguro de salud para mi edad.', 'Cotizar mi seguro de salud')}`, faq);
  }

  // ================= 4. COMPARATIVO =================
  {
    const FICHAS = [
      ['SURA', 'Salud Global (premium), Salud Clásico (completo) y el complementario «Salud Para Todos» de EPS SURA.',
        ['Red amplia en Medellín y el país', 'Salud Clásico acepta afiliados hasta antes de los 70', 'Global incluye cobertura internacional'],
        'Quien quiere la red SURA y, si ya pasó los 63, entrar por Salud Clásico.'],
      ['Seguros Bolívar', 'Salud Integral (premium) y Salud a su Medida, con planes L y M.',
        ['Único tarifario oficial publicado', 'Salud a su Medida sin límite de edad de ingreso', 'Plan M con tarifa única a cualquier edad'],
        'Presupuestos ajustados y personas mayores que no tienen otra opción.'],
      ['Allianz', 'Gold Plus 2 (premium), Gold Plus 1 (completo) y Care 4 (liviano).',
        ['Ingreso hasta los 69 años y 364 días', 'Gold Plus 2 incluye cobertura fuera de red por reembolso', 'Anexo para embarazos en curso'],
        'Quien quiere libre elección de médicos o necesita afiliarse entre los 63 y los 69.'],
      ['AXA Colpatria', 'Fesalud Amparado (premium) y Original Amparado (completo).',
        ['Especialistas sin copago en sus centros médicos', 'Coberturas de cáncer y enfermedad renal sin límite en Fesalud', 'Anexo opcional para embarazos en curso'],
        'Quien usa los centros médicos AXA y busca cero copagos.'],
    ];
    const tabla35 = ['sup', 'cla'].map((k) => `<tr><th scope="row">Plan ${NIVEL[k].toLowerCase()}</th>${['sura', 'bolivar', 'allianz', 'axa'].map((id) => `<td>${esc(plan(id, k).plan)}<br><strong>${celda(precio(id, k, 35))}</strong></td>`).join('')}</tr>`).join('');
    const faq = [
      ['¿Cuál es la mejor aseguradora de salud en Colombia?',
        '<p>No hay una sola respuesta: depende de tu edad, tu presupuesto y qué clínicas quieres usar. Allianz es la más flexible en edad de ingreso, Bolívar la más económica y la única sin límite de edad en Salud a su Medida, SURA la de red más amplia en Antioquia y AXA Colpatria la que elimina copagos en sus centros médicos.</p>'],
      ['¿Qué es más barato, SURA o Allianz?',
        `<p>A los 35 años, en plan completo, SURA Salud Clásico cuesta aproximadamente ${fmt(precio('sura', 'cla', 35).price)} al mes y Allianz Gold Plus 1 ${fmt(precio('allianz', 'cla', 35).price)}. En plan premium, SURA Salud Global cuesta ${fmt(precio('sura', 'sup', 35).price)} y Allianz Gold Plus 2 ${fmt(precio('allianz', 'sup', 35).price)}. La diferencia cambia con la edad.</p>`],
      ['¿Todas las aseguradoras piden estar afiliado a una EPS?',
        '<p>Sí. En Colombia los planes voluntarios de salud complementan el sistema obligatorio, así que necesitas estar afiliado a una EPS. El complementario «Salud Para Todos» exige, además, que esa EPS sea EPS SURA.</p>'],
    ];
    add('comparativo-aseguradoras', 'SURA vs. Allianz vs. Bolívar vs. AXA',
      'SURA vs. Allianz vs. Bolívar vs. AXA: seguros de salud 2026',
      'Comparamos los seguros de salud de SURA, Allianz, Bolívar y AXA Colpatria: planes, precios a los 35 años, edades de ingreso y para quién conviene cada uno.',
      'SURA, Allianz, Bolívar o AXA: ¿qué seguro de salud elegir?',
      'Las cuatro compañías que más cotizamos, comparadas en lo que de verdad cambia tu decisión: precio, edad de ingreso, red y condiciones.',
      `<h2>Precio a los 35 años</h2>
<p>Valores mensuales aproximados en Medellín.</p>
<div class="tabla-wrap"><table class="dato num">
<caption class="vh">Precio mensual aproximado a los 35 años por aseguradora y nivel de plan</caption>
<thead><tr><th scope="col">Nivel</th><th scope="col">SURA</th><th scope="col">Bolívar</th><th scope="col">Allianz</th><th scope="col">AXA Colpatria</th></tr></thead>
<tbody>${tabla35}</tbody>
</table></div>
<h2>Cada aseguradora, en resumen</h2>
${FICHAS.map(([co, planes, pros, ideal]) => `<h3>${esc(co)}</h3>
<p>${esc(planes)}</p>
<ul>${pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<p><strong>Ideal para:</strong> ${esc(ideal)}</p>`).join('\n')}
<h3>¿Y Seguros Mundial?</h3>
<p>Tiene tres planes individuales: Salud Mundial 360 (premium, con hospitalización sin límite de días en su red), Mundial Esencial (liviano, ambulatorio y sin períodos de carencia) y Mundial Silver (desde los 55 años, solo ambulatorio y sin edad máxima de ingreso). No publica tarifas, así que su valor se cotiza con el asesor.</p>
<h3>¿Y MAPFRE?</h3>
<p>Tiene tres planes individuales en pesos: Salud Excelencia (premium, con libre elección de médicos por reembolso, habitación suite y asistencia en viajes), Salud Preferencial (completo, solo en su red) y Salud Vital (liviano, de base hospitalaria: consultas y urgencias se contratan aparte). Acepta nuevos afiliados hasta los 59 años y 364 días y no publica tarifas, así que su valor se cotiza con el asesor.</p>
<h2>Cómo decidir</h2>
<ol>
<li><strong>Define tu presupuesto mensual</strong> y descarta lo que no cabe.</li>
<li><strong>Revisa tu edad frente a los límites de ingreso</strong> (consulta la <a href="/seguros/salud/adultos-mayores/">guía de adultos mayores</a>).</li>
<li><strong>Mira las clínicas de cada red</strong> en tu ciudad: de nada sirve un plan si tus médicos no están en él.</li>
<li><strong>Compara copagos y deducibles</strong>, no solo la prima mensual.</li>
</ol>
${cta('Hola Vera Seguros, quiero comparar SURA, Allianz, Bolívar y AXA para mi seguro de salud.', 'Comparar para mi caso')}`, faq);
  }

  // ================= 5. MEDICINA PREPAGADA =================
  {
    const rango = (k, e) => {
      const v = PLANES.filter((x) => x[1] === k).map(([id]) => precio(id, k, e).price).filter((x) => x != null);
      return [Math.min(...v), Math.max(...v)];
    };
    const [c1, c2] = rango('cla', 35), [p1, p2] = rango('sup', 35);
    const pac = precio('sura', 'liv', 35).price, planM = precio('bolivar', 'liv', 35).price;
    const TABLA = [
      ['Quién la vende', 'Empresas de medicina prepagada', 'Aseguradoras', 'Tu propia EPS'],
      ['Quién la vigila', 'Superintendencia Nacional de Salud', 'Superintendencia Financiera', 'Superintendencia Nacional de Salud'],
      ['Cómo funciona', 'Red propia o adscrita de médicos y clínicas, con bonos o copagos por servicio', 'Cubre gastos médicos según el clausulado; algunos planes permiten libre elección o reembolso', 'Mejora el plan básico de la EPS: cita directa con especialistas y habitación individual'],
      ['Cobertura internacional', 'Según el plan', 'Disponible en planes premium (p. ej. SURA Salud Global o AXA Fesalud)', 'Normalmente no'],
      ['Necesitas EPS', 'Sí', 'Sí', 'Sí, y debe ser la misma EPS'],
    ];
    const faq = [
      ['¿Qué es la medicina prepagada?',
        '<p>Es un plan voluntario de salud que se paga con una cuota periódica y da acceso a una red privada de médicos, especialistas y clínicas, además de lo que te cubre tu EPS. Lo ofrecen empresas de medicina prepagada vigiladas por la Superintendencia Nacional de Salud.</p>'],
      ['¿Qué diferencia hay entre medicina prepagada y póliza de salud?',
        '<p>La medicina prepagada funciona con una red de prestadores y bonos o copagos por servicio. La póliza de salud es un seguro de una aseguradora vigilada por la Superintendencia Financiera: cubre gastos médicos según el clausulado y, en los planes más completos, permite libre elección de médicos, reembolso o cobertura internacional. Para el usuario, ambas dan acceso privado a especialistas y hospitalización, complementario a la EPS.</p>'],
      ['¿Puedo tener medicina prepagada o póliza de salud sin EPS?',
        '<p>No. La medicina prepagada, las pólizas de salud y los planes complementarios son planes adicionales de salud (Decreto 806 de 1998) y exigen estar afiliado al sistema de salud a través de una EPS.</p>'],
      ['¿Cuánto cuesta la medicina prepagada o una póliza de salud en 2026?',
        `<p>Depende sobre todo de la edad y del plan. Como referencia, las pólizas de salud que comparamos cuestan a los 35 años entre ${fmt(c1)} y ${fmt(c2)} al mes en un plan completo, y entre ${fmt(p1)} y ${fmt(p2)} en un plan premium. Las opciones más económicas parten de unos ${fmt(planM)} (Bolívar Salud a su Medida plan M, ambulatorio) y el complementario de EPS SURA de unos ${fmt(pac)}.</p>`],
      ['¿La medicina prepagada o la póliza cubren enfermedades preexistentes?',
        '<p>Depende del contrato. Al ingresar debes declarar tu estado de salud, y las enfermedades que ya tienes pueden quedar excluidas o sujetas a condiciones especiales. Por eso conviene comparar varias compañías antes de firmar.</p>'],
    ];
    add('medicina-prepagada', '¿Prepagada o póliza de salud?',
      'Medicina prepagada en Colombia: qué es, precios y cómo elegir',
      'Medicina prepagada o póliza de salud en Colombia: diferencias, precios 2026 por edad y cuál te conviene. Compara SURA, Bolívar, Allianz, AXA, MAPFRE y Mundial.',
      'Medicina prepagada en Colombia: qué es, cuánto cuesta y cómo elegir',
      'Mucha gente busca "prepagada" cuando lo que quiere es salud privada ágil y de calidad. Te explicamos las tres formas de tenerla en Colombia, cuánto cuestan y cuál te conviene según tu caso.',
      `<h2>La respuesta corta</h2>
<p>En Colombia hay tres formas de tener salud privada además de tu EPS: la <strong>medicina prepagada</strong>, la <strong>póliza de salud</strong> y el <strong>plan complementario</strong>. Las tres exigen estar afiliado a una EPS. La diferencia está en quién te atiende, cómo se pagan los servicios y qué tan amplia es la cobertura. A los 35 años, una póliza de salud completa cuesta aproximadamente entre <strong>${fmt(c1)} y ${fmt(c2)} al mes</strong>.</p>
<h2>Prepagada, póliza o complementario: las diferencias</h2>
<div class="tabla-wrap"><table class="dato">
<caption class="vh">Diferencias entre medicina prepagada, póliza de salud y plan complementario</caption>
<thead><tr><th scope="col"></th><th scope="col">Medicina prepagada</th><th scope="col">Póliza de salud</th><th scope="col">Plan complementario</th></tr></thead>
<tbody>${TABLA.map((r) => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join('')}</tbody>
</table></div>
<h2>¿Cuál te conviene?</h2>
<ul>
<li><strong>Si quieres libre elección de médicos o cobertura fuera de la red</strong>, una póliza premium como Allianz Gold Plus 2, que reembolsa atenciones fuera de su red.</li>
<li><strong>Si viajas o quieres respaldo internacional</strong>, planes como SURA Salud Global o AXA Colpatria Fesalud, que incluyen cobertura o asistencia en el exterior.</li>
<li><strong>Si tu prioridad es el precio</strong>, los planes con deducible de Seguros Bolívar Salud a su Medida o, si estás en EPS SURA, su complementario «Salud Para Todos».</li>
<li><strong>Si tienes más de 60 años</strong>, revisa primero las edades de ingreso en la <a href="/seguros/salud/adultos-mayores/">guía para adultos mayores</a>.</li>
<li><strong>Si estás embarazada o planeas estarlo</strong>, revisa las carencias de maternidad en la <a href="/seguros/salud/embarazo/">guía de embarazo</a> antes de elegir.</li>
</ul>
<h2>Qué cotizamos en Vera Seguros</h2>
<p>Como asesores de seguros, comparamos pólizas de salud y planes complementarios de SURA, Seguros Bolívar, Allianz, AXA Colpatria, MAPFRE y Seguros Mundial. En el <a href="/seguros/salud/#cotizador">comparador de seguros de salud</a> ves precios aproximados para tu edad y las coberturas de cada plan lado a lado; cuando eliges uno, un asesor te lo cotiza por WhatsApp sin costo.</p>
${cta('Hola Vera Seguros, busco medicina prepagada o un seguro de salud y quiero asesoría.', 'Quiero asesoría de salud')}`, faq);
  }

  // ================= 6. CLAUSULADOS =================
  {
    const NIV = { sup: 'Premium', cla: 'Completo', liv: 'Liviano' };
    const fila = (planTxt, nivel, [l, u, d]) => `<tr><th scope="row">${esc(planTxt)}${l.startsWith('Nivel') ? ` — ${esc(l)}` : ''}</th><td>${esc(nivel)}</td><td>${esc(d)}</td><td><a href="${u}" target="_blank" rel="noopener">Ver PDF</a></td></tr>`;
    const tablas = DATA.map((c) => {
      const filas = ['sup', 'cla', 'liv'].filter((k) => c[k]).flatMap((k) => c[k].claus.map((x) => fila(c[k].plan, NIV[k], x)))
        .concat((c.clausOtros || []).map(([pl, u, d]) => fila(pl, 'Fuera del comparador', ['', u, d])));
      return `<h2>${esc(c.nombre)}</h2>
<div class="tabla-wrap"><table class="dato"><thead><tr><th scope="col">Plan</th><th scope="col">Nivel</th><th scope="col">Código y vigencia</th><th scope="col">Clausulado</th></tr></thead><tbody>${filas.join('')}</tbody></table></div>`;
    }).join('\n');
    const total = DATA.reduce((n, c) => n + ['sup', 'cla', 'liv'].filter((k) => c[k]).length, 0);
    const clasico = plan('sura', 'cla').claus[0];
    const faq = [
      ['¿Qué es el clausulado de un seguro de salud?',
        '<p>Es el documento de condiciones generales de la póliza: define qué cubre, las exclusiones, los períodos de carencia, las edades de ingreso y permanencia, y cómo se hacen las reclamaciones. Cada aseguradora lo identifica con un código y una fecha a partir de la cual se utiliza, y te lo debe entregar junto con la carátula de tu póliza.</p>'],
      ['¿Dónde encuentro el clausulado de SURA Salud Clásico?',
        `<p>En esta página, en la tabla de Seguros SURA: enlazamos el <a href="${clasico[1]}" target="_blank" rel="noopener">PDF oficial del Plan Salud Clásico</a> (${esc(clasico[2])}), publicado por SURA en su sitio web.</p>`],
      ['¿Qué pasa si la aseguradora cambia el clausulado?',
        '<p>Las compañías actualizan sus clausulados periódicamente. A tu póliza la rige el clausulado que aparece en tu carátula, el vigente cuando la contrataste o renovaste. Si tienes dudas sobre cuál aplica, pídeselo a tu asesor o a la aseguradora: la Ley 1328 de 2009 te da derecho a recibir información cierta, suficiente y oportuna antes de contratar.</p>'],
    ];
    add('clausulados', 'Clausulados',
      'Clausulados de seguros de salud en Colombia 2026 (PDF)',
      'Clausulados oficiales 2026 de los seguros de salud de SURA (Global y Clásico), Bolívar, Allianz, AXA Colpatria, MAPFRE y Seguros Mundial, en PDF.',
      'Clausulados de seguros de salud 2026: todos los PDF oficiales',
      `Los clausulados (condiciones generales) de los ${total} planes de nuestro <a href="/seguros/salud/#cotizador">comparador de seguros de salud</a>, enlazados al documento que publica cada aseguradora en su sitio oficial, con su código y fecha de vigencia.`,
      `<p>Antes de contratar un seguro de salud vale la pena leer su clausulado: ahí están las exclusiones, los períodos de carencia, las reglas de maternidad y las edades de ingreso que resumimos en el comparador. Los enlaces llevan directamente al PDF publicado por cada compañía; los verificamos el ${new Date(HOY + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
${tablas}
<p>Si una aseguradora publica una versión nueva, el enlace puede cambiar. El clausulado que rige tu póliza es el que te entregan con la carátula; si quieres que te ayudemos a leerlo, escríbenos.</p>
${cta('Hola Vera Seguros, quiero asesoría para entender el clausulado de un seguro de salud.', 'Te ayudamos a leer el clausulado')}`,
      faq);
  }

  return paginas;
}
