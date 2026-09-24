// Genera las páginas estáticas de producto (/seguros/<slug>/) y el sitemap.
// Uso: node tools/build-seo.mjs
//
// Por qué existe: Producto.dc.html pinta los 31 productos en el navegador, así
// que el HTML que Google recibe es idéntico para todos (mismo título, mismo
// canonical, H1 "Seguro de {{ titulo }}"). Estas páginas llevan el contenido
// ya renderizado y metadatos propios. Fuente única de datos: productos.js.

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { PRODUCTOS } from '../productos.js';
import { guiasSalud } from './guias-salud.mjs';
import { SEO } from './seo-productos.mjs';
import { SEO_EN } from './seo-productos-en.mjs';
import { paginasEn } from './paginas-en.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SITE = 'https://veraseguros.com';
const HOY = new Date().toISOString().slice(0, 10);
const WA = (msg) => 'https://wa.me/573156705627?text=' + encodeURIComponent(msg);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Nombre natural para buscar en Colombia; "Seguro de {t}" no funciona para todos.
const NOMBRE = {
  auto: 'Seguro de auto', moto: 'Seguro de moto', soat: 'SOAT', hogar: 'Seguro de hogar',
  arrendamiento: 'Seguro de arrendamiento', salud: 'Seguro de salud', 'vida-individual': 'Seguro de vida',
  'accidentes-personales': 'Seguro de accidentes personales', exequias: 'Seguro exequial',
  'viajes-y-asistencia': 'Seguro de viaje y asistencia', mascotas: 'Seguro para mascotas',
  bicicletas: 'Seguro para bicicletas', 'plan-credito-protegido': 'Seguro de crédito protegido',
  'enfermedades-graves': 'Seguro de enfermedades graves', pension: 'Pensión voluntaria y ahorro',
  educacion: 'Seguro educativo', 'todo-riesgo-empresarial': 'Seguro todo riesgo empresarial',
  pyme: 'Seguro para pymes', 'seguros-colectivos-de-salud': 'Seguro colectivo de salud para empresas',
  'transporte-de-mercancias': 'Seguro de transporte de mercancías', fraude: 'Seguro contra fraude empresarial',
  'clinicas-hospitales-y-profesionales-de-la-salud': 'Responsabilidad civil médica',
  cumplimiento: 'Póliza de cumplimiento', 'directivos-y-administradores': 'Seguro D&O para directivos y administradores',
  'proteccion-legal': 'Seguro de protección legal', 'proteccion-digital': 'Seguro de protección digital',
  'responsabilidad-civil': 'Seguro de responsabilidad civil', cyber: 'Seguro cyber (ciberriesgos)',
  transporte: 'Seguro de transporte', 'todo-riesgo-construccion': 'Seguro todo riesgo construcción',
  'cauciones-y-garantias': 'Pólizas de cauciones y garantías',
};
const CAT = { personas: 'Seguros para personas', empresas: 'Seguros para empresas', patrimoniales: 'Seguros patrimoniales' };

// Títulos a mano para las páginas de mayor intención comercial.
const TITULO = {
  salud: 'Seguros de Salud en Colombia 2026: Compara Precios por Edad',
  auto: 'Seguro de Auto en Colombia: compara aseguradoras y cotiza',
  soat: 'SOAT 2026 en Colombia: compra y renueva con asesoría',
  'vida-individual': 'Seguro de Vida en Colombia: compara y cotiza gratis',
  hogar: 'Seguro de Hogar en Colombia: compara coberturas y cotiza',
  'seguros-colectivos-de-salud': 'Seguro Colectivo de Salud para Empresas en Colombia',
  cumplimiento: 'Póliza de Cumplimiento en Colombia: cotiza en minutos',
};
const DESCRIPCION = {
  salud: 'Compara seguros de salud en Colombia: precios 2026 por edad de SURA, Bolívar, Allianz, AXA Colpatria, MAPFRE y Seguros Mundial, con asesoría gratis.',
};

// WhatsApp del botón de mayores de 60: llega al asesor ya calificado.
export const MSG_60 = 'Hola Vera Seguros, busco un *seguro de salud para una persona mayor de 60 años*.\n\n'
  + '• Edad: \n• Ciudad: \n• ¿Tiene EPS? (sí/no): \n• ¿Alguna enfermedad diagnosticada?: \n\n'
  + 'Quiero conocer los planes que tienen para esta edad.\n\nOrigen: página de salud — botón 60+';

const recortar = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
const titulo = (p) => SEO[p.slug]?.title || TITULO[p.slug] || (() => {
  const t = `${NOMBRE[p.slug] || 'Seguro de ' + p.t} en Colombia | Vera Seguros`;
  return t.length <= 62 ? t : `${NOMBRE[p.slug] || p.t} | Vera Seguros`;
})();
const descripcion = (p) => SEO[p.slug]?.description || DESCRIPCION[p.slug] || recortar(`${p.intro} Comparamos aseguradoras en Colombia y te acompañamos en la cotización.`, 158);

// Versión del cotizador para la dirección del iframe: cambia cuando cambia el archivo,
// así GitHub Pages (max-age=600) no muestra una versión vieja del comparador.
const VERSION_COTIZADOR = crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, 'cotizador-de-salud/index.html'))).digest('hex').slice(0, 8);

// ---------- piezas compartidas ----------
// SURA es el principal aliado de Vera en salud: sello visible en la página de salud y en la de precios.
export const SELLO_SURA = '<p class="sello-sura"><img src="/assets/lg/sura.png" alt="Seguros SURA" width="111" height="37"><span>Aliados oficiales de <strong>Seguros SURA</strong></span></p>';
const ICON_WA = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.42 1.31-1.96 1.36-.5.05-.96.24-3.23-.67-2.73-1.08-4.45-3.86-4.58-4.04-.13-.18-1.1-1.46-1.1-2.79 0-1.33.7-1.98.94-2.25.24-.27.53-.34.71-.34.18 0 .35.002.51.01.16.007.38-.06.6.46.24.56.79 1.94.86 2.08.07.14.12.31.02.49-.09.18-.14.29-.28.45-.14.16-.29.36-.42.48-.14.14-.28.28-.12.55.16.27.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.36.27.14.43.12.59-.07.16-.18.68-.79.86-1.07.18-.27.36-.22.6-.13.25.09 1.58.75 1.85.88.27.14.45.21.51.32.07.11.07.63-.17 1.31z"/></svg>';

