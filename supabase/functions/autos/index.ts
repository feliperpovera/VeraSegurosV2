// Cotizador de autos con la API de Agente Motor. La API Key vive solo aquí (secretos AGM_API_KEY y AGM_TENANT).
// Acciones (POST JSON desde veraseguros.com): ciudades, marcas, referencias, vehiculos, sms, cotizar, ofertas.
// Agente Motor llama a ?cb=<id>.<token> con cada oferta (policy_list) o error (error_message).
import { createClient } from "jsr:@supabase/supabase-js@2";
const ORIGENES = ["https://veraseguros.com", "https://www.veraseguros.com", "http://localhost:4173"];
const API = "https://apipro.agentemotor.com";
const SUPA = Deno.env.get("SUPABASE_URL")!;
const TENANT = Deno.env.get("AGM_TENANT") ?? "";
// Valor asegurado que el cliente web elige antes de cotizar: 5 o 10% por debajo de Fasecolda (máximo 10%, también en la base: auto_cotizacion_pct_max). El CRM va siempre al 100%.
const PCTS = [5, 10];
// Aseguradoras con el mismo nombre para comparar (HDI llega como Liberty, AXA como Colpatria).
const canon = (v: unknown) => norm(v).replace(/^liberty.*/, "hdi").replace(/.*colpatria.*|^axa.*/, "axa");
const CIAS = ["sura", "bolivar", "hdi", "allianz", "axa", "mapfre", "sbs", "zurich", "qualitas", "solidaria"];
const POR_IP_DIA = 3, TOPE_DIA = 40; // cada cotización cuesta ~$4.790: límite anti-abuso
const VIGENCIA_DIAS = 15; // las ofertas de Agentemotor valen 15 días: en ese plazo no se vuelve a pagar la misma cotización
// Rechazos de la aseguradora por el riesgo frente a fallas técnicas (caídas, tiempos): marca el motivo; ya no se reintenta para no pagar otra comparativa.
const NO_REINTENTAR = /pol[ií]tica|asegurable|no aplica|no v[aá]lid|rechaz|antig[uü]edad|valor|edad|zona|uso|cilindraj/i;
const db = createClient(SUPA, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

let tok = "", tokVence = 0;
// Cotizar exige el access_token de /authentication; la API Key sola solo abre las consultas (marcas, ciudades).
async function token() {
  if (tok && Date.now() < tokVence) return tok;
  const llave = (Deno.env.get("AGM_API_KEY") ?? "").trim(), usuario = (Deno.env.get("AGM_USER") ?? "info@veraseguros.com").trim();
  const r = await fetch(`${API}/app/co/customers/authentication`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: usuario, password: (Deno.env.get("AGM_PASS") ?? llave).trim(), tenant: TENANT }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) { console.error(`auth ${r.status} ${JSON.stringify(j).slice(0, 200)} user=${Deno.env.get("AGM_USER") ? "si" : "no"}/${usuario.length} pass=${Deno.env.get("AGM_PASS") ? "AGM_PASS" : "AGM_API_KEY"}/${llave.length}`); return llave; }
  tok = j.access_token; tokVence = Date.now() + 45 * 60_000; // ponytail: TTL fijo; leer expires_in si la API lo trae
  return tok;
}
async function agm(path: string, init: RequestInit = {}) {
  const r = await fetch(API + path, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${await token()}`, ...(init.headers ?? {}) } });
  const body = await r.json().catch(() => null);
  if (r.status >= 400) console.error(`agm ${path.split("?")[0]} ${r.status} ${JSON.stringify(body).slice(0, 200)} tenant=${TENANT}`);
  return { status: r.status, body };
}
// Verificación por SMS con Twilio Verify (secretos TWILIO_SID, TWILIO_TOKEN, TWILIO_VERIFY_SID). Sin secretos no se cotiza.
async function verify(path: string, form: Record<string, string>) {
  const r = await fetch(`https://verify.twilio.com/v2/Services/${(Deno.env.get("TWILIO_VERIFY_SID") ?? "").trim()}/${path}`, { method: "POST",
    headers: { authorization: "Basic " + btoa(`${(Deno.env.get("TWILIO_SID") ?? "").trim()}:${(Deno.env.get("TWILIO_TOKEN") ?? "").trim()}`), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form) });
  if (!r.ok) console.error(`twilio ${path} ${r.status} ${(await r.text()).slice(0, 300)} sid=${(Deno.env.get("TWILIO_SID") ?? "").trim().slice(0, 2)}/${(Deno.env.get("TWILIO_SID") ?? "").trim().length} token=${!!Deno.env.get("TWILIO_TOKEN")} verify=${(Deno.env.get("TWILIO_VERIFY_SID") ?? "").slice(0, 2)}`);
  return r.ok ? await r.json() : null;
}
const txt = (v: unknown, n = 80) => (typeof v === "string" ? v.trim().slice(0, n) : "");
// Empleado activo del CRM (sesión de Supabase Auth): cotiza sin SMS y sin límite por IP.
async function empleado(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data } = await db.auth.getUser(jwt);
  const email = data?.user?.email?.toLowerCase();
  if (!email) return null;
  const { data: e } = await db.from("empleado").select("email").eq("email", email).eq("activo", true).maybeSingle();
  return e?.email ?? null;
}
const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))), (b) => b.toString(16).padStart(2, "0")).join("");

// Nivel por coberturas (códigos iguales en todas las aseguradoras de Agentemotor):
// Premium = cubre pérdida parcial (DEBPPD); Esencial = cubre pérdida total (DEBPTD); Básica = solo responsabilidad civil.
const cubre = (v: unknown) => v != null && !/^\s*(no cubre|no|n\/a|)\s*$/i.test(String(v));
function nivel(cob: any[]) {
  const t = (tag: string) => cob.find((c) => c.coverage_tag === tag)?.description;
  return cubre(t("DEBPPD")) || cubre(t("DEBPPH")) ? "Premium" : cubre(t("DEBPTD")) || cubre(t("DEBPTH")) || cubre(t("PERTOT")) ? "Esencial" : "Básica";
}
// Nivel comercial de cada plan dentro de su aseguradora (los nombres de plan no cambian). Clave: "aseguradora|plan" normalizado.
// Planes que no estén aquí usan la regla por coberturas de nivel().
const PLANES: Record<string, string> = {
  "qualitas|qualitas - base": "Básica", "qualitas|qualitas - plus": "Esencial", "qualitas|qualitas - amplia": "Premium",
  "allianz|autos esencial": "Básica", "allianz|autos esencial + totales": "Esencial", "allianz|autos plus": "Premium",
  "liberty|ligero": "Básica", "liberty|integral": "Esencial", "liberty|premium": "Premium",
  "zurich|esencial": "Básica", "zurich|plus": "Esencial", "zurich|premium": "Premium",
  "bolivar|clasica": "Básica", "bolivar|standard": "Esencial", "bolivar|premium": "Premium",
  "solidaria|particular familiar plus": "Básica", "solidaria|particular familiar premium": "Esencial", "solidaria|particular familiar elite": "Premium",
  "sura|sura - clasico": "Esencial", "sura|sura - global": "Premium",
  "mapfre|super trebol": "Premium", "mapfre|para la mujer": "Premium",
  "colpatria|au plus nuevo": "Premium", "sbs|full": "Premium",
};
const norm = (v: unknown) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
// Solo lo que la página necesita mostrar de cada oferta.
function oferta(d: any) {
  const p = d?.products?.[0] ?? {}, cob = p.coverages ?? [];
  return { id: d?.id_db ?? null, aseguradora: p.manufacturer ?? "", plan: p.name ?? "", logo: p.logo ?? "", precio: d?.total_price ?? p.price ?? null,
    nivel: PLANES[`${norm(p.manufacturer)}|${norm(p.name)}`] ?? nivel(cob),
    cuotas: d?.financing_installments ?? "", pdf: d?.document_reference?.url ?? "", recomendada: d?.view_status === "Recomendado",
    coberturas: cob.filter((c: any) => (c.coverage ?? c.description_tag) && !c.is_product_tag && !/^PRODUCT_NAME/.test(c.coverage_tag ?? "") && !/^https?:/.test(String(c.description)))
      .map((c: any) => ({ tag: c.coverage_tag, grupo: c.group, cobertura: c.coverage ?? c.description_tag, valor: c.description }))
      // Valor que asegura de verdad cada aseguradora: Agentemotor aplica el límite de cada una.
      .concat(Number(d?.amount_quoted) > 0 ? [{ tag: "VALASE", grupo: "Valor", cobertura: "Valor asegurado del vehículo", valor: peso(Number(d.amount_quoted)) }] : []) };
}

async function callback(req: Request, cb: string) {
  const [id, t] = cb.split(".");
  const { data: c } = await db.from("auto_cotizacion").select("id,token").eq("id", id).maybeSingle();
  if (!c || c.token !== t) return new Response("no", { status: 403 });
  const b = await req.json().catch(() => null);
  if (b?.event_name === "policy_list") {
    // La guía muestra data como lista, pero puede llegar como texto JSON o envuelta en { policy_list: [...] }.
    let d = b.data;
    if (typeof d === "string") try { d = JSON.parse(d); } catch { /* queda texto */ }
    if (d?.policy_list) d = d.policy_list;
    const lista = (Array.isArray(d) ? d : [d]).map((x: any) => x?.products ? x : x?.data?.products ? x.data : x?.policy ?? x?.offer ?? x) // real: [{ name: "update-policy", data: {...} }]
      .filter((x: any) => x && typeof x === "object" && x.view_status !== "Invisible");
    const filas = lista.map((x: any) => ({ cotizacion_id: id, evento: "oferta", data: oferta(x) })).filter((f: any) => f.data.aseguradora);
    if (filas.length) await db.from("auto_oferta").insert(filas);
    else console.error(`callback sin ofertas legibles ${JSON.stringify(b).slice(0, 600)}`);
  } else if (b?.event_name === "error_message") {
    const e = b.data?.error ?? {};
    const motivo = `${e.status ?? ""} ${e.message ?? ""}`;
    await db.from("auto_oferta").insert({ cotizacion_id: id, evento: "error", data: { aseguradora: e.insurer ?? "", estado: e.status ?? "", mensaje: String(e.message ?? "").slice(0, 200),
      tecnico: !NO_REINTENTAR.test(motivo) } });
  }
  return new Response("ok");
}

