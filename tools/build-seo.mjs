// Genera las páginas estáticas de producto (/seguros/<slug>/) y el sitemap.
// Uso: node tools/build-seo.mjs
//
// Por qué existe: Producto.dc.html pinta los 31 productos en el navegador, así
// que el HTML que Google recibe es idéntico para todos (mismo título, mismo
// canonical, H1 "Seguro de {{ titulo }}"). Estas páginas llevan el contenido
// ya renderizado y metadatos propios. Fuente única de datos: productos.js.

import fs from 'node:fs';
import path from 'node:path';
import { PRODUCTOS } from '../productos.js';

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
  salud: 'Seguro de Salud 2026: compara SURA, Bolívar, Allianz y AXA',
  auto: 'Seguro de Auto en Colombia: compara aseguradoras y cotiza',
  soat: 'SOAT 2026 en Colombia: compra y renueva con asesoría',
  'vida-individual': 'Seguro de Vida en Colombia: compara y cotiza gratis',
  hogar: 'Seguro de Hogar en Colombia: compara coberturas y cotiza',
  'seguros-colectivos-de-salud': 'Seguro Colectivo de Salud para Empresas en Colombia',
  cumplimiento: 'Póliza de Cumplimiento en Colombia: cotiza en minutos',
};
const DESCRIPCION = {
  salud: 'Compara precios 2026 de seguros de salud de SURA, Bolívar, Allianz y AXA Colpatria según tu edad. Edades de ingreso y reglas de embarazo verificadas.',
};

const recortar = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
const titulo = (p) => TITULO[p.slug] || (() => {
  const t = `${NOMBRE[p.slug] || 'Seguro de ' + p.t} en Colombia | Vera Seguros`;
  return t.length <= 62 ? t : `${NOMBRE[p.slug] || p.t} | Vera Seguros`;
})();
const descripcion = (p) => DESCRIPCION[p.slug] || recortar(`${p.intro} Comparamos aseguradoras en Colombia y te acompañamos en la cotización.`, 158);

// ---------- piezas compartidas ----------
const ICON_WA = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.42 1.31-1.96 1.36-.5.05-.96.24-3.23-.67-2.73-1.08-4.45-3.86-4.58-4.04-.13-.18-1.1-1.46-1.1-2.79 0-1.33.7-1.98.94-2.25.24-.27.53-.34.71-.34.18 0 .35.002.51.01.16.007.38-.06.6.46.24.56.79 1.94.86 2.08.07.14.12.31.02.49-.09.18-.14.29-.28.45-.14.16-.29.36-.42.48-.14.14-.28.28-.12.55.16.27.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.36.27.14.43.12.59-.07.16-.18.68-.79.86-1.07.18-.27.36-.22.6-.13.25.09 1.58.75 1.85.88.27.14.45.21.51.32.07.11.07.63-.17 1.31z"/></svg>';

// El mismo rastreo de WhatsApp que el resto del sitio, con ruta absoluta a /gracias.html
// (una ruta relativa daría 404 desde /seguros/<slug>/).
const GTM = `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-TV8VZGC');
document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href*="wa.me"]');if(!a)return;var t=(a.innerText||a.getAttribute('aria-label')||'WhatsApp').trim().slice(0,80);window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'whatsapp_click',link_url:a.href,link_text:t,page_path:location.pathname,seguro:a.getAttribute('data-seguro')||'',boton:(a.className.match(/btn-wa-[a-z\\-]+/)||[''])[0],'gtm.element':a,'gtm.elementClasses':'btn-wa','gtm.elementId':a.id||'','gtm.elementTarget':a.getAttribute('target')||'','gtm.elementUrl':a.href,'gtm.elementText':t});try{e.preventDefault();var g='/gracias.html?to='+encodeURIComponent(a.href);if((a.getAttribute('target')||'')==='_blank'){var w=window.open(g,'_blank');if(!w)window.location.href=g;}else{window.location.href=g;}}catch(err){}},true);</script>`;