// El mismo rastreo de WhatsApp que el resto del sitio, con ruta absoluta a /gracias.html
// (una ruta relativa daría 404 desde /seguros/<slug>/).
const GTM = `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-TV8VZGC');
document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href*="wa.me"]');if(!a)return;var t=(a.innerText||a.getAttribute('aria-label')||'WhatsApp').trim().slice(0,80);window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'whatsapp_click',link_url:a.href,link_text:t,page_path:location.pathname,seguro:a.getAttribute('data-seguro')||'',boton:(a.className.match(/btn-wa-[a-z\\-]+/)||[''])[0],'gtm.element':a,'gtm.elementClasses':'btn-wa','gtm.elementId':a.id||'','gtm.elementTarget':a.getAttribute('target')||'','gtm.elementUrl':a.href,'gtm.elementText':t});try{e.preventDefault();var g='/gracias.html?to='+encodeURIComponent(a.href);if((a.getAttribute('target')||'')==='_blank'){var w=window.open(g,'_blank');if(!w)window.location.href=g;}else{window.location.href=g;}}catch(err){}},true);</script>`;

const CSS = `
*{box-sizing:border-box}html,body{margin:0}
body{font-family:var(--font);font-size:17px;line-height:1.47;letter-spacing:-.01em;color:var(--ink);background:#fff;-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3{font-family:var(--font-display);text-wrap:balance}
a{color:inherit}
.wrap{max-width:1120px;margin:0 auto;padding:0 22px}
.hero{background:#fff}
.hero .wrap{padding-top:26px;padding-bottom:76px;max-width:980px}
.crumbs{font-size:13px;margin:0 0 44px;padding:0;list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:4px;color:var(--ink-3)}
.crumbs a{color:var(--ink-2);text-decoration:none}
.crumbs a:hover{text-decoration:underline;text-underline-offset:3px}
.crumbs li+li::before{content:"";display:inline-block;width:5px;height:5px;border-top:1.3px solid currentColor;border-right:1.3px solid currentColor;transform:rotate(45deg);margin:0 9px 1px 4px}
.hero h1{font-size:clamp(34px,5.6vw,64px);font-weight:600;line-height:1.05;letter-spacing:-.028em;margin:0 0 20px}
.hero p.lead{font-size:clamp(18px,1.7vw,21px);line-height:1.45;color:var(--ink-2);max-width:680px;margin:0 0 32px}
.ctas,.cta-inline{display:flex;flex-wrap:wrap;gap:14px 28px;align-items:center}
.cta-inline{margin:36px 0}
.boton-grande,.boton-pill{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:12px 24px;border-radius:980px;background:var(--cta);color:var(--cta-ink);font-size:17px;font-weight:600;letter-spacing:-.01em;text-decoration:none;box-shadow:0 10px 26px -12px rgba(37,211,102,.95);transition:background-color .2s ease,transform .12s ease-out}
.boton-grande:hover,.boton-pill:hover{background:var(--cta-hover);transform:translateY(-1px)}
.boton-grande:active,.boton-pill:active{transform:scale(.97)}
.boton-grande svg,.boton-pill svg{width:20px;height:20px;fill:currentColor;flex:none}
.btn-tel{display:inline-flex;align-items:center;min-height:44px;color:var(--link);font-size:17px;text-decoration:none}
.btn-tel:hover{text-decoration:underline;text-underline-offset:3px}
section.block{padding:84px 0}
section.block.alt{background:var(--parchment)}
h2{font-size:clamp(28px,3.6vw,40px);font-weight:600;line-height:1.1;letter-spacing:-.022em;margin:0 0 14px}
p.sub{font-size:19px;line-height:1.45;color:var(--ink-2);margin:0 0 30px;max-width:68ch}
.leyenda{display:flex;flex-wrap:wrap;gap:18px;margin-bottom:18px;font-size:14px;color:var(--ink-2)}
.leyenda span{display:inline-flex;align-items:center;gap:8px}
.mk{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;flex:none}
.mk.S{background:#dcefe8;color:#17604b}.mk.P{background:#f7ecd2;color:#7a5700}.mk.N{background:#f6e3e6;color:#a3354a}
.tabla-wrap{overflow-x:auto;border:1px solid var(--hairline);border-radius:18px;background:#fff}
table.comp{border-collapse:collapse;width:100%;font-size:14px}
table.comp th,table.comp td{border-left:1px solid var(--hairline);padding:14px 10px;text-align:center}
table.comp thead th{background:var(--parchment);color:var(--ink);font-weight:600;font-size:13px;vertical-align:top}
table.comp thead th:first-child{text-align:left;padding:16px 18px;color:var(--ink-3)}
table.comp thead img{display:block;margin:4px auto 8px;width:96px;height:32px;object-fit:contain}
table.comp tbody th{text-align:left;font-weight:400;color:var(--ink);padding:14px 18px;border-left:none}
table.comp tbody tr{border-top:1px solid var(--hairline)}
.recom{display:block;margin-top:4px;font-size:12px;font-weight:600;color:var(--accent);white-space:nowrap}
.nota{font-size:14px;line-height:1.55;color:var(--ink-3);margin:18px 0 0}
.grid-2{display:grid;grid-template-columns:1.4fr .8fr;gap:56px;align-items:start}
.lista{list-style:none;margin:0;padding:0;border-top:1px solid var(--hairline)}
.lista li{display:flex;gap:14px;align-items:flex-start;padding:16px 2px;border-bottom:1px solid var(--hairline);font-size:17px;line-height:1.45}
.lista li::before{content:"";flex:none;width:20px;height:20px;margin-top:2px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23218166' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7'/%3E%3C/svg%3E") center/20px no-repeat}
.card{background:#fff;border:1px solid var(--hairline);border-radius:18px;padding:24px}
.alt .card{border-color:transparent}
.card h3{font-size:17px;font-weight:600;letter-spacing:-.01em;margin:0 0 12px}
.card ul{margin:0;padding-left:18px;font-size:15px;line-height:1.55;color:var(--ink-2)}
.logos{display:flex;flex-wrap:wrap;gap:12px 18px;align-items:center}
.logos img{width:90px;height:30px;object-fit:contain}
.guia{display:flex;flex-direction:column;gap:6px;background:var(--parchment);border-radius:18px;padding:24px 26px;text-decoration:none;color:var(--ink);transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.guia:hover{transform:scale(1.01)}
.guia strong{font-family:var(--font-display);font-size:21px;font-weight:600;letter-spacing:-.012em}
.guia span{color:var(--link)}
.faq details{border-bottom:1px solid var(--hairline)}
.faq h2+details,.faq details:first-of-type{border-top:1px solid var(--hairline)}
.faq summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:20px;padding:22px 2px;font-family:var(--font-display);font-weight:600;font-size:19px;letter-spacing:-.01em}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"";flex:none;width:14px;height:14px;background:linear-gradient(var(--ink-2),var(--ink-2)) center/14px 1.6px no-repeat,linear-gradient(var(--ink-2),var(--ink-2)) center/1.6px 14px no-repeat}
.faq details[open] summary::after{background:linear-gradient(var(--ink-2),var(--ink-2)) center/14px 1.6px no-repeat}
.faq details p,.faq details ul{font-size:17px;line-height:1.55;color:var(--ink-2);margin:0 0 22px;padding-right:34px}
.relacionados{display:grid;grid-template-columns:repeat(3,1fr);column-gap:32px;padding:0;margin:0;list-style:none}
.relacionados li{border-bottom:1px solid var(--hairline)}
.relacionados a{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:56px;padding:12px 2px;text-decoration:none;font-size:17px;color:var(--ink)}
.relacionados a::after{content:"";flex:none;width:7px;height:7px;border-top:1.6px solid var(--ink-3);border-right:1.6px solid var(--ink-3);transform:rotate(45deg)}
.relacionados a:hover{color:var(--link)}
.cta-final{background:var(--tile-dark);color:#fff;text-align:center}
.cta-final .wrap{max-width:780px;padding-top:92px;padding-bottom:92px}
.cta-final h2{color:#fff;margin-bottom:28px}
.cta-final p.sub{color:var(--on-dark-2);margin:0 auto 32px}
.legal-mini{font-size:12px;line-height:1.6;color:#aeb8ca;margin:36px auto 0;max-width:600px}
.cotizador-sec{background:var(--parchment)}
.sello-sura{display:inline-flex;align-items:center;gap:12px;margin:30px 0 0;padding:6px 20px 6px 8px;border:1px solid var(--hairline);border-radius:980px;background:#fff;font-size:15px;color:var(--ink-2)}
.sello-sura img{width:111px;height:37px;display:block}
.sello-sura strong{color:var(--ink);font-weight:600}
.cotizador-sec .wrap>h2,.cotizador-sec .wrap>p.sub{text-align:center;margin-left:auto;margin-right:auto}
.cotizador-sec .wrap>p.sub{max-width:720px}
.legal-box{margin-top:24px;background:#fff;border-radius:18px;padding:16px 22px}
.legal-box summary{cursor:pointer;font-size:14px;font-weight:600;color:var(--ink-2)}
.legal-box[open] summary{margin-bottom:12px}
.legal-box p{font-size:12px;line-height:1.6;color:var(--ink-3);margin:0 0 10px}
.legal-box strong{color:var(--ink-2)}
.legal-box a{color:var(--link)}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.prosa{max-width:760px}
.prosa h2{margin-top:60px}.prosa h3{font-size:21px;font-weight:600;letter-spacing:-.012em;margin:34px 0 8px}
.prosa p,.prosa li{font-size:17px;line-height:1.6}
.prosa ul,.prosa ol{padding-left:22px}.prosa li{margin-bottom:8px}
.prosa a{color:var(--link)}
table.dato{border-collapse:collapse;width:100%;font-size:15px}
table.dato th,table.dato td{padding:13px 14px;border-bottom:1px solid var(--hairline);text-align:left;vertical-align:top}
table.dato thead th{background:var(--parchment);color:var(--ink);font-weight:600;font-size:13px}
table.dato tbody th{font-weight:600}
table.dato.num td{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
table.dato .src{font-size:13px;color:var(--ink-3)}
table.dato a{color:var(--link)}
.na-txt{font-size:13px;color:#a3354a;font-weight:600;white-space:normal}
.iva{font-size:12px;font-weight:400;color:var(--ink-3)}
.nivel{font-size:12px;color:var(--ink-3)}
.fuente{font-size:14px !important;color:var(--ink-3) !important;border-top:1px solid var(--hairline);padding-top:20px;margin-top:44px}
.cluster{margin-top:52px}
.banda60{background:var(--tile-dark);color:#fff}
.banda60 .wrap{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:24px 48px;padding-top:60px;padding-bottom:60px}
.banda60 .wrap>div:first-child{flex:1 1 440px}
.banda60 h2{color:#fff;font-size:clamp(24px,2.8vw,32px);margin:0}
.banda60 p{color:var(--on-dark-2);font-size:17px;line-height:1.5;margin:0}
.banda60-ctas{display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.banda60-link{color:var(--link-dark);text-decoration:none}
.banda60-link::after,.guia span::after{content:"";display:inline-block;width:6px;height:6px;border-top:1.5px solid currentColor;border-right:1.5px solid currentColor;transform:rotate(45deg);margin:0 0 1px 7px}
.banda60-link:hover{text-decoration:underline;text-underline-offset:3px}
.guias-hub{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;list-style:none;padding:0;margin:0}
.guias-hub a{display:flex;flex-direction:column;height:100%;padding:24px;border-radius:18px;text-decoration:none;background:var(--parchment);color:var(--ink);transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.guias-hub a:hover{transform:scale(1.015)}
.guias-hub strong{display:block;font-family:var(--font-display);font-size:19px;font-weight:600;letter-spacing:-.01em;margin-bottom:6px}
.guias-hub span{font-size:15px;color:var(--ink-2);line-height:1.45}
@media (max-width:1068px){.guias-hub{grid-template-columns:repeat(2,1fr)}}
@media (max-width:833px){
  .grid-2{grid-template-columns:1fr;gap:40px}
  .relacionados{grid-template-columns:1fr 1fr}
  section.block{padding:64px 0}
  .hero .wrap{padding-bottom:56px}
  .crumbs{margin-bottom:28px}
}
@media (max-width:560px){
  .guias-hub,.relacionados{grid-template-columns:1fr}
  section.block{padding:52px 0}
  .faq summary{font-size:17px}
}
`;

