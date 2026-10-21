// Cotizador de autos con la API de Agente Motor. La API Key vive solo aquí (secretos AGM_USER, AGM_PASS, AGM_TENANT).
// Acciones (POST JSON desde veraseguros.com): ciudades, marcas, referencias, vehiculos, cotizar, ofertas.
// Agente Motor llama a ?cb=<id>.<token> con cada oferta (policy_list) o error (error_message).
import { createClient } from "jsr:@supabase/supabase-js@2";
const ORIGENES = ["https://veraseguros.com", "https://www.veraseguros.com", "http://localhost:4173"];
const API = "https://apipro.agentemotor.com";
const SUPA = Deno.env.get("SUPABASE_URL")!;
const TENANT = Deno.env.get("AGM_TENANT") ?? "";
const POR_IP_DIA = 3, TOPE_DIA = 40; // cada cotización cuesta ~$4.790: límite anti-abuso
const db = createClient(SUPA, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

let tok = "", tokVence = 0;
async function token() {
  if (tok && Date.now() < tokVence) return tok;
  const r = await fetch(`${API}/app/co/customers/authentication`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: Deno.env.get("AGM_USER"), password: Deno.env.get("AGM_PASS"), tenant: TENANT }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error("auth " + r.status);
  tok = j.access_token; tokVence = Date.now() + 45 * 60_000; // ponytail: TTL fijo; leer expires_in si la API lo trae
  return tok;
}
async function agm(path: string, init: RequestInit = {}) {
  const r = await fetch(API + path, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${await token()}`, ...(init.headers ?? {}) } });
  return { status: r.status, body: await r.json().catch(() => null) };
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
    const filas = (Array.isArray(b.data) ? b.data : [b.data]).filter((d: any) => d && d.view_status !== "Invisible")
      .map((d: any) => ({ cotizacion_id: id, evento: "oferta", data: oferta(d) }));
    if (filas.length) await db.from("auto_oferta").insert(filas);
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
