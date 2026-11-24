// Precios reales de todo riesgo para carro: medianas de las cotizaciones hechas en veraseguros.com
// (Agentemotor). Excluye planes por kilómetro y motos. Actualizar con una consulta nueva a auto_oferta.
export const PRECIOS_AUTOS = {
  desde: '21 de octubre', hasta: '18 de noviembre de 2026', n: 67,
  brecha: 57, brechaPesos: 2464459,
  niveles: [['Premium', 3589831], ['Esencial', 2253754], ['Básica', 1377788]],
  premium: [['HDI', 2394896], ['Qualitas', 2540427], ['SBS', 3155622], ['Bolívar', 3345172], ['Zurich', 3584546],
    ['Allianz', 4050520], ['AXA Colpatria', 4311185], ['SURA', 4430188], ['MAPFRE', 4446671]],
};

const peso = (n) => '$' + n.toLocaleString('es-CO');

export function preciosAutosHTML(h = 'h2') {
  const P = PRECIOS_AUTOS;
  const fila = ([a, v]) => `<tr><th scope="row">${a}</th><td>${peso(v)}</td></tr>`;
  return `<${h} id="h-precios">Precios reales del seguro todo riesgo para carro en 2026</${h}>
    <p>En nuestras cotizaciones, el plan Premium más caro cuesta normalmente <strong>${P.brecha}% más</strong> que el más barato para el mismo carro: unos <strong>${peso(P.brechaPesos)} al año</strong> de diferencia. Por eso vale la pena comparar.</p>
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
    <p class="fuente">Fuente: ${P.n} cotizaciones reales de carros hechas en veraseguros.com entre el ${P.desde} y el ${P.hasta}, la mayoría en Medellín. Precio anual total que entregó cada aseguradora; mediana por nivel y por aseguradora. Sin planes por kilómetro. Es una muestra de 4 semanas: tu precio depende de tu carro, tu ciudad y tu perfil. Para saberlo, cotiza con tu placa.</p>`;
}

// Versión comparador para /seguros/auto/: logos y barras, texto mínimo. Sigue siendo una tabla (accesible e indexable).
const LG = { HDI: 'hdi', Qualitas: 'qualitas', SBS: 'sbs', 'Bolívar': 'bolivar', Zurich: 'zurich', Allianz: 'allianz', 'AXA Colpatria': 'axa-colpatria', SURA: 'sura', MAPFRE: 'mapfre' };
export function comparadorAutosHTML() {
  const P = PRECIOS_AUTOS, max = Math.max(...P.premium.map((x) => x[1]));
  return `<h2 id="h-precios">Compara: ${P.brecha}% de diferencia</h2>
      <table class="cmp"><caption>Plan Premium · precio anual mediano</caption><thead class="vh"><tr><th scope="col">Aseguradora</th><th scope="col">Precio anual</th></tr></thead>
      <tbody>${P.premium.map(([a, v], i) => `<tr${i ? '' : ' class="min"'}><th scope="row"><img src="/assets/lg/${LG[a]}.png" alt="${a}" width="76" height="28" loading="lazy"></th><td><span class="cmp-b"><i style="width:${Math.round(v / max * 100)}%"></i></span><b>${peso(v)}</b></td></tr>`).join('')}</tbody></table>
      <p class="cmp-f">${P.n} cotizaciones reales, ${P.desde} a ${P.hasta}. El plan más caro cuesta ${P.brecha}% más que el más barato para el mismo carro (mediana). Tu precio depende de tu carro y tu perfil.</p>`;
}
export const nivelesAutosHTML = () => `<div class="grid-3 niv3">${[['Premium', 'El plan más completo'], ['Esencial', 'El plan intermedio'], ['Básica', 'El plan de entrada']].map(([n, d]) => `<div class="card"><h3>${n}</h3><p>${d}</p><b>${peso(PRECIOS_AUTOS.niveles.find((x) => x[0] === n)[1])}</b><small>al año, mediana</small></div>`).join('')}</div>`;