const header = (activo, alt) => `<header class="v-nav">
  <div class="v-nav-bar">
    <a class="v-nav-logo" href="/" aria-label="Vera Seguros, ir al inicio"><img src="/assets/logo-vera-wordmark.png" alt="Vera Seguros" width="153" height="96"></a>
    <nav class="v-nav-links" aria-label="Principal">
      <a href="/">Inicio</a>
      <a href="/Seguros.dc.html"${activo === 'seguros' ? ' aria-current="page"' : ''}>Seguros</a>
      <a href="/seguros/salud/"${activo === 'salud' ? ' aria-current="page"' : ''}>Salud</a>
      <a href="/Companias.dc.html">Compañías</a>
      <a href="/Nosotros.dc.html">Nosotros</a>
    </nav>
    <a class="v-lang" href="${alt || '/en/'}" hreflang="en" lang="en" aria-label="English version">EN</a>
    <a class="v-btn btn-wa btn-wa-header" id="btn-wa-header" href="${WA('Hola Vera Seguros, quiero cotizar un seguro.')}" target="_blank" rel="noopener">${ICON_WA} Cotizar</a>
    <button class="v-nav-menu" type="button" aria-expanded="false" aria-controls="m-menu" aria-label="Abrir menú"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg></button>
  </div>
  <nav class="v-nav-panel" id="m-menu" aria-label="Menú">
    <a href="/">Inicio</a><a href="/Seguros.dc.html">Seguros</a><a href="/seguros/salud/">Seguros de salud</a><a href="/Companias.dc.html">Compañías</a><a href="/Nosotros.dc.html">Nosotros</a><a href="${alt || '/en/'}" hreflang="en" lang="en">English</a>
    <a class="v-btn btn-wa btn-wa-menu-movil" id="btn-wa-menu-movil" href="${WA('Hola Vera Seguros, quiero cotizar un seguro.')}" target="_blank" rel="noopener">${ICON_WA} Cotizar por WhatsApp</a>
  </nav>
</header>`;