const CSS = `
*{box-sizing:border-box}html,body{margin:0}
body{font-family:'Mulish',system-ui,sans-serif;color:#203152;background:#fff;-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3{letter-spacing:-0.02em;text-wrap:balance}
a{color:inherit}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.site-header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,0.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid #E7ECF6}
.site-header .bar{max-width:1200px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:24px}
.site-header .brand img{height:120px;width:120px;object-fit:contain;border-radius:18px;display:block}
.site-header nav{display:flex;gap:30px}
.site-header nav a{text-decoration:none;font-weight:600;font-size:15px;color:#203152;padding:6px 0}
.site-header nav a[aria-current="page"]{box-shadow:inset 0 -2px 0 #2d4777}
.btn-wa-pill{display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 20px;border-radius:999px;box-shadow:0 6px 18px rgba(37,211,102,0.28)}
.menu-btn{display:none;width:50px;height:50px;border:1px solid #E7ECF6;border-radius:14px;background:#fff;align-items:center;justify-content:center;cursor:pointer;padding:0}
.m-menu{border-top:1px solid #E7ECF6;background:#fff;padding:6px 16px 18px;flex-direction:column;display:none}
.m-menu.open{display:flex}
.m-menu a{text-decoration:none;color:#203152;font-weight:600;font-size:17px;padding:15px 6px;border-bottom:1px solid #F0F3F9}
.hero{position:relative;background:linear-gradient(180deg,#F5F7FC,#EAF0FB);overflow:hidden}
.hero .wrap{position:relative;padding-top:32px;padding-bottom:52px;max-width:980px}
.crumbs{font-size:14px;margin:0 0 20px;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px;color:#56575c}
.crumbs a{color:#3c609c;text-decoration:none;font-weight:600}
.crumbs li+li::before{content:"›";margin-right:6px;color:#72757d}
.chip{display:inline-block;background:#fff;border:1px solid #D5DEF0;color:#2d4777;font-weight:600;font-size:13px;padding:6px 13px;border-radius:999px;margin-bottom:16px}
.hero h1{font-weight:800;font-size:42px;line-height:1.08;margin:0 0 16px}
.hero p.lead{font-size:19px;line-height:1.6;color:#56575c;max-width:680px;margin:0 0 28px}
.ctas{display:flex;flex-wrap:wrap;gap:12px}
.btn-wa-big{display:inline-flex;align-items:center;gap:9px;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:999px;box-shadow:0 10px 26px rgba(37,211,102,0.3)}
.btn-tel{display:inline-flex;align-items:center;gap:8px;background:#fff;color:#2d4777;border:1.5px solid #C8D4ED;text-decoration:none;font-weight:700;font-size:16px;padding:14px 24px;border-radius:999px}
section.block{padding:48px 0}
h2{font-weight:700;font-size:28px;line-height:1.2;margin:0 0 10px}
p.sub{font-size:16px;line-height:1.6;color:#56575c;margin:0 0 20px;max-width:70ch}
.leyenda{display:flex;flex-wrap:wrap;gap:18px;margin-bottom:16px;font-size:13px;color:#2d4777}
.leyenda span{display:inline-flex;align-items:center;gap:7px}
.mk{width:26px;height:26px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex:none}
.mk.S{background:#d2eae8;color:#218166}.mk.P{background:#FBF2DC;color:#8a6100}.mk.N{background:#F6E7EA;color:#B23B4E}
.tabla-wrap{overflow-x:auto;border:1px solid #E7ECF6;border-radius:18px;box-shadow:0 6px 20px rgba(28,43,79,0.05)}
table.comp{border-collapse:collapse;width:100%;font-size:14px}
table.comp th,table.comp td{border-left:1px solid #EEF1F7;padding:12px 8px;text-align:center}
table.comp thead th{background:#203152;color:#d8e4f5;font-weight:600;font-size:12px;vertical-align:top}
table.comp thead th:first-child{text-align:left;text-transform:uppercase;letter-spacing:.5px;font-size:13px;padding:16px 18px}
table.comp thead img{display:block;margin:6px auto 6px;max-height:28px;max-width:80px;object-fit:contain;background:#fff;border-radius:6px;padding:3px}
table.comp tbody th{text-align:left;font-weight:500;color:#203152;padding:14px 18px;border-left:none}
table.comp tbody tr{border-top:1px solid #EEF1F7}
.recom{display:inline-block;font-size:11px;font-weight:700;color:#fff;background:#2d4777;border-radius:999px;padding:2px 8px;white-space:nowrap}
.nota{font-size:13px;line-height:1.6;color:#72757d;margin:16px 0 0}
.grid-2{display:grid;grid-template-columns:1.4fr .8fr;gap:40px;align-items:start}
.lista{display:flex;flex-direction:column;gap:12px;padding:0;margin:0;list-style:none}
.lista li{display:flex;gap:13px;align-items:flex-start;background:#F5F7FC;border:1px solid #EAF0FB;border-radius:14px;padding:16px 18px;font-size:15px;line-height:1.5;color:#2d4777;font-weight:500}
.lista li::before{content:"";width:24px;height:24px;flex:none;border-radius:50%;background:#3da787 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 13l4 4L19 7'/%3E%3C/svg%3E") center no-repeat}
.card{background:#fff;border:1px solid #E7ECF6;border-radius:18px;padding:22px;box-shadow:0 6px 20px rgba(28,43,79,0.06)}
.card h3{font-size:15px;margin:0 0 12px}
.card ul{margin:0;padding-left:18px;font-size:14px;line-height:1.55;color:#56575c}
.logos{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.logos img{height:22px;max-width:64px;object-fit:contain}
.guia{display:block;background:linear-gradient(120deg,#EAF7EF,#d2eae8);border:1px solid #CBE9D8;border-radius:16px;padding:18px 22px;text-decoration:none}
.guia strong{font-size:15.5px}
.guia span{display:block;color:#218166;font-weight:700;font-size:14px;margin-top:4px}
.faq details{border:1px solid #E7ECF6;border-radius:14px;padding:0 18px;margin-bottom:10px;background:#fff}
.faq summary{cursor:pointer;font-weight:700;font-size:16px;padding:16px 0;list-style-position:outside}
.faq details p,.faq details ul{font-size:15px;line-height:1.65;color:#56575c;margin:0 0 16px}
.relacionados{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:0;margin:0;list-style:none}
.relacionados a{display:block;padding:14px 16px;border:1px solid #E7ECF6;border-radius:14px;text-decoration:none;font-weight:600;font-size:15px;color:#203152;background:#fff}
.relacionados a:hover{border-color:#218166}
.cta-final{background:#F5F7FC;text-align:center}
.cta-final .wrap{max-width:760px;padding-top:56px;padding-bottom:56px}
.legal-mini{font-size:12px;line-height:1.6;color:#72757d;margin:28px auto 0;max-width:600px}
.cotizador-sec{background:linear-gradient(180deg,#EAF0FB,#F5F7FC);border-top:1px solid #E7ECF6}
.legal-box{margin-top:28px;background:#fff;border:1px solid #E7ECF6;border-radius:16px;padding:22px 24px}
.legal-box h3{font-size:14px;margin:0 0 12px}
.legal-box p{font-size:12px;line-height:1.65;color:#72757d;margin:0 0 10px}
.legal-box strong{color:#56575c}
.legal-box a{color:#218166;font-weight:600}
.site-footer{background:#203152;color:#d8e4f5}
.site-footer .inner{max-width:1200px;margin:0 auto;padding:56px 24px 28px}
.site-footer .cols{display:flex;flex-wrap:wrap;gap:48px;justify-content:space-between}
.site-footer h4{font-size:14px;color:#fff;margin:0 0 14px;text-transform:uppercase;letter-spacing:1px}
.site-footer a{color:#d8e4f5;text-decoration:none}
.site-footer .links{display:flex;flex-direction:column;gap:10px;font-size:14px}
.site-footer .base{margin-top:40px;padding-top:20px;border-top:1px solid #2d4777;display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;font-size:12px}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.wa-float{position:fixed;bottom:24px;right:24px;z-index:80;width:60px;height:60px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 28px rgba(37,211,102,0.45)}
@media (max-width:880px){.grid-2{grid-template-columns:1fr}.relacionados{grid-template-columns:repeat(2,1fr)}}
@media (max-width:760px){
  .site-header .bar{padding:8px 16px}
  .site-header nav,.site-header .hdr-cta{display:none}
  .menu-btn{display:flex}
  .site-header .brand img{height:100px;width:100px}
  .hero h1{font-size:31px}.hero p.lead{font-size:17px}
  h2{font-size:24px}
  .relacionados{grid-template-columns:1fr}
}
@media (min-width:761px){.m-menu{display:none !important}}
`;

