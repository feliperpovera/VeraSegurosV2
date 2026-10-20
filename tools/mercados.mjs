// Zona "Mercados": dólar (TRM oficial), peso colombiano frente a ~30 monedas y noticias de finanzas y seguros.
// Se genera como HTML estático (Google lo indexa) y una GitHub Action lo regenera varias veces al día.
// Fuentes gratuitas, sin API key:
//   - TRM oficial: Superintendencia Financiera vía datos.gov.co (dataset 32sa-8pi3).
//   - Otras monedas: fawazahmed0/currency-api (jsDelivr), tasa de referencia del mercado.
//   - Noticias: RSS públicos de medios colombianos. Solo titular, medio, fecha y enlace (sin copiar contenido).
// Si una fuente falla se usa la última copia guardada en data/mercados.json, para no romper el build.
import fs from 'node:fs';
import path from 'node:path';

export const MONEDAS = [
  ['usd', 'dólar estadounidense', 'dolar'], ['eur', 'euro', 'euro'], ['gbp', 'libra esterlina', 'libra-esterlina'],
  ['cny', 'yuan chino', 'yuan'], ['jpy', 'yen japonés', 'yen'], ['mxn', 'peso mexicano', 'peso-mexicano'],
  ['brl', 'real brasileño', 'real-brasileno'], ['ars', 'peso argentino', 'peso-argentino'], ['clp', 'peso chileno', 'peso-chileno'],
  ['pen', 'sol peruano', 'sol-peruano'], ['ves', 'bolívar venezolano', 'bolivar-venezolano'], ['cad', 'dólar canadiense', 'dolar-canadiense'],
  ['aud', 'dólar australiano', 'dolar-australiano'], ['chf', 'franco suizo', 'franco-suizo'], ['uyu', 'peso uruguayo', 'peso-uruguayo'],
  ['bob', 'boliviano', 'boliviano'], ['dop', 'peso dominicano', 'peso-dominicano'], ['crc', 'colón costarricense', 'colon-costarricense'],
  ['gtq', 'quetzal guatemalteco', 'quetzal'], ['pab', 'balboa panameño', 'balboa'], ['krw', 'won surcoreano', 'won'],
  ['inr', 'rupia india', 'rupia-india'], ['rub', 'rublo ruso', 'rublo'], ['try', 'lira turca', 'lira-turca'],
  ['aed', 'dírham de Emiratos', 'dirham'], ['sek', 'corona sueca', 'corona-sueca'], ['nok', 'corona noruega', 'corona-noruega'],
  ['dkk', 'corona danesa', 'corona-danesa'], ['hkd', 'dólar de Hong Kong', 'dolar-hong-kong'], ['sgd', 'dólar de Singapur', 'dolar-singapur'],
  ['nzd', 'dólar neozelandés', 'dolar-neozelandes'], ['zar', 'rand sudafricano', 'rand'], ['ils', 'séquel israelí', 'sequel'],
];

const FEEDS = [
  ['La República', 'https://www.larepublica.co/rss/finanzas', 'finanzas'],
  ['Portafolio', 'https://www.portafolio.co/rss/economia.xml', 'finanzas'],
  ['Valora Analitik', 'https://www.valoraanalitik.com/feed/', 'finanzas'],
  ['El Tiempo', 'https://www.eltiempo.com/rss/economia.xml', 'finanzas'],
  ['Fasecolda', 'https://fasecolda.com/feed/', 'seguros'],
];

