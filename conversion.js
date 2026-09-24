// Todos los botones de contacto (WhatsApp y llamar) pasan por /gracias.html:
// allí se mide la conversión en Google Tag Manager (Google Ads, GA4 y Meta) y
// luego se abre WhatsApp o el marcador. Se carga en todas las páginas.
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href*="wa.me/573156705627"], a[href^="tel:"]');
    if (!a) return;
    var tel = /^tel:/i.test(a.getAttribute('href'));
    var canal = tel ? 'llamada' : 'whatsapp';
    var texto = (a.innerText || a.getAttribute('aria-label') || canal).trim().slice(0, 80);
    var boton = (a.className.match(/btn-(?:wa|tel)-[a-z0-9-]+/) || [tel ? 'btn-tel' : 'btn-wa'])[0];   // la clase específica (btn-wa-hero…) identifica el botón
    var seguro = a.getAttribute('data-seguro') || '';
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: tel ? 'llamada_click' : 'whatsapp_click', canal: canal, link_url: a.href, link_text: texto,
      page_path: location.pathname, seguro: seguro, boton: boton, 'gtm.element': a, 'gtm.elementUrl': a.href, 'gtm.elementText': texto });
    try {
      e.preventDefault();
      var g = '/gracias.html?to=' + encodeURIComponent(a.href) + '&c=' + canal + '&b=' + encodeURIComponent(boton)
        + '&s=' + encodeURIComponent(seguro) + '&o=' + encodeURIComponent(location.pathname)
        + (/^en/i.test(document.documentElement.lang || '') ? '&l=en' : '');
      if (!tel && a.getAttribute('target') === '_blank') { var w = window.open(g, '_blank'); if (!w) location.href = g; }
      else location.href = g;
    } catch (err) {}
  }, true);
})();
