// Precio menor: el cliente web que ya vio sus ofertas al 100% Fasecolda pide cotizar por un valor asegurado 5, 10 o 15% menor.
// El CRM se queda en 100%. Una sola por cotización (índice único). Se guarda con estado "menor": así la función autos no la
// reutiliza ni manda correos. Agentemotor aplica el límite de cada aseguradora y devuelve el valor real en amount_quoted.
// Acciones (POST): info y cotizar, con { id, t }. Agentemotor llama a ?cb=<id>.<token>: se anota el valor asegurado y se reenvía a autos.
import { createClient } from "jsr:@supabase/supabase-js@2";
const ORIGENES = ["https://veraseguros.com", "https://www.veraseguros.com", "http://localhost:4173"];
const API = "https://apipro.agentemotor.com", SUPA = Deno.env.get("SUPABASE_URL")!, TENANT = Deno.env.get("AGM_TENANT") ?? "";
const PCTS = [5, 10, 15]; // 15%: máximo de las políticas de SURA; las demás las limita Agentemotor
const VIGENCIA_DIAS = 15, POR_IP_DIA = 2, TOPE_DIA = 40; // cada una se paga: mismos topes que autos
const db = createClient(SUPA, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const txt = (v: unknown, n = 80) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))), (b) => b.toString(16).padStart(2, "0")).join("");
const COLS = "id,token,estado,creado,datos,veh:respuesta->data->insurable_objects->0->vehicle";

async function token() {
  const llave = (Deno.env.get("AGM_API_KEY") ?? "").trim();
  const r = await fetch(`${API}/app/co/customers/authentication`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: (Deno.env.get("AGM_USER") ?? "info@veraseguros.com").trim(), password: (Deno.env.get("AGM_PASS") ?? llave).trim(), tenant: TENANT }) });
  return (await r.json().catch(() => ({})))?.access_token ?? llave;
}
async function leer(b: any) {
  const { data: c } = await db.from("auto_cotizacion").select(COLS).eq("id", txt(b.id, 40)).maybeSingle();
  return c && c.token === b.t ? c : null;
}
const guia = (c: any) => Number(c.veh?.vehicle_risk?.commercial_price) || 0; // valor Fasecolda con el que se cotizó
const menorDe = (valor: number, pct: number) => Math.round(valor * (1 - pct / 100) / 100_000) * 100_000;
// Solo carros y motos usados cotizados en la web: en 0 km el valor es el de la factura; el CRM va siempre al 100%.
const puede = (c: any) => c.estado === "aceptada" && !c.datos?.empleado && c.datos?.utm?.source !== "crm" && !c.datos?.ceroKm && !c.veh?.vehicle_risk?.in_agency
  && guia(c) > 0 && !!c.datos?.placa && !!c.veh?.codification?.code && !!c.veh?.model && Date.now() - Date.parse(c.creado) < VIGENCIA_DIAS * 86_400_000;
async function hecha(id: string) {
  const { data } = await db.from("auto_cotizacion").select("id,token").eq("estado", "menor").eq("datos->>base", id).maybeSingle();
  return data;
}

async function info(b: any) {
  const c = await leer(b);
  if (!c) return { status: 403, body: { ok: false } };
  if (c.estado === "menor") {
    const { data: o } = await db.from("auto_cotizacion").select("id,token").eq("id", c.datos.base ?? "").maybeSingle();
    return { status: 200, body: { ok: true, menor: true, guia: c.datos.guia, valor: c.datos.valor, pct: c.datos.pct, base: o ? `${o.id}.${o.token}` : "" } };
  }
  if (!puede(c)) return { status: 200, body: { ok: true, puede: false } };
  const h = await hecha(c.id);
  return { status: 200, body: { ok: true, puede: true, guia: guia(c), opciones: PCTS.map((pct) => ({ pct, valor: menorDe(guia(c), pct) })), hecha: h ? `${h.id}.${h.token}` : "" } };
}