const headerEn = (activo, alt) => `<header class="v-nav">
  <div class="v-nav-bar">
    <a class="v-nav-logo" href="/en/" aria-label="Vera Seguros, go to home"><img src="/assets/logo-vera-wordmark.png" alt="Vera Seguros" width="153" height="96"></a>
    <nav class="v-nav-links" aria-label="Main">
      <a href="/en/"${activo === 'inicio' ? ' aria-current="page"' : ''}>Home</a>
      <a href="/en/health-insurance/"${activo === 'salud' ? ' aria-current="page"' : ''}>Health insurance</a>
      <a href="/en/#insurance">Insurance</a>
    </nav>
    <a class="v-lang" href="${alt || '/'}" hreflang="es" lang="es" aria-label="Ver en español">ES</a>
    <a class="v-btn btn-wa btn-wa-header" id="btn-wa-header" href="${WA('Hi Vera Seguros, I would like an insurance quote.')}" target="_blank" rel="noopener">${ICON_WA} Get a quote</a>
    <button class="v-nav-menu" type="button" aria-expanded="false" aria-controls="m-menu" aria-label="Open menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg></button>
  </div>
  <nav class="v-nav-panel" id="m-menu" aria-label="Menu">
    <a href="/en/">Home</a><a href="/en/health-insurance/">Health insurance</a><a href="/en/#insurance">Insurance</a><a href="${alt || '/'}" hreflang="es" lang="es">Español</a>
    <a class="v-btn btn-wa btn-wa-menu-movil" id="btn-wa-menu-movil" href="${WA('Hi Vera Seguros, I would like an insurance quote.')}" target="_blank" rel="noopener">${ICON_WA} Get a quote on WhatsApp</a>
  </nav>
</header>`;

const footerEn = () => `<footer class="v-foot">
  <div class="v-foot-in">
    <div class="v-foot-cols">
      <div class="v-foot-brand">
        <img src="/assets/logo-vera-wordmark.png" alt="Vera Seguros" width="153" height="96" loading="lazy">
        <p>Over 20 years helping you quote, compare, buy and manage your insurance with leading insurers in Colombia.</p>
        <p class="v-foot-legal">Vera Seguros is an insurance agency (intermediary), not an insurer. Published information is for guidance only.</p>
      </div>
      <nav aria-labelledby="pie-nav">
        <h2 id="pie-nav">Navigation</h2>
        <div class="v-foot-links">
          <a href="/en/">Home</a><a href="/en/health-insurance/">Health insurance in Colombia</a><a href="/" hreflang="es" lang="es">Versión en español</a>
        </div>
      </nav>
      <div>
        <h2>Contact</h2>
        <div class="v-foot-links">
          <span><strong style="color:var(--ink);font-weight:600">Vera Asesores Ltda.</strong><br>NIT 901039892-0</span>
          <span>Edificio Platinum Superior<br>Cra 25 # 1A Sur 155, Office 1540<br>Medellín, Colombia</span>
          <a href="tel:+573156705627">+57 315 670 5627</a>
          <a href="mailto:Info@veraseguros.com">Info@veraseguros.com</a>
          <a href="${WA('Hi Vera Seguros, I would like advice.')}" target="_blank" rel="noopener">WhatsApp: +57 315 670 5627</a>
        </div>
      </div>
    </div>
    <div class="v-foot-base">
      <span>© ${new Date().getFullYear()} Vera Seguros — Vera Asesores Ltda. All rights reserved.</span>
      <nav aria-label="Legal"><a href="/politica-tratamiento-datos.html">Privacy policy (Spanish)</a><a href="/politica-tratamiento-datos.html#r14" data-vera-cookies>Cookie settings</a></nav>
    </div>
  </div>
</footer>`;

