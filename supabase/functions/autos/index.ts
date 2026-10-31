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
  const utm = d.utm ?? {};
  return { name: "event-create-quote",
    tenant_data: { name: TENANT, campaign: { campaign: txt(utm.campaign) || "web", medium: txt(utm.medium) || "cotizador", source: txt(utm.source) || "veraseguros.com" } },
    callback: { url_callback: `${SUPA}/functions/v1/autos?cb=${id}.${t}`, callback_param: id },
    data: { business_line: "vehiculos", insurable_objects: [{ type: "vehicle", vehicle }],
      parties: [{ party_rol: "Asegurado", party_type: "person", person: { identification_type: "CC", identification_number: d.doc, firstname: d.nombre, lastname: d.apellido, gender: d.genero, birht_date: d.nac,
        contact_data: [{ contact_tag: "principal", contact_info: { email: d.email, phone: d.tel, ubication: { place: { city_code: d.ciudad, country_code: "170" } } } }] } }],
      ubication: { place: { city_code: d.ciudad, country_code: "170" } } } };
}

async function cotizar(b: any, ip: string, emp: string | null) {
  const placa = txt(b.placa, 7).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const fasecolda = txt(b.fasecolda, 10).replace(/\D/g, ""), modelo = Number(b.modelo) || 0;
  const doc = txt(b.cedula, 12).replace(/\D/g, ""), ciudad = txt(b.ciudad, 6).replace(/\D/g, "");
  const nac = /^\d{4}-\d{2}-\d{2}$/.test(b.nacimiento) ? b.nacimiento : "";
  const genero = b.genero === "F" ? "F" : "M";
  const nombre = txt(b.nombre, 60), apellido = txt(b.apellido, 60), email = txt(b.email, 120), tel = txt(b.telefono, 15).replace(/\D/g, "");
  const ceroKm = !!b.ceroKm;
  if ((!placa && !(fasecolda && modelo)) || doc.length < 5 || !ciudad || !nac || !nombre || !apellido || tel.length < 10 || !b.acepta)
    return { status: 400, body: { ok: false, error: "datos" } };

  let previo: any = null;
  if (b.completar?.id && fasecolda && modelo) {
    const { data } = await db.from("auto_cotizacion").select("id,token,estado,creado,datos").eq("id", txt(b.completar.id, 40)).maybeSingle();
    if (data && data.token === b.completar.t && data.estado === "rechazada" && data.datos?.tel === tel && Date.now() - Date.parse(data.creado) < 30 * 60_000) previo = data;
  }
  const codigo = txt(b.codigo, 8).replace(/\D/g, "");
  if (!previo && !emp && (!codigo || (await verify("VerificationCheck", { To: "+57" + tel, Code: codigo }))?.status !== "approved"))
    return { status: 200, body: { ok: false, error: "codigo" } };

  const ip_hash = await sha(ip + new Date().toISOString().slice(0, 10));
  const hoy = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: mias }, { count: total }] = await Promise.all([
    db.from("auto_cotizacion").select("id", { count: "exact", head: true }).eq("ip_hash", ip_hash).eq("estado", "aceptada").gte("creado", hoy),
    db.from("auto_cotizacion").select("id", { count: "exact", head: true }).eq("estado", "aceptada").gte("creado", hoy)]);
  if ((!emp && (mias ?? 0) >= POR_IP_DIA) || (total ?? 0) >= TOPE_DIA) return { status: 429, body: { ok: false, error: "limite" } };

  const datos = { placa, fasecolda, modelo, ceroKm, doc, ciudad, nac, genero, nombre, apellido, email, tel, utm: emp ? { source: "crm", medium: "asesor" } : b.utm ?? null, ...(emp ? { empleado: emp } : {}) };
  const t = crypto.randomUUID().replace(/-/g, "");
  const { data: c, error } = await db.from("auto_cotizacion").insert({ token: t, ip_hash, datos }).select("id").single();
  if (error) return { status: 500, body: { ok: false } };

  const r = await agm("/app/co/customers/quotation", { method: "POST", body: JSON.stringify(cuerpo(c.id, t, datos)) });
  const ok = r.status === 200;
  await db.from("auto_cotizacion").update({ estado: ok ? "aceptada" : "rechazada", opp_id: r.body?.opp_id ? String(r.body.opp_id) : null, respuesta: r.body,
    pdf_url: r.body?.url_pdf_comparativo ?? null }).eq("id", c.id);
  if (previo) await db.from("auto_cotizacion").update({ estado: "completada" }).eq("id", previo.id); // ya no cuenta como intento abierto
  const msg = String(r.body?.message ?? "");
  if (!ok) return { status: 200, body: { ok: false, id: c.id, t, error: /p[uú]blico/i.test(msg) ? "publico" : /placa no encontrada/i.test(msg) || (r.status === 400 && !fasecolda) ? "placa" : "servicio" } };
  return { status: 200, body: { ok: true, id: c.id, t } };
}

