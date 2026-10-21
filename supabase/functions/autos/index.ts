// Cotizador de autos con la API de Agente Motor. La API Key vive solo aquí (secretos AGM_API_KEY y AGM_TENANT).
// Acciones (POST JSON desde veraseguros.com): ciudades, marcas, referencias, vehiculos, sms, cotizar, ofertas.
// Agente Motor llama a ?cb=<id>.<token> con cada oferta (policy_list) o error (error_message).
import { createClient } from "jsr:@supabase/supabase-js@2";
const ORIGENES = ["https://veraseguros.com", "https://www.veraseguros.com", "http://localhost:4173"];
const API = "https://apipro.agentemotor.com";
const SUPA = Deno.env.get("SUPABASE_URL")!;
const TENANT = Deno.env.get("AGM_TENANT") ?? "";
const POR_IP_DIA = 3, TOPE_DIA = 40; // cada cotización cuesta ~$4.790: límite anti-abuso
// Rechazos de la aseguradora por el riesgo: volver a cotizar no cambia nada. El resto (caídas, tiempos) se reintenta a los 5 min.
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
      .map((c: any) => ({ tag: c.coverage_tag, grupo: c.group, cobertura: c.coverage ?? c.description_tag, valor: c.description })) };
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
    const lista = (Array.isArray(d) ? d : [d]).map((x: any) => x?.products ? x : x?.data?.products ? x.data : x?.policy ?? x?.offer ?? x) // real: [{ name: "update-policy", data: {...} }].filter((x: any) => x && typeof x === "object" && x.view_status !== "Invisible");
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
    : { plate: d.placa };
  const utm = d.utm ?? {};
  return { name: "event-create-quote",
    tenant_data: { name: TENANT, campaign: { campaign: txt(utm.campaign) || "web", medium: txt(utm.medium) || "cotizador", source: txt(utm.source) || "veraseguros.com" } },
    callback: { url_callback: `${SUPA}/functions/v1/autos?cb=${id}.${t}`, callback_param: id },
    data: { business_line: "vehiculos", insurable_objects: [{ type: "vehicle", vehicle }],
      parties: [{ party_rol: "Asegurado", party_type: "person", person: { identification_type: "CC", identification_number: d.doc, firstname: d.nombre, lastname: d.apellido, gender: d.genero, birht_date: d.nac,
        contact_data: [{ contact_tag: "principal", contact_info: { email: d.email, phone: d.tel, ubication: { place: { city_code: d.ciudad, country_code: "170" } } } }] } }],
      ubication: { place: { city_code: d.ciudad, country_code: "170" } } } };
}

async function cotizar(b: any, ip: string) {
  const placa = txt(b.placa, 7).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const fasecolda = txt(b.fasecolda, 10).replace(/\D/g, ""), modelo = Number(b.modelo) || 0;
  const doc = txt(b.cedula, 12).replace(/\D/g, ""), ciudad = txt(b.ciudad, 6).replace(/\D/g, "");
  const nac = /^\d{4}-\d{2}-\d{2}$/.test(b.nacimiento) ? b.nacimiento : "";
  const genero = b.genero === "F" ? "F" : "M";
  const nombre = txt(b.nombre, 60), apellido = txt(b.apellido, 60), email = txt(b.email, 120), tel = txt(b.telefono, 15).replace(/\D/g, "");
  const ceroKm = !!b.ceroKm;
  if ((!placa && !(fasecolda && modelo)) || doc.length < 5 || !ciudad || !nac || !nombre || !apellido || tel.length < 10 || !b.acepta)
    return { status: 400, body: { ok: false, error: "datos" } };

  const codigo = txt(b.codigo, 8).replace(/\D/g, "");
  if (!codigo || (await verify("VerificationCheck", { To: "+57" + tel, Code: codigo }))?.status !== "approved")
    return { status: 200, body: { ok: false, error: "codigo" } };

  const ip_hash = await sha(ip + new Date().toISOString().slice(0, 10));
  const hoy = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: mias }, { count: total }] = await Promise.all([
    db.from("auto_cotizacion").select("id", { count: "exact", head: true }).eq("ip_hash", ip_hash).gte("creado", hoy),
    db.from("auto_cotizacion").select("id", { count: "exact", head: true }).gte("creado", hoy)]);
  if ((mias ?? 0) >= POR_IP_DIA || (total ?? 0) >= TOPE_DIA) return { status: 429, body: { ok: false, error: "limite" } };

  const datos = { placa, fasecolda, modelo, ceroKm, doc, ciudad, nac, genero, nombre, apellido, email, tel, utm: b.utm ?? null };
  const t = crypto.randomUUID().replace(/-/g, "");
  const { data: c, error } = await db.from("auto_cotizacion").insert({ token: t, ip_hash, datos }).select("id").single();
  if (error) return { status: 500, body: { ok: false } };

  const r = await agm("/app/co/customers/quotation", { method: "POST", body: JSON.stringify(cuerpo(c.id, t, datos)) });
  const ok = r.status === 200;
  await db.from("auto_cotizacion").update({ estado: ok ? "aceptada" : "rechazada", opp_id: r.body?.opp_id ? String(r.body.opp_id) : null, respuesta: r.body,
    pdf_url: r.body?.url_pdf_comparativo ?? null }).eq("id", c.id);
  if (!ok) return { status: 200, body: { ok: false, error: r.status === 400 ? "placa" : "servicio" } };
  return { status: 200, body: { ok: true, id: c.id, t } };
}

