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

  // El pixel de Meta solo arranca con consentimiento de publicidad.
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
  function cerrar() {
    if (!el) return;
    var box = el.querySelector('.bx');
    if (box) { box.style.transition = 'opacity .18s ease, transform .18s ease'; box.style.opacity = '0'; box.style.transform = 'translateY(10px)'; }
    var ref = el;
    el = null;
    setTimeout(function () { ref.remove(); }, 190);
  }

  var CSS = ''
  + '#vera-ck{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;display:flex;justify-content:flex-start;pointer-events:none;font-family:Mulish,system-ui,-apple-system,sans-serif}'
  + '#vera-ck *{box-sizing:border-box;margin:0;padding:0}'
  + '#vera-ck .bx{pointer-events:auto;width:100%;max-width:398px;background:#fff;border:1px solid #E7ECF6;border-radius:20px;box-shadow:0 24px 70px rgba(28,43,79,.24);padding:20px 20px 16px;animation:vck-in .5s cubic-bezier(.16,1,.3,1)}'
  + '@keyframes vck-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}'
  + '@media(prefers-reduced-motion:reduce){#vera-ck .bx{animation:none}}'
  + '#vera-ck .hd{display:flex;align-items:center;gap:10px;margin-bottom:9px}'
  + '#vera-ck .hd img{width:30px;height:30px;border-radius:50%;object-fit:contain;flex:none}'
  + '#vera-ck .hd b{font-size:15.5px;font-weight:800;color:#203152;letter-spacing:-.2px}'
  + '#vera-ck .tx{font-size:13.5px;line-height:1.6;color:#56575c;margin-bottom:14px}'
  + '#vera-ck .tx a{color:#2d4777;font-weight:600;text-decoration:underline;text-underline-offset:2px}'
  + '#vera-ck .row-btn{display:flex;gap:8px}'
  + '#vera-ck button{font-family:inherit;cursor:pointer;border:none;font-weight:700}'
  + '#vera-ck .ok{flex:1;background:#203152;color:#fff;font-size:14px;padding:12px 16px;border-radius:12px}'
  + '#vera-ck .ok:hover{background:#2d4777}'
  + '#vera-ck .no{flex:1;background:#F5F7FC;color:#2d4777;font-size:14px;padding:12px 16px;border-radius:12px;border:1px solid #E7ECF6}'
  + '#vera-ck .no:hover{background:#EAF0FB}'
  + '#vera-ck .cf{display:inline-flex;align-items:center;gap:5px;background:none;color:#797c85;font-size:12.5px;font-weight:600;margin-top:11px;padding:2px 0}'
  + '#vera-ck .cf:hover{color:#2d4777}'
  + '#vera-ck .cf svg{transition:transform .25s ease}'
  + '#vera-ck.open .cf svg{transform:rotate(180deg)}'
  + '#vera-ck .op{display:none;border-top:1px solid #EEF1F7;margin-top:12px;padding-top:4px}'
  + '#vera-ck.open .op{display:block}'
  + '#vera-ck .it{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #F5F7FC}'
  + '#vera-ck .it:last-of-type{border-bottom:none}'
  + '#vera-ck .it .t b{display:block;font-size:13.5px;color:#203152;margin-bottom:2px}'
  + '#vera-ck .it .t span{display:block;font-size:12px;color:#9aa3b5;line-height:1.45}'
  + '#vera-ck .it .t{flex:1}'
  + '#vera-ck .always{font-size:10.5px;font-weight:800;color:#218166;background:#d2eae8;border-radius:999px;padding:4px 9px;white-space:nowrap;letter-spacing:.3px}'
  + '#vera-ck .sw{position:relative;width:40px;height:23px;flex:none}'
  + '#vera-ck .sw input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;z-index:1}'
  + '#vera-ck .sw i{position:absolute;inset:0;background:#D9DFEC;border-radius:999px;transition:background .2s ease}'
  + '#vera-ck .sw i:before{content:"";position:absolute;width:17px;height:17px;left:3px;top:3px;background:#fff;border-radius:50%;box-shadow:0 1px 3px rgba(28,43,79,.3);transition:transform .2s ease}'
  + '#vera-ck .sw input:checked+i{background:#218166}'
  + '#vera-ck .sw input:checked+i:before{transform:translateX(17px)}'
  + '#vera-ck .save{width:100%;background:#218166;color:#fff;font-size:13.5px;padding:11px 16px;border-radius:12px;margin-top:11px}'
  + '#vera-ck .save:hover{background:#1c6e57}'
  + '@media(max-width:480px){#vera-ck{left:10px;right:10px;bottom:10px}#vera-ck .bx{max-width:none}}';

  function render(forzarPanel) {
    if (el) { el.remove(); el = null; }
    var st = document.createElement('style'); st.textContent = CSS;
    el = document.createElement('div');
    el.id = 'vera-ck';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-label', 'Preferencias de privacidad');
    el.innerHTML = ''
      + '<div class="bx">'
      + '  <div class="hd"><img src="assets/favicon-vera.jpg" alt=""><b>Tu privacidad, sin letra menuda</b></div>'
      + '  <p class="tx">Usamos cookies para que el sitio funcione y, solo si tú lo permites, para entender las visitas y medir nuestras campañas. Tú decides — y puedes cambiarlo cuando quieras. <a href="' + POLICY + '">Más detalles</a></p>'
      + '  <div class="row-btn">'
      + '    <button class="no" id="ck-none" type="button">Solo necesarias</button>'
      + '    <button class="ok" id="ck-all" type="button">Aceptar</button>'
      + '  </div>'
      + '  <button class="cf" id="ck-cfg" type="button">Personalizar <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></button>'
      + '  <div class="op">'
      + '    <div class="it"><div class="t"><b>Necesarias</b><span>Navegación, seguridad y recordar esta elección.</span></div><span class="always">SIEMPRE</span></div>'
      + '    <div class="it"><div class="t"><b>Estadísticas</b><span>Visitas anónimas para mejorar el sitio.</span></div><label class="sw"><input type="checkbox" id="ck-an"' + (granted.analiticas ? ' checked' : '') + '><i></i></label></div>'
      + '    <div class="it"><div class="t"><b>Publicidad</b><span>Miden nuestras campañas en Google y Meta.</span></div><label class="sw"><input type="checkbox" id="ck-mk"' + (granted.marketing ? ' checked' : '') + '><i></i></label></div>'
      + '    <button class="save" id="ck-save" type="button">Guardar mi selección</button>'
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
