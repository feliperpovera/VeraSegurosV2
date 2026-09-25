// Health guides in English (/en/health-insurance/<slug>/): faithful translation of tools/guias-salud.mjs.
// Same prices (read from the comparator) and same rules from the official policy terms.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { cargarCotizador } from './guias-salud.mjs';

// Spanish slug -> English slug (used by build-seo.mjs for hreflang and by paginas-en.mjs for the Guides list).
export const GUIAS_EN = [
  { es: 'precios', slug: 'health-insurance-prices', corto: 'Health insurance prices 2026' },
  { es: 'adultos-mayores', slug: 'seniors', corto: 'Health insurance for seniors' },
  { es: 'embarazo', slug: 'pregnancy', corto: 'Pregnancy and maternity' },
  { es: 'comparativo-aseguradoras', slug: 'compare-insurers', corto: 'SURA vs. Allianz vs. Bolívar vs. AXA' },
  { es: 'medicina-prepagada', slug: 'prepaid-medicine', corto: 'Prepaid medicine or health insurance?' },
  { es: 'clausulados', slug: 'policy-terms', corto: 'Official policy terms (PDF)' },
];

export function guiasSaludEn({ ROOT, SITE, HOY, esc, WA, ICON_WA }) {
  const { DATA, cotizar, PREPAGADA } = cargarCotizador(ROOT);
  const w = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'cotizador-de-salud/i18n-en.js'), 'utf8'), w);
  const I18N = w.window.I18N;
  const tr = (s) => {
    if (I18N.ui[s] || I18N.data[s]) return I18N.ui[s] || I18N.data[s];
    for (const [re, rep] of I18N.rx) if (typeof rep === 'string' && re.test(s)) return s.replace(re, rep);
    return s;
  };
  const fmt = (v) => '≈ COP ' + Math.round(v).toLocaleString('en-US');
  const plan = (id, k) => DATA.find((c) => c.id === id)[k];
  const precio = (id, k, edad, ciudad = 'medellin') => cotizar(plan(id, k), edad, ciudad, id);
  const celda = (q) => (q.price != null ? `${fmt(q.price)} <small class="iva">+ VAT</small>` : `<span class="na-txt">${esc(tr(q.na))}</span>`);
  const sx = (t, e, s) => cotizar(t, e, 'medellin', 'coomeva', s);
  const celdaSx = (t, e) => {
    const h = sx(t, e, 'M'), m = sx(t, e, 'F');
    if (h.price == null) return `<span class="na-txt">${esc(tr(h.na))}</span>`;
    return Math.round(h.price) === Math.round(m.price) ? celda(h) : `M ${fmt(h.price)}<br>F ${fmt(m.price)} <small class="iva">+ VAT</small>`;
  };
  const tablaPrepagada = (edades, programas) => `<div class="tabla-wrap"><table class="dato num">
<caption class="vh">2026 monthly price of Coomeva Medicina Prepagada programs by age</caption>
<thead><tr><th scope="col">Coomeva program</th>${edades.map((e) => `<th scope="col">Age ${e}</th>`).join('')}</tr></thead>
<tbody>${programas.map((c) => `<tr><th scope="row">${esc(c.mp.plan)}</th>${edades.map((e) => `<td>${celdaSx(c.mp, e)}</td>`).join('')}</tr>`).join('')}</tbody>
</table></div>
<p class="fuente">Official 2026 rates of Coomeva Medicina Prepagada (Family Plan), monthly amount before VAT (5%). M: male · F: female. If you are a member of the Coomeva cooperative, the cheaper Member Plan applies. Plata Joven only accepts new members up to age 35.</p>`;
  const rangoPrepagada = (e) => {
    const v = PREPAGADA.flatMap((c) => ['M', 'F'].map((s) => sx(c.mp, e, s).price)).filter((x) => x != null);
    return [Math.min(...v), Math.max(...v)];
  };
  const PLANES = [
    ['sura', 'sup', 'SURA'], ['sura', 'cla', 'SURA'], ['sura', 'liv', 'SURA'],
    ['bolivar', 'sup', 'Bolívar'], ['bolivar', 'cla', 'Bolívar'], ['bolivar', 'liv', 'Bolívar'],
    ['allianz', 'sup', 'Allianz'], ['allianz', 'cla', 'Allianz'], ['allianz', 'liv', 'Allianz'],
    ['axa', 'sup', 'AXA Colpatria'], ['axa', 'cla', 'AXA Colpatria'],
  ];
  const NIVEL = { sup: 'Premium', cla: 'Comprehensive', liv: 'Basic' };
  const rango = (k, e) => {
    const v = PLANES.filter((x) => x[1] === k).map(([id]) => precio(id, k, e).price).filter((x) => x != null);
    return [Math.min(...v), Math.max(...v)];
  };

  const HUB = `${SITE}/en/health-insurance/`;
  const cta = (msg, txt) => `<p class="cta-inline"><a class="btn-wa boton-grande btn-wa-guia" data-seguro="Health" href="${WA(msg)}" target="_blank" rel="noopener">${ICON_WA} ${txt}</a> <a class="btn-tel" href="/en/health-insurance/#cotizador">See prices for my age</a></p>`;
  const faqHtml = (faq) => `<section class="faq" aria-labelledby="h-faq"><h2 id="h-faq">Frequently asked questions</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary>${a}</details>`).join('')}</section>`;
  const plano = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const fuente = `<p class="fuente"><strong>Sources and validity.</strong> Age and maternity rules taken from each company’s official policy terms and documents (SURA, Seguros Bolívar, Allianz, AXA Colpatria, MAPFRE and Seguros Mundial), reviewed between August and September 2026; you can see them all in <a href="/en/health-insurance/policy-terms/">health insurance policy terms</a>. Reference prices: Seguros Bolívar’s official rate list (Salud a su Medida updated on 15 September 2026), 2026 tables from authorized intermediaries of SURA and Allianz, and a 2025 table from an authorized intermediary of AXA Colpatria (AXA does not publish a 2026 rate). MAPFRE and Seguros Mundial do not publish rates. All prices are monthly and before VAT (5%); Bolívar Salud a su Medida rates are published with VAT included and are shown here without it. They are approximate values, not a binding quote: each insurer sets the final rate based on your profile. Last reviewed: ${HOY}.</p>`;

  const ARTICULO = (slug, titulo, desc) => ({
    '@context': 'https://schema.org', '@type': 'Article', headline: titulo, description: desc,
    url: `${HUB}${slug}/`, mainEntityOfPage: `${HUB}${slug}/`, inLanguage: 'en',
    datePublished: '2026-09-25', dateModified: HOY,
    author: { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Vera Seguros' },
    publisher: { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Vera Seguros', logo: { '@type': 'ImageObject', url: `${SITE}/assets/logo-vera.jpg` } },
  });
  const MIGAS = (slug, nombre) => ({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/en/` },
      { '@type': 'ListItem', position: 2, name: 'Health insurance', item: HUB },
      { '@type': 'ListItem', position: 3, name: nombre, item: `${HUB}${slug}/` }],
  });
  const FAQLD = (faq) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: 'en',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: plano(a) } })) });
  const migasHtml = (nombre) => `<nav aria-label="Breadcrumb"><ol class="crumbs"><li><a href="/en/">Home</a></li><li><a href="/en/health-insurance/">Health insurance</a></li><li aria-current="page">${esc(nombre)}</li></ol></nav>`;
  const cluster = (actual) => `<aside class="cluster" aria-labelledby="h-cluster"><h2 id="h-cluster">More health insurance guides</h2><ul class="relacionados">${
    GUIAS_EN.filter((g) => g.slug !== actual).map((g) => `<li><a href="/en/health-insurance/${g.slug}/">${esc(g.corto)}</a></li>`).join('')
  }<li><a href="/en/health-insurance/">Health insurance: comparison</a></li></ul></aside>`;

  const paginas = [];
  const add = (slug, nombre, title, description, h1, lead, contenido, faq, sello = '') => {
    const g = GUIAS_EN.find((x) => x.slug === slug);
    paginas.push({ ruta: `/en/health-insurance/${slug}/`, alt: `/seguros/salud/${g.es}/`, activo: 'salud', ogType: 'article',
      title, description, ld: [ARTICULO(slug, h1, description), MIGAS(slug, nombre), FAQLD(faq)],
      body: `
  <section class="hero"><div class="wrap">${migasHtml(nombre)}
    <h1>${esc(h1)}</h1>
    <p class="lead">${lead}</p>${sello}
  </div></section>
  <article class="block"><div class="wrap prosa">
${contenido}
${faqHtml(faq)}
${fuente}
${cluster(slug)}
  </div></article>` });
  };

  // ================= 1. SENIORS =================
  {
    const EDADES = [
      ['SURA', 'Salud Global', 'Under 63', 'Lifelong', 'Salud Global policy terms, section 2'],
      ['SURA', 'Salud Clásico', 'Under 70', 'Lifelong', 'Salud Clásico policy terms, section 2'],
      ['SURA', 'PAC «Salud Para Todos»', '3 months to 59 years', 'No age-based removal', 'Policy terms, clause 2.2'],
      ['Seguros Bolívar', 'Salud Integral', 'Before turning 60', 'Lifelong', 'Terms PH-028, clause 4.5'],
      ['Seguros Bolívar', 'Salud a su Medida (plans S and M)', 'No age limit', 'Lifelong', 'Policy terms, clause 4.2'],
      ['Seguros Bolívar', 'Salud a su Medida (plan L)', 'No age limit, with medical assessment', 'Lifelong', 'Policy terms, clause 4.5'],
      ['Allianz', 'Gold Plus and Care', 'Up to 69 years and 364 days', 'Unlimited', 'Underwriting technical guide, section 2.1.1'],
      ['AXA Colpatria', 'Fesalud and Original', 'Up to 63', 'No maximum age', 'Official page of each plan'],
      ['Seguros Mundial', 'Salud Mundial 360 and Esencial', '0 to 59 years', 'Unlimited', 'Policy terms, clauses 3.11 and 3.10'],
      ['Seguros Mundial', 'Mundial Silver (outpatient only)', 'From 55, no maximum age', 'Unlimited', 'Policy terms, clause 3.5'],
      ['MAPFRE', 'Excelencia, Preferencial and Vital', 'Up to 59 years and 364 days', 'No limit', 'Policy terms, clause 7'],
    ];
    const edades = [60, 65, 70];
    const filasPrecio = PLANES.map(([id, k, co]) => `<tr><th scope="row">${esc(co)} — ${esc(plan(id, k).plan)}</th>${edades.map((e) => `<td>${celda(precio(id, k, e))}</td>`).join('')}</tr>`).join('');
    const faq = [
      ['Up to what age can I join a health insurance plan in Colombia?',
        '<p>It depends on the plan. The widest limits are Allianz (up to 69 years and 364 days) and SURA Salud Clásico (under 70). Seguros Bolívar Salud a su Medida has no entry age limit, and Mundial Silver accepts people from 55 with no maximum age (outpatient services only). SURA Salud Global accepts people under 63, AXA Colpatria up to 63, Bolívar Salud Integral before turning 60 and MAPFRE up to 59 years and 364 days.</p>'],
      ['Can I be removed from my health insurance when I reach a certain age?',
        '<p>Not in the plans we compare: once you are in, membership is lifelong or unlimited under their policy terms. What does change with age is the rate, which is adjusted at each renewal by age band.</p>'],
      ['What medical tests are required to join after 55?',
        '<p>It varies by company. Allianz, for example, requires a medical assessment from age 55 under its underwriting technical guide; between 60 and 69 it asks for tests even if you come with continuity from another company, and asks women over 55 for a recent mammogram, pelvic ultrasound and Pap smear.</p>'],
      ['What is the most affordable option for someone over 70?',
        '<p>Among the plans we compare, the ones that accept new members after 70 are Seguros Bolívar Salud a su Medida and Mundial Silver (the latter is outpatient and does not publish a rate). Plan M has a single rate of ' + fmt(precio('bolivar', 'liv', 75).price) + ' a month plus VAT at any age, but it is outpatient (it does not cover hospitalization). Plan L does include hospitalization and requires a medical assessment.</p>'],
    ];
    add('seniors', 'Seniors',
      'Health insurance for seniors in Colombia: age limits 2026',
      'Up to what age you can join a health insurance plan in Colombia: SURA, Bolívar, Allianz and AXA limits per policy terms, and prices at 60, 65 and 70.',
      'Health insurance for seniors in Colombia: up to what age you can join',
      'After 60 the options shrink, but they don’t disappear. We reviewed each company’s policy terms to tell you, with sources, up to what age it accepts new members and how much it costs.',
      `<h2>The short answer</h2>
<p>In Colombia you can buy health insurance after 60 with <strong>Allianz</strong> (up to 69 years and 364 days), <strong>SURA Salud Clásico</strong> (under 70) or <strong>Seguros Bolívar Salud a su Medida</strong>, which has no entry age limit. In every case membership is lifelong: once you are in, you are not removed for getting older.</p>
<h2>Maximum entry age by insurer</h2>
<div class="tabla-wrap"><table class="dato">
<caption class="vh">Maximum entry age and continuity of each health plan</caption>
<thead><tr><th scope="col">Company</th><th scope="col">Plan</th><th scope="col">Entry</th><th scope="col">Continuity</th><th scope="col">Source</th></tr></thead>
<tbody>${EDADES.map((r) => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td><td><strong>${esc(r[2])}</strong></td><td>${esc(r[3])}</td><td class="src">${esc(r[4])}</td></tr>`).join('')}</tbody>
</table></div>
<h2>How much it costs at 60, 65 and 70</h2>
<p>Approximate monthly amounts in Medellín. When a plan does not accept new members at that age, we say so.</p>
<div class="tabla-wrap"><table class="dato num">
<caption class="vh">Approximate monthly price by plan and age</caption>
<thead><tr><th scope="col">Plan</th>${edades.map((e) => `<th scope="col">Age ${e}</th>`).join('')}</tr></thead>
<tbody>${filasPrecio}</tbody>
</table></div>
<h2>What to know before you join</h2>
<ul>
<li><strong>The later, the fewer options.</strong> At 59 all six companies are available; at 64, Allianz, SURA Clásico, Bolívar Salud a su Medida and Mundial Silver; after 70, only Bolívar Salud a su Medida and Mundial Silver.</li>
<li><strong>Pre-existing conditions matter.</strong> Prior diagnoses increase with age, and each company decides whether to accept them, exclude them or set conditions. Declaring them honestly is mandatory (article 1058 of the Commercial Code).</li>
<li><strong>Some plans have no health assessment.</strong> Bolívar Salud a su Medida plans S and M do not consider your health status to join, but they are outpatient: they cover doctor visits and tests, not hospitalization.</li>
<li><strong>Get covered before the key birthday.</strong> If you are close to a limit (60, 63 or 70), the enrollment date decides whether you can join the plan you want.</li>
</ul>
${cta('Hi Vera Seguros, I am looking for health insurance for someone over 60.', 'Insurance for over 60s')}`, faq);
  }

  // ================= 2. PREGNANCY =================
  {
    const REGLAS = [
      ['SURA', 'Salud Global and Clásico', 'The pregnancy must begin after day 60 from enrollment if you are the only insured person (in family or group policies, after enrollment).', 'No', 'Clause 1.4'],
      ['SURA', 'PAC «Salud Para Todos»', 'The expected due date must be more than 300 days after enrollment.', 'No', 'Clause 1.1.2'],
      ['Seguros Bolívar', 'Salud Integral', 'The pregnancy must begin after the second month of membership (third month if you are the only insured person).', 'No', 'Clause 4.2, PH-028'],
      ['Seguros Bolívar', 'Salud a su Medida plan L', '12-month maternity waiting period.', 'No', 'Clause 4.1'],
      ['Seguros Bolívar', 'Salud a su Medida plans S and M', 'No maternity: they are outpatient plans.', 'No', 'Plans S and M policy terms'],
      ['Allianz', 'Gold Plus and Care 4', 'The pregnancy must begin more than 60 days after inclusion.', 'Yes, with an add-on', 'Gold Plus terms and technical guide'],
      ['AXA Colpatria', 'Fesalud and Original', 'The pregnancy must begin after 90 days of coverage.', 'Yes, with an add-on', 'Maternity clause'],
      ['Seguros Mundial', 'Salud Mundial 360', 'The pregnancy must begin 60 days after enrollment (30 days in a family or group policy).', 'No', 'Clauses 1.1.3 and 3.6'],
      ['Seguros Mundial', 'Mundial Esencial and Silver', 'No maternity.', 'No', 'Policy exclusions'],
      ['MAPFRE', 'Excelencia, Preferencial and Vital', 'The pregnancy must begin 30 days after enrollment if there are 2 or more insured people, or from the second year if you are the only insured person.', 'No', 'Clauses 5.13 (5.9 in Vital) and 2.1.21'],
    ];
    const faq = [
      ['Can I get health insurance if I am already pregnant?',
        '<p>Yes, you can join, but in most plans that pregnancy and its delivery will not be covered, because the policy terms require the pregnancy to begin after enrollment or set a waiting period. The exceptions are Allianz and AXA Colpatria, which offer maternity add-ons at an extra cost.</p>'],
      ['How much does Allianz’s ongoing-pregnancy maternity add-on cost?',
        '<p>According to Allianz’s underwriting technical guide, about COP 10,500,000 plus 5% VAT between weeks 13 and 24 of pregnancy, and COP 14,500,000 plus VAT between weeks 24 and 36. It is paid upfront with the annual policy, applies only to single pregnancies and to expectant mothers aged 18 to 38. Since the document may have been updated, confirm it with an advisor before deciding.</p>'],
      ['Is my baby covered if born while I am insured?',
        '<p>Yes, if the pregnancy was covered by the policy and you add the baby in time: 30 days after birth at SURA, Seguros Bolívar and AXA Colpatria, and 60 days at Allianz. Note: AXA’s maternity add-on for ongoing pregnancies excludes newborn neonatal care.</p>'],
      ['How far in advance should I join if I am planning a pregnancy?',
        '<p>At least two to three months before trying at SURA, Bolívar Salud Integral or Allianz, and three months at AXA Colpatria. Bolívar plan L requires 12 months, and for the EPS SURA complementary plan the due date must fall more than 300 days after enrollment.</p>'],
    ];
    add('pregnancy', 'Pregnancy and maternity',
      'Health insurance in Colombia if you are pregnant',
      'Does health insurance cover you if you are already pregnant? Maternity rules of SURA, Bolívar, Allianz and AXA, and which add-ons cover an ongoing pregnancy.',
      'Does health insurance cover me if I am already pregnant?',
      'It is one of the most common questions and the one with the most surprises. We reviewed each company’s maternity clause so you know what to expect before signing.',
      `<h2>The short answer</h2>