function cuerpo(id: string, t: string, d: any) {
  const vehicle: any = d.ceroKm || !d.placa
    ? { plate: "", model: d.modelo, codification: { code: d.fasecolda }, vehicle_risk: { in_agency: d.ceroKm } }
    : d.fasecolda && d.modelo ? { plate: d.placa, model: d.modelo, force: "code", codification: { code: d.fasecolda } } // placa sin datos en Agentemotor
    : { plate: d.placa };
  if (d.valor) vehicle.vehicle_risk = { in_agency: false, commercial_price: d.valor }; // valor que eligió el cliente
  if (d.factura) vehicle.vehicle_risk = { in_agency: true, commercial_price: d.factura }; // 0 km: se cotiza y se expide por el valor de la factura
  const utm = d.utm ?? {}, e = d.empresa;
  // Agentemotor nunca recibe el correo del cliente: le mandaba solo una «bienvenida» con planes por kilómetro. Al cliente le escriben únicamente autos y autos-renovacion.
  const contacto = [{ contact_tag: "principal", contact_info: { email: "comunicaciones@veraseguros.com", phone: d.tel, ubication: { ...(e?.direccion ? { address_line1: e.direccion } : {}), place: { city_code: d.ciudad, country_code: "170" } } } }];
  const persona = (x: any) => ({ identification_type: "CC", identification_number: x.doc, firstname: x.nombre, lastname: x.apellido, gender: d.genero, birht_date: d.nac, contact_data: contacto });
  // Persona jurídica: la empresa es el asegurado (NIT con dígito de verificación) y el representante legal va como conductor (lo exige Agentemotor).
  const parties = e ? [{ party_rol: "Asegurado", party_type: "organization", organization: { name: e.razon, identification_type: "NIT", identification_number: e.nit + e.dv, contact_data: contacto } },
    { party_rol: "Conductor", party_type: "person", person: persona(e.rep) }] : [{ party_rol: "Asegurado", party_type: "person", person: persona(d) }];
  return { name: "event-create-quote",
    tenant_data: { name: TENANT, campaign: { campaign: txt(utm.campaign) || "web", medium: txt(utm.medium) || "cotizador", source: txt(utm.source) || "veraseguros.com" } },
    callback: { url_callback: `${SUPA}/functions/v1/autos?cb=${id}.${t}`, callback_param: id },
    data: { business_line: "vehiculos", insurable_objects: [{ type: "vehicle", vehicle }],
      parties,
      ubication: { place: { city_code: d.ciudad, country_code: "170" } } } };
}

// Versiones de una referencia con su valor Fasecolda (consulta sin costo).
async function versiones(marca: unknown, modelo: unknown, ref: unknown, ceroKm: boolean) {
  const r = await agm(`/seguros/co/vehicles/consultar/vehiculos-por-caracteristica?marca=${encodeURIComponent(txt(marca))}&modelo=${Number(modelo) || 0}&ref=${encodeURIComponent(txt(ref))}&ceroKm=${ceroKm}`);
  return (Array.isArray(r.body) ? r.body : []).map((x: any) => { const v = x?.data?.vehicle ?? {}; return { fasecolda: v.codification?.code, linea: v.line, valor: v.vehicle_risk?.commercial_price }; });
}
// Textos para que nunca quede duda de que la cotización va por debajo del valor Fasecolda.
const vaDe = (o: any) => (o?.coberturas ?? []).find((x: any) => x.tag === "VALASE")?.valor ?? "";
const marcaMenor = (d: any) => (d?.valor ? "[DEBAJO DE FASECOLDA] " : "");
const vehTxt = (d: any) => (d.placa ? "tu vehículo de placa " + d.placa : "tu vehículo 0 km") + (d.valor ? `, asegurado por ${peso(d.valor)}: ${d.pct}% por debajo del valor Fasecolda (${peso(d.guia)})` : "");
const avisoMenor = (d: any) => d?.valor ? `<p style="font-size:15px;line-height:1.5;background:#fff8e1;color:#5c4400;padding:12px 14px;border-radius:10px"><b>Estos precios NO son al 100% Fasecolda.</b> Pediste asegurar tu vehículo por <b>${peso(d.valor)}</b>, ${d.pct}% por debajo del valor Fasecolda (<b>${peso(d.guia)}</b>). En pérdida total o hurto recibirías como máximo el valor que asegura cada oferta, menos el deducible. Algunas aseguradoras pagan los daños parciales en proporción y otras no aceptan un valor menor.</p>` : "";

// Dígito de verificación del NIT (DIAN).
function digitoNit(nit: string) {
  const s = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71].reduce((a, p, i) => a + p * Number(nit[nit.length - 1 - i] ?? 0), 0) % 11;
  return String(s > 1 ? 11 - s : s);
}
const TAGS_REN: Record<string, string> = { RESEXT: "Responsabilidad civil", DEBPTD: "Pérdida total por daño", DEBPTH: "Pérdida total por hurto", DEBPPD: "Daños parciales", DEBPPH: "Hurto parcial", VEHRPT: "Vehículo de reemplazo", SERGRU: "Grúa" };
const CUOTAS: Record<string, number> = { anual: 1, semestral: 2, trimestral: 4, mensual: 12 };
function renovacionDe(x: any) {
  // prima = total del año (para comparar); cuota = lo que aparece en la carátula cuando se paga por periodos.
  const periodo = CUOTAS[x.periodo] ? x.periodo : "anual", cuotas = periodo === "anual" ? 1 : Math.min(12, Math.max(2, Math.round(Number(x.cuotas) || CUOTAS[periodo]))), cuota = Math.round(Number(x.prima) || 0);
  const n = (v: unknown) => Math.round(Number(v) || 0), ren = { aseguradora: txt(x.aseguradora, 40), plan: txt(x.plan, 60), numero: txt(x.numero, 40), vence: /^\d{4}-\d{2}-\d{2}$/.test(x.vence) ? x.vence : "", prima: cuota * cuotas, periodo, cuota, cuotas, valor: n(x.valor),
    pdf: /^renovaciones\/[\w-]+\.pdf$/.test(x.pdf ?? "") ? x.pdf : "", cob: Object.fromEntries(Object.keys(TAGS_REN).map((k) => [k, txt(x.cob?.[k], 80)]).filter(([, v]) => v)) };
  return ren.aseguradora && ren.prima >= 50_000 && ren.prima < 200_000_000 ? ren : null;
}
const ofertaRenovacion = (x: any) => ({ id: null, aseguradora: x.aseguradora, plan: `Renovación${x.plan ? " · " + x.plan : ""}`, logo: "", precio: x.prima, nivel: "Renovación", renovacion: true, periodo: x.periodo ?? "anual", cuota: x.cuota ?? x.prima, cuotas: x.periodo && x.periodo !== "anual" ? `${x.cuotas} cuotas de ${peso(x.cuota)}` : "", pdf: "", recomendada: false,
  coberturas: [...Object.entries(x.cob).map(([tag, valor]) => ({ tag, grupo: "Renovación", cobertura: TAGS_REN[tag], valor })), ...(x.valor ? [{ tag: "VALASE", grupo: "Valor", cobertura: "Valor asegurado del vehículo", valor: peso(x.valor) }] : [])] });
// A quién se saluda: en persona jurídica, al representante legal.
const saludo = (d: any) => String(d.empresa?.rep?.nombre || d.nombre || "");

