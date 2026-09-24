// Páginas en inglés (/en/): Inicio y Seguro de salud, con el comparador en inglés (?lang=en).
// Los productos en inglés salen de tools/seo-productos-en.mjs cuando existan.
// Mismo tono que el sitio en español: poco texto, sin cifras inventadas.

export function paginasEn({ SITE, esc, WA, ICON_WA, VERSION_COTIZADOR, IFRAME_JS, SEO_EN, PRODUCTOS }) {
  const SELLO = '<p class="sello-sura"><img src="/assets/lg/sura.png" alt="Seguros SURA" width="111" height="37"><span>Official partners of <strong>Seguros SURA</strong></span></p>';
  const faqSec = (titulo, pares) => `
  <section class="block faq" aria-labelledby="h-faq"><div class="wrap" style="max-width:860px">
    <h2 id="h-faq">${esc(titulo)}</h2>
    ${pares.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join('\n    ')}
  </div></section>`;
  const faqLd = (pares) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: 'en',
    mainEntity: pares.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() } })) });
  const cta = (titulo, msg, boton, clase) => `
  <section class="cta-final"><div class="wrap">
    <h2>${esc(titulo)}</h2>
    <a class="btn-wa boton-grande ${clase}" href="${WA(msg)}" target="_blank" rel="noopener">${ICON_WA} ${esc(boton)}</a>
    <p class="legal-mini">Coverage, premiums, deductibles and conditions depend on each insurer’s review and underwriting rules. This information is for guidance only and does not replace the policy terms.</p>
  </div></section>`;
  const productos = PRODUCTOS.filter((p) => SEO_EN[p.slug] && p.slug !== 'salud');
  const org = { '@type': 'InsuranceAgency', '@id': `${SITE}/#organization`, name: 'Vera Seguros', url: `${SITE}/` };

  // ================= INICIO =================
  const faqInicio = [
    ['Is Vera Seguros an insurance company?',
      'No. Vera Asesores Ltda. (NIT 901.039.892-0) is an insurance agency (intermediary) based in Medellín. We compare options from several insurers, advise you and support you through the whole process.'],
    ['Does your advice cost anything?',
      'No. Our advice and quotes are free for you.'],
    ['Which insurers do you work with?',
      'SURA, Seguros Bolívar, Allianz, AXA Colpatria, MAPFRE, Seguros Mundial and Coomeva Medicina Prepagada, among others. Options depend on the type of insurance.'],
    ['Can foreigners buy health insurance in Colombia?',
      'Voluntary health plans in Colombia, such as health insurance policies and prepaid health plans, require you to be affiliated with an EPS (Decree 806 of 1998). Other requirements depend on each insurer; we check your case.'],
    ['Do you serve clients outside Medellín?',
      'Yes. Our office is in Medellín and we serve clients all over Colombia on WhatsApp and by phone.'],
  ];
  const inicio = {
    ruta: '/en/', alt: '/', activo: 'inicio',
    title: 'Insurance agency in Medellín, Colombia | Vera Seguros',
    description: 'Insurance agency in Medellín, Colombia: we compare health insurance, prepaid health plans, car, life and business insurance. Free advice on WhatsApp.',
    ld: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Vera Seguros — Insurance agency in Medellín, Colombia', url: `${SITE}/en/`, inLanguage: 'en', about: org }, faqLd(faqInicio)],
    body: `
  <section class="hero"><div class="wrap">
    <h1>Insurance agency in Medellín, Colombia</h1>
    <p class="lead">We compare health, car, life and business insurance from Colombia’s leading insurers, at no extra cost to you.</p>
    <div class="ctas">
      <a class="btn-wa boton-grande btn-wa-hero" href="${WA('Hi Vera Seguros, I would like an insurance quote.')}" target="_blank" rel="noopener">${ICON_WA} Get a quote on WhatsApp</a>
      <a class="btn-tel" href="tel:+573156705627">Call: +57 315 670 5627</a>
    </div>
    ${SELLO}
  </div></section>
  <section class="block alt"><div class="wrap">
    <h2>Health insurance and prepaid health plans</h2>
    <p class="sub">Compare SURA, Coomeva, Seguros Bolívar, Allianz, AXA Colpatria, MAPFRE and Seguros Mundial with prices by age.</p>
    <a class="guia" href="/en/health-insurance/"><strong>Compare health plans in Colombia</strong><span>Open the comparison</span></a>
  </div></section>
  ${productos.length ? `<section class="block" id="insurance" aria-labelledby="h-ins"><div class="wrap">
    <h2 id="h-ins">Insurance we handle</h2>
    <ul class="relacionados">${productos.map((p) => `<li><a href="/en/insurance/${SEO_EN[p.slug].slug_en}/">${esc(SEO_EN[p.slug].nombre_en)}</a></li>`).join('')}</ul>
  </div></section>` : ''}
  <section class="block alt"><div class="wrap grid-2">
    <div>
      <h2>Why Vera Seguros</h2>
      <ul class="lista">
        <li>Real support before, during and after your policy.</li>
        <li>We compare several insurers for you.</li>
        <li>We explain coverage and differences clearly.</li>
        <li>Fast, human service on WhatsApp.</li>
      </ul>
    </div>
    <aside class="card"><h3>Visit us</h3><ul>
      <li>Edificio Platinum Superior, Cra 25 # 1A Sur 155, Office 1540, Medellín</li>
      <li><a href="tel:+573156705627">+57 315 670 5627</a></li>
      <li><a href="mailto:Info@veraseguros.com">Info@veraseguros.com</a></li>
    </ul></aside>
  </div></section>
${faqSec('Frequently asked questions', faqInicio)}
${cta('Not sure which insurance you need?', 'Hi Vera Seguros, I would like advice.', 'Talk to an advisor', 'btn-wa-asesor')}
`,
  };

  // ================= SEGURO DE SALUD =================
  const faqSalud = [
    ['How much does health insurance cost in Colombia?',
      'It depends mainly on age and plan. Use the comparison above to see reference prices for your exact age, before VAT (5%).'],
    ['Can foreigners get health insurance or prepaid medicine in Colombia?',
      'These plans require affiliation with an EPS, Colombia’s mandatory health system (Decree 806 of 1998). Other requirements depend on each company; we check your case for free.'],
    ['What is the difference between prepaid medicine and a health insurance policy?',
      'Prepaid health plans (medicina prepagada) work with a network of doctors and clinics and a fee per service, and are supervised by the Superintendencia Nacional de Salud. Health insurance policies cover medical expenses under their policy terms and are supervised by the Superintendencia Financiera.'],
    ['Do these plans cover pre-existing conditions?',
      'It depends on the contract. You must declare your health status when you join, and existing conditions may be excluded or have special conditions.'],
    ['Do the plans cover pregnancy?',
      'Usually only pregnancies that start after joining, with waiting periods set by each plan. Turn on “Are you pregnant?” in the comparison to see each plan’s rule.'],
  ];
  const MSG_60_EN = 'Hi Vera Seguros, I am looking for *health insurance for someone over 60*.\n\n'
    + '• Age: \n• City: \n• EPS (yes/no): \n• Any diagnosed illness?: \n\nI would like to know the plans available for this age.';
  const salud = {
    ruta: '/en/health-insurance/', alt: '/seguros/salud/', activo: 'salud', codigo: 'V2ED',
    title: 'Health insurance in Colombia: 2026 prices by age',
    description: 'Compare health insurance and prepaid health plans in Colombia: 2026 prices by age from SURA, Coomeva, Bolívar, Allianz, AXA Colpatria, MAPFRE and Mundial.',
    ld: [{ '@context': 'https://schema.org', '@type': 'Service', name: 'Health insurance in Colombia', serviceType: 'Health insurance', url: `${SITE}/en/health-insurance/`,
      inLanguage: 'en', areaServed: { '@type': 'Country', name: 'Colombia' }, provider: org },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/en/` },
        { '@type': 'ListItem', position: 2, name: 'Health insurance', item: `${SITE}/en/health-insurance/` }] },
      faqLd(faqSalud)],
    extraJs: IFRAME_JS,
    body: `
  <section class="hero"><div class="wrap">
    <nav aria-label="Breadcrumb"><ol class="crumbs"><li><a href="/en/">Home</a></li><li aria-current="page">Health insurance</li></ol></nav>
    <h1>Health insurance and prepaid health plans in Colombia</h1>
    <p class="lead">Compare SURA, Coomeva, Seguros Bolívar, Allianz, AXA Colpatria, MAPFRE and Seguros Mundial with prices by age, and get free advice on WhatsApp.</p>
    <div class="ctas">
      <a class="btn-wa boton-grande btn-wa-producto" data-seguro="Health" href="${WA('Hi Vera Seguros, I would like a health insurance quote.')}" target="_blank" rel="noopener">${ICON_WA} Get a quote on WhatsApp</a>
      <a class="btn-tel" href="tel:+573156705627">Call: +57 315 670 5627</a>
    </div>
    ${SELLO}
  </div></section>
  <section class="banda60" aria-labelledby="h-60"><div class="wrap">
    <div><h2 id="h-60">Looking for health insurance for someone over 60?</h2></div>
    <div class="banda60-ctas">
      <a class="btn-wa boton-grande btn-wa-mayores" data-seguro="Health 60+" href="${WA(MSG_60_EN)}" target="_blank" rel="noopener">${ICON_WA} Insurance for over 60s</a>
    </div>
  </div></section>
  <section class="cotizador-sec" id="cotizador" aria-labelledby="h-cotizador">
    <div class="wrap" style="padding-top:56px;padding-bottom:56px">
      <h2 id="h-cotizador">Health insurance and prepaid health plans comparison</h2>
      <iframe id="cotizadorFrame" src="/cotizador-de-salud/?embed=1&amp;lang=en&amp;v=${VERSION_COTIZADOR}" title="Health insurance and prepaid health plans comparison" style="width:100%;height:1400px;border:0;display:block;background:transparent"></iframe>
      <details class="legal-box">
        <summary>Legal information</summary>
        <p><strong>Nature of the information.</strong> Prices shown are approximate and for information only. They are reference rates collected from insurers’ price lists and authorized intermediaries’ tables, each with the stated validity. They are not a firm quote, a commercial offer under articles 845 and following of the Colombian Commercial Code, an insurance proposal or a promise to contract, and they create no obligation for Vera Asesores Ltda.</p>
        <p><strong>Our role.</strong> Vera Asesores Ltda., NIT 901.039.892-0, acts only as an insurance intermediary. Rates, coverage, exclusions, deductibles, waiting periods and eligibility rules are set and changed by each insurer.</p>
        <p><strong>Coverage and policy terms.</strong> Coverage descriptions are a general summary; their scope is governed by each policy’s terms. Buying is subject to a truthful health declaration (article 1058 of the Commercial Code) and to the insurer’s acceptance.</p>
        <p><strong>Consumer rights.</strong> Under Law 1328 of 2009 you are entitled to accurate, sufficient and timely information from the insurer before buying. Insurers are supervised by the Superintendencia Financiera de Colombia; prepaid health companies by the Superintendencia Nacional de Salud.</p>
        <p style="margin:0"><strong>Personal data.</strong> Data you provide is processed under Law 1581 of 2012 and Decree 1377 of 2013. You can access, update, correct or delete your data, or revoke your authorization, by writing to <a href="mailto:info@veraseguros.com">info@veraseguros.com</a>. See the <a href="/politica-tratamiento-datos.html">Personal Data Policy</a> (in Spanish).</p>
      </details>
    </div>
  </section>
${faqSec('Health insurance FAQ', faqSalud)}
${cta('Want help choosing a health plan?', 'Hi Vera Seguros, I would like a health insurance quote.', 'Get a health insurance quote', 'btn-wa-producto-cta')}
`,
  };

  // ================= PRODUCTOS (fase 2) =================
  const CAT_EN = { personas: 'Personal insurance', empresas: 'Business insurance', patrimoniales: 'Property and liability insurance' };
  const productosEn = productos.map((p) => {
    const e = SEO_EN[p.slug], ruta = `/en/insurance/${e.slug_en}/`, url = SITE + ruta;
    const comp = p.comparativo, filas = e.filas_comparativo || [];
    const hermanos = productos.filter((x) => x.cat === p.cat && x.slug !== p.slug).slice(0, 6);
    const faq = (e.faq || []).map((f) => [f.q, esc(f.a)]);
    const tabla = comp ? `
  <section class="block" aria-labelledby="h-comp"><div class="wrap">
    <h2 id="h-comp">Companies compared: ${esc(e.nombre_en.toLowerCase())}</h2>
    <p class="leyenda"><span><span class="mk S" aria-hidden="true">✓</span>Included in the base plan</span><span><span class="mk P" aria-hidden="true">–</span>Optional or partial</span><span><span class="mk N" aria-hidden="true">✕</span>Not available</span></p>
    <div class="tabla-wrap"><table class="comp">
      <caption class="vh">${esc(e.nombre_en)} coverage by insurer</caption>
      <thead><tr><th scope="col">Coverage</th>${comp.companias.map((c) => `<th scope="col"><img src="/${c.logo}" alt="" loading="lazy" width="80" height="28">${esc(c.name)}${c.recom ? '<br><span class="recom">★ Recommended</span>' : ''}</th>`).join('')}</tr></thead>
      <tbody>${comp.rows.map((r, i) => `<tr><th scope="row">${esc(filas[i] || r.label)}</th>${r.cells.map((c) => `<td><span class="mk ${c.status}" role="img" aria-label="${c.status === 'S' ? 'Included' : c.status === 'P' ? 'Optional or partial' : 'Not available'}">${c.glyph}</span></td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <p class="nota">For guidance only: coverage is governed by each policy’s terms.</p>
  </div></section>` : '';
    return {
      ruta, alt: `/seguros/${p.slug}/`, activo: 'seguros', slug: p.slug,
      title: e.title, description: e.description,
      ld: [{ '@context': 'https://schema.org', '@type': 'Service', '@id': url + '#service', name: `${e.nombre_en} in Colombia`, serviceType: e.nombre_en,
        description: e.intro, url, inLanguage: 'en', areaServed: { '@type': 'Country', name: 'Colombia' }, provider: org,
        ...(comp ? { brand: comp.companias.map((c) => ({ '@type': 'Brand', name: c.name })) } : {}) },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/en/` },
          { '@type': 'ListItem', position: 2, name: 'Insurance', item: `${SITE}/en/#insurance` },
          { '@type': 'ListItem', position: 3, name: e.nombre_en, item: url }] },
        ...(faq.length ? [faqLd(faq)] : [])],
      body: `
  <section class="hero"><div class="wrap">
    <nav aria-label="Breadcrumb"><ol class="crumbs"><li><a href="/en/">Home</a></li><li><a href="/en/#insurance">Insurance</a></li><li aria-current="page">${esc(e.nombre_en)}</li></ol></nav>
    <h1>${esc(e.h1)}</h1>
    <p class="lead">${esc(e.intro)}</p>
    <div class="ctas">
      <a class="btn-wa boton-grande btn-wa-producto" data-seguro="${esc(p.t)}" href="${WA(`Hi Vera Seguros, I would like a quote: ${e.nombre_en}.`)}" target="_blank" rel="noopener">${ICON_WA} Get a quote on WhatsApp</a>
      <a class="btn-tel" href="tel:+573156705627">Call: +57 315 670 5627</a>
    </div>
  </div></section>
${tabla}
  <section class="block alt"><div class="wrap grid-2">
    <div>
      <h2>What does it cover?</h2>
      <ul class="lista">${(e.coberturas || []).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      ${e.nota ? `<p class="nota">${esc(e.nota)}</p>` : ''}
    </div>
    <aside style="display:flex;flex-direction:column;gap:20px">
      <div class="card"><h3>Who is it for?</h3><ul>${(e.ideal || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>
      <div class="card"><h3>Companies that offer it</h3>
        <div class="logos">${p.logos.map((l) => `<img src="/${l}" alt="${esc(l.split('/').pop().replace('.png', '').replace(/-/g, ' '))}" loading="lazy" width="64" height="22">`).join('')}</div></div>
    </aside>
  </div></section>
${faq.length ? faqSec(`${e.nombre_en}: frequently asked questions`, faq) : ''}
  ${hermanos.length ? `<section class="block${faq.length ? ' alt' : ''}" aria-labelledby="h-rel"><div class="wrap">
    <h2 id="h-rel">More ${esc((CAT_EN[p.cat] || 'insurance').toLowerCase())}</h2>
    <ul class="relacionados">${hermanos.map((h) => `<li><a href="/en/insurance/${SEO_EN[h.slug].slug_en}/">${esc(SEO_EN[h.slug].nombre_en)}</a></li>`).join('')}</ul>
  </div></section>` : ''}
${cta(`Interested in ${e.nombre_en.toLowerCase()}?`, `Hi Vera Seguros, I would like a quote: ${e.nombre_en}.`, `Get a ${e.nombre_en.toLowerCase()} quote`, 'btn-wa-producto-cta')}
`,
    };
  });

  return [inicio, salud, ...productosEn];
}
