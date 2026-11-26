// Correo del día 16 de Felipe Restrepo a quienes cotizaron autos y no expidieron: volver a cotizar (pg_cron autos-dia16, 9 a.m. Bogotá).
// Sale por su Outlook (flujo de Azure verabot-envios, config_interna.outlook_flujo): queda en Enviados y las respuestas le llegan a él.
// Uno por persona (celular), cuando su última cotización cumple 15 días y ya_es_cliente (CRM + correo) dice que no lo tomó. Se apaga en CRM → Correos (correo_paso autos_16d).
// ?baja=<id>.<token> lo saca de la lista. Modos (header x-tarea): "" solo cuenta · prueba: un ejemplo a Felipe · enviar: envío real.
import { createClient } from "jsr:@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const LOTE = 40, FELIPE = "feliperestrepo@veraseguros.com"; // ponytail: 40 al día con 2 s entre correos (Outlook acepta 30/min)
const BASE = "https://cwfvqusyvfdohjmgefli.supabase.co/functions/v1/autos-semanal";
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
const pagina = (t: string) => new Response(`${t}\n\nVera Seguros`, { headers: { "content-type": "text/plain; charset=utf-8" } }); // Supabase no sirve text/html por GET
const primer = (d: any) => { const n = String(d.nombre || "").trim().split(/\s+/)[0]; return n ? n[0].toUpperCase() + n.slice(1).toLowerCase() : "Hola"; };
const asunto = (d: any) => `${primer(d)}, hoy podemos mejorar el precio de tu seguro todo riesgo`;

