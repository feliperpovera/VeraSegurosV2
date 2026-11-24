// Ciclo del lector de carátulas: lee el corpus verificado (JSON local, con datos de clientes: nunca se sube) y mide el acierto por aseguradora y dato.
// Uso: node --experimental-strip-types tools/lector-loop.mjs corpus.json [campo] [aseguradora]   → con campo y aseguradora muestra las fallas.
import fs from 'node:fs';
import * as L from '../supabase/functions/autos-renovacion/lector.ts';
const [, , ruta, campo, cia] = process.argv, rows = JSON.parse(fs.readFileSync(ruta, 'utf8')).filter((r) => r.tipo !== 'modificacion' && !(r.pt < 0)); // las modificaciones no son renovaciones
const llano = (v) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^seguros del /, '');
const dig = (v) => String(v ?? '').replace(/\D/g, '').replace(/^0+/, '');
// En colectivos el CRM guarda la empresa tomadora, pero se cotiza al asegurado: documento y nombre se miden solo en personas.
const persona = (r) => r.doc && !/^[89]\d{8,9}$/.test(dig(r.doc));
const COMPARA = {
  aseguradora: (r, x) => [x.aseguradora, r.a, llano(x.aseguradora) === llano(r.a)],
  prima: (r, x) => r.pt && [x.prima, +r.pt, Math.abs((x.prima || 0) - r.pt) <= 5],
  desde: (r, x) => r.vd && [x.vigencia_desde, r.vd, x.vigencia_desde === r.vd],
  hasta: (r, x) => r.vh && [x.vigencia_hasta, r.vh, x.vigencia_hasta === r.vh],
  placa: (r, x) => r.placa && [x.placa, r.placa, x.placa === r.placa.replace(/\W/g, '')],
  numero: (r, x) => r.numero && [x.numero, r.numero, dig(x.numero) === dig(r.numero)],
  documento: (r, x) => persona(r) && [x.documento, r.doc, dig(x.documento).slice(0, 9) === dig(r.doc).slice(0, 9)],
  tomador: (r, x) => persona(r) && r.tomador && [x.tomador, r.tomador, [...new Set(llano(x.tomador).split(/\W+/))].sort().join(' ') === [...new Set(llano(r.tomador).split(/\W+/))].sort().join(' ')],
};
const tabla = {}, fallas = [];
for (const r of rows) {
  const x = L.leerTexto(r.texto);
  for (const [k, f] of Object.entries(COMPARA)) {
    const c = f(r, x); if (!c) continue;
    for (const a of [r.a, 'TODAS']) { const q = ((tabla[a] ??= {})[k] ??= [0, 0]); q[1]++; if (c[2]) q[0]++; }
    if (!c[2] && k === campo && (!cia || r.a === cia)) fallas.push({ id: r.id, leido: c[0], real: c[1], tipo: r.tipo, n: r.texto.length });
  }
  for (const k of ['valor', 'rc', 'ptd', 'pth', 'ppd', 'reemplazo', 'grua', 'plan']) for (const a of [r.a, 'TODAS']) { const q = ((tabla[a] ??= {})['~' + k] ??= [0, 0]); q[1]++; if (x[k]) q[0]++; }
}
console.table(Object.fromEntries(Object.entries(tabla).sort((a, b) => Object.values(b[1])[0][1] - Object.values(a[1])[0][1]).map(([a, o]) => [a, Object.fromEntries(Object.entries(o).map(([k, [b, n]]) => [k, `${Math.round(b / n * 100)}%`]))])));
if (campo) { console.log(`${fallas.length} fallas de ${campo}`); fallas.slice(0, 25).forEach((f) => console.log(JSON.stringify(f))); }

// Mínimos: si un cambio baja el acierto, el ciclo falla.
const MIN = { aseguradora: 99, prima: 97, desde: 93, hasta: 96, placa: 98, numero: 88, documento: 90 };
const mal = Object.entries(MIN).filter(([k, m]) => (tabla.TODAS[k][0] / tabla.TODAS[k][1]) * 100 < m);
console.log(mal.length ? 'BAJÓ EL ACIERTO: ' + mal.map(([k, m]) => `${k} < ${m}%`).join(', ') : 'LECTOR OK'); process.exitCode = mal.length ? 1 : 0;