const header = (activo) => `<header class="site-header">
  <div class="bar">
    <a class="brand" href="/" aria-label="Vera Seguros, ir al inicio"><img src="/assets/logo-vera.jpg" alt="Vera Seguros — agencia de seguros en Medellín" width="500" height="500"></a>
    <nav aria-label="Principal">
      <a href="/">Inicio</a>
      <a href="/Seguros.dc.html"${activo === 'seguros' ? ' aria-current="page"' : ''}>Seguros</a>
      <a href="/Companias.dc.html">Compañías</a>
      <a href="/Nosotros.dc.html">Nosotros</a>
    </nav>
    <a class="hdr-cta btn-wa btn-wa-pill btn-wa-header" id="btn-wa-header" href="${WA('Hola Vera Seguros, quiero cotizar un seguro.')}" target="_blank" rel="noopener">${ICON_WA.replace('width="20" height="20"', 'width="18" height="18"')} Cotizar</a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="m-menu" aria-label="Abrir menú">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#203152" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
  </div>
  <div class="m-menu" id="m-menu">
    <a href="/">Inicio</a><a href="/Seguros.dc.html">Seguros</a><a href="/Companias.dc.html">Compañías</a><a href="/Nosotros.dc.html">Nosotros</a>
    <a class="btn-wa btn-wa-big btn-wa-menu-movil" id="btn-wa-menu-movil" href="${WA('Hola Vera Seguros, quiero cotizar un seguro.')}" target="_blank" rel="noopener" style="margin-top:14px;justify-content:center">${ICON_WA} Cotizar por WhatsApp</a>
  </div>
</header>`;