async function cotizar(b: any, ip: string) {
  const c = await leer(b), pct = Number(b.pct);
  if (!c) return { status: 403, body: { ok: false } };
  if (!PCTS.includes(pct) || b.acepta !== true || !puede(c)) return { status: 400, body: { ok: false, error: "datos" } };
  const ya = await hecha(c.id);
  if (ya) return { status: 200, body: { ok: true, id: ya.id, t: ya.token } }; // no se paga otra
  const ip_hash = await sha(ip + new Date().toISOString().slice(0, 10)), ayer = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: mias }, { count: total }] = await Promise.all([
    db.from("auto_cotizacion").select("id", { count: "exact", head: true }).eq("estado", "menor").eq("ip_hash", ip_hash).gte("creado", ayer),
    db.from("auto_cotizacion").select("id", { count: "exact", head: true }).in("estado", ["aceptada", "menor"]).gte("creado", ayer)]);
  if ((mias ?? 0) >= POR_IP_DIA || (total ?? 0) >= TOPE_DIA) return { status: 429, body: { ok: false, error: "limite" } };
  const d = c.datos, valor = menorDe(guia(c), pct), t = crypto.randomUUID().replace(/-/g, "");
  const datos = { ...d, base: c.id, guia: guia(c), valor, pct, consentimiento: { fecha: new Date().toISOString(), version: "2026-11-24" } };
  const { data: n, error } = await db.from("auto_cotizacion").insert({ token: t, ip_hash, estado: "menor", datos }).select("id").single();
  if (error) { // doble clic: el índice único ya dejó pasar la primera
    const otra = await hecha(c.id);
    if (otra) return { status: 200, body: { ok: true, id: otra.id, t: otra.token } };
    console.error(`insert ${error.message}`); return { status: 500, body: { ok: false } };
  }
  const place = { city_code: d.ciudad, country_code: "170" };
  let r: Response | null = null, body: any = null;
  try {
    r = await fetch(`${API}/app/co/customers/quotation`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({
      name: "event-create-quote", tenant_data: { name: TENANT, campaign: { campaign: "valor_menor", medium: txt(d.utm?.medium) || "cotizador", source: txt(d.utm?.source) || "veraseguros.com" } },
      callback: { url_callback: `${SUPA}/functions/v1/autos-menor?cb=${n.id}.${t}`, callback_param: n.id },
      data: { business_line: "vehiculos", insurable_objects: [{ type: "vehicle", vehicle: { plate: d.placa, model: c.veh.model, force: "code", codification: { code: c.veh.codification.code }, vehicle_risk: { in_agency: false, commercial_price: valor } } }],
        parties: [{ party_rol: "Asegurado", party_type: "person", person: { identification_type: "CC", identification_number: d.doc, firstname: d.nombre, lastname: d.apellido, gender: d.genero, birht_date: d.nac,
          contact_data: [{ contact_tag: "principal", contact_info: { email: d.email, phone: d.tel, ubication: { place } } }] } }], ubication: { place } } }) });
    body = await r.json().catch(() => null);
  } catch (e) { console.error(`agm ${e}`); }
  const ok = r?.status === 200;
  // Si Agentemotor la rechaza se suelta la base para poder reintentar. Nunca se actualiza "estado" (el CRM lo escucha).
  await db.from("auto_cotizacion").update({ opp_id: body?.opp_id ? String(body.opp_id) : null, respuesta: body, pdf_url: body?.url_pdf_comparativo ?? null,
    ...(ok ? {} : { datos: { ...datos, base: null, base_fallida: c.id } }) }).eq("id", n.id);
  if (!ok) { console.error(`menor ${r?.status} ${JSON.stringify(body).slice(0, 300)}`); return { status: 200, body: { ok: false, error: "servicio" } }; }
  return { status: 200, body: { ok: true, id: n.id, t } };
}

// Anota amount_quoted como una cobertura más (tag VALASE) y deja que autos guarde la oferta como siempre.
export function anotar(b: any) {
  if (b?.event_name !== "policy_list") return b;
  let d = b.data;
  if (typeof d === "string") try { d = JSON.parse(d); } catch { return b; }
  const lista = d?.policy_list ?? d;
  for (const x of Array.isArray(lista) ? lista : [lista]) {
    const o = x?.products ? x : x?.data?.products ? x.data : x?.policy ?? x?.offer ?? x, p = o?.products?.[0], v = Number(o?.amount_quoted);
    if (p && v > 0) p.coverages = [...(p.coverages ?? []), { coverage_tag: "VALASE", coverage: "Valor asegurado del vehículo", group: "Valor", description: "$" + Math.round(v).toLocaleString("es-CO") }];
  }
  return { ...b, data: d };
}

Deno.serve(async (req) => {
  const cb = new URL(req.url).searchParams.get("cb");
  if (cb && req.method === "POST") {
    const texto = await req.text(); let cuerpo = texto;
    try { cuerpo = JSON.stringify(anotar(JSON.parse(texto))); } catch { /* se reenvía tal cual */ }
    const r = await fetch(`${SUPA}/functions/v1/autos?cb=${encodeURIComponent(cb)}`, { method: "POST", headers: { "content-type": "application/json" }, body: cuerpo });
    return new Response(await r.text(), { status: r.status });
  }
  const origin = req.headers.get("origin") ?? "";
  const cors = { "Access-Control-Allow-Origin": ORIGENES.includes(origin) ? origin : ORIGENES[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST" || !ORIGENES.includes(origin)) return new Response('{"ok":false}', { status: 403, headers: cors });
  try {
    const b = await req.json().catch(() => ({}));
    const r = b.accion === "info" ? await info(b) : b.accion === "cotizar" ? await cotizar(b, req.headers.get("x-forwarded-for")?.split(",")[0] ?? "") : { status: 400, body: { ok: false } };
    return new Response(JSON.stringify(r.body), { status: r.status, headers: cors });
  } catch (e) { console.error(`menor ${e}`); return new Response('{"ok":false}', { status: 500, headers: cors }); }
});