const footer = () => `<footer class="v-foot">
  <div class="v-foot-in">
    <div class="v-foot-cols">
      <div class="v-foot-brand">
        <img src="/assets/logo-vera-wordmark.png" alt="Vera Seguros" width="153" height="96" loading="lazy">
        <p>Más de 20 años acompañándote en la cotización, comparación, contratación y gestión de tus seguros con compañías reconocidas en Colombia.</p>
        <div class="v-foot-social">
          <a href="https://www.facebook.com/Vera.seguros.Ltda" target="_blank" rel="noopener" aria-label="Facebook de Vera Seguros"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z"/></svg></a>
          <a href="https://www.instagram.com/vera.seguros" target="_blank" rel="noopener" aria-label="Instagram de Vera Seguros"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
        </div>
        <p class="v-foot-legal">Vera Seguros actúa como agencia / intermediario de seguros, no como aseguradora. La información publicada es orientativa.</p>
      </div>
      <nav aria-labelledby="pie-nav">
        <h2 id="pie-nav">Navegación</h2>
        <div class="v-foot-links">
          <a href="/">Inicio</a><a href="/Seguros.dc.html">Seguros</a><a href="/Companias.dc.html">Compañías</a><a href="/Nosotros.dc.html">Nosotros</a>
          <a href="/seguros/salud/">Seguros de salud en Colombia</a><a href="/seguros/salud/medicina-prepagada/">Medicina prepagada</a><a href="/seguros/salud/clausulados/">Clausulados de salud</a><a href="/seguro-de-salud-medellin.html">Salud en Medellín</a>
        </div>
      </nav>
      <div>
        <h2>Contacto</h2>
        <div class="v-foot-links">
          <span><strong style="color:var(--ink);font-weight:600">Vera Asesores Ltda.</strong><br>NIT 901039892-0</span>
          <span>Edificio Platinum Superior<br>Cra 25 # 1A Sur 155, Oficina 1540<br>Medellín, Colombia</span>
          <a href="tel:+573156705627">315 670 5627</a>
          <a href="mailto:Info@veraseguros.com">Info@veraseguros.com</a>
          <a href="${WA('Hola Vera Seguros, quiero asesoría.')}" target="_blank" rel="noopener">WhatsApp: 315 670 5627</a>
        </div>
      </div>
    </div>
    <div class="v-foot-base">
      <span>© ${new Date().getFullYear()} Vera Seguros — Vera Asesores Ltda. Todos los derechos reservados.</span>
      <nav aria-label="Legal"><a href="/politica-tratamiento-datos.html">Política de privacidad</a><a href="/politica-tratamiento-datos.html">Tratamiento de datos</a><a href="/politica-tratamiento-datos.html#r14" data-vera-cookies>Configurar cookies</a></nav>
    </div>
  </div>
</footer>`;

// ---------- contenido exclusivo de salud (datos verificados en clausulados) ----------
const SALUD_FAQ = [
  ['¿Qué diferencia hay entre plan complementario, medicina prepagada y póliza de salud?',
    '<p>El <strong>plan complementario</strong> se contrata con tu propia EPS y agiliza la atención (cita directa con especialistas, habitación individual). La <strong>medicina prepagada</strong> es un contrato independiente con una red propia de clínicas y médicos. La <strong>póliza de salud</strong> es un seguro de una aseguradora vigilada por la Superintendencia Financiera, con sumas aseguradas y, según el plan, libre elección de clínica o cobertura internacional. Las tres requieren estar afiliado a una EPS.</p>'],
  ['¿Hasta qué edad puedo contratar un seguro de salud?',
    '<p>Depende de la compañía y del plan. Según sus clausulados y documentos oficiales vigentes:</p><ul><li>SURA Salud Global: menores de 63 años. SURA Salud Clásico: menores de 70 años.</li><li>Seguros Bolívar Salud Integral: sin haber cumplido 60 años. Salud a su Medida (planes L y M): sin límite de edad de ingreso.</li><li>Allianz (Gold Plus y Care): desde el nacimiento hasta los 69 años y 364 días.</li><li>AXA Colpatria (Fesalud y Original): hasta los 63 años.</li><li>MAPFRE (Excelencia, Preferencial y Vital): hasta los 59 años y 364 días.</li><li>Seguros Mundial: 360 y Esencial hasta los 59 años; Silver desde los 55 sin edad máxima (solo ambulatorio).</li></ul><p>En todos estos planes la permanencia es vitalicia: una vez adentro, no te retiran por edad.</p>'],
  ['¿Me cubren el parto si contrato el seguro estando embarazada?',
    '<p>Por regla general, no: los clausulados exigen que el embarazo inicie después del ingreso o fijan un período de carencia de maternidad. Las excepciones que encontramos son Allianz, con un anexo de maternidad en curso de costo adicional, y AXA Colpatria, con un anexo opcional sujeto a valoración del riesgo. Si estás planeando un embarazo, lo recomendable es afiliarte antes.</p>'],
  ['¿Cuánto cuesta un seguro de salud en Colombia en 2026?',
    // ponytail: cifras a mano (comparador a los 35 años, sep-2026); si cambian las tarifas del cotizador, actualizarlas aquí.
    '<p>El valor depende principalmente de la edad y del plan. Como referencia, para una persona de 35 años los planes completos van aproximadamente de $361.000 a $510.000 mensuales más IVA y los planes premium de $514.000 a $746.000 más IVA. Los planes livianos parten de unos $97.000 más IVA (Bolívar Salud a su Medida Plan M, tarifa única a cualquier edad) y el de SURA «Salud para Todos» de unos $142.000 más IVA. En el comparador de esta página ves el valor aproximado para tu edad exacta; el IVA de las pólizas de salud es del 5 %.</p>'],
  ['¿Cuánto cuesta la medicina prepagada?',
    '<p>Depende de la edad, el sexo y el programa. En el comparador de esta página ves los 7 programas de Coomeva Medicina Prepagada con su precio para tu edad, y en la <a href="/seguros/salud/medicina-prepagada/">guía de medicina prepagada</a> los tienes por edad, de hombre y de mujer.</p>'],
  ['¿Vera Seguros es una aseguradora?',
    '<p>No. Vera Asesores Ltda. (NIT 901.039.892-0) es una agencia intermediaria de seguros con sede en Medellín: comparamos las opciones de varias aseguradoras, te asesoramos y acompañamos todo el proceso, sin costo adicional para ti.</p>'],
];