const footer = () => `<footer class="site-footer">
  <div class="inner">
    <div class="cols">
      <div style="max-width:320px">
        <p style="display:flex;align-items:center;gap:10px;margin:0 0 16px"><img src="/assets/logo-vera.jpg" alt="" width="44" height="44" style="border-radius:11px;object-fit:cover"><strong style="font-size:19px;color:#fff">Vera Seguros</strong></p>
        <p style="font-size:14px;line-height:1.6;margin:0 0 14px">Más de 20 años acompañándote en la cotización, comparación, contratación y gestión de tus seguros con compañías reconocidas en Colombia.</p>
        <p style="font-size:12px;line-height:1.6;margin:0">Vera Seguros actúa como agencia / intermediario de seguros, no como aseguradora. La información publicada es orientativa.</p>
      </div>
      <div>
        <h4>Navegación</h4>
        <div class="links">
          <a href="/">Inicio</a><a href="/Seguros.dc.html">Seguros</a><a href="/Companias.dc.html">Compañías</a><a href="/Nosotros.dc.html">Nosotros</a>
          <a href="/seguros/salud/">Seguro de salud</a><a href="/seguro-de-salud-medellin.html">Salud en Medellín</a>
        </div>
      </div>
      <div style="max-width:280px">
        <h4>Contacto</h4>
        <div class="links" style="line-height:1.5">
          <strong style="color:#fff">Vera Asesores Ltda.</strong>
          <span>NIT 901039892-0</span>
          <span>Edificio Platinum Superior<br>Cra 25 # 1A Sur 155, Oficina 1540<br>Medellín, Colombia</span>
          <a href="tel:+573156705627">315 670 5627</a>
          <a href="mailto:Info@veraseguros.com">Info@veraseguros.com</a>
        </div>
      </div>
    </div>
    <div class="base">
      <span>© ${new Date().getFullYear()} Vera Seguros — Vera Asesores Ltda. Todos los derechos reservados.</span>
      <span style="display:flex;gap:18px;flex-wrap:wrap"><a href="/politica-tratamiento-datos.html">Política de privacidad</a><a href="/politica-tratamiento-datos.html#r14" data-vera-cookies>Configurar cookies</a></span>
    </div>
  </div>
</footer>`;

