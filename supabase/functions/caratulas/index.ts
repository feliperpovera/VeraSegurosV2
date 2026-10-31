// Carátulas de pólizas: la Logic App de Azure manda cada PDF que llega a info@ (Outlook) y Claude lo lee.
// POST JSON { mensaje, de, asunto, recibido, nombre, contenido (base64) } con cabecera x-clave = config_interna.caratulas_key.
// También desde el CRM ("Subir póliza"): sesión de un empleado activo en lugar de x-clave (origen manual).
// Secreto requerido: ANTHROPIC_API_KEY. Cada PDF se procesa una sola vez (sha256).
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const claude = new Anthropic(); // ANTHROPIC_API_KEY
const txt = (v: unknown, n = 200) => (typeof v === "string" ? v.trim().slice(0, n) : "");

const RAMOS = ["Autos", "SOAT", "Salud", "Vida", "Hogar", "Accidentes personales", "Cumplimiento", "Responsabilidad civil", "Empresarial", "Otro"];
const nulo = (t: string) => ({ anyOf: [{ type: t }, { type: "null" }] });
const ESQUEMA = {
  type: "object", additionalProperties: false,
  required: ["es_poliza", "aseguradora", "ramo", "numero", "anexo", "tipo", "tomador", "documento", "placa", "vigencia_desde", "vigencia_hasta", "prima_neta", "iva", "prima_total", "dudas"],
  properties: {
    es_poliza: { type: "boolean", description: "true solo si es la carátula o certificado de expedición/renovación/modificación de una póliza" },
    aseguradora: { ...nulo("string"), description: "Nombre corto: SURA, Bolívar, Allianz, AXA Colpatria, Mapfre, HDI, SBS, Equidad, Previsora, Qualitas, Mundial, Solidaria, Zurich, Coomeva…" },
    ramo: { anyOf: [{ type: "string", enum: RAMOS }, { type: "null" }] },
    numero: { ...nulo("string"), description: "Número de póliza" },
    anexo: { ...nulo("string"), description: "Número de anexo/certificado/endoso; null si no tiene" },
    tipo: { anyOf: [{ type: "string", enum: ["nueva", "renovacion", "modificacion"] }, { type: "null" }] },
    tomador: { ...nulo("string"), description: "Nombre completo del tomador" },
    documento: { ...nulo("string"), description: "Cédula o NIT del tomador, solo dígitos" },
    placa: nulo("string"),
    vigencia_desde: { ...nulo("string"), description: "YYYY-MM-DD" },
    vigencia_hasta: { ...nulo("string"), description: "YYYY-MM-DD" },
    prima_neta: { ...nulo("number"), description: "Prima sin IVA ni gastos, en pesos, número entero" },
    iva: nulo("number"),
    prima_total: { ...nulo("number"), description: "Total a pagar en pesos" },
    dudas: { type: "array", items: { type: "string" }, description: "Campos que no se leen con certeza; vacío si todo es claro" },
  },
};
const INSTRUCCION = `Eres el lector de carátulas de Vera Seguros, intermediario de seguros en Colombia.
Lee el PDF adjunto y extrae los datos de la póliza. No inventes: si un dato no aparece, usa null y anótalo en "dudas".
Los montos van en pesos colombianos como números (1.234.567,00 → 1234567). Si el documento no es una póliza (factura, cotización, comunicado, extracto), es_poliza = false.`;

async function leer(pdf: string) {
  const r = await claude.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
    messages: [{ role: "user", content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } },
      { type: "text", text: INSTRUCCION },
    ] }],
  } as any);
  if (r.stop_reason === "refusal") throw new Error("Claude no leyó el documento (refusal)");
  const t = r.content.find((b: any) => b.type === "text") as any;
  return JSON.parse(t?.text ?? "null");
}

// Une la póliza al cliente (por cédula) y cierra su oportunidad del mismo ramo como emitida.
async function alCrm(d: any, polizaId: string) {
  const doc = String(d.documento ?? "").replace(/\D/g, "");
  if (!doc || !d.tomador) return;
  let { data: p } = await db.from("persona").select("id,asesor_id").eq("cedula", doc).maybeSingle();
  if (!p) p = (await db.from("persona").insert({ nombre: d.tomador, cedula: doc }).select("id,asesor_id").single()).data;
  if (!p) return;
  await db.from("poliza").update({ persona_id: p.id, asesor_id: p.asesor_id }).eq("id", polizaId);
  await db.from("evento").insert({ persona_id: p.id, canal: "correo", texto: `Póliza ${d.tipo ?? ""} ${d.aseguradora} ${d.ramo} N.º ${d.numero}`.replace(/\s+/g, " ") });
  await db.from("oportunidad").update({ etapa: "emitido", actualizado: new Date().toISOString() })
    .eq("persona_id", p.id).eq("producto", d.ramo).not("etapa", "in", "(emitido,perdido)");
}

