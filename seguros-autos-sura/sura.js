// Cotizador y expedición SURA de la landing de pauta. Habla con dos funciones de Supabase:
// autos (ciudades, marcas, versiones Fasecolda y SMS, sin costo) y autos-sura (cotizar, expedir y estado con la API de SURA).
(function () {
  var BASE = 'https://cwfvqusyvfdohjmgefli.supabase.co/functions/v1/';
  var WA = 'https://wa.me/573156705627?text=';
  var $ = function (id) { return document.getElementById(id); };
  var peso = function (n) { return '$' + Math.round(n || 0).toLocaleString('es-CO'); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var post = function (fn, body) {
    return fetch(BASE + fn, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'servicio' }; }); })
      .catch(function () { return { ok: false, error: 'red' }; });
  };
  var evento = function (n, x) { window.dataLayer = window.dataLayer || []; window.dataLayer.push(Object.assign({ event: 'sura_' + n }, x || {})); };
  var q = new URLSearchParams(location.search);
  var utm = { source: q.get('utm_source') || (q.get('gclid') ? 'google' : 'landing-sura'), medium: q.get('utm_medium') || (q.get('gclid') ? 'cpc' : null), campaign: q.get('utm_campaign') || 'autos_sura', gclid: q.get('gclid') };

  var st = { modo: 'placa', doc: 'C', prenda: 'no', rem: 'no', com: 'no', ciudades: {}, cot: null, plan: null, pago: null };
  var PASOS = ['p-veh', 'p-per', 'p-res', 'p-exp', 'p-fin'];
  function paso(id) {
    PASOS.forEach(function (p) { $(p).hidden = p !== id; });
    var n = Math.min(PASOS.indexOf(id), 3);
    [].forEach.call(document.querySelectorAll('.prog li'), function (li, i) { li.className = i === n ? 'on' : i < n ? 'ok' : ''; });
    var f = $('cotizador'), top = f.getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * 0.6) window.scrollTo({ top: scrollY + top - 90, behavior: 'smooth' });
  }
  function mal(id, err, msg) { if (id) { $(id).setAttribute('aria-invalid', 'true'); $(id).focus(); } $(err).textContent = msg; return false; }
  document.addEventListener('input', function (e) { if (e.target.removeAttribute) e.target.removeAttribute('aria-invalid'); });
  [].forEach.call(document.querySelectorAll('[data-volver]'), function (b) { b.onclick = function () { paso(b.dataset.volver); }; });

  // Botones tipo segmento (aria-pressed): placa/0 km, documento, prenda, remolque, combustible, forma de pago.
  function seg(grupo, attr, cb) {
    grupo.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-' + attr + ']'); if (!b) return;
      [].forEach.call(grupo.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      cb(b.dataset[attr]);
    });
  }
  seg($('p-veh').querySelector('.seg'), 'modo', function (v) { st.modo = v; $('c-placa').hidden = v !== 'placa'; $('c-nuevo').hidden = v === 'placa'; if (v !== 'placa') marcas(); });
  seg($('p-per').querySelector('.seg'), 'doc', function (v) { st.doc = v; });
  [['prenda', function (v) { st.prenda = v; $('x-datos').hidden = v === 'si'; $('x-prenda').hidden = v !== 'si'; $('b-exp').textContent = v === 'si' ? 'Hablar con un asesor' : 'Continuar al pago'; }],
   ['rem', function (v) { st.rem = v; }], ['com', function (v) { st.com = v; }]].forEach(function (x) {
    seg(document.querySelector('[data-' + x[0] + ']').parentNode, x[0], x[1]);
  });
  seg($('x-pagos'), 'pago', function (v) { st.pago = v; });

  // Fechas con listas (día, mes, año): más rápido que escribir.
  var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var hoy = new Date().getFullYear();
  [].forEach.call(document.querySelectorAll('[data-fecha]'), function (c) {
    var n = c.dataset.fecha, desde = n === 'nac' ? hoy - 18 : hoy, hasta = n === 'nac' ? hoy - 90 : hoy - 72;
    var o = function (v, t) { return '<option value="' + v + '">' + t + '</option>'; }, d = o('', 'Día'), m = o('', 'Mes'), a = o('', 'Año');
    for (var i = 1; i <= 31; i++) d += o(i, i);
    MESES.forEach(function (x, i) { m += o(i + 1, x); });
    for (var y = desde; y >= hasta; y--) a += o(y, y);
    c.innerHTML = '<select id="' + n + '-d" aria-label="Día">' + d + '</select><select id="' + n + '-m" aria-label="Mes">' + m + '</select><select id="' + n + '-a" aria-label="Año">' + a + '</select>';
  });
  function fecha(n) {
    var d = +$(n + '-d').value, m = +$(n + '-m').value, a = +$(n + '-a').value;
    if (!d || !m || !a) return '';
    var f = new Date(a, m - 1, d); if (f.getDate() !== d) return '';
    return a + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  // Ciudades: autocompletado con la lista DANE de la función autos.
  var tCiudad;
  function buscaCiudad(e) {
    var v = e.target.value.trim(); clearTimeout(tCiudad);
    if (v.length < 3 || st.ciudades[v]) return;
    tCiudad = setTimeout(function () {
      post('autos', { accion: 'ciudades', q: v.split(',')[0] }).then(function (c) {
        if (!Array.isArray(c)) return;
        $('l-ciudades').innerHTML = c.map(function (x) { st.ciudades[x.nombre] = x.code; return '<option value="' + esc(x.nombre) + '">'; }).join('');
      });
    }, 250);
  }
  $('ciudad').addEventListener('input', buscaCiudad); $('ciudad2').addEventListener('input', buscaCiudad);

  // 0 km: año → marca → referencia → versión (código Fasecolda).
  var mm = ''; for (var y = hoy + 1; y >= hoy - 1; y--) mm += '<option value="' + y + '"' + (y === hoy ? ' selected' : '') + '>' + y + '</option>';
  $('modelo').innerHTML = mm;
  var marcasOk = false;
  function marcas() {
    if (marcasOk) return; marcasOk = true;
    post('autos', { accion: 'marcas' }).then(function (m) { opts($('marca'), Array.isArray(m) ? m.sort() : [], 'Elige la marca'); });
  }
  function opts(sel, arr, ph) { sel.innerHTML = '<option value="">' + ph + '</option>' + arr.map(function (x) { var v = typeof x === 'string' ? x : x.v, t = typeof x === 'string' ? x : x.t; return '<option value="' + esc(v) + '">' + esc(t) + '</option>'; }).join(''); sel.disabled = !arr.length; }
  function refs() {
    opts($('version'), [], 'Elige la referencia');
    if (!$('marca').value) return opts($('ref'), [], 'Elige marca y año');
    $('ref').innerHTML = '<option>Cargando…</option>';
    post('autos', { accion: 'referencias', marca: $('marca').value, modelo: $('modelo').value }).then(function (r) { opts($('ref'), Array.isArray(r) ? r.sort() : [], 'Elige la referencia'); });
  }
  $('marca').onchange = refs; $('modelo').onchange = refs;
  $('ref').onchange = function () {
    if (!$('ref').value) return opts($('version'), [], 'Elige la referencia');
    $('version').innerHTML = '<option>Cargando…</option>';
    post('autos', { accion: 'vehiculos', marca: $('marca').value, modelo: $('modelo').value, ref: $('ref').value, ceroKm: true }).then(function (v) {
      opts($('version'), (Array.isArray(v) ? v : []).filter(function (x) { return x.fasecolda; }).map(function (x) { return { v: x.fasecolda, t: x.linea + (x.valor ? ' · ' + peso(x.valor) : '') }; }), 'Elige la versión');
    });
  };

  // Paso 1 → 2
  var veh = {};
  $('p-veh').onsubmit = function (e) {
    e.preventDefault(); $('e-veh').textContent = '';
    var placa = $('placa').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (st.modo === 'placa' && !/^[A-Z]{3}\d{2}[A-Z0-9]$/.test(placa)) return mal('placa', 'e-veh', 'Escribe la placa: 3 letras y 3 números (o 2 números y una letra para motos).');
    if (st.modo !== 'placa' && !$('version').value) return mal('version', 'e-veh', 'Elige marca, año, referencia y versión.');
    var c = st.ciudades[$('ciudad').value.trim()];
    if (!c) return mal('ciudad', 'e-veh', 'Escribe tu ciudad y elígela de la lista.');
    veh = st.modo === 'placa' ? { placa: placa, ciudad: c } : { ceroKm: true, fasecolda: $('version').value, modelo: $('modelo').value, ciudad: c };
    if (!$('ciudad2').value) $('ciudad2').value = $('ciudad').value;
    evento('vehiculo', { modo: st.modo }); paso('p-per'); $('doc').focus();
  };

  // Paso 2: SMS y cotización
  var per = null;
  function leerPer() {
    var d = { tipoDoc: st.doc, doc: $('doc').value.replace(/\D/g, ''), nombres: $('nombres').value.trim(), apellidos: $('apellidos').value.trim(), nacimiento: fecha('nac'),
      telefono: $('tel').value.replace(/\D/g, ''), email: $('email').value.trim() };
    if (d.doc.length < 5) return mal('doc', 'e-per', 'Escribe tu número de documento.');
    if (d.nombres.length < 2) return mal('nombres', 'e-per', 'Escribe tus nombres.');
    if (d.apellidos.length < 2) return mal('apellidos', 'e-per', 'Escribe tus apellidos.');
    if (!d.nacimiento) return mal('nac-d', 'e-per', 'Elige tu fecha de nacimiento.');
    if (!/^3\d{9}$/.test(d.telefono)) return mal('tel', 'e-per', 'Escribe un celular de 10 dígitos que empiece por 3.');
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(d.email)) return mal('email', 'e-per', 'Revisa tu correo.');
    if (!$('acepta').checked) return mal('acepta', 'e-per', 'Para cotizar debes autorizar el tratamiento de tus datos.');
    return d;
  }
  function enviarSms() {
    $('b-per').disabled = true;
    return post('autos', { accion: 'sms', telefono: per.telefono }).then(function (r) {
      $('b-per').disabled = false;
      if (!r.ok) return mal('tel', 'e-per', 'No pudimos enviar el SMS a ese celular. Revísalo o escríbenos por WhatsApp.');
      $('c-codigo').hidden = false; $('b-per').textContent = 'Ver mis precios'; $('codigo').focus();
      $('e-per').textContent = '';
    });
  }
  $('reenviar').onclick = function () { if (per) enviarSms(); };
  $('p-per').onsubmit = function (e) {
    e.preventDefault(); $('e-per').textContent = '';
    var d = leerPer(); if (!d) return;
    if ($('c-codigo').hidden || !per || per.telefono !== d.telefono) { per = d; return enviarSms(); }
    per = d;
    var codigo = $('codigo').value.replace(/\D/g, '');
    if (codigo.length < 4) return mal('codigo', 'e-per', 'Escribe el código que te llegó por SMS.');
    $('b-per').disabled = true; $('b-per').textContent = 'Verificando…';
    cotizar(Object.assign({ accion: 'cotizar', codigo: codigo, acepta: true, utm: utm }, veh, per));
  };

  function cotizar(body) {
    post('autos-sura', body).then(function (r) {
      $('b-per').disabled = false; $('b-per').textContent = 'Ver mis precios';
      if (r.error === 'codigo') return mal('codigo', 'e-per', 'El código no es correcto o ya venció. Revísalo o pide otro.');
      if (r.error === 'datos') return mal(null, 'e-per', 'Revisa tus datos e inténtalo de nuevo.');
      if (r.error === 'limite') return mal(null, 'e-per', 'Hiciste varias cotizaciones hoy. Escríbenos por WhatsApp y te ayudamos.');
      paso('p-res'); $('r-cargando').hidden = true;
      st.cot = r.id ? { id: r.id, t: r.t } : null;
      if (r.ok) { evento('cotizacion', { planes: r.planes.filter(function (p) { return p.ok; }).length }); return pintar(r); }
      evento('cotizacion_' + (r.error || 'error'));
      var texto = r.error === 'pendiente' ? '<b>Recibimos tus datos.</b> Un asesor de Vera te envía tu precio SURA por WhatsApp en minutos (lunes a viernes de 8 a.m. a 6 p.m., sábados hasta la 1 p.m.).'
        : r.error === 'rechazo' ? '<b>SURA no pudo cotizar este vehículo en línea.</b> ' + esc(r.motivo || '') + ' Un asesor revisa tu caso y te escribe por WhatsApp.'
        : '<b>SURA no respondió en este momento.</b> Ya tenemos tus datos: un asesor te envía tu precio por WhatsApp.';
      msg(texto + ' <br><a href="' + WA + encodeURIComponent('Hola, coticé el seguro de autos SURA en la página' + (veh.placa ? ' para la placa ' + veh.placa : '') + '.') + '">Escribir por WhatsApp ahora</a>');
    });
    paso('p-res'); $('r-cargando').hidden = false; $('r-planes').innerHTML = ''; $('r-msg').hidden = true; $('r-veh').hidden = true;
  }
  function msg(html) { $('r-msg').innerHTML = html; $('r-msg').hidden = false; }

  // Paso 3: planes
  function pintar(r) {
    var v = r.vehiculo;
    if (v) { $('r-veh').hidden = false; $('r-veh').innerHTML = '<b>' + esc([v.marca, v.linea, v.modelo].filter(Boolean).join(' ')) + '</b>' + (v.version ? ' · ' + esc(v.version) : '') + (v.placa ? ' · Placa ' + esc(v.placa) : '') + (v.valor ? '<br>Valor asegurado: <b>' + peso(v.valor) + '</b>' : ''); }
    var buenos = r.planes.filter(function (p) { return p.ok; }).sort(function (a, b) { return a.pagos[0].primaTotal - b.pagos[0].primaTotal; });
    var caro = buenos[buenos.length - 1];
    st.planes = buenos;
    $('r-planes').innerHTML = buenos.map(function (p, i) {
      var anual = p.pagos.filter(function (g) { return g.cuotas <= 1; })[0] || p.pagos[0], mes = p.pagos.filter(function (g) { return g.cuotas > 1; })[0];
      var cob = p.coberturas.map(function (g) { return '<dt class="g">' + esc(g.grupo) + '</dt>' + g.items.map(function (x) { return '<dt>' + esc(x.nombre) + '</dt><dd>' + esc(x.valor) + '</dd>'; }).join(''); }).join('');
      return '<article class="pr' + (p === caro && buenos.length > 1 ? ' dest' : '') + '"><div class="t"><h3>' + esc(p.nombre) + '</h3>' + (p === caro && buenos.length > 1 ? '<span class="tag">Más completo</span>' : '') + '</div>' +
        '<div class="precio">' + peso(anual.primaTotal) + ' <small>al año, IVA incluido</small></div>' +
        (mes ? '<div class="cuota">o ' + mes.cuotas + ' cuotas de ' + peso(mes.cuota) + '</div>' : '') +
        (cob ? '<details><summary>Ver coberturas</summary><dl>' + cob + '</dl></details>' : '') +
        '<button type="button" class="btn btn-azul ancho" data-plan="' + i + '">Quiero este plan</button></article>';
    }).join('') + r.planes.filter(function (p) { return !p.ok; }).map(function (p) {
      return '<article class="pr no"><h3>' + esc(p.nombre) + '</h3><p>No disponible para tu vehículo: ' + esc(p.motivo) + '</p></article>';
    }).join('');
  }
  $('r-planes').addEventListener('click', function (e) {
    var b = e.target.closest('[data-plan]'); if (!b) return;
    st.plan = st.planes[+b.dataset.plan];
    evento('plan', { plan: st.plan.nombre, valor: st.plan.pagos[0].primaTotal });
    $('x-plan').innerHTML = '<b>' + esc(st.plan.nombre) + '</b> · ' + peso(st.plan.pagos[0].primaTotal) + ' al año';
    $('x-pagos').innerHTML = st.plan.pagos.map(function (g, i) {
      return '<button type="button" data-pago="' + esc(g.forma) + '" class="' + (i ? '' : 'on') + '" aria-pressed="' + !i + '">' + (g.cuotas > 1 ? g.cuotas + ' cuotas de ' + peso(g.cuota) : 'Anual ' + peso(g.primaTotal)) + '</button>';
    }).join('');
    st.pago = st.plan.pagos[0].forma;
    if (veh.ceroKm) { // sin placa SURA no expide por API: lo termina un asesor
      $('x-datos').hidden = true; $('x-prenda').hidden = false; st.prenda = 'si';
      $('x-prenda').textContent = 'Tu carro aún no tiene placa: un asesor de Vera termina la expedición contigo cuando la tengas.';
      $('b-exp').textContent = 'Hablar con un asesor';
      $('p-exp').querySelector('[data-prenda]').parentNode.hidden = true; $('p-exp').querySelector('[data-prenda]').parentNode.previousElementSibling.hidden = true;
    }
    paso('p-exp');
  });

  // Paso 4: expedición
  $('p-exp').onsubmit = function (e) {
    e.preventDefault(); $('e-exp').textContent = '';
    var p = st.plan;
    if (st.prenda === 'si') {
      evento('asesor', { motivo: veh.ceroKm ? '0km' : 'prenda' });
      location.href = WA + encodeURIComponent('Hola, quiero expedir el ' + p.nombre + ' de SURA (' + peso(p.pagos[0].primaTotal) + ')' + (veh.placa ? ' para la placa ' + veh.placa : ' para mi carro 0 km') + (veh.ceroKm ? '.' : '. Mi carro tiene prenda.') + ' Cotización ' + p.idCotizacion + '.');
      return;
    }
    var x = { chasis: $('chasis').value.trim(), motor: $('motor').value.trim(), fechaExpedicion: fecha('fexp'), direccion: $('direccion').value.trim(),
      ciudad: st.ciudades[$('ciudad2').value.trim()], remolque: st.rem === 'si', combustible: st.com === 'si', declara: $('declara').checked };
    if (x.chasis.replace(/\W/g, '').length < 5) return mal('chasis', 'e-exp', 'Escribe el número de chasis o VIN de la tarjeta de propiedad.');
    if (x.motor.replace(/\W/g, '').length < 3) return mal('motor', 'e-exp', 'Escribe el número de motor de la tarjeta de propiedad.');
    if (!x.fechaExpedicion) return mal('fexp-d', 'e-exp', 'Elige la fecha de expedición de tu documento.');
    if (x.direccion.length < 5) return mal('direccion', 'e-exp', 'Escribe tu dirección de residencia.');
    if (!x.ciudad) return mal('ciudad2', 'e-exp', 'Escribe tu ciudad de residencia y elígela de la lista.');
    if (!x.declara) return mal('declara', 'e-exp', 'Confirma que los datos son ciertos.');
    $('b-exp').disabled = true; $('b-exp').textContent = 'Enviando…';
    post('autos-sura', { accion: 'expedir', id: st.cot.id, t: st.cot.t, idCotizacion: p.idCotizacion, forma: st.pago, expedicion: x }).then(function (r) {
      $('b-exp').disabled = false; $('b-exp').textContent = 'Continuar al pago';
      if (r.error === 'datos') return mal(null, 'e-exp', 'Revisa los datos de la expedición.');
      evento(r.ok ? 'expedir' : 'expedir_error', { plan: p.nombre, valor: p.pagos[0].primaTotal });
      fin(r.ok, r.motivo);
    });
  };

  // Paso 5: resultado y estado
  function fin(ok, motivo) {
    var p = st.plan;
    var g = p.pagos.filter(function (x) { return x.forma === st.pago; })[0] || p.pagos[0];
    $('p-fin').innerHTML = ok
      ? '<div class="fin"><span class="ok"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span><h3>¡Listo! Recibimos tu solicitud</h3><p>' + esc(p.nombre) + ' · ' +
        (g.cuotas > 1 ? g.cuotas + ' cuotas de ' + peso(g.cuota) : peso(g.primaTotal) + ' al año') + '.</p>' +
        '<ol><li>Un asesor de Vera te envía el enlace de pago por WhatsApp.</li><li>Cuando pagues, SURA expide tu póliza. Si pide inspección, te avisamos.</li><li>Recibes tu póliza en el correo ' + esc(per.email) + '.</li></ol>' +
        '<p id="f-estado" style="margin-top:16px"></p><button type="button" class="btn btn-borde ancho" id="b-estado">Ver estado de mi póliza</button></div>'
      : '<div class="msg"><b>SURA no pudo expedir en línea.</b> ' + esc(motivo || '') + ' Un asesor de Vera ya tiene tus datos y termina la expedición contigo. <br><a href="' + WA + encodeURIComponent('Hola, intenté expedir el ' + p.nombre + ' de SURA en la página. Cotización ' + p.idCotizacion + '.') + '">Escribir por WhatsApp</a></div>';
    paso('p-fin');
    if (ok) $('b-estado').onclick = function () {
      $('f-estado').textContent = 'Consultando…';
      post('autos-sura', { accion: 'estado', id: st.cot.id, t: st.cot.t }).then(function (r) {
        $('f-estado').innerHTML = r.ok ? '<b>' + esc(r.estado || 'En proceso') + '</b>' + (r.impedimentos && r.impedimentos.length ? '<br>' + r.impedimentos.map(esc).join('<br>') + '<br>Tu asesor te ayuda con esto.' : '') : 'No pudimos consultar el estado. Tu asesor te avisa por WhatsApp.';
      });
    };
  }
})();