// ---------- contenido exclusivo de salud (datos verificados en clausulados) ----------
const SALUD_FAQ = [
  ['¿Qué diferencia hay entre plan complementario, medicina prepagada y póliza de salud?',
    '<p>El <strong>plan complementario</strong> se contrata con tu propia EPS y agiliza la atención (cita directa con especialistas, habitación individual). La <strong>medicina prepagada</strong> es un contrato independiente con una red propia de clínicas y médicos. La <strong>póliza de salud</strong> es un seguro de una aseguradora vigilada por la Superintendencia Financiera, con sumas aseguradas y, según el plan, libre elección de clínica o cobertura internacional. Las tres requieren estar afiliado a una EPS.</p>'],
  ['¿Hasta qué edad puedo contratar un seguro de salud?',
    '<p>Depende de la compañía y del plan. Según sus clausulados y documentos oficiales vigentes:</p><ul><li>SURA Salud Global: menores de 63 años. SURA Salud Clásico: menores de 70 años.</li><li>Seguros Bolívar Salud Integral: sin haber cumplido 60 años. Salud a su Medida (planes L y M): sin límite de edad de ingreso.</li><li>Allianz (Gold Plus y Care): desde el nacimiento hasta los 69 años y 364 días.</li><li>AXA Colpatria (Fesalud y Original): hasta los 63 años.</li></ul><p>En todos estos planes la permanencia es vitalicia: una vez adentro, no te retiran por edad.</p>'],
  ['¿Me cubren el parto si contrato el seguro estando embarazada?',
    '<p>Por regla general, no: los clausulados exigen que el embarazo inicie después del ingreso o fijan un período de carencia de maternidad. Las excepciones que encontramos son Allianz, con un anexo de maternidad en curso de costo adicional, y AXA Colpatria, con un anexo opcional sujeto a valoración del riesgo. Si estás planeando un embarazo, lo recomendable es afiliarte antes.</p>'],
  ['¿Cuánto cuesta un seguro de salud en Colombia en 2026?',
    '<p>El valor depende principalmente de la edad y del plan. Como referencia, para una persona de 35 años los planes completos van aproximadamente de $380.000 a $515.000 mensuales y los planes premium de $515.000 a $750.000. Los planes livianos parten de unos $101.000 (Bolívar Salud a su Medida Plan M, tarifa única a cualquier edad) y el complementario de EPS SURA de unos $147.000. En el comparador de esta página ves el valor aproximado para tu edad exacta.</p>'],
  ['¿Vera Seguros es una aseguradora?',
    '<p>No. Vera Asesores Ltda. (NIT 901.039.892-0) es una agencia intermediaria de seguros con sede en Medellín: comparamos las opciones de varias aseguradoras, te asesoramos y acompañamos todo el proceso, sin costo adicional para ti.</p>'],
];

const saludExtras = () => `
  <section class="block"><div class="wrap">
    <a class="guia" href="/seguro-de-salud-medellin.html"><strong>Guía 2026: seguros de salud en Medellín — precios, EPS vs. prepagada y comparativa local</strong><span>Ver la guía completa →</span></a>
  </div></section>`;