<p>As a rule, <strong>no</strong>. Health insurance plans require the pregnancy to begin after the enrollment date or set a maternity waiting period, so an ongoing pregnancy has no delivery coverage. The two exceptions are <strong>Allianz</strong> and <strong>AXA Colpatria</strong>, which offer add-ons to cover an ongoing pregnancy for an extra premium.</p>
<h2>Each insurer’s maternity rule</h2>
<div class="tabla-wrap"><table class="dato">
<caption class="vh">Maternity rule and coverage of an ongoing pregnancy by plan</caption>
<thead><tr><th scope="col">Company</th><th scope="col">Plan</th><th scope="col">Maternity rule</th><th scope="col">Covers an ongoing pregnancy?</th><th scope="col">Source</th></tr></thead>
<tbody>${REGLAS.map((r) => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td><strong>${esc(r[3])}</strong></td><td class="src">${esc(r[4])}</td></tr>`).join('')}</tbody>
</table></div>
<h2>Your two options if you are already pregnant</h2>
<h3>Allianz: ongoing-pregnancy maternity add-on</h3>
<ul>
<li>Applies between weeks 13 and 36 of pregnancy, for single pregnancies and expectant mothers aged 18 to 38.</li>
<li>Approximate cost according to Allianz’s technical guide: <strong>COP 10,500,000 + VAT</strong> (weeks 13 to 24) or <strong>COP 14,500,000 + VAT</strong> (weeks 24 to 36), paid upfront with an annual-payment policy.</li>
<li>You must join together with another insured person and provide your obstetric medical record and pregnancy tests.</li>
</ul>
<h3>AXA Colpatria: optional maternity assistance</h3>
<ul>
<li>Covers check-ups and delivery for the pregnancy you have when you join, for an extra premium.</li>
<li>It is not automatic: AXA reserves the right to grant it after assessing the risk.</li>
<li><strong>It excludes newborn neonatal care</strong>, which is key when planning expenses.</li>
</ul>
<h2>If you are planning a pregnancy</h2>
<p>Join before trying. Once the waiting period is over, pregnancy, delivery and newborn coverage (including congenital conditions) are covered with no add-ons or surcharges. The shortest requirement is 60 days (SURA and Allianz) and the longest, 12 months (Bolívar plan L).</p>
${cta('Hi Vera Seguros, I am pregnant or planning a pregnancy and would like health insurance advice.', 'Maternity advice')}`, faq);
  }

  // ================= 3. PRICES =================
  {
    const edades = [25, 35, 45, 55, 62];
    const filas = PLANES.map(([id, k, co]) => `<tr><th scope="row">${esc(co)} — ${esc(plan(id, k).plan)}<br><span class="nivel">${NIVEL[k]} plan</span></th>${edades.map((e) => `<td>${celda(precio(id, k, e))}</td>`).join('')}</tr>`).join('');
    const [c1, c2] = rango('cla', 35), [p1, p2] = rango('sup', 35);
    const bq = precio('bolivar', 'sup', 55, 'barranquilla').price, md = precio('bolivar', 'sup', 55).price;
    const faq = [
      ['How much does health insurance cost for a 35-year-old?',
        `<p>About ${fmt(c1)} to ${fmt(c2)} a month plus VAT for a comprehensive plan, and ${fmt(p1)} to ${fmt(p2)} plus VAT for a premium plan, depending on the insurer.</p>`],
      ['Why does the price rise so much with age?',
        '<p>Rates are set by age band because the likelihood of using medical services grows with age. The jump is usually noticeable after 40 and after 50, and it is applied at each renewal.</p>'],
      ['Does the price of health insurance change by city?',
        `<p>In some plans, yes. In Seguros Bolívar Salud Integral, Barranquilla has a higher rate from age 45: at 55 it costs ${fmt(bq)} plus VAT versus ${fmt(md)} in Medellín. SURA also adjusts by city, although it does not publish that table.</p>`],
      ['Do the prices include VAT?',
        '<p>No. All amounts on this site are shown before VAT; for health policies VAT is 5% (Tax Code, article 468-3). Seguros Bolívar publishes Salud a su Medida rates with VAT included: we show them without VAT so you can compare on equal terms.</p>'],
    ];
    add('health-insurance-prices', 'Prices 2026',
      'Health insurance Colombia prices 2026 by age',
      'How much health insurance costs in Colombia in 2026: monthly prices by age from SURA, Bolívar, Allianz and AXA for premium, comprehensive and basic plans.',
      'How much does health insurance cost in Colombia in 2026?',
      'Hardly anyone publishes prices, so we gathered them: approximate monthly amounts by age for the plans of the four insurers we quote most.',
      `<h2>The short answer</h2>
<p>At 35, a comprehensive health insurance plan costs about <strong>${fmt(c1)} to ${fmt(c2)} a month plus VAT</strong>, and a premium one <strong>${fmt(p1)} to ${fmt(p2)} plus VAT</strong>. Basic plans start at about <strong>${fmt(precio('bolivar', 'liv', 35).price)} plus VAT</strong>. Age is what moves the price most.</p>
<h2>Monthly price by age and plan</h2>
<p>Approximate amounts in Medellín. If a plan does not accept new members at that age, we say so.</p>
<div class="tabla-wrap"><table class="dato num">
<caption class="vh">Approximate monthly price of each health plan by age</caption>
<thead><tr><th scope="col">Plan</th>${edades.map((e) => `<th scope="col">Age ${e}</th>`).join('')}</tr></thead>
<tbody>${filas}</tbody>
</table></div>
<p>MAPFRE (Excelencia, Preferencial and Vital) and Seguros Mundial (360 and Esencial) do not publish rates: their price is quoted directly with the advisor.</p>
<h2>Prepaid medicine prices 2026 (Coomeva)</h2>
${tablaPrepagada(edades.slice(0, 4), PREPAGADA.filter((c) => ['coomeva-oro', 'coomeva-plata', 'coomeva-trad'].includes(c.id)))}
<p>All 7 Coomeva programs and their differences are in the <a href="/en/health-insurance/prepaid-medicine/">prepaid medicine guide</a>.</p>
<h2>What makes the price vary</h2>
<ul>
<li><strong>Age</strong>, especially after 40 and after 50.</li>
<li><strong>Plan level:</strong> premium plans add a private room or suite, free choice of doctors or international coverage.</li>
<li><strong>Deductibles and copays:</strong> Bolívar Salud a su Medida plans cost less because they charge a deductible per event.</li>
<li><strong>City:</strong> in Bolívar Salud Integral, Barranquilla is more expensive from age 45.</li>
<li><strong>Health status:</strong> pre-existing conditions may lead to exclusions or special conditions.</li>
</ul>
<p>To see the exact price for your age, with coverage side by side, use the <a href="/en/health-insurance/#cotizador">health insurance comparison</a>.</p>
${cta('Hi Vera Seguros, I would like to know the price of health insurance for my age.', 'Get my health insurance quote')}`, faq,
      '\n    <p class="sello-sura"><img src="/assets/lg/sura.png" alt="Seguros SURA" width="111" height="37"><span>Official partners of <strong>Seguros SURA</strong></span></p>');
  }

  // ================= 4. COMPARE INSURERS =================
  {
    const FICHAS = [
      ['SURA', 'Salud Global (premium), Salud Clásico (comprehensive) and the EPS SURA complementary plan «Salud Para Todos».',
        ['Wide network in Medellín and nationwide', 'Salud Clásico accepts members up to before age 70', 'Global includes international coverage'],
        'People who want the SURA network and, if over 63, can join through Salud Clásico.'],
      ['Seguros Bolívar', 'Salud Integral (premium) and Salud a su Medida, with plans L and M.',
        ['The only official rate list published', 'Salud a su Medida has no entry age limit', 'Plan M has a single rate at any age'],
        'Tight budgets and older people who have no other option.'],
      ['Allianz', 'Gold Plus 2 (premium), Gold Plus 1 (comprehensive) and Care 4 (basic).',
        ['Entry up to 69 years and 364 days', 'Gold Plus 2 includes out-of-network coverage by reimbursement', 'Add-on for ongoing pregnancies'],
        'People who want free choice of doctors or need to join between 63 and 69.'],
      ['AXA Colpatria', 'Fesalud Amparado (premium) and Original Amparado (comprehensive).',
        ['Specialists with no copay at its medical centers', 'Unlimited cancer and kidney disease coverage in Fesalud', 'Optional add-on for ongoing pregnancies'],
        'People who use AXA medical centers and want zero copays.'],
    ];
    const tabla35 = ['sup', 'cla'].map((k) => `<tr><th scope="row">${NIVEL[k]} plan</th>${['sura', 'bolivar', 'allianz', 'axa'].map((id) => `<td>${esc(plan(id, k).plan)}<br><strong>${celda(precio(id, k, 35))}</strong></td>`).join('')}</tr>`).join('');
    const faq = [
      ['What is the best health insurer in Colombia?',
        '<p>There is no single answer: it depends on your age, your budget and which clinics you want to use. Allianz is the most flexible on entry age, Bolívar the most affordable and the only one with no age limit in Salud a su Medida, SURA has the widest network in Antioquia and AXA Colpatria eliminates copays at its medical centers.</p>'],
      ['Which is cheaper, SURA or Allianz?',
        `<p>At 35, for a comprehensive plan, SURA Salud Clásico costs ${fmt(precio('sura', 'cla', 35).price)} a month and Allianz Gold Plus 1 ${fmt(precio('allianz', 'cla', 35).price)}. For a premium plan, SURA Salud Global costs ${fmt(precio('sura', 'sup', 35).price)} and Allianz Gold Plus 2 ${fmt(precio('allianz', 'sup', 35).price)}, all before VAT. The difference changes with age.</p>`],
      ['Do all insurers require EPS membership?',
        '<p>Yes. In Colombia voluntary health plans complement the mandatory system, so you need to be affiliated with an EPS. The «Salud Para Todos» complementary plan also requires that EPS to be EPS SURA.</p>'],
    ];
    add('compare-insurers', 'SURA vs. Allianz vs. Bolívar vs. AXA',
      'SURA vs Allianz vs Bolívar vs AXA: health insurance 2026',
      'We compare SURA, Allianz, Bolívar and AXA Colpatria health insurance in Colombia: plans, prices at 35, entry ages and who each one suits.',
      'SURA, Allianz, Bolívar or AXA: which health insurance to choose?',
      'The four companies we quote most, compared on what really changes your decision: price, entry age, network and conditions.',
      `<h2>Price at age 35</h2>
<p>Approximate monthly amounts in Medellín.</p>
<div class="tabla-wrap"><table class="dato num">
<caption class="vh">Approximate monthly price at age 35 by insurer and plan level</caption>
<thead><tr><th scope="col">Level</th><th scope="col">SURA</th><th scope="col">Bolívar</th><th scope="col">Allianz</th><th scope="col">AXA Colpatria</th></tr></thead>
<tbody>${tabla35}</tbody>
</table></div>
<h2>Each insurer in brief</h2>
${FICHAS.map(([co, planes, pros, ideal]) => `<h3>${esc(co)}</h3>
<p>${esc(planes)}</p>
<ul>${pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<p><strong>Best for:</strong> ${esc(ideal)}</p>`).join('\n')}
<h3>What about Seguros Mundial?</h3>
<p>It has three individual plans: Salud Mundial 360 (premium, with unlimited hospitalization days in its network), Mundial Esencial (basic, outpatient and with no waiting periods) and Mundial Silver (from age 55, outpatient only and with no maximum entry age). It does not publish rates, so its price is quoted with the advisor.</p>
<h3>What about MAPFRE?</h3>
<p>It has three individual plans in pesos: Salud Excelencia (premium, with free choice of doctors by reimbursement, suite room and travel assistance), Salud Preferencial (comprehensive, network only) and Salud Vital (basic, hospital-based: doctor visits and emergency care are bought separately). It accepts new members up to 59 years and 364 days and does not publish rates, so its price is quoted with the advisor.</p>
<h2>How to decide</h2>
<ol>
<li><strong>Set your monthly budget</strong> and rule out what doesn’t fit.</li>
<li><strong>Check your age against the entry limits</strong> (see the <a href="/en/health-insurance/seniors/">seniors guide</a>).</li>
<li><strong>Look at the clinics in each network</strong> in your city: a plan is no use if your doctors are not in it.</li>
<li><strong>Compare copays and deductibles</strong>, not just the monthly premium.</li>
</ol>
${cta('Hi Vera Seguros, I would like to compare SURA, Allianz, Bolívar and AXA for my health insurance.', 'Compare for my case')}`, faq);
  }

  // ================= 5. PREPAID MEDICINE =================
  {
    const [c1, c2] = rango('cla', 35), [p1, p2] = rango('sup', 35);
    const pac = precio('sura', 'liv', 35).price, planM = precio('bolivar', 'liv', 35).price;
    const [mp1, mp2] = rangoPrepagada(35);
    const TABLA = [
      ['Who sells it', 'Prepaid medicine companies', 'Insurers', 'Your own EPS'],
      ['Who supervises it', 'Superintendencia Nacional de Salud', 'Superintendencia Financiera', 'Superintendencia Nacional de Salud'],
      ['How it works', 'Own or affiliated network of doctors and clinics, with vouchers or copays per service', 'Covers medical expenses under the policy terms; some plans allow free choice or reimbursement', 'Upgrades the basic EPS plan: direct appointments with specialists and a private room'],
      ['International coverage', 'Depends on the plan', 'Available in premium plans (e.g. SURA Salud Global or AXA Fesalud)', 'Usually not'],
      ['EPS required', 'Yes', 'Yes', 'Yes, and it must be the same EPS'],
    ];
    const faq = [
      ['How much does prepaid medicine cost in Colombia in 2026?',
        `<p>It depends on age, sex and program. At Coomeva Medicina Prepagada, at 35 it ranges from ${fmt(mp1)} (outpatient program) to ${fmt(mp2)} (Oro Plus, female) a month before VAT, according to its official 2026 rates.</p>`],
      ['What is prepaid medicine?',
        '<p>It is a voluntary health plan paid with a periodic fee that gives access to a private network of doctors, specialists and clinics, on top of what your EPS covers. It is offered by prepaid medicine companies supervised by the Superintendencia Nacional de Salud.</p>'],
      ['What is the difference between prepaid medicine and a health insurance policy?',
        '<p>Prepaid medicine works with a network of providers and vouchers or copays per service. A health insurance policy is insurance from an insurer supervised by the Superintendencia Financiera: it covers medical expenses under the policy terms and, in the most complete plans, allows free choice of doctors, reimbursement or international coverage. For the user, both give private access to specialists and hospitalization, as a complement to the EPS.</p>'],
      ['Can I have prepaid medicine or a health policy without an EPS?',
        '<p>No. Prepaid medicine, health insurance policies and complementary plans are additional health plans (Decree 806 of 1998) and require affiliation with the health system through an EPS.</p>'],
      ['How much does prepaid medicine or a health policy cost in 2026?',
        `<p>It depends mainly on age and plan. As a reference, the health policies we compare cost at 35 between ${fmt(c1)} and ${fmt(c2)} a month for a comprehensive plan, and between ${fmt(p1)} and ${fmt(p2)} for a premium plan. The most affordable options start at ${fmt(planM)} (Bolívar Salud a su Medida plan M, outpatient) and the EPS SURA complementary plan at ${fmt(pac)}. These are monthly amounts before VAT (5%).</p>`],
      ['Do prepaid medicine or health policies cover pre-existing conditions?',
        '<p>It depends on the contract. When you join you must declare your health status, and conditions you already have may be excluded or subject to special conditions. That is why it pays to compare several companies before signing.</p>'],
    ];
    add('prepaid-medicine', 'Prepaid medicine or health policy?',
      'Prepaid medicine in Colombia 2026: prices and plans',
      'Prepaid medicine in Colombia: 2026 prices by age for Coomeva’s 7 programs, how it differs from a health insurance policy and which suits you. Free advice.',
      'Prepaid medicine in Colombia: 2026 prices and how to choose',
      'Prices by age for Coomeva prepaid medicine and how it differs from a health insurance policy.',
      `<h2>The short answer</h2>
<p>In Colombia there are three ways to have private health care on top of your EPS: <strong>prepaid medicine</strong>, a <strong>health insurance policy</strong> and a <strong>complementary plan</strong>. All three require EPS affiliation. The difference is who treats you, how services are paid and how wide the coverage is. At 35, a comprehensive health policy costs about <strong>${fmt(c1)} to ${fmt(c2)} a month</strong>.</p>
<h2>Prepaid medicine prices 2026: Coomeva</h2>
${tablaPrepagada([25, 35, 45, 55], PREPAGADA)}
<p>Compare these programs with health insurance policies in the <a href="/en/health-insurance/?tipo=prepagada#cotizador">prepaid medicine comparison</a>: there you can see each one’s coverage and get a quote on WhatsApp.</p>
<h2>Prepaid, policy or complementary: the differences</h2>
<div class="tabla-wrap"><table class="dato">
<caption class="vh">Differences between prepaid medicine, health insurance policy and complementary plan</caption>
<thead><tr><th scope="col"></th><th scope="col">Prepaid medicine</th><th scope="col">Health insurance policy</th><th scope="col">Complementary plan</th></tr></thead>
<tbody>${TABLA.map((r) => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join('')}</tbody>
</table></div>
<h2>Which one suits you?</h2>
<ul>
<li><strong>If you want free choice of doctors or out-of-network coverage</strong>, a premium policy such as Allianz Gold Plus 2, which reimburses out-of-network care.</li>
<li><strong>If you travel or want international backup</strong>, plans such as SURA Salud Global or AXA Colpatria Fesalud, which include coverage or assistance abroad.</li>
<li><strong>If price is your priority</strong>, the deductible plans of Seguros Bolívar Salud a su Medida or, if you are with EPS SURA, its «Salud Para Todos» complementary plan.</li>
<li><strong>If you want prepaid medicine with VIP clinics</strong>, Coomeva Oro Plus or Plata Joven (under 35); on a tight budget, Preferente or Tradicional Especial.</li>
<li><strong>If you are over 60</strong>, first check the entry ages in the <a href="/en/health-insurance/seniors/">seniors guide</a>.</li>
<li><strong>If you are pregnant or planning to be</strong>, check the maternity waiting periods in the <a href="/en/health-insurance/pregnancy/">pregnancy guide</a> before choosing.</li>
</ul>
<h2>What we quote at Vera Seguros</h2>
<p>As insurance advisors, we compare Coomeva prepaid medicine and health insurance policies and complementary plans from SURA, Seguros Bolívar, Allianz, AXA Colpatria, MAPFRE and Seguros Mundial. In the <a href="/en/health-insurance/#cotizador">health insurance comparison</a> you see approximate prices for your age and each plan’s coverage side by side; when you pick one, an advisor quotes it for you on WhatsApp at no cost.</p>
${cta('Hi Vera Seguros, I am looking for prepaid medicine or health insurance and would like advice.', 'I would like health advice')}`, faq);
  }

  // ================= 6. POLICY TERMS =================
  {
    const NIV = { sup: 'Premium', cla: 'Comprehensive', liv: 'Basic' };
    const OTROS = { 'Mundial Silver (desde 55 años, ambulatorio)': 'Mundial Silver (from age 55, outpatient)', 'Salud Platino (en dólares, cobertura mundial)': 'Salud Platino (in dollars, worldwide coverage)' };
    const desc = (d) => d.replace(/vigente desde el /g, 'effective ').replace(/Versión del |versión del /g, 'version of ')
      .replace('Planes S y M:', 'Plans S and M:').replace('Condiciones generales', 'General terms')
      .replace('Anexo de coberturas y carencias', 'Coverage and waiting-period annex').replace('(ene-2024)', '(Jan 2024)')
      .replace(/(\d{2})\/(\d{2})\/(\d{4})/g, '$3-$2-$1');
    const fila = (planTxt, nivel, [l, u, d]) => `<tr><th scope="row">${esc(OTROS[planTxt] || planTxt)}${l.startsWith('Nivel') ? ` — ${esc(l.replace('Nivel', 'Level'))}` : ''}</th><td>${esc(nivel)}</td><td>${esc(desc(d))}</td><td><a href="${u}" target="_blank" rel="noopener">${/\.pdf($|[?#])/i.test(u) ? 'View PDF' : 'View annex'}</a></td></tr>`;
    const tablas = DATA.map((c) => {
      const filas = ['sup', 'cla', 'liv'].filter((k) => c[k]).flatMap((k) => (c[k].claus || []).map((x) => fila(c[k].plan, NIV[k], x)))
        .concat(Object.values(c.programas || {}).flatMap((t) => (t.claus || []).map((x) => fila(t.plan, 'Prepaid medicine', x))))
        .concat((c.clausOtros || []).map(([pl, u, d]) => fila(pl, 'Not in the comparison', ['', u, d])));
      if (!filas.length) return '';
      return `<h2>${esc(c.nombre)}</h2>
<div class="tabla-wrap"><table class="dato"><thead><tr><th scope="col">Plan</th><th scope="col">Level</th><th scope="col">Code and effective date</th><th scope="col">Policy terms</th></tr></thead><tbody>${filas.join('')}</tbody></table></div>`;
    }).join('\n');
    const total = DATA.reduce((n, c) => n + ['sup', 'cla', 'liv'].filter((k) => c[k] && (c[k].claus || []).length).length
      + Object.values(c.programas || {}).filter((t) => (t.claus || []).length).length, 0);
    const clasico = plan('sura', 'cla').claus[0];
    const faq = [
      ['What are the policy terms of a health insurance plan?',
        '<p>They are the policy’s general conditions document: it defines what is covered, the exclusions, waiting periods, entry and continuity ages, and how claims are made. Each insurer identifies it with a code and a date from which it is used, and must give it to you together with your policy declarations page.</p>'],
      ['Where can I find the SURA Salud Clásico policy terms?',
        `<p>On this page, in the Seguros SURA table: we link to the <a href="${clasico[1]}" target="_blank" rel="noopener">official Plan Salud Clásico PDF</a> (${esc(desc(clasico[2]))}), published by SURA on its website.</p>`],
      ['What happens if the insurer changes the policy terms?',
        '<p>Companies update their policy terms periodically. Your policy is governed by the terms shown on your declarations page, the ones in force when you bought or renewed it. If you are unsure which applies, ask your advisor or the insurer: Law 1328 of 2009 entitles you to accurate, sufficient and timely information before buying.</p>'],
    ];
    add('policy-terms', 'Policy terms',
      'Health insurance policy terms in Colombia 2026 (PDF)',
      'Official 2026 policy terms of SURA (Global and Clásico), Bolívar, Allianz, AXA Colpatria, MAPFRE and Seguros Mundial health insurance, in PDF (Spanish).',
      'Health insurance policy terms 2026: all the official PDFs',
      `The policy terms (general conditions) of the ${total} plans in our <a href="/en/health-insurance/#cotizador">health insurance comparison</a>, linked to the document each insurer publishes on its official website, with its code and effective date. Documents are in Spanish.`,
      `<p>Before buying health insurance it is worth reading its policy terms: that is where the exclusions, waiting periods, maternity rules and entry ages we summarize in the comparison are. The links go straight to the PDF published by each company; we checked them on ${new Date(HOY + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
${tablas}
<p>If an insurer publishes a new version, the link may change. The policy terms that govern your policy are the ones you receive with your declarations page; if you would like help reading them, write to us.</p>
${cta('Hi Vera Seguros, I would like help understanding the policy terms of a health insurance plan.', 'We help you read the policy terms')}`,
      faq);
  }

  return paginas;
}