const ORIGENES = ["https://veraseguros.com", "https://www.veraseguros.com", "http://localhost:4173"];
async function empleado(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data } = await db.auth.getUser(jwt);
  const email = data?.user?.email?.toLowerCase();
  return email ? (await db.from("empleado").select("id,nombre").eq("email", email).eq("activo", true).maybeSingle()).data : null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors: Record<string, string> = ORIGENES.includes(origin) ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info" } : {};
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "content-type": "application/json" } });
  if (req.method !== "POST") return new Response("ok");
  const { data: k } = await db.from("config_interna").select("v").eq("k", "caratulas_key").single();
  const emp = k?.v && req.headers.get("x-clave") === k.v ? null : await empleado(req);
  if (!(k?.v && req.headers.get("x-clave") === k.v) && !emp) return json({ ok: false }, 403);

  const b = await req.json().catch(() => ({}));
  const pdf = txt(b.contenido, 20_000_000).replace(/\s/g, "");
  if (!pdf.startsWith("JVBER")) return json({ ok: true, omitido: "no es PDF" }); // "%PDF" en base64
  const bytes = Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0));
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (x) => x.toString(16).padStart(2, "0")).join("");

  let { data: c, error } = await db.from("caratula").insert({ hash, mensaje: txt(b.mensaje), de: txt(b.de), asunto: txt(b.asunto),
    recibido: Date.parse(b.recibido) ? b.recibido : new Date().toISOString(), nombre: txt(b.nombre), ...(emp ? { de: `CRM · ${emp.nombre}` } : {}) }).select("id").single();
  if (error) { // hash único: ya llegó antes. Solo se vuelve a leer si la vez anterior falló.
    const { data: antes } = await db.from("caratula").select("id,estado").eq("hash", hash).single();
    if (antes?.estado !== "error") return json({ ok: true, omitido: "repetido" }); // ya está en el CRM
    c = antes;
  }

  const ruta = `${new Date().toISOString().slice(0, 7)}/${hash}.pdf`;
  await db.storage.from("caratulas").upload(ruta, bytes, { contentType: "application/pdf", upsert: true });
  try {
    const d = await leer(pdf);
    if (!d?.es_poliza) {
      await db.from("caratula").update({ estado: "no_es_poliza", pdf_path: ruta, datos: d }).eq("id", c.id);
      return json({ ok: true, poliza: false });
    }
    const dudosa = d.dudas?.length || !d.numero || !d.aseguradora || !d.prima_neta || !d.vigencia_desde;
    const fila = { aseguradora: d.aseguradora ?? "Sin leer", ramo: d.ramo ?? "Otro", numero: d.numero ?? `sin-numero-${hash.slice(0, 8)}`, anexo: d.anexo ?? "0",
      tipo: d.tipo ?? "nueva", vigencia_desde: d.vigencia_desde, vigencia_hasta: d.vigencia_hasta, prima_neta: d.prima_neta, prima_total: d.prima_total,
      pdf_path: ruta, revision: dudosa ? "pendiente" : "ok", origen: emp ? "manual" : "caratula", datos: d };
    const { data: pol, error: e2 } = await db.from("poliza").upsert(fila, { onConflict: "aseguradora,numero,anexo", ignoreDuplicates: true }).select("id").maybeSingle();
    if (e2) throw e2;
    await db.from("caratula").update({ estado: "poliza", pdf_path: ruta, datos: d, poliza_id: pol?.id ?? null }).eq("id", c.id);
    if (pol) await alCrm(d, pol.id);
    return json({ ok: true, poliza: true, revisar: !!dudosa, datos: { aseguradora: fila.aseguradora, ramo: fila.ramo, numero: fila.numero, tomador: d.tomador, vigencia_hasta: d.vigencia_hasta, prima_neta: d.prima_neta } });
  } catch (e) {
    console.error(`caratula ${c.id}: ${e}`);
    await db.from("caratula").update({ estado: "error", pdf_path: ruta, error: String(e).slice(0, 300) }).eq("id", c.id);
    return json({ ok: false, error: "lectura" }, 500); // la Logic App reintenta; el hash evita duplicar
  }
});
