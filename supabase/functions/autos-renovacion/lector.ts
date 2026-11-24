// Lector propio de carátulas de autos (Colombia): sin IA ni API. Recibe el texto del PDF y devuelve los datos.
// Cada dato se busca por la etiqueta de la aseguradora y, si se puede, se comprueba con aritmética (prima + gastos + IVA = total).
// Se mide y se corrige con tools/lector-loop.mjs contra las carátulas ya verificadas del CRM.
// deno-lint-ignore-file no-explicit-any
const llano = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
// "214.400.000,00", "82,000,000", "$ *****1,274,240" y "2.006" en pesos enteros.
export function plata(v: string): number {
  const s = v.replace(/[^\d.,]/g, "").replace(/^[.,]+|[.,]+$/g, "");
  const m = s.match(/^(.*)[.,](\d{1,2})$/); // decimales
  const e = (m ? m[1] : s).replace(/[.,]/g, "");
  return e ? Math.round(Number(e) + (m ? Number(m[2].padEnd(2, "0")) / 100 : 0)) : 0;
}
const N = String.raw`\$?\s*\**\s*(\d{1,3}(?:(?:\.\d{3})+(?:,\d{2})?|(?:,\d{3})+(?:\.\d{2})?))`; // miles y decimales con separador distinto, aunque vengan pegados

const CIAS: [string, RegExp][] = [
  ["SURA", /suramericana|seguro adquiere sura|que sura adquiere/], ["Bolívar", /seguros comerciales bolivar|segurosbolivar/], ["HDI", /hdi seguros|hdiseguros|liberty seguros|libertycolombia/],
  ["Allianz", /allianz seguros|allianz\.co/], ["AXA Colpatria", /axa ?colpatria/], ["MAPFRE", /mapfre seguros|mapfre\.com/], ["SBS", /sbs seguros/], ["Zurich", /zurich colombia/],
  ["Qualitas", /qualitas (compania|colombia)|qualitascolombia/], ["Solidaria", /aseguradora solidaria|solidaria\.com/], ["Estado", /segurosdelestado|seguros del estado/], ["Mundial", /seguros mundial|mundialseguros/], ["Previsora", /la previsora|previsora\.gov/], ["Equidad", /laequidad|la equidad/], ["Chubb", /chubb seguros/]];
export function aseguradora(t: string) { // la que más se nombra
  const n = llano(t), l = CIAS.map(([c, re]) => [c, (n.match(new RegExp(re.source, "g")) ?? []).length] as const).filter((x) => x[1]).sort((a, b) => b[1] - a[1]);
  return l[0]?.[0] ?? null;
}

// Total a pagar: busca tres (o cuatro) valores del documento donde neto + gastos + IVA (19 %) = total.
export function prima(t: string): { total: number; neta: number; segura: boolean } | null {
  // Bolívar suma la asistencia con su propio IVA: manda el total rotulado.
  if (/seguros comerciales bolivar/.test(llano(t))) {
    const ult = [...t.slice(Math.max(0, t.indexOf("VALORES A PAGAR"))).matchAll(new RegExp(N, "g"))].map((m) => plata(m[1])).slice(0, 8);
    for (let k = 4; k < ult.length; k++) if (Math.abs(ult[k] - ult.slice(k - 4, k).reduce((a, x) => a + x, 0)) <= 4) return { total: ult[k], neta: ult[k - 4], segura: true };
    const tp = t.match(new RegExp(`total a pagar\\s*${N}`, "i"));
    if (tp) return { total: plata(tp[1]), neta: 0, segura: false };
  }
  const vistos = [...t.matchAll(new RegExp(N, "g"))].map((m) => plata(m[1])).filter((x) => x >= 2_000 && x < 150_000_000);
  const veces = new Map<number, number>(); for (const x of vistos) veces.set(x, (veces.get(x) ?? 0) + 1);
  const l = [...veces.keys()], hay = (x: number) => l.some((y) => Math.abs(y - x) <= 2);
  const c: { total: number; neta: number; p: number }[] = [];
  for (const iva of l) {
    const base = iva / 0.19, total = l.find((y) => Math.abs(y - base - iva) <= Math.max(8, total0(base)) && y > 50_000);
    if (!total) continue;
    const netas = l.filter((y) => Math.abs(y - (total - iva)) <= 2), con = l.filter((y) => y < total - iva && hay(total - iva - y));
    const et = new RegExp(`(total|pagar)[^\\d]{0,60}${esc(total, t)}`, "i").test(t) ? 2 : 0;
    c.push({ total, neta: netas[0] ?? Math.max(0, ...con), p: et + (netas.length ? 2 : con.length ? 1 : 0) + (veces.get(total)! > 1 ? 1 : 0) });
  }
  c.sort((a, b) => b.p - a.p || b.total - a.total);
  if (c.length && c[0].p > 0) return { total: c[0].total, neta: c[0].neta || 0, segura: true };
  const et = t.match(new RegExp(`(?:total a pagar(?: en pesos)?|valor total con iva|importe total|total prima|prima total)[^\\d]{0,40}${N}`, "i"));
  return et ? { total: plata(et[1]), neta: 0, segura: false } : null;
}
const total0 = (base: number) => base * 0.0002; // redondeos
const esc = (n: number, _t: string) => { const s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "[.,]"); return String.raw`\$?\s*\**\s*` + s; };

