// Precios reales de todo riesgo para carro: cotizaciones hechas en veraseguros.com (Agentemotor).
// Sin motos, sin planes por kilómetro, sin renovaciones ni cotizaciones por debajo de Fasecolda. De cada cotización se toma
// el plan más barato de cada aseguradora en cada nivel; luego la mediana. Consulta para actualizar: tools/precios-autos.sql.
// brecha: para el mismo carro, cuánto MENOS cuesta el Premium más barato que el más caro (mediana de nBrecha cotizaciones con 3+ aseguradoras).
export const PRECIOS_AUTOS = {
  desde: '21 de octubre', hasta: '24 de noviembre de 2026', isoDesde: '2026-10-21', isoHasta: '2026-11-24', n: 68,
  brecha: 59, veces: '2,5', brechaPesos: 3191550, nBrecha: 61,
  niveles: [['Premium', 3621916], ['Esencial', 2280382], ['Básica', 1359157]],
  premium: [['Qualitas', 2770725, 60], ['HDI', 2882030, 56], ['Zurich', 3403696, 37], ['Bolívar', 3571324, 49], ['Allianz', 3707249, 55],
    ['SBS', 3930282, 42], ['AXA Colpatria', 4299395, 45], ['SURA', 4338867, 57], ['MAPFRE', 4528456, 54]],
  // [valor Fasecolda del carro, cotizaciones, Básica, Esencial, Premium]
  valor: [['Menos de $40 millones', 16, 1288506, 1872750, 2771029], ['$40 a $70 millones', 20, 1216018, 2176026, 3454936],
    ['$70 a $120 millones', 18, 1300660, 2353417, 3536797], ['$120 millones o más', 14, 1828094, 3696103, 5666598]],
  // Coberturas más frecuentes del plan Premium en esas cotizaciones: [aseguradora, responsabilidad civil, deducible daños parciales, carro de reemplazo]
  cob: [['Allianz', '$5.000 millones', '1 SMMLV', 'Hasta 20 días'], ['Zurich', '$5.000 millones', '1 SMMLV', '20 días (pérdida total por daños)'], ['HDI', '$4.400 millones', '1 SMMLV', 'Hasta 21 días'],
    ['SURA', '$4.100 millones', '1 SMMLV', 'Hasta 20 días'], ['Bolívar', '$4.000 millones', '0,8 SMMLV', 'Hasta 30 días'], ['MAPFRE', '$4.000 millones', '$1.200.000', '15 días (pérdida total)'],
    ['Qualitas', '$4.000 millones', '$1.400.000', 'Hasta 20 días'], ['AXA Colpatria', '$4.000 millones', '1 SMMLV', 'Hasta 20 días'], ['SBS', '$3.000 millones', '1 SMMLV', '15 días (pérdida total)']],
  motos: { n: 23, premium: 985344 },
};

const peso = (n) => '$' + n.toLocaleString('es-CO');

export function preciosAutosHTML(h = 'h2') {
  const P = PRECIOS_AUTOS;
  const fila = ([a, v]) => `<tr><th scope="row">${a}</th><td>${peso(v)}</td></tr>`;
  return `<${h} id="h-precios">Precios reales del seguro todo riesgo para carro en 2026</${h}>
    <p>Para el mismo carro, el plan Premium más barato cuesta normalmente <strong>${P.brecha}% menos</strong> que el más caro: unos <strong>${peso(P.brechaPesos)} al año</strong> de diferencia (mediana de ${P.nBrecha} cotizaciones).</p>
    <div class="tabla-wrap"><table class="dato num">
      <caption class="vh">Precio anual mediano del seguro todo riesgo para carro por nivel de plan</caption>
      <thead><tr><th scope="col">Nivel de plan</th><th scope="col">Precio anual (mediana)</th></tr></thead>
      <tbody>${P.niveles.map(fila).join('')}</tbody>
    </table></div>
    <div class="tabla-wrap"><table class="dato num">
      <caption class="vh">Precio anual mediano del plan Premium por aseguradora</caption>
      <thead><tr><th scope="col">Aseguradora (plan Premium)</th><th scope="col">Precio anual (mediana)</th></tr></thead>
      <tbody>${P.premium.map(fila).join('')}</tbody>
    </table></div>
    <p class="fuente">Fuente: ${P.n} cotizaciones reales de carros hechas en veraseguros.com entre el ${P.desde} y el ${P.hasta}, la mayoría en Medellín. Precio anual total que entregó cada aseguradora; mediana por nivel y por aseguradora. Sin planes por kilómetro. Es una muestra de 5 semanas: tu precio depende de tu carro, tu ciudad y tu perfil. Para saberlo, cotiza con tu placa.</p>`;
}