async function cotizar(b: any, ip: string, emp: string | null) {
  const placa = txt(b.placa, 7).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const fasecolda = txt(b.fasecolda, 10).replace(/\D/g, ""), modelo = Number(b.modelo) || 0;
  const doc = txt(b.empresa ? b.empresa.nit : b.cedula, 12).replace(/\D/g, ""), ciudad = txt(b.ciudad, 6).replace(/\D/g, "");
  const nac = /^\d{4}-\d{2}-\d{2}$/.test(b.nacimiento) ? b.nacimiento : "";
  const genero = b.genero === "F" ? "F" : "M";
  const nombre = txt(b.empresa ? b.empresa.razon : b.nombre, b.empresa ? 100 : 60), apellido = b.empresa ? "" : txt(b.apellido, 60), email = txt(b.email, 120), tel = txt(b.telefono, 15).replace(/\D/g, "");
  const ceroKm = !!b.ceroKm;
  // Persona jurídica: nombre = razón social y doc = NIT (sin dígito), para que el CRM la una con la empresa.
  let empresa: any = null;
  if (b.empresa) {
    const x = b.empresa, nit = txt(x.nit, 12).replace(/\D/g, ""), rep = { nombre: txt(x.rep?.nombre, 60), apellido: txt(x.rep?.apellido, 60), doc: txt(x.rep?.doc, 12).replace(/\D/g, "") };
    empresa = { razon: txt(x.razon, 100), nit, dv: digitoNit(nit), direccion: txt(x.direccion, 120), rep };
    if (!/^\d{9}$/.test(nit) || empresa.razon.length < 3 || !rep.nombre || !rep.apellido || rep.doc.length < 5) return { status: 400, body: { ok: false, error: "empresa" } };
  }
  // 0 km: valor de la factura obligatorio, es el valor con el que las aseguradoras expiden.
  const factura = ceroKm ? Math.round(Number(b.factura) || 0) : 0;
  if (ceroKm && !(factura >= 1_000_000 && factura <= 3_000_000_000)) return { status: 400, body: { ok: false, error: "factura" } };
  // Renovación (solo CRM): la oferta de la carátula entra al comparativo y se quitan compañías.
  const ren = emp && b.renovacion ? renovacionDe(b.renovacion) : null;
  if (emp && b.renovacion && !ren) return { status: 400, body: { ok: false, error: "renovacion" } };
  const excluir = emp && Array.isArray(b.excluir) ? b.excluir.map(canon).filter((x: string) => CIAS.includes(x)) : [];
  if (email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) return { status: 200, body: { ok: false, error: "correo" } }; // Agentemotor lo rechaza
  if ((!placa && !(fasecolda && modelo)) || doc.length < 5 || !ciudad || !nac || !nombre || (!apellido && !b.empresa) || tel.length < 10 || !b.acepta)
    return { status: 400, body: { ok: false, error: "datos" } };

  const pct = emp ? 0 : Number(b.menor?.pct) || 0;
  if (pct && (!PCTS.includes(pct) || b.menor.acepta !== true || ceroKm || !placa || !fasecolda || !modelo)) return { status: 400, body: { ok: false, error: "datos" } };

  let previo: any = null;
  if (b.completar?.id && fasecolda && modelo) {
    const { data } = await db.from("auto_cotizacion").select("id,token,estado,creado,datos").eq("id", txt(b.completar.id, 40)).maybeSingle();
    if (data && data.token === b.completar.t && data.estado === "rechazada" && data.datos?.tel === tel && Date.now() - Date.parse(data.creado) < 72 * 3_600_000) previo = data; // 72 h: también desde el enlace del correo
  }
  const codigo = txt(b.codigo, 8).replace(/\D/g, "");
  if (!previo && !emp && (!codigo || (await verify("VerificationCheck", { To: "+57" + tel, Code: codigo }))?.status !== "approved"))
    return { status: 200, body: { ok: false, error: "codigo" } };

  // El valor Fasecolda lo consulta el servidor (consulta sin costo), no se confía en el del navegador.
  let guia = 0, valor = 0;
  if (pct) {
    guia = Number((await versiones(b.menor.marca, modelo, b.menor.ref, false)).find((x: any) => String(x.fasecolda) === fasecolda)?.valor) || 0;
    if (!guia) return { status: 200, body: { ok: false, error: "fasecolda" } };
    valor = Math.round(guia * (1 - pct / 100) / 100_000) * 100_000;
  }

  // Misma persona (cédula y celular ya verificado), mismo vehículo, ciudad y valor asegurado: se muestra la cotización vigente sin llamar a Agentemotor.
  let q = db.from("auto_cotizacion").select("id,token,creado").eq("estado", "aceptada").eq("datos->>doc", doc).eq("datos->>tel", tel).eq("datos->>ciudad", ciudad)
    .gte("creado", new Date(Date.now() - VIGENCIA_DIAS * 86_400_000).toISOString());
  q = valor ? q.eq("datos->>valor", String(valor)) : q.is("datos->>valor", null);
  q = factura ? q.eq("datos->>factura", String(factura)) : q.is("datos->>factura", null);
  q = ren ? q.eq("datos->renovacion->>prima", String(ren.prima)).eq("datos->renovacion->>aseguradora", ren.aseguradora) : q.is("datos->renovacion", null);
  q = placa ? q.eq("datos->>placa", placa) : q.eq("datos->>fasecolda", fasecolda).eq("datos->>modelo", String(modelo));
  const { data: vigente } = await q.order("creado", { ascending: false }).limit(1).maybeSingle();
  if (vigente) {
    const { count: ofertas } = await db.from("auto_oferta").select("id", { count: "exact", head: true }).eq("cotizacion_id", vigente.id).eq("evento", "oferta");
    if (ofertas || Date.now() - Date.parse(vigente.creado) < 10 * 60_000) { // sin ofertas aún: pueden seguir llegando los primeros minutos
      if (previo) await db.from("auto_cotizacion").update({ estado: "completada" }).eq("id", previo.id);
      return { status: 200, body: { ok: true, id: vigente.id, t: vigente.token, reusada: true } };
    }
  }

  const ip_hash = await sha(ip + new Date().toISOString().slice(0, 10));
  const hoy = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: mias }, { count: total }] = await Promise.all([
    db.from("auto_cotizacion").select("id", { count: "exact", head: true }).eq("ip_hash", ip_hash).eq("estado", "aceptada").gte("creado", hoy),
    db.from("auto_cotizacion").select("id", { count: "exact", head: true }).eq("estado", "aceptada").gte("creado", hoy)]);
  if ((!emp && (mias ?? 0) >= POR_IP_DIA) || (total ?? 0) >= TOPE_DIA) return { status: 429, body: { ok: false, error: "limite" } };

  const guia0 = factura && b.marca ? Number((await versiones(b.marca, modelo, b.ref, true).catch(() => [])).find((x: any) => String(x.fasecolda) === fasecolda)?.valor) || 0 : 0; // solo para comparar
  const quien = emp ? (await db.from("empleado").select("nombre").eq("email", emp).maybeSingle()).data?.nombre ?? emp : null;
  const datos = { placa, fasecolda, modelo, ceroKm, doc, ciudad, nac, genero, nombre, apellido, email, tel, utm: emp ? { source: "crm", medium: "asesor" } : b.utm ?? null,
    ...(empresa ? { empresa } : {}), ...(factura ? { factura, guia0 } : {}), ...(ren ? { renovacion: ren } : {}), ...(excluir.length ? { excluir } : {}),
    ...(valor ? { guia, valor, pct, consentimiento: { fecha: new Date().toISOString(), version: "2026-11-24" } } : {}), ...(emp ? { empleado: emp, empleado_nombre: quien } : {}) };
  const t = crypto.randomUUID().replace(/-/g, "");
  const { data: c, error } = await db.from("auto_cotizacion").insert({ token: t, ip_hash, datos }).select("id").single();
  if (error) return { status: 500, body: { ok: false } };

  if (ren) await db.from("auto_oferta").insert({ cotizacion_id: c.id, evento: "oferta", data: ofertaRenovacion(ren) });
  const r = await agm("/app/co/customers/quotation", { method: "POST", body: JSON.stringify(cuerpo(c.id, t, datos)) });
  const ok = r.status === 200;
  await db.from("auto_cotizacion").update({ estado: ok ? "aceptada" : "rechazada", opp_id: r.body?.opp_id ? String(r.body.opp_id) : null, respuesta: r.body,
    pdf_url: r.body?.url_pdf_comparativo ?? null }).eq("id", c.id);
  if (previo && ok) await db.from("auto_cotizacion").update({ estado: "completada" }).eq("id", previo.id); // ya no cuenta como intento abierto
  const msg = String(r.body?.message ?? "");
  // Un solo correo al equipo por cotización: si Agentemotor la rechaza, ya; si no, cuando llegan las ofertas finales (tareas, 12 min).
  if (!ok && !ren) await correo(EQUIPO, `${marcaCrm(datos)}${marcaMenor(datos)}Cotización autos RECHAZADA: ${nombre} ${apellido} · ${placa || "0 km"} · ${msg.slice(0, 70)}`,
    htmlInterno({ id: c.id, token: t, datos, estado: "rechazada", opp_id: null, creado: new Date().toISOString(), pdf_url: null }, [], [])).catch(() => false);
  if (!ok) return { status: 200, body: { ok: false, id: c.id, t, error: /p[uú]blico/i.test(msg) ? "publico" : /placa no encontrada/i.test(msg) || (r.status === 400 && !fasecolda) ? "placa" : "servicio" } };
  return { status: 200, body: { ok: true, id: c.id, t } };
}

