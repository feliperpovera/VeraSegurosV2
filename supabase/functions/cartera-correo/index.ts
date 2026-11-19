// Cartera desde el correo, sin IA: lee los PDF que ya guardó la Logic App en la tabla caratula.
// Recibos de cobro → por cobrar con fecha límite; informe semanal SURA "Clientes con cartera vencida" → vencida con días de mora;
// "Candidatos a cancelación por no pago" → fecha de cancelación. Corre cada 15 min (cron) con la cabecera x-tarea.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getDocumentProxy, extractText } from "npm:unpdf@0.12.1";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const MES: Record<string, string> = { ENE: "01", JAN: "01", FEB: "02", MAR: "03", ABR: "04", APR: "04", MAY: "05", JUN: "06", JUL: "07", AGO: "08", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DIC: "12", DEC: "12" };
const fecha = (s: string) => { const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (iso) return iso[0]; const m = s.match(/(\d{2})[-/ ]([A-Za-z]{3})[-/ ](\d{4})/); return m && MES[m[2].toUpperCase()] ? `${m[3]}-${MES[m[2].toUpperCase()]}-${m[1]}` : null; };
const pesos = (s: string) => Number(s.replace(/[.,]\d{2}$/, "").replace(/[^\d]/g, "")) || 0;

async function texto(bytes: Uint8Array, claves: string[]) {
  for (const c of [undefined, ...claves]) {
    try { return ((await extractText(await getDocumentProxy(bytes.slice(), c ? { password: c } : {}), { mergePages: true })).text as string).replace(/\s+/g, " "); } catch { /* siguiente clave */ }
  }
  return "";
}
function recibo(t: string, asunto: string) {
  const numero = t.match(/N[úu]mero de (?:la )?p[óo]liza:?\s*(\d{5,})/i)?.[1] ?? t.match(/P[óo]liza n[úu]mero:?\s*(\d{5,})/i)?.[1] ?? asunto.match(/seguro (\d{8,})/)?.[1];
  const total = t.match(/Total a pagar:?\s*\$?\s*([\d.,]+)/i)?.[1] ?? t.match(/Valor a pagar:?\s*\$?\s*([\d.,]+)/i)?.[1];
  const lim = t.match(/Fecha l[íi]mite de pago:?\s*(\d{2}[-/ ][A-Za-z]{3}[-/ ]\d{4}|\d{4}-\d{2}-\d{2})/i)?.[1]
    ?? ((t.split(/Periodo de cobro/i)[1] ?? "").match(/\d{2}-[A-Za-z]{3}-\d{4}/g) ?? []).at(-1) ?? "";
  const limite = fecha(lim);
  return numero && total && limite ? [{ numero, saldo: pesos(total), pago_limite: limite }] : [];
}
// Filas: financiación, ID cliente, nombre y teléfono, saldo en mora, días de mora, cuotas vencidas, plazo, vencido desde, seguro.
function informe(t: string) {
  const filas = [];
  for (const m of t.matchAll(/(\d{6,8})\s+([AC]\d{6,12})\s+(.*?)\$\s*\$?\s*([\d,.]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d{4}\/\d{2}\/\d{2})\s+(\d{6,15})\s+[^$]*?P\d+\s*(\d{4}\/\d{2}\/\d{2})?/g)) {
    const cancela = m[10]?.replaceAll("/", "-") ?? null;
    filas.push({ numero: m[9], saldo: pesos(m[4]), dias: Number(m[5]), mora_desde: m[8].replaceAll("/", "-"), fecha: cancela });
  }
  return filas;
}

Deno.serve(async (req) => {
  const { data: k } = await db.from("config_interna").select("v").eq("k", "tareas_token").single();
  if (!k || req.headers.get("x-tarea") !== k.v) return new Response("no", { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { data: c } = await db.from("config_interna").select("v").eq("k", "pdf_clave").single();
  const claves = [c?.v ?? "", "9010398920", "39892"].filter(Boolean);
  let q = db.from("caratula").select("id,asunto,nombre,recibido,pdf_path,datos").not("pdf_path", "is", null);
  q = body.id ? q.eq("id", body.id) : q.gte("recibido", new Date(Date.now() - 60 * 864e5).toISOString()).is("datos->>cartera", null)
    .or("nombre.ilike.RECIBO%,nombre.ilike.%Cartera_Vencida%,nombre.ilike.%Candidatos_a_cancelacion%").order("recibido").limit(15);
  const { data: pend } = await q;
  const hecho = [];
  for (const x of pend ?? []) {
    const tipo = /Candidatos_a_cancelacion/i.test(x.nombre ?? "") ? "cancelacion" : /Cartera_Vencida/i.test(x.nombre ?? "") ? "vencida" : "recibo";
    let res: any = { tipo, filas: 0 };
    try {
      const { data: b, error } = await db.storage.from("caratulas").download(x.pdf_path);
      if (error) throw error;
      const t = await texto(new Uint8Array(await b.arrayBuffer()), claves);
      if (body.texto) { hecho.push({ nombre: x.nombre, texto: t.slice(0, 4000) }); continue; }
      const filas = tipo === "recibo" ? recibo(t, x.asunto ?? "") : informe(t);
      const dia = String(x.recibido).slice(0, 10);
      if (filas.length) {
        const { data: r } = await db.rpc("aplicar_cartera", { filas, fuente: tipo === "recibo" ? `Recibo ${dia}` : tipo === "vencida" ? `SURA cartera vencida ${dia}` : `SURA candidatos a cancelación ${dia}`, tipo });
        res = { tipo, filas: filas.length, ...r };
        // El informe de vencida más reciente manda: lo vencido por un informe anterior que ya no aparece, se pagó.
        if (tipo === "vencida") {
          const { count } = await db.from("caratula").select("id", { count: "exact", head: true }).ilike("nombre", "%Cartera_Vencida%").gt("recibido", x.recibido);
          if (!count) res.pagadas = (await db.rpc("cartera_pagada_por_informe", { desde: new Date(Date.now() - 60_000).toISOString() })).data;
        }
      } else res.sin_formato = t.length ? true : "sin texto";
    } catch (e) { res.error = String(e).slice(0, 120); }
    await db.from("caratula").update({ datos: { ...(x.datos ?? {}), cartera: res } }).eq("id", x.id);
    hecho.push({ nombre: x.nombre, ...res });
  }
  return new Response(JSON.stringify({ leidos: hecho.length, hecho }), { headers: { "content-type": "application/json" } });
});