// Versión comparador para /seguros/auto/: logos y barras, texto mínimo. Sigue siendo una tabla (accesible e indexable).
const LG = { HDI: 'hdi', Qualitas: 'qualitas', SBS: 'sbs', 'Bolívar': 'bolivar', Zurich: 'zurich', Allianz: 'allianz', 'AXA Colpatria': 'axa-colpatria', SURA: 'sura', MAPFRE: 'mapfre' };
const logo = (a) => `<img src="/assets/lg/s/${LG[a]}.png" alt="${a}" width="76" height="28">`;
export function comparadorAutosHTML() {
  const P = PRECIOS_AUTOS, max = Math.max(...P.premium.map((x) => x[1]));
  return `<h2 id="h-precios">Mismo carro, ${P.veces} veces el precio</h2>
      <table class="cmp"><caption>Plan Premium · precio anual mediano</caption><thead class="vh"><tr><th scope="col">Aseguradora</th><th scope="col">Precio anual</th></tr></thead>
      <tbody>${P.premium.map(([a, v], i) => `<tr${i ? '' : ' class="min"'}><th scope="row">${logo(a)}</th><td><span class="cmp-b"><i style="width:${Math.round(v / max * 100)}%"></i></span><b>${peso(v)}</b></td></tr>`).join('')}</tbody></table>
      <p class="cmp-f">${P.n} cotizaciones reales, ${P.desde} a ${P.hasta}. Para el mismo carro, el Premium más barato costó ${P.brecha}% menos que el más caro (mediana). Los planes no son idénticos; tu precio depende de tu carro y tu perfil.</p>`;
}
export const nivelesAutosHTML = () => `<div class="grid-3 niv3">${[['Premium', 'El plan más completo'], ['Esencial', 'El plan intermedio'], ['Básica', 'El plan de entrada']].map(([n, d]) => `<div class="card"><h3>${n}</h3><p>${d}</p><b>${peso(PRECIOS_AUTOS.niveles.find((x) => x[0] === n)[1])}</b><small>al año, mediana</small></div>`).join('')}</div>`;
export const tablaValorHTML = () => `<div class="tabla-wrap"><table class="dato num"><caption class="vh">Precio anual mediano del seguro todo riesgo según el valor del carro</caption>
      <thead><tr><th scope="col">Valor del carro (Fasecolda)</th><th scope="col">Básica</th><th scope="col">Esencial</th><th scope="col">Premium</th></tr></thead>
      <tbody>${PRECIOS_AUTOS.valor.map(([g, n, b, e, p]) => `<tr><th scope="row">${g} <small>(${n} carros)</small></th><td>${peso(b)}</td><td>${peso(e)}</td><td>${peso(p)}</td></tr>`).join('')}</tbody></table></div>`;
export const tablaCobHTML = () => `<div class="tabla-wrap"><table class="dato num"><caption class="vh">Comparativo de aseguradoras de autos en Colombia, plan Premium</caption>
      <thead><tr><th scope="col">Aseguradora</th><th scope="col">Precio anual (mediana)</th><th scope="col">Responsabilidad civil</th><th scope="col">Deducible daños parciales</th><th scope="col">Carro de reemplazo</th></tr></thead>
      <tbody>${PRECIOS_AUTOS.premium.map(([a, v]) => { const c = PRECIOS_AUTOS.cob.find((x) => x[0] === a); return `<tr><th scope="row">${a}</th><td>${peso(v)}</td><td>${c[1]}</td><td>${c[2]}</td><td>${c[3]}</td></tr>`; }).join('')}</tbody></table></div>`;
export const metodoAutos = () => { const P = PRECIOS_AUTOS; return `${P.n} cotizaciones reales de carros en veraseguros.com, del ${P.desde} al ${P.hasta}, la mayoría en Medellín. Precio anual total que entregó cada aseguradora; mediana. Sin motos ni planes por kilómetro. Es una muestra pequeña: sirve como referencia, no reemplaza tu cotización.`; };
export const pesoA = peso;
export const datasetAutos = (url, SITE) => ({ '@context': 'https://schema.org', '@type': 'Dataset', name: 'Precios del seguro todo riesgo para carro en Colombia 2026', description: `Medianas de precio anual por nivel de plan, aseguradora y valor del carro. ${metodoAutos()}`, url, inLanguage: 'es-CO', isAccessibleForFree: true,
  temporalCoverage: `${PRECIOS_AUTOS.isoDesde}/${PRECIOS_AUTOS.isoHasta}`, dateModified: PRECIOS_AUTOS.isoHasta, spatialCoverage: { '@type': 'Place', name: 'Colombia' }, creator: { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Vera Seguros' }, variableMeasured: ['Precio anual en pesos colombianos', 'Nivel de plan', 'Aseguradora', 'Valor Fasecolda del vehículo'], measurementTechnique: 'Mediana de cotizaciones reales' });