const saludCotizador = () => `
  <section class="cotizador-sec" id="cotizador" aria-labelledby="h-cotizador">
    <div class="wrap" style="padding-top:56px;padding-bottom:56px">
      <h2 id="h-cotizador">Compara precios de referencia para tu edad</h2>
      <p class="sub">Consulta valores mensuales aproximados de los planes de SURA, Seguros Bolívar, Allianz y AXA Colpatria según tu edad y tu ciudad, con sus coberturas lado a lado. Al finalizar puedes enviarle tus datos a un asesor para recibir una cotización formal.</p>
      <iframe id="cotizadorFrame" src="/cotizador-de-salud/?embed=1" title="Comparativo de planes de salud" loading="lazy" style="width:100%;height:1400px;border:0;display:block;background:transparent"></iframe>
      <div class="legal-box">
        <h3>Información legal sobre este comparativo</h3>
        <p><strong>Naturaleza de la información.</strong> Los valores mostrados son aproximados y de carácter meramente informativo e ilustrativo. Corresponden a tarifas de referencia recopiladas de tarifarios de las compañías aseguradoras y de tablas de intermediarios autorizados, cada una con la vigencia indicada. No constituyen una cotización en firme, oferta mercantil en los términos de los artículos 845 y siguientes del Código de Comercio, propuesta de seguro ni promesa de contratación, y no generan obligación ni vínculo contractual alguno para Vera Asesores Ltda.</p>
        <p><strong>Nuestra calidad.</strong> Vera Asesores Ltda., NIT 901.039.892-0, actúa exclusivamente como intermediario de seguros. Las tarifas, coberturas, exclusiones, deducibles, períodos de carencia y requisitos de asegurabilidad son fijados y modificados de forma autónoma por cada compañía aseguradora.</p>
        <p><strong>Coberturas y clausulado.</strong> Las coberturas descritas son un resumen general; su alcance se rige por el clausulado y las condiciones de cada póliza. La contratación está sujeta a la declaración veraz del estado del riesgo (artículo 1058 del Código de Comercio) y a la aceptación de la compañía.</p>
        <p><strong>Derechos del consumidor financiero.</strong> Conforme a la Ley 1328 de 2009, tienes derecho a recibir información cierta, suficiente y oportuna de la aseguradora antes de contratar. Las aseguradoras están vigiladas por la Superintendencia Financiera de Colombia.</p>
        <p style="margin:0"><strong>Tratamiento de datos personales.</strong> Los datos que suministres se tratan conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013. Puedes conocer, actualizar, rectificar, suprimir tus datos o revocar la autorización escribiendo a <a href="mailto:info@veraseguros.com">info@veraseguros.com</a>. Consulta la <a href="/politica-tratamiento-datos.html">Política de Tratamiento de Datos Personales</a>.</p>
      </div>
    </div>
  </section>
  <section class="block faq" aria-labelledby="h-faq"><div class="wrap" style="max-width:860px">
    <h2 id="h-faq">Preguntas frecuentes sobre seguros de salud</h2>
    ${SALUD_FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary>${a}</details>`).join('\n    ')}
  </div></section>`;

const IFRAME_JS = `<script>window.addEventListener('message',function(ev){if(ev.origin!==location.origin)return;var d=ev.data;if(!d||d.veraCotizador!=='alto'||typeof d.alto!=='number')return;var f=document.getElementById('cotizadorFrame');if(f)f.style.height=Math.min(Math.max(d.alto,500),8000)+'px';});</script>`;
const MENU_JS = `<script>(function(){var b=document.querySelector('.menu-btn'),m=document.getElementById('m-menu');if(!b||!m)return;b.addEventListener('click',function(){var o=m.classList.toggle('open');b.setAttribute('aria-expanded',o);b.setAttribute('aria-label',o?'Cerrar menú':'Abrir menú');});})();</script>`;

// ---------- página de producto ----------
function pagina(p) {
  const nombre = NOMBRE[p.slug] || 'Seguro de ' + p.t;
  const url = `${SITE}/seguros/${p.slug}/`;
  const comp = p.comparativo;
  const hermanos = PRODUCTOS.filter((x) => x.cat === p.cat && x.slug !== p.slug).slice(0, 6);
  const wa = WA(`Hola Vera Seguros, quiero cotizar: ${nombre}.`);
  const esSalud = p.slug === 'salud';

  const ld = [
    { '@context': 'https://schema.org', '@type': 'Service', '@id': url + '#servicio', name: `${nombre} en Colombia`,
      serviceType: nombre, description: p.intro, url, areaServed: { '@type': 'Country', name: 'Colombia' },
      provider: { '@type': 'InsuranceAgency', '@id': `${SITE}/#organization`, name: 'Vera Seguros', url: SITE + '/' },
      ...(comp ? { brand: comp.companias.map((c) => ({ '@type': 'Brand', name: c.name })) } : {}) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Seguros', item: `${SITE}/Seguros.dc.html` },
      { '@type': 'ListItem', position: 3, name: nombre, item: url } ] },
  ];
  if (esSalud) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: SALUD_FAQ.map(([q, a]) => ({ '@type': 'Question', name: q,
      acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() } })) });

  const tabla = comp ? `
  <section class="block" aria-labelledby="h-comp"><div class="wrap">
    <h2 id="h-comp">Comparativo de compañías: ${esc(nombre.toLowerCase())}</h2>
    <p class="sub">Comparamos las aseguradoras que ofrecen este seguro en Colombia. La cobertura exacta se confirma siempre al cotizar según tu perfil.</p>
    <p class="leyenda"><span><span class="mk S" aria-hidden="true">✓</span>Incluida en el plan base</span><span><span class="mk P" aria-hidden="true">–</span>Opcional o parcial</span><span><span class="mk N" aria-hidden="true">✕</span>No disponible</span></p>
    <div class="tabla-wrap"><table class="comp">
      <caption class="vh">Coberturas de ${esc(nombre)} por aseguradora</caption>
      <thead><tr><th scope="col">Cobertura</th>${comp.companias.map((c) => `<th scope="col"><img src="/${c.logo}" alt="" loading="lazy" width="80" height="28">${esc(c.name)}${c.recom ? '<br><span class="recom">★ Recomendada</span>' : ''}</th>`).join('')}</tr></thead>
      <tbody>${comp.rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th>${r.cells.map((c) => `<td><span class="mk ${c.status}" role="img" aria-label="${c.status === 'S' ? 'Incluida' : c.status === 'P' ? 'Opcional o parcial' : 'No disponible'}">${c.glyph}</span></td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <p class="nota">Comparativo orientativo basado en información pública de cada aseguradora. Las coberturas, sublímites, deducibles y exclusiones se rigen por el clausulado vigente de cada póliza. Vera Seguros actúa como agencia / intermediario de seguros.</p>
  </div></section>` : '';

  return `<!DOCTYPE html>