const peso = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
async function correo(para: string, asunto: string, html: string) {
  const llave = Deno.env.get("RESEND_API_KEY");
  if (!llave) return false; // sin proveedor de correo configurado: no se marca como enviado
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${llave}`, "content-type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("CORREO_DE") ?? "Vera Seguros <cotizaciones@veraseguros.com>", reply_to: "info@veraseguros.com", to: [para], subject: asunto, html }) });
  if (!r.ok) console.error(`correo ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.ok;
}
function htmlSeguimiento(c: any, ofertas: any[], horas: number) {
  const d = c.datos, vehiculo = d.placa || "tu vehículo 0 km";
  const top = ofertas.filter((o) => o.precio).sort((a, b) => a.precio - b.precio).slice(0, 3);
  const ver = `https://veraseguros.com/seguros/auto/?ver=${c.id}.${c.token}#cotizador`;
  const wa = "https://wa.me/573156705627?text=" + encodeURIComponent(`Hola Vera Seguros, quiero el seguro todo riesgo para ${vehiculo}.`);
  const filas = top.map((o) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e3e8">${esc(o.aseguradora)} · ${esc(o.plan)}</td><td style="padding:10px 0;border-bottom:1px solid #e2e3e8;text-align:right;font-weight:700;color:#203152">${peso(o.precio)}</td></tr>`).join("");
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1d2433">
  <img src="https://veraseguros.com/assets/logo-vera-wordmark.png" alt="Vera Seguros" width="120" style="margin:16px 0">
  <h1 style="font-size:22px;color:#203152;margin:0 0 8px">${esc(d.nombre)}, ${horas === 12 ? "tus precios siguen disponibles" : "¿te ayudamos a elegir?"}</h1>
  <p style="font-size:15px;line-height:1.5;color:#4b5263">${horas === 12 ? `Estas son las mejores ofertas del seguro todo riesgo para ${esc(vehiculo)}:` : `Un asesor de Vera Seguros te explica las diferencias y te acompaña en la compra, sin costo.`}</p>
  ${filas ? `<table style="width:100%;border-collapse:collapse;font-size:15px">${filas}</table>` : ""}
  <p style="margin:24px 0"><a href="${wa}" style="background:#25D366;color:#0b2217;padding:14px 24px;border-radius:980px;text-decoration:none;font-weight:600;display:inline-block">Hablar con un asesor</a></p>
  <p style="font-size:14px"><a href="${ver}" style="color:#2d4777">Ver todas mis ofertas</a></p>
  <p style="font-size:12px;color:#646a78;line-height:1.5;margin-top:28px">Recibes este correo porque cotizaste en veraseguros.com y autorizaste el contacto sobre tu cotización. Precios sujetos a inspección y aceptación de cada aseguradora. Vera Asesores Ltda., NIT 901.039.892-0, Medellín. Para no recibir más correos responde "no más".</p></div>`;
}
// Ofertas sin repetir (el reintento puede duplicarlas), de la más barata a la más cara.
async function ofertasUnicas(id: string) {
  const { data: o } = await db.from("auto_oferta").select("data").eq("cotizacion_id", id).eq("evento", "oferta");
  const m = new Map<string, any>();
  for (const x of o ?? []) m.set(`${x.data.aseguradora}|${x.data.plan}`, x.data);
  return [...m.values()].filter((x) => x.precio).sort((a, b) => a.precio - b.precio);
}
// WhatsApp con la plantilla aprobada por Meta, enviada por la Bot API de Woztell (secreto WOZTELL_TOKEN, permiso bot:sendResponses).
// Botones de la plantilla, en este orden: 0 "Quiero comprar", 1 "Hablar con un asesor" (respuestas rápidas), 2 "Ver todas mis ofertas" (URL ...?ver={{1}}).
const PLANTILLA_AUTOS = Deno.env.get("WOZTELL_PLANTILLA_AUTOS") ?? "cotizacion_autos_ofertas";
async function whatsapp(c: any, top: any[]) {
  const llave = Deno.env.get("WOZTELL_TOKEN");
  if (!llave) return false; // sin token: no se marca como enviado
  const d = c.datos, ref = `${c.id}.${c.token}`;
  const linea = (o: any) => (o ? `${o.aseguradora} · ${o.plan}: ${peso(o.precio)}` : "—");
  const r = await fetch(`https://bot.api.woztell.com/sendResponses?accessToken=${encodeURIComponent(llave)}`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ channelId: Deno.env.get("WOZTELL_CANAL") ?? "68fa428f24db78a9c72f8dcc", recipientId: "57" + d.tel, response: [{ type: "TEMPLATE", elementName: PLANTILLA_AUTOS, languageCode: "es",
      components: [
        { type: "body", parameters: [d.nombre, d.placa || "tu vehículo 0 km", linea(top[0]), linea(top[1]), linea(top[2])].map((text) => ({ type: "text", text })) },
        { type: "button", sub_type: "quick_reply", index: "0", parameters: [{ type: "payload", payload: "AUTO_COMPRAR:" + ref }] },
        { type: "button", sub_type: "quick_reply", index: "1", parameters: [{ type: "payload", payload: "AUTO_ASESOR:" + ref }] },
        { type: "button", sub_type: "url", index: "2", parameters: [{ type: "text", text: ref }] }] }] }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok !== 1) console.error(`woztell ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return r.ok && j.ok === 1;
}
async function tareas() {
  const ahora = Date.now(), hace = (min: number) => new Date(ahora - min * 60_000).toISOString();
  // WhatsApp con las mejores ofertas: uno solo por cotización, entre 4 y 60 min después de cotizar y con al menos una oferta.
  const { data: porWa } = await db.from("auto_cotizacion").select("id,token,datos").eq("estado", "aceptada").is("whatsapp_enviado", null).lte("creado", hace(4)).gte("creado", hace(60)).limit(10);
  let whatsapps = 0;
  for (const c of porWa ?? []) {
    const top = (await ofertasUnicas(c.id)).slice(0, 3);
    if (!top.length || !/^3\d{9}$/.test(c.datos?.tel ?? "")) continue;
    if (await whatsapp(c, top)) { await db.from("auto_cotizacion").update({ whatsapp_enviado: new Date().toISOString() }).eq("id", c.id); whatsapps++; }
  }
  // Reintento: una vez por cotización, si alguna aseguradora falló por error técnico y no dejó oferta.
  const { data: pend } = await db.from("auto_cotizacion").select("id,token,datos").eq("estado", "aceptada").eq("reintentada", false).lte("creado", hace(5)).gte("creado", hace(60)).limit(10);
  let reintentos = 0;
  for (const c of pend ?? []) {
    const { data: o } = await db.from("auto_oferta").select("evento,data").eq("cotizacion_id", c.id);
    const cotizaron = new Set((o ?? []).filter((x) => x.evento === "oferta").map((x) => String(x.data.aseguradora).toLowerCase()));
    const falla = (o ?? []).some((x) => x.evento === "error" && x.data.tecnico && !cotizaron.has(String(x.data.aseguradora).toLowerCase()));
    await db.from("auto_cotizacion").update({ reintentada: true }).eq("id", c.id); // ponytail: un solo reintento; más costaría otra comparativa cada vez
    if (!falla) continue;
    await db.from("auto_oferta").delete().eq("cotizacion_id", c.id).eq("evento", "error").eq("data->>tecnico", "true");
    await agm("/app/co/customers/quotation", { method: "POST", body: JSON.stringify(cuerpo(c.id, c.token, c.datos)) });
    reintentos++;
  }
  // Seguimiento por correo a las 12 y 24 horas.
  let correos = 0;
  for (const [h, col] of [[12, "correo_12h"], [24, "correo_24h"]] as const) {
    const { data: lista } = await db.from("auto_cotizacion").select("id,token,datos").eq("estado", "aceptada").is(col, null).lte("creado", hace(h * 60)).gte("creado", hace((h + 12) * 60)).limit(20);
    for (const c of lista ?? []) {
      if (!c.datos?.email) { await db.from("auto_cotizacion").update({ [col]: new Date().toISOString() }).eq("id", c.id); continue; }
      const { data: o } = await db.from("auto_oferta").select("data").eq("cotizacion_id", c.id).eq("evento", "oferta");
      const asunto = h === 12 ? `Tus precios del seguro todo riesgo para ${c.datos.placa || "tu vehículo"}` : `${c.datos.nombre}, ¿te ayudamos a elegir tu seguro?`;
      if (await correo(c.datos.email, asunto, htmlSeguimiento(c, (o ?? []).map((x) => x.data), h))) {
        await db.from("auto_cotizacion").update({ [col]: new Date().toISOString() }).eq("id", c.id); correos++;
      }
    }
  }
  return { reintentos, correos, whatsapps };
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
    return json({ ok: true, nombre: c.datos?.nombre ?? "", vehiculo: c.datos?.placa || "tu vehículo 0 km", ofertas });
  }

  const origin = req.headers.get("origin") ?? "";
  const cors = { "Access-Control-Allow-Origin": ORIGENES.includes(origin) ? origin : ORIGENES[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type", "Content-Type": "application/json" };
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
      case "vehiculos": {
        const r = await agm(`/seguros/co/vehicles/consultar/vehiculos-por-caracteristica?marca=${encodeURIComponent(txt(b.marca))}&modelo=${Number(b.modelo) || 0}&ref=${encodeURIComponent(txt(b.ref))}&ceroKm=${b.ceroKm ? "true" : "false"}`);
        return res((Array.isArray(r.body) ? r.body : []).slice(0, 40).map((x: any) => { const v = x?.data?.vehicle ?? {}; return { fasecolda: v.codification?.code, linea: v.line, valor: v.vehicle_risk?.commercial_price }; }));
      }
      case "sms": { // ponytail: Twilio limita reenvíos por número (5 cada 10 min); límite por IP si hay abuso
        const tel = txt(b.telefono, 10).replace(/\D/g, "");
        if (!/^3\d{9}$/.test(tel)) return res({ ok: false, error: "telefono" }, 400);
        return res({ ok: !!(await verify("Verifications", { To: "+57" + tel, Channel: "sms", Locale: "es" })) });
      }
      case "auth": { await token(); return res({ ok: tok !== "" }); } // diagnóstico sin costo
      case "cotizar": { const r = await cotizar(b, req.headers.get("x-forwarded-for")?.split(",")[0] ?? ""); return res(r.body, r.status); }
      case "ofertas": {
        const { data: c } = await db.from("auto_cotizacion").select("id,token,estado,pdf_url,creado,reintentada,opp_id").eq("id", txt(b.id, 40)).maybeSingle();
        if (!c || c.token !== b.t) return res({ ok: false }, 403);
        const { data: o } = await db.from("auto_oferta").select("evento,data").eq("cotizacion_id", c.id).order("id");
        const unicas = new Map<string, any>(), fallas = new Map<string, any>();
        for (const x of o ?? []) {
          if (x.evento === "oferta") unicas.set(x.data.id ? String(x.data.id) : `${x.data.aseguradora}|${x.data.plan}|${x.data.precio}`, x.data);
          else fallas.set(String(x.data.aseguradora).toLowerCase(), { aseguradora: x.data.aseguradora, motivo: x.data.estado, tecnico: !!x.data.tecnico });
        }
        const ofertas = [...unicas.values()], cotizaron = new Set(ofertas.map((x) => String(x.aseguradora).toLowerCase()));
        return res({ ok: true, estado: c.estado, pdf: c.pdf_url, opp: c.opp_id, reintento: !c.reintentada, segundos: Math.round((Date.now() - Date.parse(c.creado)) / 1000), ofertas,
          sin_oferta: [...fallas.entries()].filter(([k]) => !cotizaron.has(k)).map(([, v]) => v) });
      }
    }
    return res({ ok: false }, 400);
  } catch (e) {
    console.error(e);
    return res({ ok: false, error: "servicio" }, 502);
  }
});