const MES: Record<string, string> = { ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06", jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12" };
const iso = (a: string, m: string, d: string) => { const f = `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`; return +m >= 1 && +m <= 12 && +d >= 1 && +d <= 31 && +a >= 2015 && +a < 2040 ? f : ""; };
function fechas(t: string): string[] {
  const out: [number, string][] = []; let m;
  const f = (re: RegExp, g: (m: RegExpExecArray) => string) => { while ((m = re.exec(t))) { const x = g(m); if (x) out.push([m.index, x]); } };
  f(/(?<!\d[\/-])(?<!\d\d\d)(\d{2})\s*[\/-]\s*(\d{1,2})\s*[\/-]\s*(\d{4})/g, (m) => iso(m[3], m[2], m[1]));
  f(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m) => iso(m[1], m[2], m[3]));
  f(/\b(\d{4})-([A-Z]{3})-(\d{2})\b/g, (m) => iso(m[1], MES[llano(m[2])] ?? "0", m[3]));
  f(/\b(\d{1,2})\s*[-\/]\s*([A-Za-z]{3})[A-Za-z. ]{0,9}[-\/]\s*(\d{4})/g, (m) => iso(m[3], MES[llano(m[2])] ?? "0", m[1]));
  f(/\b(\d{1,2}) de ([A-Za-z]{3})[a-z]* (?:de )?(\d{4})/g, (m) => iso(m[3], MES[llano(m[2])] ?? "0", m[1]));
  f(/\b(\d{1,2})\s+(\d{1,2})\s+(20\d{2})\b/g, (m) => iso(m[3], m[2], m[1]));
  return out.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
}
// Vigencia: el par de fechas del documento separadas un año (±3 días); si hay varios, el que más se repite y luego el más reciente.
export function vigencia(t: string): { desde: string; hasta: string } | null {
  const dias = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000, ok = (d?: string, h?: string) => d && h && dias(d, h) > 20 && dias(d, h) < 1100 ? { desde: d, hasta: h } : null;
  let m, x;
  // SURA
  if ((m = t.match(/vigencia del? (?:tu |su )?seguro.{0,110}?desde\s*hasta(?!\s*desde)(.{0,60})/i)) && (x = fechas(m[1])).length >= 2 && ok(x[0], x[1])) return ok(x[0], x[1]);
  // AXA: los números quedan sueltos entre "Mes Día Año Hora"
  if ((m = t.match(/Mes (\d{1,2}) Día (\d{1,2}) (20\d\d) Año Hora \d\d:\d\d (\d{1,2}) (20\d\d) \d\d:\d\d.{0,160}?Hora (\d{1,2}) /)) && ok(iso(m[3], m[2], m[1]), iso(m[5], m[6], m[4]))) return ok(iso(m[3], m[2], m[1]), iso(m[5], m[6], m[4]));
  if ((m = t.match(/Hora D[ií]a Mes A[nñ]o (\d{1,2}) (\d{1,2}) (20\d\d) \d\d:\d\d (\d{1,2}) (\d{1,2}) (20\d\d)/)) && ok(iso(m[3], m[2], m[1]), iso(m[6], m[5], m[4]))) return ok(iso(m[3], m[2], m[1]), iso(m[6], m[5], m[4]));
  // SBS y similares: DESDE y HASTA aparecen sueltos, cada uno con su fecha
  const d1 = fechas(t.match(/(?:vigencia )?desde las 00hh \([^)]*\) (.{8,22})/i)?.[1] ?? "")[0], h1 = fechas(t.match(/hasta las 00hh \([^)]*\) (.{8,22})/i)?.[1] ?? "")[0];
  if (ok(d1, h1)) return ok(d1, h1);
  // Desde … hasta con las dos fechas cerca
  if ((m = t.match(/desde\s+(?:las\s+)?(?:las\s+)?[\d:hH ]{0,12}(?:horas\s+)?(?:del\s+(?:d[ií]a\s+)?)?(.{8,24}?)\s+hasta\s+(?:las\s+)?[\d:hH ]{0,12}(?:horas\s+)?(?:del\s+(?:d[ií]a\s+)?)?(.{8,24})/i)) && (x = [fechas(m[1])[0], fechas(m[2])[0]]) && ok(x[0], x[1])) return ok(x[0], x[1]);
  // Dos fechas pegadas (Zurich): 28/05/202729/05/2026
  if ((m = t.match(/(\d{2}\/\d{2}\/\d{4})(\d{2}\/\d{2}\/\d{4})/))) { x = [fechas(m[1])[0], fechas(m[2])[0]].sort(); if (ok(x[0], x[1])) return ok(x[0], x[1]); }
  // El par de fechas separadas un año; si hay varios, el más reciente y el que más se repite
  const l = fechas(t), u = [...new Set(l)];
  const p = u.flatMap((a) => u.filter((b) => dias(a, b) >= 362 && dias(a, b) <= 367).map((b) => ({ desde: a, hasta: b, n: l.filter((y) => y === a || y === b).length })));
  p.sort((a, b) => b.hasta.localeCompare(a.hasta) || b.n - a.n);
  return p[0] ?? null;
}