// Alertas internas de autos (web y WhatsApp): a info@, comercial@ y feliperestrepo@ (secreto CORREO_INTERNO).
const EQUIPO = (Deno.env.get("CORREO_INTERNO") ?? "info@veraseguros.com,comercial@veraseguros.com,feliperestrepo@veraseguros.com").split(",");
// Enlaces de correo y WhatsApp: UTM para verlos como canal propio en Analytics.
const utm = (canal: string, campana: string) => `utm_source=${canal}&utm_medium=${canal === "correo" ? "email" : "whatsapp"}&utm_campaign=${campana}`;
const peso = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
// pdf: url_pdf_comparativo_b64 de Agentemotor (JSON { pdfBase64 }); se adjunta el PDF. Si falla, el correo sale sin adjunto.
async function correo(para: string | string[], asunto: string, html: string, pdf?: string | null, extra: { filename: string; content: string }[] = []) {
  const llave = Deno.env.get("RESEND_API_KEY");
  if (!llave) return false; // sin proveedor de correo configurado: no se marca como enviado
  let adjunto = "";
  if (pdf) try { adjunto = (await (await fetch(pdf, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(25_000) })).json())?.pdfBase64 ?? ""; } catch (e) { console.error(`pdf ${e}`); }
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${llave}`, "content-type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("CORREO_DE") ?? "Vera Seguros <cotizaciones@veraseguros.com>", reply_to: "info@veraseguros.com", to: [para].flat(), subject: asunto, html,
      ...(adjunto || extra.length ? { attachments: [...(adjunto ? [{ filename: "Comparativo seguro todo riesgo - Vera Seguros.pdf", content: adjunto }] : []), ...extra] } : {}) }) });
  if (!r.ok) console.error(`correo ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.ok;
}
function htmlSeguimiento(c: any, ofertas: any[], horas: number) {
  const d = c.datos, vehiculo = d.placa || "tu vehículo 0 km";
  const top = destacadas(ofertas.filter((o) => o.precio && !POR_KM.test(o.plan)).sort((a, b) => a.precio - b.precio));
  const u = utm("correo", `autos_ofertas_${horas}h`), ver = `https://veraseguros.com/seguros/auto/?ver=${c.id}.${c.token}&${u}#cotizador`, expedir = `https://veraseguros.com/seguros/auto/?ver=${c.id}.${c.token}&exp=vera&${u}#cotizador`;
  const wa = "https://wa.me/573156705627?text=" + encodeURIComponent(`Hola Vera Seguros, soy ${d.nombre} ${d.apellido}. Quiero el seguro todo riesgo para la placa ${d.placa || "(vehículo 0 km)"}${d.valor ? ` por debajo del valor Fasecolda (${peso(d.valor)})` : ""}.${c.opp_id ? " Ref. " + c.opp_id : ""}`);
  const filas = top.map((o) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e3e8">${esc(o.aseguradora)} · ${esc(o.plan)}${d.valor ? `<br><span style="font-size:13px;color:#5c4400">Asegura ${esc(vaDe(o) || "un valor por confirmar")}</span>` : ""}</td><td style="padding:10px 0;border-bottom:1px solid #e2e3e8;text-align:right;font-weight:700;color:#203152">${peso(o.precio)}</td></tr>`).join("");
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1d2433">
  <img src="https://veraseguros.com/assets/logo-vera-wordmark.png" alt="Vera Seguros" width="120" style="margin:16px 0">
  <h1 style="font-size:22px;color:#203152;margin:0 0 8px">${esc(saludo(d))}, ${horas === 0 ? "tus ofertas están listas" : "no pierdas esta oportunidad"}</h1>
  <p style="font-size:15px;line-height:1.5;color:#4b5263">${horas === 0 ? `Estas son las mejores ofertas del seguro todo riesgo para ${esc(vehiculo)}:` : `Tus precios para ${esc(vehiculo)} todavía están disponibles. Asegura tu vehículo hoy en línea, o un asesor te ayuda a elegir sin costo:`}</p>${avisoMenor(d)}
  ${filas ? `<table style="width:100%;border-collapse:collapse;font-size:15px">${filas}</table>` : ""}
  <p style="margin:24px 0 10px"><a href="${expedir}" style="background:#25D366;color:#0b2217;padding:14px 24px;border-radius:980px;text-decoration:none;font-weight:700;display:inline-block">Expedir mi póliza en línea</a></p>
  <p style="font-size:13px;color:#646a78;margin:0 0 18px">Llenas tus datos y subes la foto de ${d.placa ? "la tarjeta de propiedad" : "la factura de compra"} y la cédula. Toma unos 5 minutos.</p>
  <p style="font-size:14px"><a href="${ver}" style="color:#2d4777">Ver todas mis ofertas</a> &nbsp;·&nbsp; <a href="${wa}" style="color:#2d4777">Hablar con un asesor</a></p>
  <p style="font-size:12px;color:#646a78;line-height:1.5;margin-top:28px">Recibes este correo porque ${delCrm(d) ? "un asesor de Vera Seguros cotizó tu seguro contigo" : "cotizaste en veraseguros.com"} y autorizaste el contacto sobre tu cotización. Precios sujetos a inspección y aceptación de cada aseguradora. Vera Asesores Ltda., NIT 901.039.892-0, Medellín. Para no recibir más correos responde "no más".</p></div>`;
}
// Cotización hecha por el equipo en el cotizador del CRM: no es un cliente nuevo de la web.
const delCrm = (d: any) => d?.utm?.source === "crm";
const marcaCrm = (d: any) => (delCrm(d) ? "[Desde el CRM] " : "");
const avisoCrm = (d: any) => delCrm(d) ? `<p style="font-size:14px;background:#e6ebf4;color:#203152;padding:10px 12px;border-radius:8px;margin:0 0 14px">Cotizada desde el CRM${d.empleado_nombre || d.empleado ? " por " + esc(d.empleado_nombre || d.empleado) : ""}. No es un cliente nuevo de la web: el equipo de autos la está gestionando en el aplicativo.</p>` : "";
// Aviso interno a info@ con los datos del cliente y todas sus ofertas, para hacerle seguimiento.
function htmlInterno(c: any, ofertas: any[], fallas: any[]) {
  const d = c.datos ?? {}, fila = (k: string, v: unknown) => `<tr><td style="padding:4px 12px 4px 0;color:#646a78">${k}</td><td style="padding:4px 0">${esc(v || "—")}</td></tr>`;
  const premium = ofertas.find((o) => o.nivel === "Premium"); // ofertas va de barata a cara: la Premium de mejor precio
  const wa = `https://wa.me/57${d.tel}?text=` + encodeURIComponent(`Hola ${saludo(d)}, te escribo de Vera Seguros por la cotización de tu seguro todo riesgo${d.placa ? " para la placa " + d.placa : ""}${d.valor ? `, asegurado por ${peso(d.valor)}, por debajo del valor Fasecolda (${peso(d.guia)})` : ""}.${premium ? ` La mejor opción Premium en precio es ${lineaVera(premium)} al año.` : ""} Aquí está tu comparativo en PDF: ${pdfVera(c)}${premium ? " ¿Te ayudo a expedirla?" : ""}`);
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:620px;color:#1d2433">
  <h2 style="color:#203152;margin:0 0 12px">${delCrm(d) ? "Cotización de autos desde el CRM" : "Nueva cotización de autos"}: ${esc(d.nombre)} ${esc(d.apellido)}</h2>${avisoCrm(d)}
  <table style="font-size:14px;border-collapse:collapse">${fila("Celular", d.tel)}${fila("Correo", d.email)}${d.empresa ? fila("Empresa", `${d.empresa.razon} · NIT ${d.empresa.nit}-${d.empresa.dv}`) + fila("Representante legal", `${d.empresa.rep.nombre} ${d.empresa.rep.apellido} · C.C. ${d.empresa.rep.doc}`) + (d.empresa.direccion ? fila("Dirección", d.empresa.direccion) : "") : fila("Cédula", d.doc)}${fila("Nacimiento", d.nac)}${fila("Género", d.genero)}${fila("Ciudad (código)", d.ciudad)}${fila("Vehículo", [d.placa ? "Placa " + d.placa : "0 km", c.veh?.brand ? `${c.veh.brand} ${c.veh.line ?? ""} · ${c.veh.model ?? ""}` : d.modelo ? "modelo " + d.modelo : ""].filter(Boolean).join(" · "))}${fila("Fasecolda", c.veh?.codification?.code ?? d.fasecolda)}${d.factura ? fila("Valor factura (cotizado)", peso(d.factura)) + fila("Valor Fasecolda 0 km", d.guia0 ? peso(d.guia0) : "") : d.valor ? fila("Valor Fasecolda", peso(d.guia)) + fila("Valor pedido", `${peso(d.valor)} (${d.pct}% por debajo de Fasecolda; el cliente aceptó)`) : fila("Valor asegurado", c.veh?.vehicle_risk?.commercial_price ? peso(c.veh.vehicle_risk.commercial_price) : "")}${fila("Estado", c.estado)}${fila("Ref. Agente Motor", c.opp_id)}${fila("Fecha", new Date(c.creado).toLocaleString("es-CO", { timeZone: "America/Bogota" }))}${fila("Origen", d.utm ? [d.utm.source, d.utm.medium, d.utm.campaign].filter(Boolean).join(" / ") : "")}</table>
  <h3 style="color:#203152;margin:20px 0 8px">Ofertas (${ofertas.length})</h3>
  ${ofertas.length ? `<table style="width:100%;font-size:14px;border-collapse:collapse">${ofertas.map((o) => `<tr><td style="padding:6px 0;border-bottom:1px solid #e2e3e8">${esc(o.aseguradora)} · ${esc(o.plan)}${o.nivel ? ` <span style="color:#646a78">(${esc(o.nivel)})</span>` : ""}${d.valor || d.factura ? ` · asegura ${esc(vaDe(o) || "por confirmar")}` : ""}</td><td style="padding:6px 0;border-bottom:1px solid #e2e3e8;text-align:right;font-weight:700">${peso(o.precio)}</td></tr>`).join("")}</table>` : "<p>Sin ofertas.</p>"}
  ${fallas.length ? `<p style="font-size:13px;color:#646a78">No cotizaron: ${fallas.map((f) => esc(`${f.aseguradora} (${f.estado || f.mensaje})`)).join(", ")}</p>` : ""}
  <p style="margin:20px 0"><a href="${wa}" style="background:#25D366;color:#0b2217;padding:10px 18px;border-radius:980px;text-decoration:none;font-weight:600">Escribirle por WhatsApp</a>
  &nbsp; <a href="https://veraseguros.com/cotizador-de-autos/?wz=${c.id}.${c.token}" style="background:#203152;color:#fff;padding:10px 18px;border-radius:980px;text-decoration:none;font-weight:600">Enviar por Woztell</a></p>
  <p style="margin:0 0 20px"><a href="${pdfVera(c)}" style="color:#2d4777">Comparativo PDF Vera</a> &nbsp; <a href="https://veraseguros.com/seguros/auto/?ver=${c.id}.${c.token}#cotizador" style="color:#2d4777">Ver sus ofertas</a>${c.pdf_url ? ` &nbsp; <a href="${esc(c.pdf_url)}" style="color:#2d4777">PDF comparativo</a>` : ""}</p></div>`;
}
// Aviso interno de una solicitud hecha en el cotizador de WhatsApp (bot de Woztell): solo datos, sin ofertas.
// Lo mismo que pide el cotizador web, para que el vendedor reciba el chat listo para cotizar.
// Campos del bot: tipo (persona|empresa), nit, razon, rep_nombre, rep_apellido, rep_cedula, nombres, apellidos, cedula, nac, genero,
// ciudad, correo, placa | ceroKm + marca, modelo (año), referencia, factura, autoriza. Sin valor frente a Fasecolda: eso es solo de la web (se cotiza al 100%).
function faltanWa(d: any) {
  const emp = /empresa|nit/i.test(d.tipo ?? "") || !!d.nit, f: string[] = [];
  const pide = (ok: unknown, n: string) => { if (!ok) f.push(n); };
  if (emp) { pide(/^\d{6,12}$/.test(String(d.nit ?? "").replace(/\D/g, "")), "NIT"); pide(d.razon, "razón social"); pide(d.rep_nombre && d.rep_apellido, "nombre del representante legal"); pide(d.rep_cedula, "cédula del representante"); }
  else { pide(d.nombres || d.nombre, "nombres"); pide(d.apellidos || d.apellido, "apellidos"); pide(d.cedula, "cédula"); pide(d.nac, "fecha de nacimiento"); pide(d.genero, "género"); }
  pide(d.ciudad, "ciudad donde circula"); pide(d.correo, "correo");
  if (d.placa) pide(/^[A-Z]{3}\d{2}[A-Z0-9]$/i.test(String(d.placa).replace(/\W/g, "")), "placa válida");
  else { pide(d.marca, "marca"); pide(d.modelo, "año"); pide(d.referencia, "referencia y versión"); pide(Number(String(d.factura ?? "").replace(/\D/g, "")) >= 5_000_000, "valor de la factura"); }
  pide(d.autoriza, "autorización de datos"); // el valor frente a Fasecolda solo se elige en la web
  return f;
}
function htmlLeadWa(d: any) {
  const fila = (k: string, v: unknown) => `<tr><td style="padding:4px 12px 4px 0;color:#646a78">${k}</td><td style="padding:4px 0">${esc(v || "—")}</td></tr>`;
  const tel = String(d.cel || d.wa || "").replace(/\D/g, "").replace(/^57/, "");
  const nombre = d.razon || d.nombre || [d.nombres, d.apellidos].filter(Boolean).join(" ");
  const emp = /empresa|nit/i.test(d.tipo ?? "") || !!d.nit, faltan = faltanWa(d), pct = Number(d.valor_pct) || 0;
  const veh = d.placa ? `Placa ${d.placa}` : `0 km · ${[d.marca, d.modelo, d.referencia].filter(Boolean).join(" ")}${d.factura ? " · factura " + peso(Number(String(d.factura).replace(/\D/g, ""))) : ""}`;
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:620px;color:#1d2433">
  <h2 style="color:#203152;margin:0 0 12px">${d.parcial ? "Cotización PARCIAL" : "Cotizar auto"} (WhatsApp): ${esc(nombre || "sin nombre")}</h2>
  <p style="font-size:14px;padding:10px 12px;border-radius:8px;margin:0 0 14px;${faltan.length ? "background:#fff4d6;color:#5c4400\">Falta: " + esc(faltan.join(", ")) : "background:#e3f6ea;color:#0b5b2a\">Datos completos: lista para cotizar"}</p>
  <table style="font-size:14px;border-collapse:collapse">${emp ? fila("Empresa", d.razon) + fila("NIT", d.nit) + fila("Representante", [d.rep_nombre, d.rep_apellido].filter(Boolean).join(" ")) + fila("Cédula representante", d.rep_cedula) : fila("Nombres", d.nombres || d.nombre) + fila("Apellidos", d.apellidos || d.apellido) + fila("Cédula", d.cedula) + fila("Nacimiento", d.nac) + fila("Género", d.genero)}
  ${fila("Celular", tel)}${fila("Correo", d.correo)}${fila("Ciudad donde circula", d.ciudad)}${fila("Vehículo", veh)}${fila("Valor a asegurar", pct ? (pct >= 100 ? "100% Fasecolda" : `${100 - pct}% por debajo de Fasecolda`) : "")}${fila("Autorizó datos", d.autoriza ? "Sí" : "")}${fila("Fecha", new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }))}</table>
  <p style="font-size:14px">${d.parcial ? "El cliente empezó el cotizador de WhatsApp y dejó de responder hace 8 minutos. Estos son los datos que alcanzó a dar: conviene escribirle para terminar." : "El chat quedó asignado a comercial@ en Woztell. Falta cotizarlo en Agente Motor y enviarle las ofertas."}</p>
  ${tel ? `<p style="margin:20px 0"><a href="https://wa.me/57${tel}" style="background:#25D366;color:#0b2217;padding:10px 18px;border-radius:980px;text-decoration:none;font-weight:600">Escribirle por WhatsApp</a></p>` : ""}</div>`;
}
// Aviso interno de un lead de Salud (Estrategia Digital) en WhatsApp: el bot manda los campos ya armados.
function htmlLeadEd(d: any) {
  const campos = Object.entries(d.campos ?? {}).slice(0, 20);
  const tel = String(d.wa || "").replace(/\D/g, "");
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:620px;color:#1d2433">
  <h2 style="color:#203152;margin:0 0 12px">Salud ED (WhatsApp): ${esc(d.evento)} · ${esc(d.nombre || "sin nombre")}</h2>
  <table style="font-size:14px;border-collapse:collapse">${campos.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#646a78">${esc(k)}</td><td style="padding:4px 0">${esc(v || "—")}</td></tr>`).join("")}</table>
  ${tel ? `<p style="margin:20px 0"><a href="https://wa.me/${tel}" style="background:#25D366;color:#0b2217;padding:10px 18px;border-radius:980px;text-decoration:none;font-weight:600">Escribirle por WhatsApp</a></p>` : ""}</div>`;
}
// Ofertas sin repetir (el reintento puede duplicarlas), de la más barata a la más cara. Sin planes por kilómetro.
const POR_KM = /kil[oó]metr|por\s*km/i;
// Compañías quitadas del comparativo de una renovación (la carátula de la renovación siempre queda).
const quitada = (excluir: any) => (o: any) => !o.renovacion && Array.isArray(excluir) && excluir.includes(canon(o.aseguradora));
async function ofertasUnicas(id: string) {
  const [{ data: o }, { data: c }] = await Promise.all([db.from("auto_oferta").select("data").eq("cotizacion_id", id).eq("evento", "oferta"), db.from("auto_cotizacion").select("excluir:datos->excluir").eq("id", id).maybeSingle()]);
  const m = new Map<string, any>(), fuera = quitada(c?.excluir);
  for (const x of o ?? []) if (!fuera(x.data)) m.set(`${x.data.aseguradora}|${x.data.plan}`, x.data);
  return [...m.values()].filter((x) => x.precio && !POR_KM.test(x.plan)).sort((a, b) => a.precio - b.precio);
}
// Las 3 que van en el WhatsApp: Sura y Bolívar primero (si cotizaron), luego la más barata de otra aseguradora. Una por aseguradora.
function destacadas(of: any[]) {
  const una = new Map<string, any>();
  for (const o of of) if (!una.has(norm(o.aseguradora))) una.set(norm(o.aseguradora), o); // of va de barata a cara
  const pref = ["sura", "bolivar"].map((k) => una.get(k)).filter(Boolean);
  return [...pref, ...[...una.values()].filter((o) => !pref.includes(o))].slice(0, 3).sort((a, b) => a.precio - b.precio);
}
const linea = (o: any) => (o ? `${o.aseguradora} ${String(o.plan).replace(new RegExp("^" + o.aseguradora + "[\\s\\-·:]*", "i"), "")}: ${peso(o.precio)}`.replace(/\s+/g, " ") : "—");
const lineaVera = (o: any) => linea(o).replace(/^Liberty/i, "HDI");
const pdfVera = (c: any) => `https://veraseguros.com/seguros/auto/?ver=${c.id}.${c.token}&pdf=1#cotizador`; // comparativo con diseño Vera, listo para guardar en PDF
// WhatsApp con plantilla aprobada por Meta, enviada por la Bot API de Woztell (secreto WOZTELL_TOKEN, permiso bot:sendResponses).
// Botones de ambas plantillas, en este orden: 0 "Hablar con un asesor", 1 "No me interesa" (respuestas rápidas).
async function whatsapp(c: any, plantilla: string, vars: string[]) {
  const llave = Deno.env.get("WOZTELL_TOKEN");
  if (!llave) return false; // sin token: no se marca como enviado
  const ref = `${c.id}.${c.token}`;
  const r = await fetch(`https://bot.api.woztell.com/sendResponses?accessToken=${encodeURIComponent(llave)}`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ channelId: Deno.env.get("WOZTELL_CANAL") ?? "68fa428f24db78a9c72f8dcc", recipientId: "57" + c.datos.tel, response: [{ type: "TEMPLATE", elementName: plantilla, languageCode: "es",
      components: [
        { type: "body", parameters: vars.map((text) => ({ type: "text", text })) },
        { type: "button", sub_type: "quick_reply", index: "0", parameters: [{ type: "payload", payload: "AUTO_ASESOR:" + ref }] },
        { type: "button", sub_type: "quick_reply", index: "1", parameters: [{ type: "payload", payload: "AUTO_NOINTERES:" + ref }] }] }] }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok !== 1) console.error(`woztell ${plantilla} ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return r.ok && j.ok === 1;
}
// Cotizaciones a medias. Parcial de WhatsApp: el bot avisa cuando el cliente deja de responder; se guarda para recordarle
// el mismo día con un enlace que llena el cotizador (?p=). Placa no encontrada en la web: correo con enlace (?c=) que pide solo marca y versión.
async function guardarParcial(d: any) {
  const tel = String(d.cel || d.wa || "").replace(/\D/g, "").replace(/^57/, "").slice(0, 10);
  if (!/^3\d{9}$/.test(tel)) return;
  const { count } = await db.from("auto_parcial").select("id", { count: "exact", head: true }).eq("tel", tel).gte("creado", new Date(Date.now() - 86_400_000).toISOString());
  if (count) return; // un recordatorio por celular al día
  const f = String(d.nac ?? "").trim(), dmy = f.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  const nac = /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : dmy ? `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}` : "";
  const email = txt(d.correo, 120);
  await db.from("auto_parcial").insert({ token: crypto.randomUUID().replace(/-/g, ""), tel, email: /^[^@\s]+@[^@\s]+\.\w+$/.test(email) ? email : null,
    datos: { nombre: txt(d.nombres || d.nombre, 60), apellido: txt(d.apellidos || d.apellido, 60), cedula: String(d.cedula ?? "").replace(/\D/g, "").slice(0, 12), nac,
      genero: /^f/i.test(d.genero ?? "") ? "F" : /^m/i.test(d.genero ?? "") ? "M" : "", ciudad: txt(d.ciudad, 60), placa: txt(d.placa, 7).toUpperCase().replace(/[^A-Z0-9]/g, "") } });
}
// Texto libre por WhatsApp: solo vale dentro de las 24 h desde el último mensaje del cliente (ventana de Meta).
async function whatsappTexto(tel: string, texto: string) {
  const llave = Deno.env.get("WOZTELL_TOKEN");
  if (!llave) return false;
  const r = await fetch(`https://bot.api.woztell.com/sendResponses?accessToken=${encodeURIComponent(llave)}`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ channelId: Deno.env.get("WOZTELL_CANAL") ?? "68fa428f24db78a9c72f8dcc", recipientId: "57" + tel, response: [{ type: "TEXT", text: texto }] }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok !== 1) console.error(`woztell texto ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return r.ok && j.ok === 1;
}
function htmlRetomar(nombre: string, titulo: string, texto: string, link: string, boton: string) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1d2433">
  <img src="https://veraseguros.com/assets/logo-vera-wordmark.png" alt="Vera Seguros" width="120" style="margin:16px 0">
  <h1 style="font-size:22px;color:#203152;margin:0 0 8px">${esc(nombre ? nombre + ", " + titulo : titulo.charAt(0).toUpperCase() + titulo.slice(1))}</h1>
  <p style="font-size:15px;line-height:1.5;color:#4b5263">${texto}</p>
  <p style="margin:24px 0"><a href="${link}" style="background:#25D366;color:#0b2217;padding:14px 24px;border-radius:980px;text-decoration:none;font-weight:700;display:inline-block">${boton}</a></p>
  <p style="font-size:14px;color:#4b5263">Comparamos SURA, Bolívar, HDI, Allianz, Mapfre y más aseguradoras, y expides en línea sin salir de la página.</p>
  <p style="font-size:12px;color:#646a78;line-height:1.5;margin-top:28px">Recibes este correo porque empezaste una cotización con Vera Seguros y autorizaste el contacto. Vera Asesores Ltda., NIT 901.039.892-0, Medellín. Para no recibir más correos responde "no más".</p></div>`;
}
async function tareas() {
  const ahora = Date.now(), hace = (min: number) => new Date(ahora - min * 60_000).toISOString();
  // WhatsApp (solo con config_interna wa_autos = "on"): ofertas a los 4–60 min de cotizar y seguimiento a las 23 h
  // si no ha respondido, solo de 7 a.m. a 8 p.m. (Bogotá) y hasta 30 h después. Uno de cada uno por cotización.
  let whatsapps = 0;
  const { data: on } = await db.from("config_interna").select("v").eq("k", "wa_autos").maybeSingle();
  if (on?.v === "on") {
    const nombre = (c: any) => saludo(c.datos).split(" ")[0];
    const vehiculo = (c: any) => vehTxt(c.datos);
    const { data: porWa } = await db.from("auto_cotizacion").select("id,token,datos").eq("estado", "aceptada").is("datos->renovacion", null).is("whatsapp_enviado", null).lte("creado", hace(4)).gte("creado", hace(60)).limit(10);
    for (const c of porWa ?? []) {
      const top = destacadas(await ofertasUnicas(c.id));
      if (!top.length || !/^3\d{9}$/.test(c.datos?.tel ?? "")) continue;
      if (await whatsapp(c, "cotizacion_autos_ofertas_v1_1", [nombre(c), vehiculo(c), linea(top[0]), linea(top[1]), linea(top[2])])) { await db.from("auto_cotizacion").update({ whatsapp_enviado: new Date().toISOString() }).eq("id", c.id); whatsapps++; }
    }
    const hora = (new Date(ahora).getUTCHours() + 19) % 24; // Bogotá = UTC−5
    if (hora >= 7 && hora < 20) {
      const { data: por24 } = await db.from("auto_cotizacion").select("id,token,datos").not("whatsapp_enviado", "is", null).is("whatsapp_24h", null).is("datos->renovacion", null).is("wa_respuesta", null).is("wa_eleccion", null).lte("creado", hace(23 * 60)).gte("creado", hace(30 * 60)).limit(10);
      for (const c of por24 ?? []) {
        const top = destacadas(await ofertasUnicas(c.id));
        if (await whatsapp(c, "cotizacion_autos_ofertas_24h_v1_1", [nombre(c), vehiculo(c), linea(top[0])])) { await db.from("auto_cotizacion").update({ whatsapp_24h: new Date().toISOString() }).eq("id", c.id); whatsapps++; }
      }
    }
  }
  // Pasos de CRM → Correos: el gerente puede apagar cada uno.
  const { data: pasos } = await db.from("correo_paso").select("id,activo").in("id", ["autos_propuesta", "autos_24h"]);
  const apagado = (id: string) => (pasos ?? []).some((x: any) => x.id === id && x.activo === false);
  // Propuesta al equipo y al cliente a la vez, cuando respondieron las 10 aseguradoras o a los 15 min (las que falten ya no llegan). Solo las de las últimas 3 h.
  const completa = async (c: any) => { if (c.creado <= hace(15)) return true;
    const { data: o } = await db.from("auto_oferta").select("data").eq("cotizacion_id", c.id);
    return new Set((o ?? []).map((x: any) => norm(x.data?.aseguradora)).filter(Boolean)).size >= 10; };
  let internos = 0;
  const { data: nuevas } = await db.from("auto_cotizacion").select("id,token,datos,estado,opp_id,pdf_url,creado,pdf_b64:respuesta->>url_pdf_comparativo_b64,veh:respuesta->data->insurable_objects->0->vehicle").is("correo_interno", null).eq("estado", "aceptada").is("datos->renovacion", null).lte("creado", hace(2)).gte("creado", hace(180)).limit(10);
  for (const c of nuevas ?? []) {
    if (!(await completa(c))) continue;
    const { data: o } = await db.from("auto_oferta").select("evento,data").eq("cotizacion_id", c.id);
    const ofertas = await ofertasUnicas(c.id), cotizaron = new Set(ofertas.map((x) => norm(x.aseguradora)));
    const fallas = (o ?? []).filter((x) => x.evento === "error" && !cotizaron.has(norm(x.data.aseguradora))).map((x) => x.data);
    const d = c.datos ?? {};
    if (await correo(EQUIPO, `${marcaCrm(d)}${marcaMenor(d)}Cotización autos: ${d.nombre} ${d.apellido} · ${d.placa || "0 km"} · ${ofertas.length ? "desde " + peso(ofertas[0].precio) : c.estado}`, htmlInterno(c, ofertas, fallas), ofertas.length ? c.pdf_b64 : null)) {
      await db.from("auto_cotizacion").update({ correo_interno: new Date().toISOString() }).eq("id", c.id); internos++;
    }
  }
  // Al cliente: la propuesta (mismo momento que el equipo), el cierre a las 24 h y nada más hasta el día 16 (autos-semanal).
  let clientes = 0;
  const { data: paraCliente } = apagado("autos_propuesta") ? { data: [] } : await db.from("auto_cotizacion").select("id,token,datos,opp_id,creado,pdf_b64:respuesta->>url_pdf_comparativo_b64").eq("estado", "aceptada").is("datos->renovacion", null).is("correo_cliente", null).lte("creado", hace(2)).gte("creado", hace(180)).limit(10);
  for (const c of paraCliente ?? []) {
    if (!(await completa(c))) continue;
    const ofertas = await ofertasUnicas(c.id);
    if (!c.datos?.email || !ofertas.length) { if (!c.datos?.email || c.creado < hace(60)) await db.from("auto_cotizacion").update({ correo_cliente: new Date().toISOString() }).eq("id", c.id); continue; }
    if (await correo(c.datos.email, `${saludo(c.datos)}, tus ofertas de seguro todo riesgo para ${c.datos.placa || "tu vehículo 0 km"}`, htmlSeguimiento(c, ofertas, 0), c.pdf_b64)) {
      await db.from("auto_cotizacion").update({ correo_cliente: new Date().toISOString() }).eq("id", c.id); clientes++;
    }
  }
  // Cierre a las 24 horas, solo si no ha expedido, elegido ni pedido no recibir más.
  let correos = 0;
  for (const [h, col] of (apagado("autos_24h") ? [] : [[24, "correo_24h"]]) as [number, string][]) {
    const { data: lista } = await db.from("auto_cotizacion").select("id,token,datos,opp_id,creado,wa_eleccion,retoma_baja,pdf_b64:respuesta->>url_pdf_comparativo_b64").eq("estado", "aceptada").is("datos->renovacion", null).is(col, null).lte("creado", hace(h * 60)).gte("creado", hace((h + 12) * 60)).limit(20);
    for (const c of lista ?? []) {
      const { count: exp } = await db.from("auto_expedicion").select("id", { count: "exact", head: true }).eq("cotizacion_id", c.id);
      const d = c.datos ?? {}, { data: cliente } = exp ? { data: true } : await db.rpc("ya_es_cliente", { p_tel: d.tel ?? "", p_email: d.email ?? "", p_cedula: d.cedula ?? "", p_placa: d.placa ?? "", p_desde: c.creado });
      if (!c.datos?.email || exp || c.wa_eleccion || c.retoma_baja || cliente !== false) { // ya lo tomó (CRM, correo) o no se pudo comprobar
        await db.from("auto_cotizacion").update({ [col]: new Date().toISOString() }).eq("id", c.id); continue; }
      const ofertas = await ofertasUnicas(c.id);
      if (await correo(c.datos.email, `${saludo(c.datos)}, no pierdas la oferta de tu seguro todo riesgo`, htmlSeguimiento(c, ofertas, h), c.pdf_b64)) {
        await db.from("auto_cotizacion").update({ [col]: new Date().toISOString() }).eq("id", c.id); correos++;
      }
    }
  }
  // Retomar cotizaciones a medias, el mismo día y solo de 7 a.m. a 9 p.m. (Bogotá).
  let retomas = 0;
  const hb = (new Date(ahora).getUTCHours() + 19) % 24;
  if (hb >= 7 && hb < 21) {
    const { data: ps } = await db.from("auto_parcial").select("id,token,tel,email,datos,creado").is("avisado", null).lte("creado", hace(30)).gte("creado", hace(12 * 60)).limit(10);
    for (const p of ps ?? []) {
      const { count } = await db.from("auto_cotizacion").select("id", { count: "exact", head: true }).eq("datos->>tel", p.tel).gte("creado", p.creado);
      if (count) { await db.from("auto_parcial").update({ avisado: new Date().toISOString(), aviso: { omitido: "ya cotizó" } }).eq("id", p.id); continue; }
      const link = (canal: string) => `https://veraseguros.com/seguros/auto/?p=${p.id}.${p.token}&${utm(canal, "autos_parcial")}#cotizador`, n = String(p.datos?.nombre || "").split(" ")[0], placa = p.datos?.placa ? " para la placa " + p.datos.placa : "";
      const wa = await whatsappTexto(p.tel, `Hola${n ? " " + n : ""}, te escribe Vera Seguros. No alcanzaste a terminar la cotización de tu seguro todo riesgo${placa}. Te guardamos tus datos: termínala aquí en 2 minutos, compara las aseguradoras y expide en línea: ${link("whatsapp")}`);
      const mail = p.email ? await correo(p.email, `${n || "Hola"}, no pierdas tu cotización del seguro todo riesgo`, htmlRetomar(n, "no pierdas tu cotización", `No alcanzaste a terminar la cotización de tu seguro todo riesgo${esc(placa)}. Te guardamos tus datos: termínala en 2 minutos, compara los precios de las aseguradoras y expide tu póliza en línea.`, link("correo"), "Terminar mi cotización")) : false;
      await db.from("auto_parcial").update({ avisado: new Date().toISOString(), aviso: { wa, mail } }).eq("id", p.id); retomas++;
    }
    // Placa no encontrada (web): el cliente no terminó con marca y versión. Otros rechazos (edad, públicos) no se pueden retomar así.
    const { data: rech } = await db.from("auto_cotizacion").select("id,token,datos,creado,msg:respuesta->>message").eq("estado", "rechazada").is("datos->renovacion", null).is("correo_cliente", null).lte("creado", hace(20)).gte("creado", hace(24 * 60)).limit(10);
    for (const c of rech ?? []) {
      const d = c.datos ?? {};
      const { count } = await db.from("auto_cotizacion").select("id", { count: "exact", head: true }).eq("datos->>tel", d.tel ?? "").neq("estado", "rechazada").gte("creado", c.creado);
      let ok = false;
      if (!count && d.email && /placa no encontrada/i.test(c.msg ?? "")) {
        ok = await correo(d.email, `${saludo(d)}, te falta un paso para ver los precios de tu seguro`, htmlRetomar(saludo(d), "te falta un paso", `No encontramos los datos de la placa ${esc(d.placa || "")} en el sistema de las aseguradoras. Ya tenemos todos tus datos: solo elige marca, año y versión de tu vehículo y verás los precios al instante, sin otro código SMS.`, `https://veraseguros.com/seguros/auto/?c=${c.id}.${c.token}&${utm("correo", "autos_placa")}#cotizador`, "Ver mis precios"));
        if (ok) retomas++;
      }
      await db.from("auto_cotizacion").update({ correo_cliente: new Date().toISOString() }).eq("id", c.id);
    }
  }
  return { correos, whatsapps, internos, clientes, retomas };
}