<html lang="es-CO">
<head>
<meta charset="utf-8">
<script>if(location.protocol==='http:'&&/(^|\\.)veraseguros\\.com$/.test(location.hostname))location.replace('https://'+location.host+location.pathname+location.search+location.hash);</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo(p))}</title>
<meta name="description" content="${esc(descripcion(p))}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/jpeg" href="/assets/favicon-vera.jpg">
<meta name="theme-color" content="#203152">
<meta name="geo.region" content="CO-ANT"><meta name="geo.placename" content="Medellín">
<meta property="og:type" content="website"><meta property="og:site_name" content="Vera Seguros"><meta property="og:locale" content="es_CO">
<meta property="og:title" content="${esc(titulo(p))}"><meta property="og:description" content="${esc(descripcion(p))}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/assets/logo-vera.jpg">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script src="/cookies.js"></script>
${GTM}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/a11y.css">
<style>${CSS}</style>
</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TV8VZGC" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<a class="skip-link" href="#contenido">Saltar al contenido</a>
${header('seguros')}
<main id="contenido" tabindex="-1">
  <section class="hero"><div class="wrap">
    <nav aria-label="Ruta de navegación"><ol class="crumbs"><li><a href="/">Inicio</a></li><li><a href="/Seguros.dc.html">Seguros</a></li><li aria-current="page">${esc(nombre)}</li></ol></nav>
    <span class="chip">${esc(CAT[p.cat] || 'Seguros')}</span>
    <h1>${esc(nombre)}${esSalud ? ' en Colombia' : ''}</h1>
    <p class="lead">${esc(p.intro)}</p>
    <div class="ctas">
      <a class="btn-wa btn-wa-big btn-wa-producto" data-seguro="${esc(p.t)}" href="${wa}" target="_blank" rel="noopener">${ICON_WA} Cotizar por WhatsApp</a>
      <a class="btn-tel" href="tel:+573156705627">Llamar: 315 670 5627</a>
    </div>
  </div></section>