const banda60 = () => `
  <section class="banda60" aria-labelledby="h-60"><div class="wrap">
    <div>
      <h2 id="h-60">¿Buscas seguro de salud para una persona mayor de 60 años?</h2>
    </div>
    <div class="banda60-ctas">
      <a class="btn-wa boton-grande btn-wa-mayores" data-seguro="Salud 60+" href="${WA(MSG_60)}" target="_blank" rel="noopener">${ICON_WA} Seguro para mayores de 60</a>
      <a class="banda60-link" href="/seguros/salud/adultos-mayores/">Ver edades de ingreso por aseguradora</a>
    </div>
  </div></section>`;

const saludExtras = () => `
  <section class="block"><div class="wrap">
    <a class="guia" href="/seguro-de-salud-medellin.html"><strong>Seguros de salud en Medellín: guía 2026</strong><span>Ver guía</span></a>
    <h2 style="margin-top:36px">Guías para decidir</h2>
    <ul class="guias-hub">
      <li><a href="/seguros/salud/medicina-prepagada/"><strong>¿Prepagada o póliza de salud?</strong></a></li>
      <li><a href="/seguros/salud/precios/"><strong>Precios 2026 por edad</strong></a></li>
      <li><a href="/seguros/salud/adultos-mayores/"><strong>Adultos mayores</strong></a></li>
      <li><a href="/seguros/salud/embarazo/"><strong>Embarazo y maternidad</strong></a></li>
      <li><a href="/seguros/salud/comparativo-aseguradoras/"><strong>SURA vs. Allianz vs. Bolívar vs. AXA</strong></a></li>
      <li><a href="/seguros/salud/clausulados/"><strong>Clausulados oficiales</strong></a></li>
    </ul>
  </div></section>`;

const saludCotizador = () => `
  <section class="cotizador-sec" id="cotizador" aria-labelledby="h-cotizador">
    <div class="wrap" style="padding-top:56px;padding-bottom:56px">
      <h2 id="h-cotizador">Comparativo de seguros de salud y medicina prepagada</h2>
      <iframe id="cotizadorFrame" src="/cotizador-de-salud/?embed=1&amp;v=${VERSION_COTIZADOR}" title="Comparativo de seguros de salud y medicina prepagada" style="width:100%;height:1400px;border:0;display:block;background:transparent"></iframe>
      <details class="legal-box">
        <summary>Información legal</summary>
        <p><strong>Naturaleza de la información.</strong> Los valores mostrados son aproximados y de carácter meramente informativo e ilustrativo. Corresponden a tarifas de referencia recopiladas de tarifarios de las compañías aseguradoras y de tablas de intermediarios autorizados, cada una con la vigencia indicada. No constituyen una cotización en firme, oferta mercantil en los términos de los artículos 845 y siguientes del Código de Comercio, propuesta de seguro ni promesa de contratación, y no generan obligación ni vínculo contractual alguno para Vera Asesores Ltda.</p>
        <p><strong>Nuestra calidad.</strong> Vera Asesores Ltda., NIT 901.039.892-0, actúa exclusivamente como intermediario de seguros. Las tarifas, coberturas, exclusiones, deducibles, períodos de carencia y requisitos de asegurabilidad son fijados y modificados de forma autónoma por cada compañía aseguradora.</p>
        <p><strong>Coberturas y clausulado.</strong> Las coberturas descritas son un resumen general; su alcance se rige por el clausulado y las condiciones de cada póliza. La contratación está sujeta a la declaración veraz del estado del riesgo (artículo 1058 del Código de Comercio) y a la aceptación de la compañía.</p>
        <p><strong>Derechos del consumidor financiero.</strong> Conforme a la Ley 1328 de 2009, tienes derecho a recibir información cierta, suficiente y oportuna de la aseguradora antes de contratar. Las aseguradoras están vigiladas por la Superintendencia Financiera de Colombia.</p>
        <p style="margin:0"><strong>Tratamiento de datos personales.</strong> Los datos que suministres se tratan conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013. Puedes conocer, actualizar, rectificar, suprimir tus datos o revocar la autorización escribiendo a <a href="mailto:info@veraseguros.com">info@veraseguros.com</a>. Consulta la <a href="/politica-tratamiento-datos.html">Política de Tratamiento de Datos Personales</a>.</p>
      </details>
    </div>
  </section>`;

// Preguntas frecuentes plegadas (se indexan sin llenar la página de texto) + marcado FAQPage.
const faqSec = (pares, titulo) => `
  <section class="block faq" aria-labelledby="h-faq"><div class="wrap" style="max-width:860px">
    <h2 id="h-faq">${esc(titulo)}</h2>
    ${pares.map(([q, a]) => `<details><summary>${esc(q)}</summary>${a}</details>`).join('\n    ')}
  </div></section>`;

const IFRAME_JS = `<script>(function(){var t=new URLSearchParams(location.search).get('tipo'),f=document.getElementById('cotizadorFrame');if(t&&f&&/^(todos|seguros|prepagada)$/.test(t))f.src=f.src+'&tipo='+t;})();window.addEventListener('message',function(ev){if(ev.origin!==location.origin)return;var d=ev.data;if(!d)return;if(d.veraCotizador==='alto'&&typeof d.alto==='number'){var f=document.getElementById('cotizadorFrame');if(f)f.style.height=Math.min(Math.max(d.alto,500),8000)+'px';}else if(d.veraCotizador==='lead'){window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'cotizador_lead',aseguradora:String(d.aseguradora||'').slice(0,60),plan:String(d.plan||'').slice(0,80),nivel:String(d.nivel||''),edad:+d.edad||null});}});</script>`;
const MENU_JS = `<script>(function(){var b=document.querySelector('.v-nav-menu'),m=document.getElementById('m-menu');if(!b||!m)return;b.addEventListener('click',function(){var o=m.classList.toggle('open');b.setAttribute('aria-expanded',o);var en=/^en/.test(document.documentElement.lang);b.setAttribute('aria-label',o?(en?'Close menu':'Cerrar menú'):(en?'Open menu':'Abrir menú'));});})();</script>`;