function html(c: any, baja: string) {
  const d = c.datos, veh = d.placa ? `la placa ${esc(d.placa)}` : "tu vehículo 0 km";
  const cotizar = "https://veraseguros.com/cotizador-de-autos/?utm_source=correo&utm_medium=email&utm_campaign=autos_dia16";
  const wa = `https://wa.me/573176678204?text=${encodeURIComponent(`Hola Felipe, soy ${d.nombre} ${d.apellido ?? ""}. Quiero volver a cotizar el seguro todo riesgo${d.placa ? " de la placa " + d.placa : ""}.`)}`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vera Seguros</title></head>
  <body style="margin:0;padding:0;background:#f5f5f7"><div style="display:none;max-height:0;overflow:hidden;opacity:0">Las tarifas cambian: en 2 minutos ves los precios de nuevo, gratis.</div>
  <div style="padding:24px 12px"><div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:22px;padding:30px 28px;color:#1d2433;font-size:16px;line-height:1.55">
  <img src="https://veraseguros.com/assets/logo-vera-wordmark.png" alt="Vera Seguros" width="110" style="display:block;margin:0 0 22px;border:0">
  <p style="margin:0 0 14px">Hola ${esc(primer(d))},</p>
  <p style="margin:0 0 14px">Soy Felipe Restrepo, de Vera Seguros. Hace unos días cotizaste el seguro todo riesgo para ${veh}.</p>
  <p style="margin:0 0 14px">Las tarifas de las aseguradoras se están moviendo y hoy podemos encontrar una mejor alternativa para ti.</p>
  <p style="margin:0 0 20px">Vuelve a cotizar: en 2 minutos ves los precios de 9 aseguradoras, gratis.</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px"><tr><td align="center" bgcolor="#25D366" style="border-radius:980px"><a href="${cotizar}" style="display:block;padding:16px 12px;color:#0b2217;text-decoration:none;font-weight:700;font-size:17px;line-height:1.2;border-radius:980px">Cotizar de nuevo</a></td></tr></table>
  <p style="margin:0 0 24px;text-align:center;font-size:15px">¿Prefieres que lo haga por ti? <a href="${wa}" style="color:#2d4777">Escríbeme por WhatsApp</a> o responde este correo.</p>
  <p style="margin:0 0 24px">Un abrazo,<br><strong>Felipe Restrepo</strong><br><span style="color:#4b5263">Vera Seguros · Medellín</span></p>
  <p style="font-size:12px;color:#646a78;line-height:1.5;border-top:1px solid #e2e3e8;padding-top:14px;margin:0">Recibes este correo porque cotizaste en veraseguros.com y autorizaste el contacto. Precios sujetos a inspección y aceptación de cada aseguradora. Vera Asesores Ltda., NIT 901.039.892-0, Medellín. <a href="${baja}" style="color:#2d4777">No recibir más correos</a>.</p></div></div></body></html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url), baja = url.searchParams.get("baja");
  if (baja) {
    const [id, t] = baja.split(".");
    const { data: c } = await db.from("auto_cotizacion").select("token,datos").eq("id", String(id).slice(0, 40)).maybeSingle();
    if (!c || c.token !== t) return pagina("Enlace no válido");
    await db.from("auto_cotizacion").update({ retoma_baja: true }).eq("datos->>tel", c.datos?.tel ?? "");
    return pagina("Listo, no te enviaremos más correos de seguimiento.");
  }
  const { data: k } = await db.from("config_interna").select("v").eq("k", "tareas_token").single();
  if (!k || req.headers.get("x-tarea") !== k.v) return new Response("no", { status: 403 });
  const modo = url.searchParams.get("modo") ?? "";
  const { data: paso } = await db.from("correo_paso").select("activo").eq("id", "autos_16d").maybeSingle();
  if (modo === "enviar" && paso?.activo === false) return Response.json({ apagado: true });
  const { data: fl } = await db.from("config_interna").select("v").eq("k", "outlook_flujo").maybeSingle();
  if (!fl?.v) return Response.json({ error: "sin flujo de Outlook" }, { status: 500 });
  const hace15 = new Date(Date.now() - 15 * 86_400_000).toISOString();
  const { data: cs, error } = await db.from("auto_cotizacion").select("id,token,datos,creado,correo_16d,retoma_baja,wa_eleccion").eq("estado", "aceptada").is("datos->renovacion", null).order("creado", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const { data: ex } = await db.from("auto_expedicion").select("cotizacion_id");
  const expedida = new Set((ex ?? []).map((x: any) => x.cotizacion_id));
  // Por celular: la cotización más reciente manda. Nadie del grupo expidió, eligió, se dio de baja ni recibió ya este correo.
  const grupos = new Map<string, any[]>();
  for (const c of cs ?? []) { const t = c.datos?.tel; if (t) grupos.set(t, [...(grupos.get(t) ?? []), c]); }
  const lista: any[] = [];
  for (const g of grupos.values()) {
    const c = g.reduce((a, b) => (b.creado > a.creado ? b : a)), d = c.datos ?? {};
    if (c.creado > hace15 || !/^[^@\s]+@[^@\s]+\.\w+$/.test(d.email ?? "") || d.empleado || d.utm?.source === "prueba" || d.utm?.source === "crm") continue;
    if (g.some((x) => x.correo_16d || x.retoma_baja || x.wa_eleccion || expedida.has(x.id))) continue;
    // CRM y correo (pólizas leídas de carátulas): si ya lo tomó, no se le escribe.
    const { data: cliente } = await db.rpc("ya_es_cliente", { p_tel: d.tel, p_email: d.email, p_cedula: d.cedula ?? "", p_placa: d.placa ?? "", p_desde: g.reduce((a, b) => (b.creado < a ? b.creado : a), c.creado) });
    if (cliente !== false) continue; // si la consulta falla, mejor no escribir
    lista.push({ ...c, ids: g.map((x) => x.id) });
  }
  const turno = modo === "prueba" ? lista.slice(0, 1) : modo === "enviar" ? lista.slice(0, LOTE) : [];
  let enviados = 0; const fallidos: string[] = [];
  for (const c of turno) {
    const link = modo === "prueba" ? `${BASE}?baja=ejemplo.ejemplo` : `${BASE}?baja=${c.id}.${c.token}`;
    const r = await fetch(fl.v, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ para: modo === "prueba" ? FELIPE : c.datos.email, asunto: `${modo === "prueba" ? "[EJEMPLO] " : ""}${asunto(c.datos)}`, html: html(c, link) }) });
    if (!r.ok) { fallidos.push(`${r.status} ${(await r.text()).slice(0, 160)}`); continue; }
    enviados++;
    if (modo === "prueba") break;
    await db.from("auto_cotizacion").update({ correo_16d: new Date().toISOString() }).in("id", c.ids);
    await new Promise((f) => setTimeout(f, 2000));
  }
  return Response.json({ pendientes: lista.length, enviados, fallidos: fallidos.slice(0, 5), modo });
});
