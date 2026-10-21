// Guías del clúster de autos y motos (/seguros/auto/<tema>/).
// Solo hechos de fuentes primarias (ya verificados en tools/blog-fuentes.json):
// Código Nacional de Tránsito (Ley 769 de 2002) y Estatuto Orgánico del Sistema Financiero (SOAT).
// Sin precios de todo riesgo: no hay tarifa pública; se remite al cotizador por placa.

const L769 = ['Código Nacional de Tránsito, Ley 769 de 2002 (Función Pública)', 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=5557'];
const EOSF = ['Estatuto Orgánico del Sistema Financiero, normas del SOAT (Senado)', 'http://www.secretariasenado.gov.co/senado/basedoc/estatuto_organico_sistema_financiero_pr007.html'];
const SOAT_GM = ['Topes de gastos médicos del SOAT (Función Pública)', 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=60483'];
const FASE = ['Tarifas máximas SOAT 2026 (Fasecolda)', 'https://www.fasecolda.com/wp-content/uploads/Tarifas-SOAT-2026-referencia.pdf'];

export const GUIAS_AUTO = [
    { slug: 'cuanto-cuesta-seguro-todo-riesgo-carro', corto: '¿Cuánto cuesta el todo riesgo?' },
    { slug: 'seguro-de-moto-todo-riesgo', corto: 'Todo riesgo para moto' },
    { slug: 'deducible-seguro-de-carro', corto: 'Qué es el deducible' },
    { slug: 'soat-vs-todo-riesgo', corto: 'SOAT vs. todo riesgo' },
    { slug: 'que-hacer-en-un-accidente-de-transito', corto: 'Qué hacer en un accidente' },
    { slug: 'seguro-de-carro-medellin', corto: 'Seguro de carro en Medellín' },
  ];

export function guiasAuto({ SITE, HOY, esc, WA, ICON_WA }) {
  const HUB = `${SITE}/seguros/auto/`;
  const plano = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const cta = (msg) => `<p class="cta-inline"><a class="btn-wa boton-grande" href="/seguros/auto/#cotizador">Cotizar con mi placa</a> <a class="btn-tel btn-wa-guia" data-seguro="Autos" href="${WA(msg)}" target="_blank" rel="noopener">${ICON_WA} WhatsApp</a></p>`;
  const faqHtml = (faq) => `<section class="faq" aria-labelledby="h-faq"><h2 id="h-faq">Preguntas frecuentes</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary>${a}</details>`).join('')}</section>`;
  const fuentes = (fs) => fs.length ? `<p class="fuente"><strong>Fuentes.</strong> ${fs.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`).join(' · ')}. Información orientativa; las condiciones de cada póliza están en su clausulado. Revisado: ${HOY}.</p>`
    : `<p class="fuente">Información orientativa; las condiciones de cada póliza están en su clausulado. Revisado: ${HOY}.</p>`;
  const cluster = (actual) => `<aside class="cluster" aria-labelledby="h-cluster"><h2 id="h-cluster">Más guías de autos y motos</h2><ul class="relacionados">${
    GUIAS_AUTO.filter((g) => g.slug !== actual).map((g) => `<li><a href="/seguros/auto/${g.slug}/">${esc(g.corto)}</a></li>`).join('')
  }<li><a href="/seguros/auto/">Cotizador de carro y moto</a></li></ul></aside>`;

  const paginas = [];
  const add = (slug, nombre, title, description, h1, lead, contenido, faq, src) => {
    const url = `${HUB}${slug}/`;
    paginas.push({ slug, title, description, canonical: url, ld: [
      { '@context': 'https://schema.org', '@type': 'Article', headline: h1, description, url, mainEntityOfPage: url, inLanguage: 'es-CO',
        datePublished: '2026-10-21', dateModified: HOY,
        author: { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Vera Seguros' },
        publisher: { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Vera Seguros', logo: { '@type': 'ImageObject', url: `${SITE}/assets/logo-vera.jpg` } } },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: 'Seguros', item: `${SITE}/Seguros.dc.html` },
        { '@type': 'ListItem', position: 3, name: 'Seguro de carro y moto', item: HUB },
        { '@type': 'ListItem', position: 4, name: nombre, item: url }] },
      { '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: plano(a) } })) },
    ], body: `
  <section class="hero"><div class="wrap"><nav aria-label="Ruta de navegación"><ol class="crumbs"><li><a href="/">Inicio</a></li><li><a href="/Seguros.dc.html">Seguros</a></li><li><a href="/seguros/auto/">Carro y moto</a></li><li aria-current="page">${esc(nombre)}</li></ol></nav>
    <h1>${esc(h1)}</h1>
    <p class="lead">${lead}</p>
  </div></section>
  <article class="block"><div class="wrap prosa">
${contenido}
${faqHtml(faq)}
${fuentes(src)}
${cluster(slug)}
  </div></article>` });
  };

  add('cuanto-cuesta-seguro-todo-riesgo-carro', '¿Cuánto cuesta?',
    '¿Cuánto cuesta un seguro todo riesgo para carro?',
    'El precio del todo riesgo depende del carro, su valor, el uso, el deducible y tu perfil. Cotiza con tu placa y ve precios reales en minutos.',
    '¿Cuánto cuesta un seguro todo riesgo para carro?',
    'Depende de tu carro y de ti. No hay una tarifa pública única: cada aseguradora fija su precio.',
    `<h2>Qué mueve el precio</h2>
<ul>
<li>Marca, modelo y valor comercial del carro.</li>
<li>Uso: particular, familiar o de trabajo.</li>
<li>Ciudad donde circula.</li>
<li>Tu edad e historial como conductor.</li>
<li>Coberturas y <a href="/seguros/auto/deducible-seguro-de-carro/">deducible</a> que elijas.</li>
</ul>
<h2>Cómo saber tu precio</h2>
<p>Escribe tu placa en el cotizador. Ves ofertas de varias aseguradoras con su deducible, sin costo.</p>
${cta('Hola Vera Seguros, quiero saber cuánto cuesta el todo riesgo de mi carro.')}`,
    [['¿Hay un precio fijo para el todo riesgo?', '<p>No. Cada aseguradora calcula el precio según el carro, el uso, la ciudad, el conductor, las coberturas y el deducible.</p>'],
      ['¿Un deducible más alto baja el precio?', '<p>Suele bajarlo, porque asumes una parte mayor de cada reclamación.</p>'],
      ['¿El todo riesgo reemplaza el SOAT?', '<p>No. El SOAT es obligatorio aparte. Mira <a href="/seguros/auto/soat-vs-todo-riesgo/">SOAT vs. todo riesgo</a>.</p>']],
    [L769]);

  add('seguro-de-moto-todo-riesgo', 'Todo riesgo para moto',
    'Seguro todo riesgo para moto: qué cubre y cómo cotizar',
    'Qué cubre un seguro todo riesgo de moto, por qué igual necesitas SOAT y cómo cotizar con tu placa en minutos.',
    'Seguro todo riesgo para moto',
    'El SOAT cubre a las personas. El todo riesgo protege tu moto y tu bolsillo.',
    `<h2>Qué suele cubrir</h2>
<ul>
<li>Pérdida total o parcial por daños.</li>
<li>Hurto de la moto.</li>
<li>Responsabilidad civil: daños a otras personas o sus bienes.</li>
<li>Asistencias, según el plan.</li>
</ul>
<p>Coberturas, límites y deducibles cambian por póliza. Revísalos antes de elegir.</p>
<h2>El SOAT sigue siendo obligatorio</h2>
<p>Todo vehículo debe tener seguro obligatorio vigente para transitar, motos incluidas (Ley 769 de 2002, art. 42).</p>
${cta('Hola Vera Seguros, quiero cotizar el todo riesgo de mi moto.')}`,
    [['¿El todo riesgo de moto incluye el SOAT?', '<p>No. Son seguros distintos y el SOAT se compra aparte.</p>'],
      ['¿Qué pasa si manejo la moto sin SOAT?', '<p>Multa de 30 salarios mínimos legales diarios vigentes e inmovilización del vehículo (Ley 769 de 2002, art. 131, literal D.2).</p>'],
      ['¿Cómo cotizo mi moto?', '<p>Con la placa, en el <a href="/seguros/auto/#cotizador">cotizador de carro y moto</a>.</p>']],
    [L769, EOSF]);

  add('deducible-seguro-de-carro', 'Deducible',
    'Deducible del seguro de carro: qué es y cómo elegirlo',
    'El deducible es la parte de la pérdida que pagas tú al reclamar. Qué significa, cómo afecta el precio y dónde verlo antes de comprar.',
    'Qué es el deducible del seguro de carro',
    'Es lo que pagas tú cuando reclamas. La aseguradora paga el resto, hasta el valor asegurado.',
    `<h2>Cómo se expresa</h2>
<p>Suele ser un porcentaje del daño con un mínimo en salarios mínimos. Cada póliza fija el suyo.</p>
<h2>Cómo elegir</h2>
<ul>
<li>Deducible alto: prima más baja, pagas más por reclamo.</li>
<li>Deducible bajo: prima más alta, pagas menos por reclamo.</li>
</ul>
<p>El cotizador muestra el deducible de cada oferta.</p>
${cta('Hola Vera Seguros, quiero entender el deducible de mi seguro de carro.')}`,
    [['¿Dónde aparece el deducible?', '<p>En la carátula y el clausulado de la póliza, por cada cobertura.</p>'],
      ['¿El deducible aplica a todo?', '<p>Depende de la póliza: puede variar por cobertura o no aplicar a algunas.</p>'],
      ['¿El SOAT tiene deducible?', '<p>El SOAT paga a las víctimas hasta sus topes legales; no funciona como el todo riesgo. Mira <a href="/seguros/auto/soat-vs-todo-riesgo/">SOAT vs. todo riesgo</a>.</p>']],
    []);

  add('soat-vs-todo-riesgo', 'SOAT vs. todo riesgo',
    'SOAT vs. todo riesgo: diferencias y cuál necesitas',
    'El SOAT es obligatorio y cubre a las personas; el todo riesgo es voluntario y cubre tu vehículo y daños a terceros. Diferencias según la ley.',
    'SOAT vs. todo riesgo: en qué se diferencian',
    'El SOAT es obligatorio y protege a las personas. El todo riesgo es voluntario y protege tu vehículo.',
    `<h2>SOAT</h2>
<ul>
<li>Obligatorio para transitar (Ley 769 de 2002, art. 42).</li>
<li>Cubre a todas las víctimas, incluido el conductor.</li>
<li>Gastos médicos hasta 800 SMDLV por víctima.</li>
<li>Incapacidad permanente hasta 180 SMDLV.</li>
<li>Muerte y gastos funerarios: 750 SMDLV.</li>
<li>Transporte de la víctima: 10 SMDLV.</li>
<li>No cubre daños a vehículos ni a cosas.</li>
</ul>
<h2>Todo riesgo</h2>
<ul>
<li>Voluntario.</li>
<li>Daños y hurto de tu vehículo.</li>
<li>Responsabilidad civil: daños a otras personas o sus bienes.</li>
<li>Asistencias, según el plan.</li>
</ul>
<h2>Cuál necesitas</h2>
<p>El SOAT, siempre. El todo riesgo, si quieres proteger tu vehículo y tu patrimonio.</p>
${cta('Hola Vera Seguros, quiero cotizar SOAT y todo riesgo.')}`,
    [['¿Cuánto es la multa por no tener SOAT?', '<p>30 salarios mínimos legales diarios vigentes, más inmovilización del vehículo (Ley 769 de 2002, art. 131, literal D.2).</p>'],
      ['¿Cuánto cuesta el SOAT en 2026?', `<p>Tiene tarifas máximas por tipo de vehículo, publicadas por <a href="${FASE[1]}" target="_blank" rel="noopener">Fasecolda</a>. Puedes <a href="/comprar-soat/">comprarlo en línea</a>.</p>`],
      ['¿El SOAT cubre el arreglo de mi carro?', '<p>No. El SOAT no cubre daños a vehículos ni a objetos.</p>']],
    [L769, EOSF, SOAT_GM, FASE]);

  add('que-hacer-en-un-accidente-de-transito', 'Qué hacer en un accidente',
    'Qué hacer en un accidente de tránsito en Colombia',
    'Qué dice la Ley 769 de 2002 si hay solo daños materiales, qué hacer si hay heridos y cómo avisar a tu aseguradora.',
    'Qué hacer en un accidente de tránsito',
    'Primero las personas. Luego las pruebas. Después el aviso a tu aseguradora.',
    `<h2>Si hay heridos</h2>
<p>Pide ayuda médica. El SOAT cubre a todas las víctimas y los hospitales están obligados a atenderlas.</p>
<h2>Si solo hay daños materiales</h2>
<ul>
<li>Toma pruebas: fotos, videos y datos de los implicados.</li>
<li>Retira los vehículos de la vía de inmediato.</li>
<li>Pueden conciliar en un centro autorizado por el Ministerio de Justicia.</li>
<li>No se necesita informe de la autoridad de tránsito.</li>
</ul>
<p>Así lo dice el artículo 143 de la Ley 769 de 2002. Si los vehículos están asegurados, pueden acudir directo a las aseguradoras (art. 143A).</p>
<h2>Avisa a tu aseguradora</h2>
<p>Repórtalo cuanto antes por su línea de asistencia y sigue sus pasos.</p>
${cta('Hola Vera Seguros, tuve un accidente y necesito orientación con mi seguro.')}`,
    [['¿Debo esperar al agente de tránsito si solo hay latas?', '<p>No es obligatorio. La ley pide recaudar pruebas y retirar los vehículos; esas pruebas reemplazan el informe de accidente (Ley 769 de 2002, art. 143).</p>'],
      ['¿Quién paga la atención de los heridos?', '<p>El SOAT del vehículo, hasta sus topes. Cubre incluso si el causante no tenía SOAT o no fue identificado.</p>'],
      ['¿El SOAT paga el daño de los carros?', '<p>No. Eso lo cubre la responsabilidad civil o el todo riesgo. Mira <a href="/seguros/auto/soat-vs-todo-riesgo/">SOAT vs. todo riesgo</a>.</p>']],
    [L769, EOSF]);

  add('seguro-de-carro-medellin', 'Medellín',
    'Seguro de carro en Medellín: cotiza con tu placa',
    'Cotiza el seguro todo riesgo de tu carro o moto en Medellín con tu placa. Compara varias aseguradoras y recibe asesoría local gratis.',
    'Seguro de carro en Medellín',
    'Somos asesores de seguros en Medellín. Cotizas con tu placa y te acompañamos si tienes un siniestro.',
    `<h2>Cómo funciona</h2>
<ul>
<li>Escribe tu placa.</li>
<li>Compara ofertas de varias aseguradoras.</li>
<li>Elige y te ayudamos a expedir.</li>
</ul>
<p>La ciudad donde circulas influye en el precio. Por eso es mejor cotizar con tus datos reales.</p>
<h2>Antes de elegir</h2>
<ul>
<li>Mira el <a href="/seguros/auto/deducible-seguro-de-carro/">deducible</a>.</li>
<li>Revisa la responsabilidad civil y las asistencias.</li>
<li>Ten tu <a href="/comprar-soat/">SOAT</a> vigente.</li>
</ul>
${cta('Hola Vera Seguros, estoy en Medellín y quiero cotizar el seguro de mi carro.')}`,
    [['¿Atienden solo en Medellín?', '<p>Estamos en Medellín y también te asesoramos por WhatsApp.</p>'],
      ['¿Cuánto cuesta el seguro en Medellín?', '<p>Depende del carro y del conductor. Mira <a href="/seguros/auto/cuanto-cuesta-seguro-todo-riesgo-carro/">qué mueve el precio</a> o cotiza con tu placa.</p>'],
      ['¿También aseguran motos?', '<p>Sí. Mira el <a href="/seguros/auto/seguro-de-moto-todo-riesgo/">todo riesgo para moto</a>.</p>']],
    [L769]);

  return paginas;
}