// ---------- armazón común de página ----------
function shell({ title, description, canonical, ld, body, extraJs = '', ogType = 'website', lang = 'es', alt = null, activo = null }) {
  const en = lang === 'en';
  // hreflang: cada página enlaza su par en el otro idioma (x-default = español)
  const esUrl = en ? (alt ? SITE + alt : null) : canonical, enUrl = en ? canonical : (alt ? SITE + alt : null);
  const hreflang = esUrl && enUrl ? `<link rel="alternate" hreflang="es-CO" href="${esUrl}">\n<link rel="alternate" hreflang="en" href="${enUrl}">\n<link rel="alternate" hreflang="x-default" href="${esUrl}">\n` : '';
  return `<!DOCTYPE html>
<html lang="${en ? 'en' : 'es-CO'}">
<head>
<meta charset="utf-8">
<script>if(location.protocol==='http:'&&/(^|\\.)veraseguros\\.com$/.test(location.hostname))location.replace('https://'+location.host+location.pathname+location.search+location.hash);</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${canonical}">
${hreflang}<link rel="icon" type="image/jpeg" href="/assets/favicon-vera.jpg">
<meta name="theme-color" content="#203152">
<meta name="geo.region" content="CO-ANT"><meta name="geo.placename" content="Medellín">
<meta property="og:type" content="${ogType}"><meta property="og:site_name" content="Vera Seguros"><meta property="og:locale" content="${en ? 'en_US' : 'es_CO'}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}"><meta property="og:image" content="${SITE}/assets/logo-vera.jpg">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script src="/cookies.js"></script>
${GTM}
<link rel="stylesheet" href="/diseno.css">
<link rel="stylesheet" href="/a11y.css">
<style>${CSS}</style>
</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TV8VZGC" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<a class="skip-link" href="#contenido">${en ? 'Skip to content' : 'Saltar al contenido'}</a>
${en ? headerEn(activo, alt) : header(canonical.includes('/seguros/salud/') ? 'salud' : 'seguros', alt)}
<main id="contenido" tabindex="-1">${body}</main>
${en ? footerEn() : footer()}
<a class="v-float btn-wa btn-wa-flotante" id="btn-wa-flotante" href="${WA(en ? 'Hi Vera Seguros, I would like an insurance quote.' : 'Hola Vera Seguros, quiero cotizar un seguro.')}" target="_blank" rel="noopener" aria-label="${en ? 'Message us on WhatsApp' : 'Escríbenos por WhatsApp'}">${ICON_WA}</a>
${MENU_JS}
${extraJs}
</body>
</html>
`;
}

// ---------- página de producto ----------
function pagina(p) {
  const nombre = NOMBRE[p.slug] || 'Seguro de ' + p.t;
  const url = `${SITE}/seguros/${p.slug}/`;
  const comp = p.comparativo;
  const hermanos = PRODUCTOS.filter((x) => x.cat === p.cat && x.slug !== p.slug).slice(0, 6);
  const wa = WA(`Hola Vera Seguros, quiero cotizar: ${nombre}.`);
  const esSalud = p.slug === 'salud';
  const seo = SEO[p.slug] || {};
  const faq = esSalud ? SALUD_FAQ : (seo.faq || []).map((f) => [f.q, `<p>${esc(f.a)}</p>`]);

  const ld = [
    { '@context': 'https://schema.org', '@type': 'Service', '@id': url + '#servicio', name: `${nombre} en Colombia`,
      serviceType: nombre, description: seo.intro || p.intro, url, areaServed: { '@type': 'Country', name: 'Colombia' },
      provider: { '@type': 'InsuranceAgency', '@id': `${SITE}/#organization`, name: 'Vera Seguros', url: SITE + '/' },
      ...(comp ? { brand: comp.companias.map((c) => ({ '@type': 'Brand', name: c.name })) } : {}) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Seguros', item: `${SITE}/Seguros.dc.html` },
      { '@type': 'ListItem', position: 3, name: nombre, item: url } ] },
  ];
  if (faq.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q,
      acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() } })) });

  const tabla = comp ? `
  <section class="block" aria-labelledby="h-comp"><div class="wrap">
    <h2 id="h-comp">Comparativo de compañías: ${esc(nombre.toLowerCase())}</h2>
    <p class="leyenda"><span><span class="mk S" aria-hidden="true">✓</span>Incluida en el plan base</span><span><span class="mk P" aria-hidden="true">–</span>Opcional o parcial</span><span><span class="mk N" aria-hidden="true">✕</span>No disponible</span></p>
    <div class="tabla-wrap"><table class="comp">
      <caption class="vh">Coberturas de ${esc(nombre)} por aseguradora</caption>
      <thead><tr><th scope="col">Cobertura</th>${comp.companias.map((c) => `<th scope="col"><img src="/${c.logo}" alt="" loading="lazy" width="80" height="28">${esc(c.name)}${c.recom ? '<br><span class="recom">★ Recomendada</span>' : ''}</th>`).join('')}</tr></thead>
      <tbody>${comp.rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th>${r.cells.map((c) => `<td><span class="mk ${c.status}" role="img" aria-label="${c.status === 'S' ? 'Incluida' : c.status === 'P' ? 'Opcional o parcial' : 'No disponible'}">${c.glyph}</span></td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <p class="nota">Orientativo: las coberturas se rigen por el clausulado de cada póliza.</p>
  </div></section>` : '';

  const alt = esSalud ? '/en/health-insurance/' : SEO_EN[p.slug] ? `/en/insurance/${SEO_EN[p.slug].slug_en}/` : null;
  return shell({ title: titulo(p), description: descripcion(p), canonical: url, ld, alt, extraJs: esSalud ? IFRAME_JS : '', body: `
  <section class="hero"><div class="wrap">
    <nav aria-label="Ruta de navegación"><ol class="crumbs"><li><a href="/">Inicio</a></li><li><a href="/Seguros.dc.html">Seguros</a></li><li aria-current="page">${esc(nombre)}</li></ol></nav>
    <h1>${esc(seo.h1 || (esSalud ? 'Seguros de salud en Colombia: compara planes y precios' : nombre))}</h1>
    <p class="lead">${esc(seo.intro || (esSalud ? 'Compara SURA, Seguros Bolívar, Allianz, AXA Colpatria, MAPFRE y Seguros Mundial, con precios por edad y asesoría gratis.' : p.intro))}</p>
    <div class="ctas">
      <a class="btn-wa boton-grande btn-wa-producto" data-seguro="${esc(p.t)}" href="${wa}" target="_blank" rel="noopener">${ICON_WA} Cotizar por WhatsApp</a>
      <a class="btn-tel" href="tel:+573156705627">Llamar: 315 670 5627</a>
    </div>
    ${esSalud ? SELLO_SURA : ''}
  </div></section>