const UA = { headers: { 'User-Agent': 'Mozilla/5.0 (VeraSeguros mercados)' } };
const getJson = async (u) => { const r = await fetch(u, { ...UA, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); };
const getText = async (u) => { const r = await fetch(u, { ...UA, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.text(); };

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const limpiar = (s) => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m).replace(/\s+/g, ' ').trim();

function parseRss(xml, medio, tema) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/g)].map(([it]) => {
    const tag = (t) => (it.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`)) || [])[1];
    const titulo = limpiar(tag('title')), enlace = limpiar(tag('link')), fecha = new Date(limpiar(tag('pubDate')));
    // Miniatura que el propio medio publica en su RSS (media:content, enclosure o <img> del resumen).
    const img = (it.match(/<(?:media:content|media:thumbnail|enclosure)[^>]*url="([^"]+)"/) || it.match(/<img[^>]+src=["']([^"']+)/) || [])[1];
    return { titulo, enlace, medio, tema, imagen: img ? limpiar(img) : null, fecha: isNaN(fecha) ? null : fecha.toISOString() };
  }).filter((n) => n.titulo && /^https?:\/\//.test(n.enlace));
}

// Descarga (o recupera de la caché) todos los datos. Async: se llama con await desde build-seo.mjs.
export async function datosMercados(ROOT) {
  const cacheFile = path.join(ROOT, 'data', 'mercados.json');
  const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
  const d = { ...cache };
  try {
    const trm = await getJson('https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=31');
    d.trm = trm.map((t) => ({ valor: +t.valor, desde: t.vigenciadesde.slice(0, 10), hasta: t.vigenciahasta.slice(0, 10) }));
  } catch (e) { console.warn('TRM: uso caché —', e.message); }
  try {
    const j = await getJson('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
    const copPorUsd = j.usd.cop;
    d.monedas = { fecha: j.date, cop: Object.fromEntries(MONEDAS.map(([c]) => [c, c === 'usd' ? copPorUsd : copPorUsd / j.usd[c]])) };
  } catch (e) { console.warn('Monedas: uso caché —', e.message); }
  const noticias = [];
  for (const [medio, url, tema] of FEEDS) {
    try { noticias.push(...parseRss(await getText(url), medio, tema).slice(0, 12)); }
    catch (e) { console.warn('RSS', medio, '—', e.message); noticias.push(...(cache.noticias || []).filter((n) => n.medio === medio)); }
  }
  // Medios sin imagen en el RSS: se usa la imagen de portada (og:image) que cada nota declara para compartirse.
  const previas = new Map((cache.noticias || []).map((n) => [n.enlace, n.imagen]));
  for (const n of noticias) {
    if (n.imagen) continue;
    if (previas.get(n.enlace)) { n.imagen = previas.get(n.enlace); continue; }
    try {
      const h = await getText(n.enlace);
      const og = (h.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || h.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) || [])[1];
      if (og) n.imagen = limpiar(og);
    } catch (e) {}
  }
  const vistos = new Set();
  d.noticias = noticias.filter((n) => !vistos.has(n.enlace) && vistos.add(n.enlace))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  d.actualizado = new Date().toISOString();
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(d, null, 1));
  return d;
}

export function paginasMercados({ d, SITE, esc, WA, ICON_WA }) {
  if (!d.trm?.length || !d.monedas) return [];
  const cop = (v, dec = 2) => '$' + v.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const dec = (v) => (v >= 100 ? 2 : v >= 1 ? 2 : 4);
  const fechaLarga = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' });
  const hora = new Date(d.actualizado).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' });
  const trm = d.trm[0], ant = d.trm[1];
  const varTrm = ant ? trm.valor - ant.valor : 0;
  const flecha = varTrm > 0 ? '▲' : varTrm < 0 ? '▼' : '=';
  const ruta = (slug) => (slug === 'dolar' ? '/mercados/dolar-hoy/' : `/mercados/${slug}-a-peso-colombiano/`);
  const AVISO = '<p class="fuente">Valores de referencia, no son una oferta de compra o venta de divisas. La TRM es la tasa oficial certificada por la Superintendencia Financiera de Colombia (datos.gov.co); las demás monedas son tasas de referencia del mercado (currency-api). Actualizado: ' + esc(hora) + '.</p>';
  const cta = `
  <section class="cta-final"><div class="wrap">
    <h2>¿Viajas, importas o tienes negocios en otra moneda?</h2>
    <a class="btn-wa boton-grande btn-wa-mercados" href="${WA('Hola Vera Seguros, vengo de la página del dólar y quiero asesoría en seguros.')}" target="_blank" rel="noopener">${ICON_WA} Asesoría en seguros de viaje y empresa</a>
  </div></section>`;
  const tablaMonedas = `<div class="tabla-wrap"><table class="dato num">
    <caption class="vh">Valor en pesos colombianos de cada moneda</caption>
    <thead><tr><th scope="col">Moneda</th><th scope="col">1 unidad = COP</th></tr></thead>
    <tbody>${MONEDAS.map(([c, n, s]) => { const v = c === 'usd' ? trm.valor : d.monedas.cop[c]; return v ? `<tr><th scope="row"><a href="${ruta(s)}">${esc(n[0].toUpperCase() + n.slice(1))}</a> <small>${c.toUpperCase()}</small></th><td>1 ${c.toUpperCase()} = ${cop(v, dec(v))}</td></tr>` : ''; }).join('')}</tbody>
  </table></div>`;
  const listaNoticias = (ns) => `<ul class="noticias">${ns.map((n) => `<li>${n.imagen ? `<img src="${esc(n.imagen)}" alt="" width="96" height="64" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : '<span class="sin-img" aria-hidden="true"></span>'}<div><a href="${esc(n.enlace)}" target="_blank" rel="noopener nofollow">${esc(n.titulo)}</a><small>${esc(n.medio)}${n.fecha ? ' · ' + new Date(n.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' }) : ''}</small></div></li>`).join('')}</ul>`;
  // Intercala medios (cada uno en orden de fecha) para que ninguno acapare la lista.
  const mezclar = (ns) => { const g = {}; ns.forEach((n) => (g[n.medio] = g[n.medio] || []).push(n)); const out = []; for (let i = 0; out.length < ns.length; i++) Object.values(g).forEach((l) => l[i] && out.push(l[i])); return out; };
  const fin = mezclar(d.noticias.filter((n) => n.tema === 'finanzas')).slice(0, 20), seg = d.noticias.filter((n) => n.tema === 'seguros').slice(0, 8);
  const faqLd = (pares) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: pares.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  const faqHtml = (pares) => `<section class="block faq"><div class="wrap" style="max-width:860px"><h2>Preguntas frecuentes</h2>${pares.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>`;

  const paginas = [];
  // Hub
  paginas.push({
    ruta: '/mercados/', title: 'Peso colombiano hoy: dólar, euro y 30 monedas | Vera Seguros',
    description: `TRM oficial hoy: ${cop(trm.valor)}. Peso colombiano frente al dólar, euro, yuan, libra y 30 monedas más, y noticias de finanzas y seguros del día.`,
    ld: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Mercados: dólar, monedas y noticias', url: SITE + '/mercados/', dateModified: d.actualizado }],
    body: `
  <section class="hero"><div class="wrap">
    <h1>Peso colombiano hoy: monedas y noticias de finanzas</h1>
    <p class="lead">TRM oficial del ${esc(fechaLarga(trm.desde))}: <strong>${cop(trm.valor)}</strong> <span class="var">${flecha} ${cop(Math.abs(varTrm))}</span></p>
  </div></section>
  <section class="block"><div class="wrap"><h2>Peso colombiano frente a otras monedas</h2>${tablaMonedas}${AVISO}</div></section>
  <section class="block alt"><div class="wrap"><h2>Noticias de finanzas y economía</h2>${listaNoticias(fin)}</div></section>
  ${seg.length ? `<section class="block"><div class="wrap"><h2>Noticias del sector asegurador</h2>${listaNoticias(seg)}</div></section>` : ''}
  ${cta}`,
  });
  // Una página por moneda
  for (const [c, n, s] of MONEDAS) {
    const esUsd = c === 'usd', v = esUsd ? trm.valor : d.monedas.cop[c];
    if (!v) continue;
    const N = n[0].toUpperCase() + n.slice(1), C = c.toUpperCase();
    const montos = [1, 5, 10, 20, 50, 100, 500, 1000];
    const faq = esUsd ? [
      ['¿Qué es la TRM?', 'La Tasa Representativa del Mercado es el valor oficial del dólar en Colombia. La calcula y certifica la Superintendencia Financiera cada día hábil con base en las operaciones del mercado cambiario.'],
      ['¿El precio del dólar en una casa de cambio es igual a la TRM?', 'No. Las casas de cambio y los bancos aplican su propio precio de compra y de venta, que suele ser distinto a la TRM.'],
    ] : [
      [`¿Cuánto vale 1 ${n} en pesos colombianos hoy?`, `Según la tasa de referencia del ${d.monedas.fecha}, 1 ${n} (${C}) equivale a ${cop(v, dec(v))} pesos colombianos.`],
      [`¿Este es el precio al que compro ${n}?`, 'No. Es una tasa de referencia del mercado; bancos y casas de cambio aplican su propio margen de compra y venta.'],
    ];
    paginas.push({
      ruta: ruta(s),
      title: esUsd ? `Dólar hoy en Colombia: TRM ${cop(trm.valor)}` : `${N} a peso colombiano hoy: ${cop(v, dec(v))}`.slice(0, 60),
      description: esUsd ? `TRM oficial del dólar hoy en Colombia: ${cop(trm.valor)} (${fechaLarga(trm.desde)}). Histórico de los últimos 30 días y conversión de dólares a pesos.`
        : `1 ${n} (${C}) a peso colombiano hoy: ${cop(v, dec(v))}. Conversión de ${C} a COP y de pesos a ${n}, actualizada a diario.`,
      ld: [faqLd(faq)],
      body: `
  <section class="hero"><div class="wrap">
    <nav aria-label="Migas"><ol class="crumbs"><li><a href="/">Inicio</a></li><li><a href="/mercados/">Mercados</a></li><li aria-current="page">${esc(N)}</li></ol></nav>
    <h1>${esUsd ? 'Dólar hoy en Colombia (TRM)' : `${esc(N)} a peso colombiano hoy`}</h1>
    <p class="lead">1 ${C} = <strong>${cop(v, dec(v))}</strong>${esUsd ? ` <span class="var">${flecha} ${cop(Math.abs(varTrm))}</span> · vigente el ${esc(fechaLarga(trm.desde))}` : ` · ${esc(d.monedas.fecha)}`}</p>
  </div></section>
  <section class="block"><div class="wrap grid-2">
    <div><h2>De ${C} a pesos</h2><div class="tabla-wrap"><table class="dato num"><tbody>${montos.map((m) => `<tr><th scope="row">${m.toLocaleString('es-CO')} ${C}</th><td>${cop(m * v, 0)}</td></tr>`).join('')}</tbody></table></div></div>
    <div><h2>De pesos a ${C}</h2><div class="tabla-wrap"><table class="dato num"><tbody>${[10000, 50000, 100000, 500000, 1000000].map((m) => `<tr><th scope="row">${cop(m, 0)}</th><td>${(m / v).toLocaleString('es-CO', { maximumFractionDigits: 2 })} ${C}</td></tr>`).join('')}</tbody></table></div></div>
  </div></section>
  ${esUsd ? `<section class="block alt"><div class="wrap"><h2>TRM de los últimos 30 días</h2><div class="tabla-wrap"><table class="dato num"><thead><tr><th scope="col">Vigencia</th><th scope="col">TRM</th></tr></thead><tbody>${d.trm.map((t) => `<tr><th scope="row">${t.desde === t.hasta ? t.desde : t.desde + ' a ' + t.hasta}</th><td>${cop(t.valor)}</td></tr>`).join('')}</tbody></table></div></div></section>` : ''}
  <section class="block"><div class="wrap">${AVISO}<p><a href="/mercados/">Ver todas las monedas y noticias →</a></p></div></section>
  ${faqHtml(faq)}
  ${cta}`,
    });
  }
  return paginas;
}