export function placa(t: string): string | null {
  const PL = String.raw`([A-Z]{3}[ -]?\d{3}|[A-Z]{3}[ -]?\d{2}[A-Z])`;
  const cerca = [...t.matchAll(new RegExp(String.raw`placas?\b.{0,90}?\b${PL}\b`, "gis"))].map((m) => m[1]).filter((x) => /^[A-Z]{3}[ -]?\d{2}[\dA-Z]$/.test(x));
  const todas = [...t.matchAll(new RegExp(String.raw`\b${PL}\b`, "g"))].map((m) => m[1]);
  todas.push(...[...t.matchAll(/(?<![A-Z\d])([A-Z]{3}\d{2}[\dA-Z])(?=[A-HJ-NPR-Z\d]{17}(?![A-Z\d]))/g)].flatMap((m) => [m[1], m[1], m[1]])); // pegada al VIN
  const v = new Map<string, number>(); const suma = (x: string, n: number) => { const k = x.replace(/[ -]/g, ""); if (!/^(CRA|KRA|CLL|CAL|INT|APT|TEL|NIT|COD|REF|PBX|FAX|OFC|AVE|RES|LEY|ART|NRO|NUM|DEL|LAS|LOS|POR|CON|SUR|CII|VTE|IVA|LTD|GLS|GTX|SUV|DIA|CC\w)/.test(k)) v.set(k, (v.get(k) ?? 0) + n); };
  todas.forEach((x) => suma(x, 1)); cerca.forEach((x) => { const k = x.replace(/[ -]/g, ""); v.set(k, (v.get(k) ?? 0) + (/^(LTD|GTX|SUV|GLS)/.test(k) ? 1 : 4)); });
  return [...v].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

// Valor asegurado: la suma que más se repite en las coberturas del carro (daños, hurto, terremoto), o la de su etiqueta.
export function valor(t: string, total = 0, doc = ""): number {
  const et = t.match(new RegExp(String.raw`(?:valor total asegurado|valor asegurado del bien|valor comercial \*|suma asegurada del veh[ií]culo)\s*${N}`, "i"));
  if (et) { const s = t.match(new RegExp(String.raw`valor total asegurado\s*${N}\s*${N}`, "i")); return s ? Math.max(plata(s[1]), plata(s[2])) : plata(et[1]); }
  const v = new Map<number, number>();
  for (const m of t.matchAll(new RegExp(N, "g"))) { const x = plata(m[1]); if (x >= 4_000_000 && x < 1_000_000_000 && x !== total && !(doc && String(x).startsWith(doc.slice(0, 8))) && !/^\s*-\s*\d\b/.test(t.slice(m.index! + m[0].length, m.index! + m[0].length + 5))) v.set(x, (v.get(x) ?? 0) + 1); }
  for (const m of t.matchAll(new RegExp(String.raw`(?:p[eé]rdida|perdida|da[nñ]os?|hurto) (?:total|parcial|de mayor cuant[ií]a)[^\d$]{0,60}${N}`, "gi"))) { const x = plata(m[1]); if (v.has(x)) v.set(x, v.get(x)! + 2); }
  return [...v].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? 0;
}

// Identidad del tomador: primero la etiqueta de la aseguradora; si no, el documento y el nombre que más se repiten (tomador, asegurado y beneficiario suelen ser el mismo).
const NO_DOC = /^(901039892|890903407|860002184|860026182|860037707|860002180|860039988|891700037|860524654|860009578|900817\d{3}|860034313|890903938|860002964|860003020|860007738|860034594|890300279|800037800|860035827|860051894|811007729|860050750|900688066|860043186|900200960|860025971|860007660)/;
const NO_NOMBRE = /\b(SEGUROS?|VERA ASESORES|P[OÓ]LIZA|VIGENCIA|COBERTURA|AMPARO|DA[NÑ]OS|HURTO|RESPONSABILIDAD|P[EÉ]RDIDA|MEDELL[IÍ]N|ANTIOQUIA|BOGOT[AÁ]|COLOMBIA|VEH[IÍ]CULO|AUTOM[OÓ]VIL|CAMIONETA|CAMPERO|PICKUP|VALOR|TOTAL|PRIMA|ASISTENCIA|SUCURSAL|CENTRO|ASEGURADO|TOMADOR|BENEFICIARIO|DIRECCI[OÓ]N|TEL[EÉ]FONO|CIUDAD|NOMBRE|PARTICULAR|FAMILIAR|RENOVACI[OÓ]N|PRODUCTO|CERTIFICADO|CLIENTE|AQUI|DATOS|PAGO|FECHA|BANCO|BANCOLOMBIA|DAVIVIENDA|DEDUCIBLE|SI AMPARA|SMMLV|SMLMV|SMLDV|TEMBLOR|TERREMOTO|CONDICIONES|GENERALES|SERVICIO|GASTOS|NO APLICA|MARCA|MODELO|CLASE|PLACA|CHASIS|MOTOR|BLANCO|NEGRO|GRIS|PLATA|ROJO|AZUL|TIPO|PQRS|C\.?C\.?|UNICO|[UÚ]NICO|CUBRE|ART[IÍ]CULO|LA MORA|EN TODO CASO|REG[IÍ]MEN|COMERCIO|CONTRATO|SEGURIDAD|LOCALIZACI[OÓ]N|GARANT[IÍ]AS|CL[AÁ]USULAS?|ANEXO|DOCUMENTO|REFERENCIA|LIQUIDACI[OÓ]N|PLAN|PREMIUM|GLOBAL|DOMICILIO|MUNICIPIO|DEPARTAMENTO|IDENTIFICACI[OÓ]N|ENDOSO|INICIAL|CHEVROLET|RENAULT|MAZDA|TOYOTA|KIA|NISSAN|FORD|HYUNDAI|SUZUKI|VOLKSWAGEN|HONDA|BMW|AUDI|BYD|JEEP|YAMAHA|BAJAJ|DUCATI|SUBARU|VOLVO|PEUGEOT|FOTON|JAC|CHERY|DOBLE|CABINA|MECANICA|LIMITE|[UÚ]NICA|COASEGURO|INTERMEDIARIO|PARTICIPACI[OÓ]N|DIARIOS|LEGALES|CONDUCTOR|COMPA[NÑ][IÍ]A|FASECOLDA|OPCI[OÓ]N|EXTRACONTRACTUAL|PROTECCI[OÓ]N|PATRIMONIAL|ACCIDENTES?|VIAJES?|MUERTE|LESIONES|GRAN|CONTRIBUYENTE|IVA|HORAS?|D[IÍ]AS?|MES|A[NÑ]O|DESDE|HASTA|OFICINA|AGENCIA|RED|AMPLIA|REEMPLAZO|EN|LAS|LOS|POR|CON|PARA|QUE|SER[AÁ]N|SU|SUS|SE|NO|BIEN|BIENES|ASEGURADOS?|BENEFICIARIOS|SERVICIOS|CONVENIO|ENTIDAD(?:ES)?|FINANCIERAS?|PAGOS|PRESENCIALES|REALIZADAS|FECHAS|OBSERVACIONES|PASTO|PEREIRA|POPAY[AÁ]N|PALMIRA|MANIZALES|ENVIGADO|ITAG[UÜ][IÍ]|SABANETA|RIONEGRO|BELLO|CALDAS|RETIRO|URB|APTO|CASA|TORRE|EDIFICIO|INT|BARRIO|FINCA|VEREDA|LEY|ESTA|ESTE|ENTRE|EL|AL|UN|UNA|INTERESES?|CORRIENTES?|JUR[IÍ]DICA|PENAL|CIVIL|PROCESO|REG|CUENTA|AHORROS|CIRCULACI[OÓ]N|USO|PERSONAL|LIVIANO|PESADO|TRACKER|SPARK|DUSTER|TRANSPORTE|TERRORISMO|ACCESORIOS|RINES|LUJO|VIDRIOS|LLANTAS|LLAVES|EXEQUIAL|INFORM[AÁ]TICO)\b/;
export function cliente(t: string, c: string | null, num = "") {
  const DOC = String.raw`(\d{1,3}(?:\.\d{3}){2,3}|\d{6,11})`;
  const cand = new Map<string, number>();
  const mas = (v: string, n: number) => { const d = v.replace(/\D/g, "").replace(/^0+/, ""); if (d.length < 6 || d.length > 10 || NO_DOC.test(d) || /^(3\d{9}|60\d{8}|(19|20)\d{6})$/.test(d) || (num && num.replace(/\D/g, "").replace(/^0+/, "").includes(d))) return; cand.set(d, (cand.get(d) ?? 0) + n); };
  for (const m of t.matchAll(new RegExp(String.raw`(?:\bNIT\b|\bC\.?C\b|C[eé]dula|CEDULA|IDENTIFICACI[OÓ]N)[^\d]{0,40}?${DOC}(?:\s*-\s*\d)?\b`, "g"))) mas(m[1], 3);
  for (const m of t.matchAll(new RegExp(String.raw`(?<![\d.,$*-])${DOC}(?![\d.,]*\d)`, "g"))) if (m[1].replace(/\D/g, "").length >= 8) mas(m[1], 1);
  if (c === "SURA") for (const m of t.matchAll(new RegExp(String.raw`(?:C[eé]dula|Nit\.?|NIT|Documento) ([A-ZÑÁÉÍÓÚ&.\- ]{5,70}?) ${DOC}`, "g"))) { mas(m[2], 5); }
  // SURA: "ASEGURADO (PROPIETARIO DE TU CARRO) Nombre Cédula … Edad NOMBRE 123"; HDI y demás: "TOMADOR/ASEGURADO … NOMBRE … CC: 123"
  for (const m of t.matchAll(new RegExp(String.raw`(?:ASEGURADO|Asegurado|PROPIETARIO)[^.]{0,120}?(?:Edad|Correo electr[oó]nico|contacto)\s+([A-ZÑÁÉÍÓÚ][A-ZÑÁÉÍÓÚ&.\- ]{5,60}?) ${DOC}`, "g"))) mas(m[2], 9);
  const t1 = t.match(new RegExp(String.raw`(?:TOMADOR|Tomador|responsable del pago|RESPONSABLE DEL PAGO).{0,260}?${DOC}(?![\d.,]*\d)`)); if (t1) mas(t1[1], 3);
  const unir = [...cand].map(([d, n]) => [d, n + [...cand].filter(([e]) => e !== d && e.length === d.length - 1 && d.startsWith(e) || e !== d && e.length === d.length + 1 && e.startsWith(d)).reduce((a, x) => a + x[1], 0)] as [string, number]);
  const id = unir.sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0]?.[0] ?? "";
  // Nombre: mayúsculas que se repiten o están junto al documento
  const nom = new Map<string, number>(), NOMBRE = String.raw`[A-ZÑÁÉÍÓÚÜ][A-ZÑÁÉÍÓÚÜ&.,]*(?: [A-ZÑÁÉÍÓÚÜ&.,]+){1,6}`;
  const vale = (v: string) => { const x = v.replace(/\s+/g, " ").replace(/\b(?:NULL|AQUI\w*)\b/g, " ").replace(/\s+/g, " ").trim().replace(/(?: [A-ZÑ]{1}| C\.C\.?)+$/g, "").replace(/^(?:NIT\.?|CC|DE|LA|EL|Y|N|S|A|CL|CR|KR|CRA|NULL)\s+/g, "").replace(/\s+(?:CC|NIT|CL|CR|KR|CRA|CALLE|CARRERA|DG|TV|AV|NO|N|D|C)\.?$/g, "").trim(); return x.length >= 6 && x.length < 60 && x.split(" ").length >= 2 && x.split(" ").length <= 8 && x.split(" ").filter((w) => w.replace(/\W/g, "").length > 2).length >= 2 && !NO_NOMBRE.test(x) ? x : ""; };
  for (const m of t.matchAll(/(?<![A-ZÑÁÉÍÓÚa-z])[A-ZÑÁÉÍÓÚÜ][A-ZÑÁÉÍÓÚÜ&.,]*(?: [A-ZÑÁÉÍÓÚÜ&.,]+){1,6}/g)) { const x = vale(m[0]); if (x) nom.set(x, (nom.get(x) ?? 0) + 1); }
  for (const m of t.matchAll(/(?:NOMBRE:?|TOMADOR:?|Tomador del Seguro:|ASEGURADO:?|Cédula|Nit\.?|Estimado(?:\(a\))?,?(?: Asegurado\(a\):)?)\s+([A-ZÑÁÉÍÓÚÜ][A-ZÑÁÉÍÓÚÜ&.,]*(?: [A-ZÑÁÉÍÓÚÜ&.,]+){1,6})/g)) { const x = vale(m[1]); if (x) nom.set(x, (nom.get(x) ?? 0) + 2); }
  for (const m of t.matchAll(/(?:TOMADOR|ASEGURADO)\s+(?:NOMBRE:\s*)?([A-ZÑÁÉÍÓÚ][a-zñáéíóúü]+(?: [A-ZÑÁÉÍÓÚ][a-zñáéíóúü]+){1,5})(?= TIPO| NOMBRE| DIREC| CC| NIT)/g)) nom.set(m[1], (nom.get(m[1]) ?? 0) + 6);
  for (const m of t.matchAll(new RegExp(String.raw`(?:TOMADOR|ASEGURADO):?\s+(?:NOMBRE:\s*)?(${NOMBRE})(?= TIPO| NOMBRE| DIREC| CC| NIT| C\.C| --)`, "g"))) { const x = vale(m[1]); if (x) nom.set(x, (nom.get(x) ?? 0) + 4); }
  for (const m of t.matchAll(new RegExp(String.raw`(?<![A-ZÑÁÉÍÓÚa-z])(${NOMBRE}) (?=(?:CL|CLL|CRA|KR|KRA|CR|CALLE|CARRERA|AV|AVENIDA|DG|TV|CIR|CQ|TRANSV) )`, "g"))) { const x = vale(m[1]); if (x) nom.set(x, (nom.get(x) ?? 0) + 3); }
  if (id) { const pat = id.replace(/\B(?=(\d{3})+$)/g, "\\.?"); for (const m of t.matchAll(new RegExp(String.raw`([A-ZÑÁÉÍÓÚÜ][A-ZÑÁÉÍÓÚÜ&., ]{4,60}?) (?:(?:NIT|CC|C\.C\.?)[: ]*)?${pat}`, "g"))) { const x = vale(m[1]); if (x) nom.set(x, (nom.get(x) ?? 0) + 3); } }
  for (const [k] of nom) if (/CUALQUIER|SANCI[OÓ]N|CUBRIMOS|OPCIONAL|ADICIONALES|NATIVO|HYBRID|TOURING|GRAND|QU[EÉ]\b/.test(k)) nom.delete(k);
  for (const [k, v] of [...nom]) { const largo = [...nom.keys()].find((x) => x !== k && (x.endsWith(" " + k) || x.startsWith(k + " ")) && x.split(" ").length <= 7); if (largo) { nom.set(largo, nom.get(largo)! + v); nom.delete(k); } }
  let nombre = [...nom].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0]?.[0] ?? "";
  nombre = nombre.replace(/[.,]+$/, (x) => (/S\.A\.S?\.?$|LTDA\.$/.test(nombre) ? x : "")).trim();
  const juridico = /\b(S\.? ?A\.? ?S|S\.? ?A|LTDA|CIA|E\.?S\.?P|FUNDACI[OÓ]N|CORPORACI[OÓ]N|ASOCIACI[OÓ]N|COOPERATIVA)\b\.?/.test(nombre);
  const nit = /^[89]\d{8}$/.test(id) || (/^[89]\d{9}$/.test(id) && digito(id.slice(0, 9)) === id[9]) || (id.length === 10 && juridico);
  return { tomador: nombre || null, documento: id ? (nit ? id.slice(0, 9) : id) : null, es_empresa: nit || juridico };
}
export function digito(nit: string) { const s = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43].reduce((a, p, i) => a + p * Number(nit[nit.length - 1 - i] ?? 0), 0) % 11; return String(s > 1 ? 11 - s : s); }
export function numero(t: string, c: string | null): string | null {
  const g = (re: RegExp) => t.match(re)?.[1] ?? null;
  return c === "SURA" ? g(/p[oó][lĺ][ií]za principal:?\s*(\d{9,14})/i) ?? g(/No\.? P[oó]l[ií]za\s*(\d{9,14})/i) ?? g(/\b((?:040|900|800|090|091)\d{9})\b/)
    : c === "Allianz" ? g(/P[oó]liza n[ºo°]:?\s*(\d{6,12})/i) ?? g(/\b(0\d{8}) ?\/ ?\d/) : c === "Bolívar" ? g(/P[oó]liza N[°º]\s*(\d{8,14})/i) ?? g(/\b(10\d{11})\b/)
    : c === "HDI" ? g(/DOCUMENTO TIPO VEH[IÍ]CULO \d{2,3} \d{3,4} (\d{5,10})/i) ?? g(/\b10[0-9] \d{4} (\d{5,9}) \d+ \d+ (?:LIVIANO|PESADO|MOTO)/) ?? g(/P[OÓ]LIZA\D{0,60}?(\d{5,10})\b/)
    : c === "AXA Colpatria" ? g(/(?:CENTRO|MEDELLIN|SUCURSAL) 10 (\d{6,8})\b/) ?? g(/P[OÓ]LIZA No\.?\s*(30\d{5}|\d{6,8})\b/) ?? g(/\b(30\d{5})\b/) : c === "SBS" ? g(/(?:P[OÓ]LIZA|POLIZA)\s*(?:No\.?|N°|#)?:?\s*(\d{6,9})\b/i) ?? g(/\b(10\d{5})\b/)
    : c === "Qualitas" ? g(/\b(00[67]\d{7})\b/) : c === "MAPFRE" ? g(/\b(1[0-9]\d{11})\s*Poliza No/i) ?? g(/Poliza No\.?\s*(\d{13})/i) : c === "Zurich" ? g(/\b(TIPL-[\d-]+)/) : c === "Solidaria" ? g(/\b(99\d{10})\b/) : c === "Estado" ? g(/P[OÓ]LIZA No\.?.{0,14}?(\d{8,10})/i) ?? g(/\b(10\d{7})\b/) : g(/p[oó]liza\s*(?:no\.?|n[°º])?:?\s*(\d{6,14})/i);
}
export function plan(t: string, c: string | null): string | null {
  const g = (re: RegExp) => t.match(re)?.[1]?.replace(/\s+/g, " ").trim() ?? null;
  return c === "SURA" ? g(/Plan (Autos (?:Global|Cl[aá]sico|B[aá]sico|Esencial)|Utilitarios Y Pesados|Motos|Autos [A-ZÁ]\w+)/) : c === "Bolívar" ? g(/OBSERVACIONES:\s*(PREMIUM|EST[AÁ]NDAR|STANDARD|CL[AÁ]SIC[AO])/i) ?? g(/\b(PREMIUM|STANDARD|ESTANDAR|CLASICA)\b/)
    : c === "AXA Colpatria" ? g(/\b(AU [A-ZÓÑ ]{3,26}?(?:PLUS|VIP|TRADICIONAL|ESENCIAL|ELITE)[A-ZÓÑ ]{0,12}?)(?= Día| RENOV| FECHA|\.|,)/) : c === "MAPFRE" ? g(/\b(SUPER TREBOL|PARA LA MUJER|TREBOL [A-Z]+)\b/) : c === "HDI" ? g(/\b(PREMIUM|INTEGRAL|LIGERO|TRADICIONAL)\b/)
    : c === "Qualitas" ? g(/\b(AMPLIA|PLUS|B[AÁ]SICA|BASE)\b/) : c === "Solidaria" ? g(/\b(PARTICULAR [A-Z]+ (?:PLUS|PREMIUM|ELITE)|(?:PLUS|PREMIUM|ELITE))\b/) : null;
}

// Coberturas: solo se devuelven cuando el orden de columnas es inequívoco; si no, quedan vacías para que el asesor las escriba.
const smm = (v: string) => Number(v.replace(",", "."));
const ded = (pct: number, min: number, u = "SMMLV") => pct && min ? `${pct}%, mínimo ${min} ${u}` : pct ? `${pct}%` : min ? `${String(min).replace(".", ",")} ${u}` : "Sin deducible";
const pesos = (n: number) => "$" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export function coberturas(t: string, c: string | null): Record<string, string> {
  const o: Record<string, string> = {}, A = (k: string, v?: string | null) => { if (v && !o[k]) o[k] = v; };
  const rcN = [...t.matchAll(new RegExp(String.raw`(?:responsabilidad civ[ií]l extracontractual|da[nñ]os a terceros)(?: LUC)?.{0,120}?${N}`, "gi"))].map((m) => plata(m[1])).find((x) => x >= 100_000_000 && x <= 20_000_000_000);
  let m: RegExpMatchArray | null;
  if (c === "SURA") {
    const D = String.raw`(\$ ?0(?![\d.,])|\d{1,2}%(?: - [\d.,]+ SMM?LM?V)?|\$ ?[\d.,]+ SMM?LM?V|[\d.,]+ SMM?LM?V(?: \(100%\))?|Si el arreglo cuesta menos de \$ ?[\d.,]+ SMM?LM?V.{0,90}?SURA)`;
    const lee = (v: string) => { const a = v.match(/menos de \$ ?([\d.,]+)/) ?? v.match(/^(?:\$ ?)?([\d.,]+) SM/); const p = v.match(/^(\d+)%(?: - ([\d.,]+))?/); return a ? ded(0, smm(a[1])) : p ? ded(+p[1], p[2] ? smm(p[2]) : 0) : "Sin deducible"; };
    for (const [z, tot, par] of [["Daños al Carro", "ptd", "ppd"], ["Hurto al Carro", "pth", "pph"]]) {
      if ((m = t.match(new RegExp(`${z}((?: P[eé]rdida Total| P[eé]rdida Parcial| Gastos de Transporte)+) ${D}(?: ${D})?(?: ${D})?`)))) {
        const et = [...m[1].matchAll(/P[eé]rdida (Total|Parcial)|(Gastos)/g)].map((x) => x[1] ?? "G");
        et.forEach((x, k) => { const v = m![2 + k]; if (v && x === "Total") A(tot, lee(v)); if (v && x === "Parcial") A(par, lee(v)); });
        if (!et.includes("Parcial")) A(par, "No cubre"); if (!et.includes("Total")) A(tot, "No cubre");
      }
    }
    if ((m = t.match(/Alternativas de Movilidad.{0,90}?(\d{1,3}) d[ií]as/))) A("reemplazo", `${m[1]} días`);
    if (/Asistencia (?:global|cl[aá]sica|de motos|pesados)/i.test(t)) A("grua", "Incluida");
  } else if (c === "Allianz") {
    const K: [string, RegExp][] = [["ptd", /Daños de Mayor Cuant[ií]a/], ["ppd", /Daños de Menor Cuant[ií]a/], ["pth", /Hurto de Mayor Cuant[ií]a/], ["pph", /Hurto de Menor Cuant[ií]a/]];
    for (const [k, re] of K) if ((m = t.match(new RegExp(re.source + String.raw` ${N} (\d{1,2}),00`)))) A(k, ded(0, +m[2]));
    if (!o.ptd && (m = t.match(/Extracontractual Asistencia Jur[ií]dica en Proceso Penal y Civ[ií]l Daños de Mayor Cuant[ií]a Daños de Menor Cuant[ií]a Hurto de Mayor Cuant[ií]a Hurto de Menor Cuant[ií]a.*?Deducible en S\.M\.M\.L\.V\. ((?:\d{1,2},00 ){6})/))) {
      const v = m[1].trim().split(" ").map((x) => parseInt(x)); A("ptd", ded(0, v[2])); A("ppd", ded(0, v[3])); A("pth", ded(0, v[4])); A("pph", ded(0, v[5]));
    }
    if (/Veh[ií]culo de Reemplazo/.test(t)) A("reemplazo", "Incluido");
    if (/Asistencia de Gr[uú]a|Emergencias en Carretera/.test(t)) A("grua", "Incluida");
  } else if (c === "Bolívar") {
    const V = String.raw`(\d{1,2})%, m[ií]nimo ([\d.]+) salario`;
    if ((m = t.match(new RegExp(`Daño total ${V}\\S* Daños parciales ${V}\\S* Hurto parcial y total\\*? ${V}`))) || (m = t.match(new RegExp(`Daño total Daños parciales Hurto parcial y total\\*?.{0,260}?${V}\\S* ${V}\\S* ${V}`)))) {
      A("ptd", ded(+m[1], +m[2])); A("ppd", ded(+m[3], +m[4])); A("pth", ded(+m[5], +m[6])); A("pph", ded(+m[3], +m[4]));
    }
    if ((m = t.match(/(\d{3,5}) Millones/))) A("rc", pesos(+m[1] * 1_000_000));
    if (/Veh[ií]culo temporal de reem/i.test(t)) A("reemplazo", "Incluido");
    if (/Asistencia en viajes/i.test(t)) A("grua", "Incluida");
  } else if (c === "HDI") {
    if ((m = t.match(/(\d)\s?[\d,.]{9,15}P[eé]rdida Total por Hurto \$ (\d{1,2}) ?% (\d)\s?[\d,.]{9,15}P[eé]rdida Total por Daños \$ (\d{1,2}) ?% (\d)\s?[\d,.]{9,15}P[eé]rdida Parcial por Daños \$ (\d{1,2}) ?% (\d)\s?[\d,.]{9,15}P[eé]rdida Parcial por Hurto \$ (\d{1,2}) ?%/))) {
      A("pth", ded(+m[2], +m[1])); A("ptd", ded(+m[4], +m[3])); A("ppd", ded(+m[6], +m[5])); A("pph", ded(+m[8], +m[7]));
    } else if ((m = t.match(/M[ií]nimo S\.M\.M\.L\.V ((?:\d{1,2}% ){6}).{0,160}?TOTAL A PAGAR \$ ((?:\d ){6})/))) {
      const p = m[1].trim().split(" ").map((x) => parseInt(x)), v = m[2].trim().split(" ").map(Number); // RC, PTH, PTD, PPD, PPH, temblor
      A("pth", ded(p[1], v[1])); A("ptd", ded(p[2], v[2])); A("ppd", ded(p[3], v[3])); A("pph", ded(p[4], v[4]));
    }
    else if ((m = t.match(/((?:\d{1,2}% ){6,7})((?:\d ){6,7})/)) && /extracontractual P[eé]rdida total por hurto P[eé]rdida total daños P[eé]rdida parcial daños P[eé]rdida parcial hurto/i.test(t)) {
      const p = m[1].trim().split(" ").map((x) => parseInt(x)), v = m[2].trim().split(" ").map(Number);
      A("pth", ded(p[1], v[1])); A("ptd", ded(p[2], v[2])); A("ppd", ded(p[3], v[3])); A("pph", ded(p[4], v[4]));
    }
    if (/Veh[ií]culo Sustituto/i.test(t)) A("reemplazo", "Incluido");
    if (/Asistencia (?:en|de) viaje/i.test(t)) A("grua", "Incluida");
  } else if (c === "AXA Colpatria") {
    const fila = (k: string, re: string) => { if ((m = t.match(new RegExp(`${re} ?${N}(?: ?(?:(\\d{1,2}) SMMLV ?)?(\\d{1,2}),\\d\\d % ?(?:(\\d{1,2}) SMMLV)?)?`))) && plata(m[1]) > 3_000_000) A(k, ded(+(m[3] ?? 0), +(m[2] ?? m[4] ?? 0))); };
    if (/PERDIDA TOTAL POR DAÑOS ?\$?\d/.test(t)) { fila("ptd", "PERDIDA TOTAL POR DAÑOS"); fila("ppd", "PERDIDA PARCIAL POR DAÑOS"); fila("pth", "PERDIDA TOTAL POR HURTO"); fila("pph", "PERDIDA PARCIAL POR HURTO"); }
    else if (/PERDIDA TOTAL POR DAÑOS PERDIDA PARCIAL POR DAÑOS PERDIDA TOTAL POR HURTO PERDIDA PARCIAL POR HURTO/.test(t) && (m = t.match(/\b(\d{1,2}),00 % (\d) SMMLV (\d{1,2}),00 % (\d) SMMLV(?! \d{1,2},00 %)/)) && (t.match(/\d,00 % \d SMMLV/g) ?? []).length === 2) { A("ptd", "Sin deducible"); A("pth", "Sin deducible"); A("ppd", ded(+m[1], +m[2])); A("pph", ded(+m[3], +m[4])); }
    if ((m = t.match(/VEHICULO DE REEMPLAZO.{0,40}?(\d{1,2}) ?D[IÍ]AS/i))) A("reemplazo", `${m[1]} días`); else if (/VEH[IÍ]CULO (?:DE REEMPLAZO|SUSTITUTO)/.test(t)) A("reemplazo", "Incluido");
    if (/ASISTENCIA EN VIAJE/.test(t)) A("grua", "Incluida");
  } else if (c === "SBS") {
    const L = ["RESPONSABILIDAD CIVIL EXTRACONTRACTUAL", "DAÑOS A BIENES DE TERCEROS", "MUERTE O LESIONES A UNA PERSONA", "MUERTE O LESIONES A DOS O M[AÁ]S PERSONAS", "R\\.?C\\.? EXTRACONTRACTUAL EN EXCESO", "ASISTENCIA JUR[IÍ]DICA PENAL Y CIVIL", "AMPARO DE PROTECCI[OÓ]N PATRIMONIAL", "P[EÉ]RDIDA PARCIAL DEL VEH[IÍ]CULO POR DAÑOS", "P[EÉ]RDIDA TOTAL POR DAÑOS", "P[EÉ]RDIDA PARCIAL DEL VEH[IÍ]CULO POR HURTO", "P[EÉ]RDIDA TOTAL POR HURTO", "TEMBLOR, TERREMOTO O ERUPCI[OÓ]N VOLC[AÁ]NICA"];
    for (const [k, i] of [["ppd", 7], ["ptd", 8], ["pph", 9], ["pth", 10]] as const) if ((m = t.match(new RegExp(L[i] + String.raw` \$ [\d,.]+ (--|(\d{1,2})\.00 %) (--|([\d.]+) SMMLV)`)))) A(k, ded(+(m[2] ?? 0), +(m[4] ?? 0)));
    const ini = Math.max(0, t.search(/RESPONSABILIDAD CIVIL EXTRACONTRACTUAL DAÑOS A BIENES/)), zona = t.slice(ini, ini + 1600);
    const orden = L.map((x, k) => [k, zona.search(new RegExp(x))] as const).filter((x) => x[1] >= 0).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
    const cols = (re: RegExp, unidad: string) => { const z = zona.match(re)?.[1]; return z ? [...z.matchAll(new RegExp(`-|(\\d{1,2})\\.00 ${unidad}`, "g"))].map((x) => Number(x[1] ?? 0)) : []; };
    const pct = cols(/(-{3,}\d{1,2}\.00 %(?: ?-| ?\d{1,2}\.00 %)*)/, "%"), min = cols(/(-{3,}\d{1,2}\.00 SMMLV(?: ?-| ?\d{1,2}\.00 SMMLV)*)/, "SMMLV");
    if (pct.length >= orden.length && min.length >= orden.length && orden.length >= 8) for (const [k, i] of [["ppd", 7], ["ptd", 8], ["pph", 9], ["pth", 10]] as const) { const j = orden.indexOf(i); if (j >= 0) A(k, ded(pct[j], min[j])); }
    if (/VEH[IÍ]CULO DE REEMPLAZO/.test(t)) A("reemplazo", "Incluido");
    if (/ASISTENCIA EN VIAJES/.test(t)) A("grua", "Incluida");
  } else if (c === "MAPFRE" || c === "Zurich") {
    const fila = (k: string, re: string) => { if ((m = t.match(new RegExp(`${re} ${N} (NO APLICA|\\d{6,8} \\(PESO|\\d{1,2} SMMLV|0(?= ))`, "i")))) A(k, /NO APLICA|^0$/.test(m[2]) ? "Sin deducible" : /PESO/.test(m[2]) ? pesos(parseInt(m[2])) : ded(0, parseInt(m[2]))); };
    fila("ptd", "P[EÉ]RDIDA TOTAL (?:DEL VEH[IÍ]CULO )?POR DA[NÑ]OS(?: Y TERRORISMO)?"); fila("pth", "P[EÉ]RDIDA TOTAL (?:DEL VEH[IÍ]CULO )?(?:POR )?HURTO"); fila("ppd", "P[EÉ]RDIDA PARCIAL (?:DEL VEH[IÍ]CULO )?POR DA[NÑ]OS(?: Y TERRORISMO)?"); fila("pph", "P[EÉ]RDIDA PARCIAL (?:DEL VEH[IÍ]CULO )?POR HURTO");
    if ((m = t.match(/VEHICULO DE REEMPLAZO (\d{1,2} dias P\.Parciales y \d{1,2} dias P\.Totales)/i))) A("reemplazo", m[1].replace(/dias P\.Parciales y (\d+) dias P\.Totales/i, "días PP, $1 días PT"));
    else if (/Veh[ií]culo de Reemplazo/i.test(t)) A("reemplazo", "Incluido");
    if (/ASISTENCIA MAPFRE|Asistencia total/i.test(t)) A("grua", "Incluida");
  } else if (c === "Qualitas") {
    const v = (k: string, re: string) => { if ((m = t.match(new RegExp(`${re} (?:${N}\\s*)?(Valor convenido 0%|\\$[\\d.]{7,10})`)))) A(k, /0%/.test(m[2]) ? "Sin deducible" : pesos(plata(m[2]))); };
    if (/P[eé]rdida Total por Daños (?:\$|Valor)/i.test(t)) { v("ptd", "P[eé]rdida Total por Daños"); v("pth", "P[eé]rdida Total por Hurto"); }
    for (const [k, re] of [["ppd", "Parcial por Daños"], ["ptd", "Total por Daños"], ["pph", "Parcial por Hurto"], ["pth", "Total por Hurto"]]) if ((m = t.match(new RegExp(String.raw`P[eé]rdida ${re} ?\$ ?[\d.]+ ?(?:\$ ?([\d.]{7,10})|Valor Convenido (\d{1,2}) ?%)`, "i")))) A(k, m[1] ? pesos(plata(m[1])) : ded(+m[2], 0));
    if ((m = t.match(/DEDUCIBLES \$([\d.]+) Valor convenido (\d+)% \$([\d.]+) Valor convenido (\d+)%/)) && /P[eé]rdida Parcial por Daños P[eé]rdida Total por Daños P[eé]rdida Parcial por Hurto P[eé]rdida Total por Hurto/i.test(t)) { A("ppd", pesos(plata(m[1]))); A("ptd", ded(+m[2], 0)); A("pph", pesos(plata(m[3]))); A("pth", ded(+m[4], 0)); }
    if (/Veh[ií]culo de Reemplazo/i.test(t)) A("reemplazo", "Incluido");
    if (/Asistencia En Viaje/i.test(t)) A("grua", "Incluida");
  }
  if (c === "SBS" && (m = t.match(/(\d{3},000,000\.00|\d,\d{3},000,000\.00) (\d{3},000,000\.00|\d,\d{3},000,000\.00) (\d{3},000,000\.00|\d,\d{3},000,000\.00)/))) A("rc", [m[1], m[2], m[3]].map((x) => pesos(plata(x))).join(" / ")); // daños, una persona, dos o más
  if (rcN) A("rc", pesos(rcN));
  const mil = [...t.matchAll(new RegExp(N, "g"))].map((x) => plata(x[1])).filter((x) => x >= 500_000_000 && x <= 20_000_000_000 && x % 10_000_000 === 0); // si la etiqueta quedó lejos: el único límite grande del documento
  if (new Set(mil).size === 1 && /responsabilidad civ/i.test(t)) A("rc", pesos(mil[0]));
  return o;
}

const OK = 200; // menos texto que esto: PDF escaneado (imagen)
export function leerTexto(texto: string): any {
  const t = texto.replace(/\s+/g, " ");
  if (t.length < OK) return { es_auto: false, escaneado: true, dudas: [] };
  const c = aseguradora(t), p = prima(t), v = vigencia(t), n = numero(t, c), q = cliente(t, c, n ?? ""), pl = placa(t), o = coberturas(t, c), va = valor(t, p?.total, q.documento ?? "") || null;
  const es_auto = /autom[oó]vil|veh[ií]culo|plan autos|plan motos|fasecolda/i.test(t) && !!(pl || va);
  // Dudas: lo que no se pudo comprobar, para que el asesor lo mire primero.
  const dudas = [!c && "aseguradora", !p ? "prima" : !p.segura && "prima (sin comprobar con el IVA)", !v && "vigencia", !pl && "placa", !va && "valor asegurado", !q.documento && "documento", !q.tomador && "nombre", !o.ptd && !o.ppd && "coberturas",
    (t.match(/valor total con iva/gi) ?? []).length > 2 && "varios vehículos en el PDF: revisa que sea el correcto"].filter(Boolean);
  return { es_auto, aseguradora: c, plan: plan(t, c), numero: n, vence: v?.desde ?? null, vigencia_desde: v?.desde ?? null, vigencia_hasta: v?.hasta ?? null, prima: p?.total ?? null, prima_neta: p?.neta || null, valor: va, placa: pl, ...q, rc: o.rc ?? null, ptd: o.ptd ?? null, pth: o.pth ?? null, ppd: o.ppd ?? null, pph: o.pph ?? null, reemplazo: o.reemplazo ?? null, grua: o.grua ?? null, dudas };
}