// Alertas internas de autos (web y WhatsApp): a info@, comercial@ y feliperestrepo@ (secreto CORREO_INTERNO).
const EQUIPO = (Deno.env.get("CORREO_INTERNO") ?? "info@veraseguros.com,comercial@veraseguros.com,feliperestrepo@veraseguros.com").split(",");
const peso = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
// pdf: url_pdf_comparativo_b64 de Agentemotor (JSON { pdfBase64 }); se adjunta el PDF. Si falla, el correo sale sin adjunto.
async function correo(para: string | string[], asunto: string, html: string, pdf?: string | null) {
  const llave = Deno.env.get("RESEND_API_KEY");
  if (!llave) return false; // sin proveedor de correo configurado: no se marca como enviado
  let adjunto = "";
  if (pdf) try { adjunto = (await (await fetch(pdf, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(25_000) })).json())?.pdfBase64 ?? ""; } catch (e) { console.error(`pdf ${e}`); }
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${llave}`, "content-type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("CORREO_DE") ?? "Vera Seguros <cotizaciones@veraseguros.com>", reply_to: "info@veraseguros.com", to: [para].flat(), subject: asunto, html,
      ...(adjunto ? { attachments: [{ filename: "Comparativo seguro todo riesgo - Vera Seguros.pdf", content: adjunto }] } : {}) }) });
  if (!r.ok) console.error(`correo ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.ok;
}
function htmlSeguimiento(c: any, ofertas: any[], horas: number) {
  const d = c.datos, vehiculo = d.placa || "tu vehículo 0 km";
  const top = destacadas(ofertas.filter((o) => o.precio).sort((a, b) => a.precio - b.precio));
  const ver = `https://veraseguros.com/seguros/auto/?ver=${c.id}.${c.token}#cotizador`;
  const wa = "https://wa.me/573156705627?text=" + encodeURIComponent(`Hola Vera Seguros, soy ${d.nombre} ${d.apellido}. Quiero el seguro todo riesgo para la placa ${d.placa || "(vehículo 0 km)"}.${c.opp_id ? " Ref. " + c.opp_id : ""}`);
  const filas = top.map((o) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e3e8">${esc(o.aseguradora)} · ${esc(o.plan)}</td><td style="padding:10px 0;border-bottom:1px solid #e2e3e8;text-align:right;font-weight:700;color:#203152">${peso(o.precio)}</td></tr>`).join("");
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1d2433">
  <img src="https://veraseguros.com/assets/logo-vera-wordmark.png" alt="Vera Seguros" width="120" style="margin:16px 0">
  <h1 style="font-size:22px;color:#203152;margin:0 0 8px">${esc(d.nombre)}, ${horas === 0 ? "tus ofertas están listas" : horas === 12 ? "tus precios siguen disponibles" : "¿te ayudamos a elegir?"}</h1>
  <p style="font-size:15px;line-height:1.5;color:#4b5263">${horas <= 12 ? `Estas son las mejores ofertas del seguro todo riesgo para ${esc(vehiculo)}:` : `Un asesor de Vera Seguros te explica las diferencias y te acompaña en la compra, sin costo.`}</p>
  ${filas ? `<table style="width:100%;border-collapse:collapse;font-size:15px">${filas}</table>` : ""}
  <p style="margin:24px 0"><a href="${wa}" style="background:#25D366;color:#0b2217;padding:14px 24px;border-radius:980px;text-decoration:none;font-weight:600;display:inline-block">Hablar con un asesor</a></p>
  <p style="font-size:14px"><a href="${ver}" style="color:#2d4777">Ver todas mis ofertas</a></p>
  <p style="font-size:12px;color:#646a78;line-height:1.5;margin-top:28px">Recibes este correo porque cotizaste en veraseguros.com y autorizaste el contacto sobre tu cotización. Precios sujetos a inspección y aceptación de cada aseguradora. Vera Asesores Ltda., NIT 901.039.892-0, Medellín. Para no recibir más correos responde "no más".</p></div>`;
}
// Aviso interno a info@ con los datos del cliente y todas sus ofertas, para hacerle seguimiento.
function htmlInterno(c: any, ofertas: any[], fallas: any[]) {
  const d = c.datos ?? {}, fila = (k: string, v: unknown) => `<tr><td style="padding:4px 12px 4px 0;color:#646a78">${k}</td><td style="padding:4px 0">${esc(v || "—")}</td></tr>`;
  const wa = `https://wa.me/57${d.tel}?text=` + encodeURIComponent(`Hola ${d.nombre}, te escribo de Vera Seguros por la cotización de tu seguro todo riesgo${d.placa ? " para la placa " + d.placa : ""}.`);
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:620px;color:#1d2433">
  <h2 style="color:#203152;margin:0 0 12px">Nueva cotización de autos: ${esc(d.nombre)} ${esc(d.apellido)}</h2>
  <table style="font-size:14px;border-collapse:collapse">${fila("Celular", d.tel)}${fila("Correo", d.email)}${fila("Cédula", d.doc)}${fila("Nacimiento", d.nac)}${fila("Género", d.genero)}${fila("Ciudad (código)", d.ciudad)}${fila("Vehículo", d.placa ? "Placa " + d.placa : `0 km · modelo ${d.modelo} · Fasecolda ${d.fasecolda}`)}${fila("Estado", c.estado)}${fila("Ref. Agente Motor", c.opp_id)}${fila("Fecha", new Date(c.creado).toLocaleString("es-CO", { timeZone: "America/Bogota" }))}${fila("Origen", d.utm ? [d.utm.source, d.utm.medium, d.utm.campaign].filter(Boolean).join(" / ") : "")}</table>
  <h3 style="color:#203152;margin:20px 0 8px">Ofertas (${ofertas.length})</h3>
  ${ofertas.length ? `<table style="width:100%;font-size:14px;border-collapse:collapse">${ofertas.map((o) => `<tr><td style="padding:6px 0;border-bottom:1px solid #e2e3e8">${esc(o.aseguradora)} · ${esc(o.plan)}${o.nivel ? ` <span style="color:#646a78">(${esc(o.nivel)})</span>` : ""}</td><td style="padding:6px 0;border-bottom:1px solid #e2e3e8;text-align:right;font-weight:700">${peso(o.precio)}</td></tr>`).join("")}</table>` : "<p>Sin ofertas.</p>"}
  ${fallas.length ? `<p style="font-size:13px;color:#646a78">No cotizaron: ${fallas.map((f) => esc(`${f.aseguradora} (${f.estado || f.mensaje})`)).join(", ")}</p>` : ""}
  <p style="margin:20px 0"><a href="${wa}" style="background:#25D366;color:#0b2217;padding:10px 18px;border-radius:980px;text-decoration:none;font-weight:600">Escribirle por WhatsApp</a>
  &nbsp; <a href="https://veraseguros.com/seguros/auto/?ver=${c.id}.${c.token}#cotizador" style="color:#2d4777">Ver sus ofertas</a>${c.pdf_url ? ` &nbsp; <a href="${esc(c.pdf_url)}" style="color:#2d4777">PDF comparativo</a>` : ""}</p></div>`;
}
// Aviso interno de una solicitud hecha en el cotizador de WhatsApp (bot de Woztell): solo datos, sin ofertas.
function htmlLeadWa(d: any) {
  const fila = (k: string, v: unknown) => `<tr><td style="padding:4px 12px 4px 0;color:#646a78">${k}</td><td style="padding:4px 0">${esc(v || "—")}</td></tr>`;
  const tel = String(d.cel || d.wa || "").replace(/\D/g, "").replace(/^57/, "");
  const nombre = d.nombre || [d.nombres, d.apellidos].filter(Boolean).join(" ");
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:620px;color:#1d2433">
  <h2 style="color:#203152;margin:0 0 12px">${d.parcial ? "Cotización PARCIAL" : "Cotizar auto"} (WhatsApp): ${esc(nombre || "sin nombre")}</h2>
  <table style="font-size:14px;border-collapse:collapse">${fila("Celular", tel)}${fila("Correo", d.correo)}${fila("Cédula", d.cedula)}${fila("Nacimiento", d.nac)}${fila("Género", d.genero)}${fila("Ciudad", d.ciudad)}${fila("Vehículo", d.placa ? "Placa " + d.placa : "0 km")}${fila("Fecha", new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }))}</table>
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
// Ofertas sin repetir (el reintento puede duplicarlas), de la más barata a la más cara.
async function ofertasUnicas(id: string) {
  const { data: o } = await db.from("auto_oferta").select("data").eq("cotizacion_id", id).eq("evento", "oferta");
  const m = new Map<string, any>();
  for (const x of o ?? []) m.set(`${x.data.aseguradora}|${x.data.plan}`, x.data);
  return [...m.values()].filter((x) => x.precio).sort((a, b) => a.precio - b.precio);
}
// Las 3 que van en el WhatsApp: Sura y Bolívar primero (si cotizaron), luego la más barata de otra aseguradora. Una por aseguradora.
function destacadas(of: any[]) {
  const una = new Map<string, any>();
  for (const o of of) if (!una.has(norm(o.aseguradora))) una.set(norm(o.aseguradora), o); // of va de barata a cara
  const pref = ["sura", "bolivar"].map((k) => una.get(k)).filter(Boolean);
  return [...pref, ...[...una.values()].filter((o) => !pref.includes(o))].slice(0, 3).sort((a, b) => a.precio - b.precio);
}
const linea = (o: any) => (o ? `${o.aseguradora} ${String(o.plan).replace(new RegExp("^" + o.aseguradora + "[\\s\\-·:]*", "i"), "")}: ${peso(o.precio)}`.replace(/\s+/g, " ") : "—");
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
async function tareas() {
  const ahora = Date.now(), hace = (min: number) => new Date(ahora - min * 60_000).toISOString();
  // WhatsApp (solo con config_interna wa_autos = "on"): ofertas a los 4–60 min de cotizar y seguimiento a las 23 h
  // si no ha respondido, solo de 7 a.m. a 8 p.m. (Bogotá) y hasta 30 h después. Uno de cada uno por cotización.
  let whatsapps = 0;
  const { data: on } = await db.from("config_interna").select("v").eq("k", "wa_autos").maybeSingle();
  if (on?.v === "on") {
    const nombre = (c: any) => String(c.datos.nombre || "").split(" ")[0];
    const vehiculo = (c: any) => c.datos.placa ? "tu vehículo de placa " + c.datos.placa : "tu vehículo 0 km";
    const { data: porWa } = await db.from("auto_cotizacion").select("id,token,datos").eq("estado", "aceptada").is("whatsapp_enviado", null).lte("creado", hace(4)).gte("creado", hace(60)).limit(10);
    for (const c of porWa ?? []) {
      const top = destacadas(await ofertasUnicas(c.id));
      if (!top.length || !/^3\d{9}$/.test(c.datos?.tel ?? "")) continue;
      if (await whatsapp(c, "cotizacion_autos_ofertas_v1_1", [nombre(c), vehiculo(c), linea(top[0]), linea(top[1]), linea(top[2])])) { await db.from("auto_cotizacion").update({ whatsapp_enviado: new Date().toISOString() }).eq("id", c.id); whatsapps++; }
    }
    const hora = (new Date(ahora).getUTCHours() + 19) % 24; // Bogotá = UTC−5
    if (hora >= 7 && hora < 20) {
      const { data: por24 } = await db.from("auto_cotizacion").select("id,token,datos").not("whatsapp_enviado", "is", null).is("whatsapp_24h", null).is("wa_respuesta", null).is("wa_eleccion", null).lte("creado", hace(23 * 60)).gte("creado", hace(30 * 60)).limit(10);
      for (const c of por24 ?? []) {
        const top = destacadas(await ofertasUnicas(c.id));
        if (await whatsapp(c, "cotizacion_autos_ofertas_24h_v1_1", [nombre(c), vehiculo(c), linea(top[0])])) { await db.from("auto_cotizacion").update({ whatsapp_24h: new Date().toISOString() }).eq("id", c.id); whatsapps++; }
      }
    }
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
  // Aviso interno a info@ por cada cotización (10 min después, cuando ya llegaron las ofertas). Solo las de las últimas 3 h: no reenvía históricas.
  let internos = 0;
  const { data: nuevas } = await db.from("auto_cotizacion").select("id,token,datos,estado,opp_id,pdf_url,creado,pdf_b64:respuesta->>url_pdf_comparativo_b64").is("correo_interno", null).neq("estado", "completada").lte("creado", hace(10)).gte("creado", hace(180)).limit(10);
  for (const c of nuevas ?? []) {
    const { data: o } = await db.from("auto_oferta").select("evento,data").eq("cotizacion_id", c.id);
    const ofertas = await ofertasUnicas(c.id), cotizaron = new Set(ofertas.map((x) => norm(x.aseguradora)));
    const fallas = (o ?? []).filter((x) => x.evento === "error" && !cotizaron.has(norm(x.data.aseguradora))).map((x) => x.data);
    const d = c.datos ?? {};
    if (await correo(EQUIPO, `Cotización autos: ${d.nombre} ${d.apellido} · ${d.placa || "0 km"} · ${ofertas.length ? "desde " + peso(ofertas[0].precio) : c.estado}`, htmlInterno(c, ofertas, fallas), ofertas.length ? c.pdf_b64 : null)) {
      await db.from("auto_cotizacion").update({ correo_interno: new Date().toISOString() }).eq("id", c.id); internos++;
    }
  }
  // Correo al cliente con sus mejores ofertas, a los 10 min de cotizar (cuando ya llegaron). Uno por cotización; no reenvía históricas.
  let clientes = 0;
  const { data: paraCliente } = await db.from("auto_cotizacion").select("id,token,datos,opp_id,creado,pdf_b64:respuesta->>url_pdf_comparativo_b64").eq("estado", "aceptada").is("correo_cliente", null).lte("creado", hace(10)).gte("creado", hace(180)).limit(10);
  for (const c of paraCliente ?? []) {
    const ofertas = await ofertasUnicas(c.id);
    if (!c.datos?.email || !ofertas.length) { if (!c.datos?.email || c.creado < hace(60)) await db.from("auto_cotizacion").update({ correo_cliente: new Date().toISOString() }).eq("id", c.id); continue; }
    if (await correo(c.datos.email, `${c.datos.nombre}, tus ofertas de seguro todo riesgo para ${c.datos.placa || "tu vehículo 0 km"}`, htmlSeguimiento(c, ofertas, 0), c.pdf_b64)) {
      await db.from("auto_cotizacion").update({ correo_cliente: new Date().toISOString() }).eq("id", c.id); clientes++;
    }
  }
  // Seguimiento por correo a las 12 y 24 horas.
  let correos = 0;
  for (const [h, col] of [[12, "correo_12h"], [24, "correo_24h"]] as const) {
    const { data: lista } = await db.from("auto_cotizacion").select("id,token,datos,opp_id,pdf_b64:respuesta->>url_pdf_comparativo_b64").eq("estado", "aceptada").is(col, null).lte("creado", hace(h * 60)).gte("creado", hace((h + 12) * 60)).limit(20);
    for (const c of lista ?? []) {
      if (!c.datos?.email) { await db.from("auto_cotizacion").update({ [col]: new Date().toISOString() }).eq("id", c.id); continue; }
      const { data: o } = await db.from("auto_oferta").select("data").eq("cotizacion_id", c.id).eq("evento", "oferta");
      const asunto = h === 12 ? `Tus precios del seguro todo riesgo para ${c.datos.placa || "tu vehículo"}` : `${c.datos.nombre}, ¿te ayudamos a elegir tu seguro?`;
      if (await correo(c.datos.email, asunto, htmlSeguimiento(c, (o ?? []).map((x) => x.data), h), c.pdf_b64)) {
        await db.from("auto_cotizacion").update({ [col]: new Date().toISOString() }).eq("id", c.id); correos++;
      }
    }
  }
  return { reintentos, correos, whatsapps, internos, clientes };
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
    return json({ ok: true, nombre: d.nombre ?? "", vehiculo: d.placa || "tu vehículo 0 km", ofertas,
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
      case "cotizar": { const r = await cotizar(b, req.headers.get("x-forwarded-for")?.split(",")[0] ?? "", await empleado(req)); return res(r.body, r.status); }
      case "ofertas": {
        const { data: c } = await db.from("auto_cotizacion").select("id,token,estado,pdf_url,creado,reintentada,opp_id,datos").eq("id", txt(b.id, 40)).maybeSingle();
        if (!c || c.token !== b.t) return res({ ok: false }, 403);
        const { data: o } = await db.from("auto_oferta").select("evento,data").eq("cotizacion_id", c.id).order("id");
        const unicas = new Map<string, any>(), fallas = new Map<string, any>();
        for (const x of o ?? []) {
          if (x.evento === "oferta") unicas.set(x.data.id ? String(x.data.id) : `${x.data.aseguradora}|${x.data.plan}|${x.data.precio}`, x.data);
          else fallas.set(String(x.data.aseguradora).toLowerCase(), { aseguradora: x.data.aseguradora, motivo: x.data.estado, tecnico: !!x.data.tecnico });
        }
        const ofertas = [...unicas.values()], cotizaron = new Set(ofertas.map((x) => String(x.aseguradora).toLowerCase()));
        return res({ ok: true, estado: c.estado, pdf: c.pdf_url, opp: c.opp_id, cliente: `${c.datos?.nombre ?? ""} ${c.datos?.apellido ?? ""}`.trim(), placa: c.datos?.placa ?? "", reintento: !c.reintentada, segundos: Math.round((Date.now() - Date.parse(c.creado)) / 1000), ofertas,
          sin_oferta: [...fallas.entries()].filter(([k]) => !cotizaron.has(k)).map(([, v]) => v) });
      }
    }
    return res({ ok: false }, 400);
  } catch (e) {
    console.error(e);
    return res({ ok: false, error: "servicio" }, 502);
  }
});