${tabla}
${esSalud ? saludExtras() : ''}
  <section class="block"><div class="wrap grid-2">
    <div>
      <h2>¿Qué cubre?</h2>
      <ul class="lista">${p.coberturas.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      ${p.nota ? `<p class="nota">${esc(p.nota)}</p>` : ''}
    </div>
    <aside style="display:flex;flex-direction:column;gap:20px">
      <div class="card"><h3>¿Para quién es?</h3><ul>${p.ideal.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>
      <div class="card"><h3>Compañías que lo manejan</h3><p style="margin:0 0 14px;font-size:13px;color:#72757d">Comparamos opciones entre estas aseguradoras.</p>
        <div class="logos">${p.logos.map((l) => `<img src="/${l}" alt="${esc(path.basename(l, '.png').replace(/-/g, ' '))}" loading="lazy" width="64" height="22">`).join('')}</div></div>
    </aside>
  </div></section>
${esSalud ? saludCotizador() : ''}
  ${hermanos.length ? `<section class="block" aria-labelledby="h-rel" style="padding-top:8px"><div class="wrap">
    <h2 id="h-rel">Otros ${esc((CAT[p.cat] || 'seguros').toLowerCase())}</h2>
    <ul class="relacionados">${hermanos.map((h) => `<li><a href="/seguros/${h.slug}/">${esc(NOMBRE[h.slug] || h.t)}</a></li>`).join('')}</ul>
  </div></section>` : ''}
  <section class="cta-final"><div class="wrap">
    <h2>¿Te interesa ${esSalud ? 'un seguro de salud' : 'este seguro'}?</h2>
    <p class="sub" style="margin:0 auto 24px">Te ayudamos a comparar opciones y elegir la cobertura adecuada para ti, sin costo adicional.</p>
    <a class="btn-wa btn-wa-big btn-wa-producto-cta" data-seguro="${esc(p.t)}" href="${wa}" target="_blank" rel="noopener">${ICON_WA} Cotizar ${esc(nombre.toLowerCase())}</a>
    <p class="legal-mini">Las coberturas, primas, deducibles y condiciones están sujetas al análisis de cada aseguradora y a sus políticas de suscripción. La información es orientativa y no reemplaza las condiciones generales ni particulares de cada póliza.</p>
  </div></section>
</main>
${footer()}
<a class="btn-wa btn-wa-flotante wa-float" id="btn-wa-flotante" href="${WA('Hola Vera Seguros, quiero cotizar un seguro.')}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">${ICON_WA.replace('width="20" height="20"', 'width="32" height="32"')}</a>
${MENU_JS}
${esSalud ? IFRAME_JS : ''}
</body>
</html>
`;
}

// ---------- escritura ----------
let n = 0;
for (const p of PRODUCTOS) {
  const dir = path.join(ROOT, 'seguros', p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), pagina(p));
  n++;
}

// Sitemap: solo URLs canónicas e indexables.
const urls = [
  ['/', '1.0'], ['/Seguros.dc.html', '0.9'], ['/Companias.dc.html', '0.7'], ['/Nosotros.dc.html', '0.6'],
  ['/seguro-de-salud-medellin.html', '0.9'],
  ...PRODUCTOS.map((p) => [`/seguros/${p.slug}/`, p.slug === 'salud' ? '0.95' : p.cat === 'personas' ? '0.8' : '0.7']),
  ['/politica-tratamiento-datos.html', '0.2'],
];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(([u, pr]) => `  <url><loc>${SITE}${u}</loc><lastmod>${HOY}</lastmod><priority>${pr}</priority></url>`).join('\n') +
  `\n</urlset>\n`);

console.log(`${n} páginas de producto + sitemap (${urls.length} URLs)`);