${esSalud ? banda60() : ''}
${esSalud ? saludCotizador() : tabla}
${esSalud ? saludExtras() : ''}
  <section class="block alt"><div class="wrap grid-2">
    <div>
      <h2>¿Qué cubre?</h2>
      <ul class="lista">${p.coberturas.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      ${p.nota ? `<p class="nota">${esc(p.nota)}</p>` : ''}
    </div>
    <aside style="display:flex;flex-direction:column;gap:20px">
      <div class="card"><h3>¿Para quién es?</h3><ul>${p.ideal.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>
      <div class="card"><h3>Compañías que lo manejan</h3>
        <div class="logos">${p.logos.map((l) => `<img src="/${l}" alt="${esc(path.basename(l, '.png').replace(/-/g, ' '))}" loading="lazy" width="64" height="22">`).join('')}</div></div>
    </aside>
  </div></section>
${faq.length ? faqSec(faq, esSalud ? 'Preguntas frecuentes sobre seguros de salud' : `Preguntas frecuentes sobre ${nombre.toLowerCase()}`) : ''}
  ${hermanos.length ? `<section class="block${faq.length ? ' alt' : ''}" aria-labelledby="h-rel"><div class="wrap">
    <h2 id="h-rel">Otros ${esc((CAT[p.cat] || 'seguros').toLowerCase())}</h2>
    <ul class="relacionados">${hermanos.map((h) => `<li><a href="/seguros/${h.slug}/">${esc(NOMBRE[h.slug] || h.t)}</a></li>`).join('')}</ul>
  </div></section>` : ''}
  <section class="cta-final"><div class="wrap">
    <h2>¿Te interesa ${esSalud ? 'un seguro de salud' : 'este seguro'}?</h2>
    <a class="btn-wa boton-grande btn-wa-producto-cta" data-seguro="${esc(p.t)}" href="${wa}" target="_blank" rel="noopener">${ICON_WA} Cotizar ${esc(nombre.toLowerCase())}</a>
    <p class="legal-mini">Las coberturas, primas, deducibles y condiciones están sujetas al análisis de cada aseguradora y a sus políticas de suscripción. La información es orientativa y no reemplaza las condiciones generales ni particulares de cada póliza.</p>
  </div></section>
` });
}

// ---------- escritura ----------
// Código del chatbot: todo botón de WhatsApp de /seguros/salud/ termina en «V2ED» (igual que el comparador).
const conCodigo = (html, codigo) => html.replace(/https:\/\/wa\.me\/573156705627\?text=[^"]*/g, (u) => u + encodeURIComponent('\n\n' + codigo));
let n = 0;
for (const p of PRODUCTOS) {
  const dir = path.join(ROOT, 'seguros', p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), p.slug === 'salud' ? conCodigo(pagina(p), 'V2ED') : pagina(p));
  n++;
}

const GUIAS = guiasSalud({ ROOT, SITE, HOY, esc, WA, ICON_WA, MSG_60, SELLO_SURA });
for (const g of GUIAS) {
  const dir = path.join(ROOT, 'seguros', 'salud', g.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), shell({ ...g, ogType: 'article' }));
}

// ---------- páginas en inglés ----------
const EN = paginasEn({ SITE, esc, WA, ICON_WA, VERSION_COTIZADOR, IFRAME_JS, SEO_EN, PRODUCTOS });
for (const pg of EN) {
  const dir = path.join(ROOT, pg.ruta);
  fs.mkdirSync(dir, { recursive: true });
  const html = shell({ ...pg, canonical: SITE + pg.ruta, lang: 'en' });
  fs.writeFileSync(path.join(dir, 'index.html'), pg.codigo ? conCodigo(html, pg.codigo) : html);
}

// Sitemap: solo URLs canónicas e indexables.
const urls = [
  ...EN.map((pg) => [pg.ruta, pg.activo === 'inicio' ? '0.8' : '0.85']),
  ['/', '1.0'], ['/Seguros.dc.html', '0.9'], ['/Companias.dc.html', '0.7'], ['/Nosotros.dc.html', '0.6'],
  ['/seguro-de-salud-medellin.html', '0.9'],
  ...PRODUCTOS.map((p) => [`/seguros/${p.slug}/`, p.slug === 'salud' ? '0.95' : p.cat === 'personas' ? '0.8' : '0.7']),
  ...GUIAS.map((g) => [`/seguros/salud/${g.slug}/`, '0.85']),
  ['/politica-tratamiento-datos.html', '0.2'],
];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(([u, pr]) => `  <url><loc>${SITE}${u}</loc><lastmod>${HOY}</lastmod><priority>${pr}</priority></url>`).join('\n') +
  `\n</urlset>\n`);

console.log(`${n} páginas de producto + ${GUIAS.length} guías + ${EN.length} en inglés + sitemap (${urls.length} URLs)`);
