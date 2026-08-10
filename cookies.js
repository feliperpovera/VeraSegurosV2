/* Vera Seguros — Gestor de consentimiento de cookies
   Ley 1581 de 2012 · Decreto 1074 de 2015 (Colombia)
   Debe cargarse en el <head> ANTES de Google Tag Manager y del pixel de Meta. */
(function () {
  var KEY = 'vera_cookies_v1';
  var POLICY = 'politica-tratamiento-datos.html';

  // ---------- estado guardado ----------
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
  var granted = {
    necesarias: true,
    analiticas: !!(saved && saved.analiticas),
    marketing: !!(saved && saved.marketing)
  };

  // ---------- 1) Google Consent Mode v2 (por defecto denegado) ----------
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });

  function pushConsent() {
    gtag('consent', 'update', {
      ad_storage: granted.marketing ? 'granted' : 'denied',
      ad_user_data: granted.marketing ? 'granted' : 'denied',
      ad_personalization: granted.marketing ? 'granted' : 'denied',
      analytics_storage: granted.analiticas ? 'granted' : 'denied'
    });
    if (window.fbq) { try { window.fbq('consent', granted.marketing ? 'grant' : 'revoke'); } catch (e) {} }
    window.dataLayer.push({
      event: 'vera_consent_update',
      consent_analiticas: granted.analiticas,
      consent_marketing: granted.marketing
    });
  }

  // El pixel de Meta solo arranca con consentimiento de marketing.
  // Las páginas registran aquí su inicialización y se ejecuta cuando corresponde.
  var pixelQueue = [];
  var pixelDone = false;
  function runPixel() {
    if (pixelDone || !granted.marketing) return;
    pixelDone = true;
    while (pixelQueue.length) { try { pixelQueue.shift()(); } catch (e) {} }
  }

  window.VeraCookies = {
    get: function () { return { necesarias: true, analiticas: granted.analiticas, marketing: granted.marketing }; },
    decidido: function () { return !!saved; },
    // fn se ejecuta solo si hay consentimiento de marketing (ahora o cuando se otorgue)
    onMarketing: function (fn) { pixelQueue.push(fn); runPixel(); },
    abrir: function () { render(true); }
  };

  if (saved) { pushConsent(); }

  // ---------- 2) Guardado ----------
  function guardar(analiticas, marketing) {
    granted.analiticas = !!analiticas;
    granted.marketing = !!marketing;
    saved = { analiticas: granted.analiticas, marketing: granted.marketing, fecha: new Date().toISOString(), version: 1 };
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
    pushConsent();
    runPixel();
    cerrar();
  }

  // ---------- 3) Interfaz ----------
  var el = null;
  function cerrar() { if (el) { el.remove(); el = null; } }

  var CSS = ''
  + '#vera-ck{position:fixed;inset:auto 0 0 0;z-index:2147483000;font-family:Mulish,system-ui,-apple-system,sans-serif;padding:14px}'
  + '#vera-ck .bx{max-width:940px;margin:0 auto;background:#fff;border:1px solid #E7ECF6;border-radius:18px;box-shadow:0 16px 46px rgba(28,43,79,.20);padding:20px 22px}'
  + '#vera-ck h2{font-size:16px;font-weight:800;color:#203152;margin:0 0 7px}'
  + '#vera-ck p{font-size:13.5px;line-height:1.55;color:#56575c;margin:0 0 14px}'
  + '#vera-ck a{color:#2d4777;font-weight:600}'
  + '#vera-ck .bs{display:flex;flex-wrap:wrap;gap:9px;align-items:center}'
  + '#vera-ck button{font-family:inherit;font-weight:700;font-size:14px;padding:11px 20px;border-radius:999px;cursor:pointer;border:1.5px solid transparent}'
  + '#vera-ck .ok{background:#218166;color:#fff}'
  + '#vera-ck .no{background:#fff;color:#2d4777;border-color:#C8D4ED}'
  + '#vera-ck .cf{background:transparent;color:#2d4777;border-color:transparent;text-decoration:underline;padding-left:6px}'
  + '#vera-ck .op{border-top:1px solid #EEF1F7;margin-top:14px;padding-top:12px;display:none}'
  + '#vera-ck.open .op{display:block}'
  + '#vera-ck .row{display:flex;gap:11px;align-items:flex-start;padding:9px 0}'
  + '#vera-ck .row b{display:block;font-size:13.5px;color:#203152}'
  + '#vera-ck .row span{display:block;font-size:12.5px;color:#797c85;line-height:1.45}'
  + '#vera-ck input[type=checkbox]{width:17px;height:17px;margin-top:2px;accent-color:#218166;flex:none}'
  + '@media(max-width:560px){#vera-ck .bs{flex-direction:column;align-items:stretch}#vera-ck button{width:100%}}';

  function render(forzarPanel) {
    cerrar();
    var st = document.createElement('style'); st.textContent = CSS;
    el = document.createElement('div');
    el.id = 'vera-ck';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-label', 'Preferencias de cookies');
    el.innerHTML = ''
      + '<div class="bx">'
      + '  <h2>Usamos cookies 🍪</h2>'
      + '  <p>Usamos cookies propias y de terceros para que el sitio funcione, medir su uso y mostrarte publicidad relevante. Puedes aceptarlas todas, rechazar las opcionales o elegir cuáles permites. Consulta nuestra <a href="' + POLICY + '">Política de Tratamiento de Datos Personales</a>.</p>'
      + '  <div class="bs">'
      + '    <button class="ok" id="ck-all">Aceptar todas</button>'
      + '    <button class="no" id="ck-none">Rechazar opcionales</button>'
      + '    <button class="cf" id="ck-cfg">Configurar</button>'
      + '  </div>'
      + '  <div class="op">'
      + '    <div class="row"><input type="checkbox" checked disabled><div><b>Necesarias (siempre activas)</b><span>Permiten la navegación y el funcionamiento básico del sitio. Sin ellas la página no opera correctamente.</span></div></div>'
      + '    <div class="row"><input type="checkbox" id="ck-an"' + (granted.analiticas ? ' checked' : '') + '><div><b>Analíticas</b><span>Nos dicen de forma agregada cómo se usa el sitio para mejorarlo (Google Analytics vía Google Tag Manager).</span></div></div>'
      + '    <div class="row"><input type="checkbox" id="ck-mk"' + (granted.marketing ? ' checked' : '') + '><div><b>Publicidad</b><span>Permiten medir la efectividad de nuestros anuncios y mostrarte publicidad relevante (Meta Pixel, Google Ads).</span></div></div>'
      + '    <div class="bs" style="margin-top:10px"><button class="ok" id="ck-save">Guardar preferencias</button></div>'
      + '  </div>'
      + '</div>';
    document.head.appendChild(st);
    document.body.appendChild(el);
    if (forzarPanel) el.classList.add('open');
    el.querySelector('#ck-all').onclick = function () { guardar(true, true); };
    el.querySelector('#ck-none').onclick = function () { guardar(false, false); };
    el.querySelector('#ck-cfg').onclick = function () { el.classList.toggle('open'); };
    el.querySelector('#ck-save').onclick = function () {
      guardar(el.querySelector('#ck-an').checked, el.querySelector('#ck-mk').checked);
    };
  }

  function init() { if (!saved) render(false); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Enlaces con data-vera-cookies abren el panel de preferencias
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('[data-vera-cookies]');
    if (!a) return;
    e.preventDefault();
    render(true);
  }, true);
})();