// Expedición desde la página: el cliente elige una oferta, llena el SARLAFT y sube tarjeta de propiedad y cédula.
// Las fotos quedan en el bucket privado "expediciones"; el equipo recibe todo por correo y la oferta se marca
// "Recomendada" en Agentemotor para que el asesor la encuentre en el CRM y la expida.
const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf" };
async function expedir(b: any) {
  const { data: c } = await db.from("auto_cotizacion").select("id,token,datos,opp_id,creado,pdf_b64:respuesta->>url_pdf_comparativo_b64").eq("id", txt(b.id, 40)).maybeSingle();
  if (!c || c.token !== b.t) return { status: 403, body: { ok: false } };
  if (!b.acepta) return { status: 400, body: { ok: false, error: "acepta" } };
  const { count } = await db.from("auto_expedicion").select("id", { count: "exact", head: true }).eq("cotizacion_id", c.id);
  if ((count ?? 0) >= 3) return { status: 429, body: { ok: false, error: "limite" } };
  // La oferta tiene que ser de esta cotización (no se confía en el precio que manda el navegador).
  const { data: ofs } = await db.from("auto_oferta").select("data").eq("cotizacion_id", c.id).eq("evento", "oferta");
  const of = (ofs ?? []).map((x) => x.data).find((o) => (b.oferta?.id && String(o.id) === String(b.oferta.id)) || (!b.oferta?.id && o.aseguradora === b.oferta?.aseguradora && o.plan === b.oferta?.plan));
  if (!of) return { status: 400, body: { ok: false, error: "oferta" } };
  // Campos del SARLAFT como [sección, campo, valor]; el formulario decide cuáles, aquí solo se limitan.
  const campos = (Array.isArray(b.campos) ? b.campos : []).slice(0, 150).map((x: any) => [txt(x?.[0], 60), txt(x?.[1], 120), txt(String(x?.[2] ?? ""), 400)]).filter((x: string[]) => x[1]);
  const archivos = (Array.isArray(b.archivos) ? b.archivos : []).slice(0, 6);
  if (!archivos.some((a: any) => a?.rol === "tarjeta" || a?.rol === "factura") || !archivos.some((a: any) => a?.rol === "cedula")) return { status: 400, body: { ok: false, error: "archivos" } };
  const rutas: string[] = [], adjuntos: { filename: string; content: string }[] = [];
  for (const [i, a] of archivos.entries()) {
    const ext = TIPOS[a?.tipo]; const b64 = typeof a?.b64 === "string" ? a.b64.replace(/^data:[^,]+,/, "") : "";
    if (!ext || !b64 || b64.length > 8_400_000) return { status: 400, body: { ok: false, error: "archivo" } }; // ~6 MB
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const nombre = `${txt(a.rol, 20).replace(/\W/g, "") || "archivo"}-${i + 1}.${ext}`, ruta = `${c.id}/${Date.now()}-${nombre}`;
    const { error } = await db.storage.from("expediciones").upload(ruta, bytes, { contentType: a.tipo });
    if (error) { console.error(`storage ${error.message}`); return { status: 500, body: { ok: false } }; }
    rutas.push(ruta); adjuntos.push({ filename: nombre, content: b64 });
  }
  const { data: e } = await db.from("auto_expedicion").insert({ cotizacion_id: c.id, oferta: of, sarlaft: campos, archivos: rutas }).select("id").single();
  await db.from("auto_cotizacion").update({ wa_eleccion: { aseguradora: of.aseguradora, plan: of.plan, precio: of.precio, fecha: new Date().toISOString(), via: "web" } }).eq("id", c.id);
  if (of.id) await agm("/app/co/customers/update_view_status", { method: "POST", body: JSON.stringify({ sale_order: String(of.id), view_status: "Recomendada", tenant: TENANT }) }).catch(() => null);
  const d = c.datos ?? {}, veh = d.placa ? "placa " + d.placa : "vehículo 0 km";
  const fila = (k: string, v: unknown) => `<tr><td style="padding:4px 12px 4px 0;color:#646a78;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${esc(v || "—")}</td></tr>`;
  let sec = "", tabla = "";
  for (const [s, k, v] of campos) { if (s !== sec) { sec = s; tabla += `<tr><td colspan="2" style="padding:14px 0 4px;font-weight:700;color:#203152">${esc(s)}</td></tr>`; } tabla += fila(k, v); }
  const htmlEquipo = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:680px;color:#1d2433">
  <h2 style="color:#203152;margin:0 0 6px">EXPEDIR: ${esc(d.nombre)} ${esc(d.apellido)} · ${esc(veh)}</h2>${avisoCrm(d)}
  <p style="font-size:15px;margin:0 0 14px"><b>${esc(of.aseguradora)} · ${esc(of.plan)}</b>${of.nivel ? " (" + esc(of.nivel) + ")" : ""} · <b>${of.precio ? peso(of.precio) : "—"}</b> al año · Ref. Agente Motor ${esc(c.opp_id || "—")}</p>
  ${d.valor ? `<p style="font-size:14px;background:#fdecea;padding:10px 12px;border-radius:8px"><b>POR DEBAJO DEL VALOR FASECOLDA.</b> Pidió ${peso(d.valor)} (valor Fasecolda ${peso(d.guia)}) y esta oferta asegura ${esc(vaDe(of) || "un valor por confirmar")}. Confirma el valor con la aseguradora antes de expedir.</p>` : ""}
  <p style="font-size:14px;background:#fff8e1;padding:10px 12px;border-radius:8px">El cliente ya eligió y envió SARLAFT, ${d.placa ? "tarjeta de propiedad" : "factura de compra (vehículo 0 km, sin matrícula; la fecha de entrega va en la tabla)"} y cédula (adjuntos). En Agente Motor la oferta quedó como <b>Recomendada</b>. Falta expedir con la aseguradora y enviarle la póliza.</p>
  <table style="font-size:14px;border-collapse:collapse">${fila("Celular", d.tel)}${fila("Correo", d.email)}${fila("Cédula", d.doc)}</table>
  <table style="font-size:14px;border-collapse:collapse;margin-top:6px">${tabla}</table>
  <p style="margin:20px 0"><a href="https://wa.me/57${esc(d.tel)}" style="background:#25D366;color:#0b2217;padding:10px 18px;border-radius:980px;text-decoration:none;font-weight:600">Escribirle por WhatsApp</a>
  &nbsp; <a href="https://veraseguros.com/seguros/auto/?ver=${c.id}.${c.token}#cotizador" style="color:#2d4777">Ver sus ofertas</a></p></div>`;
  const okEq = await correo(EQUIPO, `${marcaCrm(d)}${marcaMenor(d)}EXPEDIR póliza autos: ${d.nombre} ${d.apellido} · ${veh} · ${of.aseguradora} ${of.plan} ${of.precio ? peso(of.precio) : ""}`, htmlEquipo, c.pdf_b64, adjuntos);
  let okCl = false;
  if (d.email) okCl = await correo(d.email, `${saludo(d)}, tu póliza ${of.aseguradora} quedó en proceso de expedición`, `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1d2433">
  <img src="https://veraseguros.com/assets/logo-vera-wordmark.png" alt="Vera Seguros" width="120" style="margin:16px 0">
  <h1 style="font-size:22px;color:#203152;margin:0 0 8px">${esc(saludo(d))}, tu póliza quedó en proceso de expedición</h1>
  <p style="font-size:15px;line-height:1.5;color:#4b5263">Recibimos tus datos y documentos para el seguro todo riesgo de tu ${esc(veh)}:</p>
  <p style="font-size:16px;font-weight:700;color:#203152">${esc(of.aseguradora)} · ${esc(of.plan)} · ${of.precio ? peso(of.precio) : ""} al año</p>${d.valor ? `<p style="font-size:15px;line-height:1.5;background:#fff8e1;color:#5c4400;padding:12px 14px;border-radius:10px">Esta oferta asegura <b>${esc(vaDe(of) || "un valor por confirmar")}</b>. Valor Fasecolda: ${peso(d.guia)}. En pérdida total o hurto recibirías como máximo el valor asegurado, menos el deducible.</p>` : ""}
  <p style="font-size:15px;line-height:1.5;color:#4b5263">Un asesor de Vera Seguros te contacta para confirmar la inspección (si la aseguradora la pide), el pago y enviarte la póliza.</p>
  <p style="margin:24px 0"><a href="https://wa.me/573156705627?text=${encodeURIComponent(`Hola Vera Seguros, soy ${d.nombre} ${d.apellido}. Envié los documentos para expedir ${of.aseguradora} ${of.plan} para la ${veh}.${c.opp_id ? " Ref. " + c.opp_id : ""}`)}" style="background:#25D366;color:#0b2217;padding:14px 24px;border-radius:980px;text-decoration:none;font-weight:600;display:inline-block">Hablar con mi asesor</a></p>
  <p style="font-size:12px;color:#646a78;line-height:1.5;margin-top:28px">La expedición está sujeta a la aceptación de la aseguradora, a la inspección del vehículo cuando aplique y al pago. Vera Asesores Ltda., NIT 901.039.892-0, Medellín.</p></div>`, c.pdf_b64);
  await db.from("auto_expedicion").update({ correo_equipo: okEq ? new Date().toISOString() : null, correo_cliente: okCl ? new Date().toISOString() : null }).eq("id", e!.id);
  return { status: 200, body: { ok: true } };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const cb = url.searchParams.get("cb");
  if (cb && req.method === "POST") return callback(req, cb);
  if (url.searchParams.has("tareas") && req.method === "POST") {
    const { data: k } = await db.from("config_interna").select("v").eq("k", "tareas_token").single();
    if (!k || req.headers.get("x-tarea") !== k.v) return new Response("no", { status: 403 });
    return new Response(JSON.stringify(await tareas()), { headers: { "content-type": "application/json" } });
  }
  // El bot de Woztell avisa al equipo cuando alguien termina el cotizador de WhatsApp (llave en config_interna bot_key).
  if (url.searchParams.get("alerta") === "wa" && req.method === "POST") {
    const { data: k } = await db.from("config_interna").select("v").eq("k", "bot_key").single();
    if (!k || req.headers.get("x-bot") !== k.v) return new Response("no", { status: 403 });
    const d = await req.json().catch(() => ({}));
    if (d.area === "ED") return new Response(JSON.stringify({ ok: await correo(EQUIPO, `Salud ED (WhatsApp): ${txt(d.evento, 40)} · ${txt(d.nombre, 60) || "sin nombre"}`, htmlLeadEd(d)) }), { headers: { "content-type": "application/json" } });
    console.log(`alerta wa parcial=${!!d.parcial} cel=${!!d.cel} wa=${!!d.wa} campos=${Object.keys(d).join(",")}`);
    if (d.parcial) await guardarParcial(d).catch((e) => console.error(`parcial ${e}`));
    const ok = await correo(EQUIPO, `${d.parcial ? "Cotización PARCIAL auto" : "Cotizar auto"} (WhatsApp): ${txt(d.nombre || d.nombres, 60) || "sin nombre"} · ${txt(d.placa, 10) || "0 km"}`, htmlLeadWa(d));
    return new Response(JSON.stringify({ ok }), { headers: { "content-type": "application/json" } });
  }
  // El bot de Woztell (sin Origin) consulta las ofertas con ?wa=<id>.<token> y registra la elegida con POST {"elegida": índice}.
  const wa = url.searchParams.get("wa");
  if (wa) {
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    const [id, t] = wa.split(".");
    const { data: c } = await db.from("auto_cotizacion").select("id,token,datos").eq("id", txt(id, 40)).maybeSingle();
    if (!c || c.token !== t) return json({ ok: false }, 403);
    const ofertas = (await ofertasUnicas(c.id)).slice(0, 10).map((o) => ({ aseguradora: o.aseguradora, plan: o.plan, precio: o.precio }));
    if (req.method === "POST") {
      const o = ofertas[Number((await req.json().catch(() => ({}))).elegida)];
      if (o) await db.from("auto_cotizacion").update({ wa_eleccion: { ...o, fecha: new Date().toISOString() } }).eq("id", c.id);
      return json({ ok: !!o, elegida: o ?? null });
    }
    await db.from("auto_cotizacion").update({ wa_respuesta: new Date().toISOString() }).eq("id", c.id).is("wa_respuesta", null);
    const d = c.datos ?? {};
    return json({ ok: true, nombre: d.nombre ?? "", vehiculo: d.valor ? vehTxt(d) : d.placa || "tu vehículo 0 km", ofertas,
      datos: { nombre: d.nombre, apellido: d.apellido, cedula: d.doc, nac: d.nac, genero: d.genero, ciudad: d.ciudad, correo: d.email, cel: d.tel, placa: d.placa, modelo: d.modelo, ceroKm: d.ceroKm } });
  }

  const origin = req.headers.get("origin") ?? "";
  const cors = { "Access-Control-Allow-Origin": ORIGENES.includes(origin) ? origin : ORIGENES[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST" || !ORIGENES.includes(origin)) return new Response('{"ok":false}', { status: 403, headers: cors });
  const res = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
  const b = await req.json().catch(() => ({}));
  try {
    switch (b.accion) {
      case "ciudades": {
        const q = txt(b.q, 30); if (q.length < 3) return res([]);
        const r = await agm(`/seguros/geozone/co/?city_name_like=${encodeURIComponent(q)}`);
        return res((r.body?.response ?? []).slice(0, 12).map((c: any) => ({ code: c.city_code, nombre: `${c.city_name}, ${c.state_name}` })));
      }
      case "marcas": return res((await agm("/seguros/co/vehicles/consultar/lista-marcas")).body ?? []);
      case "referencias": return res((await agm(`/seguros/co/vehicles/consultar/lista-ref-abr?marca=${encodeURIComponent(txt(b.marca))}&modelo=${Number(b.modelo) || 0}`)).body ?? []);
      case "vehiculos": return res((await versiones(b.marca, b.modelo, b.ref, !!b.ceroKm)).slice(0, 40));
      case "sms": { // ponytail: Twilio limita reenvíos por número (5 cada 10 min); límite por IP si hay abuso
        const tel = txt(b.telefono, 10).replace(/\D/g, "");
        if (!/^3\d{9}$/.test(tel)) return res({ ok: false, error: "telefono" }, 400);
        return res({ ok: !!(await verify("Verifications", { To: "+57" + tel, Channel: "sms", Locale: "es" })) });
      }
      case "auth": { await token(); return res({ ok: tok !== "" }); } // diagnóstico sin costo
      case "cotizar": { const r = await cotizar(b, req.headers.get("x-forwarded-for")?.split(",")[0] ?? "", await empleado(req)); return res(r.body, r.status); }
      case "expedir": { const r = await expedir(b); return res(r.body, r.status); }
      case "wz": { // botón "Enviar por Woztell" del correo interno: plantilla aprobada con la Premium de mejor precio y el comparativo
        const { data: c } = await db.from("auto_cotizacion").select("id,token,datos,whatsapp_manual").eq("id", txt(b.id, 40)).maybeSingle();
        if (!c || c.token !== b.t) return res({ ok: false }, 403);
        if (c.whatsapp_manual && Date.now() - Date.parse(c.whatsapp_manual) < 12 * 3_600_000) return res({ ok: false, error: "reciente" });
        const of = await ofertasUnicas(c.id), p = of.find((o) => o.nivel === "Premium"), d = c.datos ?? {};
        if (!of.length || !/^3\d{9}$/.test(d.tel ?? "")) return res({ ok: false, error: "datos" });
        const top = [...(p ? [p] : []), ...destacadas(of).filter((o) => o !== p)];
        const ok = await whatsapp(c, "cotizacion_autos_ofertas_v1_1", [saludo(d).split(" ")[0], vehTxt(d), lineaVera(top[0]), lineaVera(top[1]), `Comparativo en PDF: ${pdfVera(c)}`]);
        if (ok) await db.from("auto_cotizacion").update({ whatsapp_manual: new Date().toISOString() }).eq("id", c.id);
        return res({ ok, nombre: d.nombre ?? "" });
      }
      case "previo": { // datos para retomar desde un enlace: tipo p = parcial de WhatsApp, c = cotización con placa no encontrada
        const [id, t] = txt(b.ref, 80).split(".");
        if (b.tipo === "p") {
          const { data: p } = await db.from("auto_parcial").select("token,tel,email,datos").eq("id", txt(id, 40)).maybeSingle();
          if (!p || p.token !== t) return res({ ok: false }, 403);
          return res({ ok: true, datos: { ...p.datos, tel: p.tel, email: p.email ?? "" } });
        }
        const { data: c } = await db.from("auto_cotizacion").select("token,estado,datos").eq("id", txt(id, 40)).maybeSingle();
        if (!c || c.token !== t) return res({ ok: false }, 403);
        const d = c.datos ?? {};
        return res({ ok: true, completar: c.estado === "rechazada", datos: { nombre: d.nombre, apellido: d.apellido, cedula: d.doc, nac: d.nac, genero: d.genero, placa: d.placa, tel: d.tel, email: d.email, ciudadCode: d.ciudad } });
      }
      case "ofertas": {
        const { data: c } = await db.from("auto_cotizacion").select("id,token,estado,pdf_url,creado,opp_id,datos,veh:respuesta->data->insurable_objects->0->vehicle").eq("id", txt(b.id, 40)).maybeSingle();
        if (!c || c.token !== b.t) return res({ ok: false }, 403);
        // Ficha técnica del vehículo que cotizó Agentemotor (guía Fasecolda), para que el cliente confirme que es el suyo.
        const v: any = c.veh ?? {}, vc = v.vehicle_codification ?? {};
        const vehiculo = v.brand ? { marca: v.brand, linea: v.line, modelo: v.model, tipo: v.type, fasecolda: v.codification?.code ?? c.datos?.fasecolda, valor: v.vehicle_risk?.commercial_price ?? v.price_sugested,
          cilindraje: v.cylinder, combustible: vc.fuel, caja: vc.tipo_caja, servicio: vc.servicio, pasajeros: vc.number_passengers, cero_km: !!v.vehicle_risk?.in_agency, foto: v.imagen?.codigo_foto?.[0]?.nombre ?? "" } : null;
        const { data: o } = await db.from("auto_oferta").select("evento,data").eq("cotizacion_id", c.id).order("id");
        const unicas = new Map<string, any>(), fallas = new Map<string, any>();
        const fuera = quitada(c.datos?.excluir);
        for (const x of o ?? []) {
          if (fuera(x.data)) continue;
          if (x.evento === "oferta") { if (!POR_KM.test(x.data.plan)) unicas.set(x.data.id ? String(x.data.id) : `${x.data.aseguradora}|${x.data.plan}|${x.data.precio}`, x.data); }
          else fallas.set(String(x.data.aseguradora).toLowerCase(), { aseguradora: x.data.aseguradora, motivo: x.data.estado, tecnico: !!x.data.tecnico });
        }
        const ofertas = [...unicas.values()], cotizaron = new Set(ofertas.map((x) => String(x.aseguradora).toLowerCase()));
        return res({ ok: true, estado: c.estado, pdf: c.pdf_url, opp: c.opp_id, previo: { nombre: c.datos?.nombre, apellido: c.datos?.apellido, doc: c.datos?.doc, nac: c.datos?.nac, genero: c.datos?.genero, email: c.datos?.email, tel: c.datos?.tel, ciudad: c.datos?.ciudad }, cliente: `${c.datos?.nombre ?? ""} ${c.datos?.apellido ?? ""}`.trim(), placa: c.datos?.placa ?? "", vehiculo, menor: c.datos?.valor ? { menor: true, guia: c.datos.guia, valor: c.datos.valor, pct: c.datos.pct } : null, factura: c.datos?.factura ? { valor: c.datos.factura, guia: c.datos.guia0 || 0 } : null, empresa: c.datos?.empresa?.razon ?? "",
          renovacion: c.datos?.renovacion ? { ...c.datos.renovacion, pdf: !!c.datos.renovacion.pdf, excluir: c.datos.excluir ?? [], enviada: c.datos.renovacion_enviada ?? null } : null, reintento: false, segundos: Math.round((Date.now() - Date.parse(c.creado)) / 1000), ofertas,
          sin_oferta: [...fallas.entries()].filter(([k]) => !cotizaron.has(k)).map(([, v]) => v) });
      }
    }
    return res({ ok: false }, 400);
  } catch (e) {
    console.error(e);
    return res({ ok: false, error: "servicio" }, 502);
  }
});
