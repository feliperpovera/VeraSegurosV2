// Cotizador de autos con la API de Agente Motor. La API Key vive solo aquí (secretos AGM_API_KEY y AGM_TENANT).
// Acciones (POST JSON desde veraseguros.com): ciudades, marcas, referencias, vehiculos, sms, cotizar, ofertas.
// Agente Motor llama a ?cb=<id>.<token> con cada oferta (policy_list) o error (error_message).
import { createClient } from "jsr:@supabase/supabase-js@2";
const ORIGENES = ["https://veraseguros.com", "https://www.veraseguros.com", "http://localhost:4173"];
const API = "https://apipro.agentemotor.com";
const SUPA = Deno.env.get("SUPABASE_URL")!;
const TENANT = Deno.env.get("AGM_TENANT") ?? "";
const POR_IP_DIA = 3, TOPE_DIA = 40; // cada cotización cuesta ~$4.790: límite anti-abuso
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

// Solo lo que la página necesita mostrar de cada oferta.
function oferta(d: any) {
  const p = d?.products?.[0] ?? {};
  return { aseguradora: p.manufacturer ?? "", plan: p.name ?? "", logo: p.logo ?? "", precio: d?.total_price ?? p.price ?? null,
    cuotas: d?.financing_installments ?? "", pdf: d?.document_reference?.url ?? "", recomendada: d?.view_status === "Recomendado",
    coberturas: (p.coverages ?? []).map((c: any) => ({ grupo: c.group, cobertura: c.coverage, valor: c.description })) };
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
    const lista = (Array.isArray(d) ? d : [d]).map((x: any) => x?.policy ?? x?.offer ?? x).filter((x: any) => x && typeof x === "object" && x.view_status !== "Invisible");
    const filas = lista.map((x: any) => ({ cotizacion_id: id, evento: "oferta", data: oferta(x) })).filter((f: any) => f.data.aseguradora);
    if (filas.length) await db.from("auto_oferta").insert(filas);
    else console.error(`callback sin ofertas legibles ${JSON.stringify(b).slice(0, 600)}`);
  } else if (b?.event_name === "error_message") {
    await db.from("auto_oferta").insert({ cotizacion_id: id, evento: "error", data: { aseguradora: b.data?.error?.insurer ?? "", estado: b.data?.error?.status ?? "" } });
  }
  return new Response("ok");
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

  const vehicle: any = ceroKm || !placa
    ? { plate: "", model: modelo, codification: { code: fasecolda }, vehicle_risk: { in_agency: ceroKm } }
    : { plate: placa };
  const utm = b.utm ?? {};
  const r = await agm("/app/co/customers/quotation", { method: "POST", body: JSON.stringify({
    name: "event-create-quote",
    tenant_data: { name: TENANT, campaign: { campaign: txt(utm.campaign) || "web", medium: txt(utm.medium) || "cotizador", source: txt(utm.source) || "veraseguros.com" } },
    callback: { url_callback: `${SUPA}/functions/v1/autos?cb=${c.id}.${t}`, callback_param: c.id },
    data: { business_line: "vehiculos", insurable_objects: [{ type: "vehicle", vehicle }],
      parties: [{ party_rol: "Asegurado", party_type: "person", person: { identification_type: "CC", identification_number: doc, firstname: nombre, lastname: apellido, gender: genero, birht_date: nac,
        contact_data: [{ contact_tag: "principal", contact_info: { email, phone: tel, ubication: { place: { city_code: ciudad, country_code: "170" } } } }] } }],
      ubication: { place: { city_code: ciudad, country_code: "170" } } } }) });
  const ok = r.status === 200;
  await db.from("auto_cotizacion").update({ estado: ok ? "aceptada" : "rechazada", opp_id: r.body?.opp_id ? String(r.body.opp_id) : null, respuesta: r.body,
    pdf_url: r.body?.url_pdf_comparativo ?? null }).eq("id", c.id);
  if (!ok) return { status: 200, body: { ok: false, error: r.status === 400 ? "placa" : "servicio" } };
  return { status: 200, body: { ok: true, id: c.id, t } };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const cb = url.searchParams.get("cb");
  if (cb && req.method === "POST") return callback(req, cb);

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
        const { data: c } = await db.from("auto_cotizacion").select("id,token,estado,pdf_url,creado").eq("id", txt(b.id, 40)).maybeSingle();
        if (!c || c.token !== b.t) return res({ ok: false }, 403);
        const { data: o } = await db.from("auto_oferta").select("evento,data").eq("cotizacion_id", c.id).order("id");
        return res({ ok: true, estado: c.estado, pdf: c.pdf_url, segundos: Math.round((Date.now() - Date.parse(c.creado)) / 1000), ofertas: (o ?? []).filter((x) => x.evento === "oferta").map((x) => x.data), errores: (o ?? []).filter((x) => x.evento === "error").length });
      }
    }
    return res({ ok: false }, 400);
  } catch (e) {
    console.error(e);
    return res({ ok: false, error: "servicio" }, 502);
  }
});
