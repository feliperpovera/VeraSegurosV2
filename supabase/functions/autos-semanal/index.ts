// Correo semanal de Felipe Restrepo para retomar a quienes cotizaron autos y no expidieron (pg_cron, lunes 9 a.m. Bogotá).
// Solo cotizaciones de 7 a 60 días, máximo 4 correos por cliente, y ?baja=<id>.<token> lo saca de la lista.
import { createClient } from "jsr:@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const MAX = 4, LOTE = 50;
const BASE = "https://cwfvqusyvfdohjmgefli.supabase.co/functions/v1/autos-semanal";
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
const peso = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
const POR_KM = /kil[oó]metr|por\s*km/i;
const marca = (a: string) => /liberty/i.test(a) ? "HDI" : a;
const pagina = (t: string) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:-apple-system,Roboto,Arial,sans-serif;text-align:center;padding:48px 20px;color:#203152"><h1 style="font-size:20px">${t}</h1><p>Vera Seguros</p>`, { headers: { "content-type": "text/html; charset=utf-8" } });

function html(c: any, p: any) {
  const d = c.datos, n = String(d.nombre || "").split(" ")[0], veh = d.placa ? `la placa ${d.placa}` : "tu vehículo 0 km";
  const u = "utm_source=correo&utm_medium=email&utm_campaign=autos_retoma_semanal";
  const link = `https://veraseguros.com/seguros/auto/?ver=${c.id}.${c.token}&exp=${p?.id ?? "vera"}&${u}#cotizador`;
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1d2433;font-size:15px;line-height:1.55">
  <p>Hola ${esc(n)},</p>
  <p>Soy Felipe Restrepo, de Vera Seguros. Vi que cotizaste el seguro todo riesgo para ${esc(veh)} y aún no lo has tomado. ¿Te quedó alguna duda?</p>
  ${p ? `<p>La mejor opción Premium de tu cotización fue <b>${esc(marca(p.aseguradora))} · ${esc(p.plan)}</b> por <b>${peso(p.precio)}</b> al año.</p>` : ""}
  <p>Puedes expedirla en línea en 5 minutos, o responder este correo y te ayudo personalmente.</p>
  <p style="margin:22px 0"><a href="${link}" style="background:#25D366;color:#0b2217;padding:13px 22px;border-radius:980px;text-decoration:none;font-weight:700;display:inline-block">Retomar mi seguro</a></p>
  <p>Un abrazo,<br>Felipe Restrepo<br>Vera Seguros</p>
  <p style="font-size:12px;color:#646a78;line-height:1.5;margin-top:26px">Recibes este correo porque cotizaste en veraseguros.com y autorizaste el contacto. Los precios pueden cambiar y están sujetos a inspección y aceptación de la aseguradora. Vera Asesores Ltda., NIT 901.039.892-0, Medellín. <a href="${BASE}?baja=${c.id}.${c.token}" style="color:#646a78">No recibir más correos</a>.</p></div>`;
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
  const modo = url.searchParams.get("modo") ?? ""; // "": solo cuenta · prueba: un ejemplo a Felipe · enviar: envío real
  const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString();
  const { data: cs } = await db.from("auto_cotizacion").select("id,token,datos,retoma_n").eq("estado", "aceptada").is("wa_eleccion", null).eq("retoma_baja", false)
    .lt("retoma_n", MAX).lte("creado", hace(7)).gte("creado", hace(60)).order("creado", { ascending: false });
  const vistos = new Set<string>();
  let enviados = 0, candidatos = 0;
  for (const c of cs ?? []) {
    const d = c.datos ?? {};
    if (d.empleado || d.utm?.source === "prueba" || !d.email || vistos.has(d.tel)) continue;
    vistos.add(d.tel);
    // Otra cotización del mismo celular ya expedida o dada de baja: no se le escribe.
    const { data: otras } = await db.from("auto_cotizacion").select("id,retoma_baja,wa_eleccion").eq("datos->>tel", d.tel);
    if ((otras ?? []).some((x) => x.retoma_baja || x.wa_eleccion)) continue;
    const { count } = await db.from("auto_expedicion").select("id", { count: "exact", head: true }).in("cotizacion_id", (otras ?? []).map((x) => x.id));
    if (count) continue;
    const { data: o } = await db.from("auto_oferta").select("data").eq("cotizacion_id", c.id).eq("evento", "oferta");
    const ofs = (o ?? []).map((x) => x.data).filter((x) => x.precio && !POR_KM.test(x.plan)).sort((a, b) => a.precio - b.precio);
    if (!ofs.length) continue;
    candidatos++;
    if (!modo || enviados >= LOTE) continue;
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "content-type": "application/json" },
      body: JSON.stringify({ from: "Felipe Restrepo <feliperestrepo@veraseguros.com>", reply_to: "feliperestrepo@veraseguros.com", to: [modo === "prueba" ? "feliperestrepo@veraseguros.com" : d.email], ...(modo === "enviar" ? { bcc: ["feliperestrepo@veraseguros.com"] } : {}), // copia oculta: Resend no deja rastro en Enviados de Outlook
        subject: `${modo === "prueba" ? "[EJEMPLO] " : ""}${String(d.nombre || "").split(" ")[0]}, ¿retomamos tu seguro todo riesgo?`, html: html(c, ofs.find((x) => x.nivel === "Premium")) }) });
    if (!r.ok) { console.error(`semanal ${r.status} ${(await r.text()).slice(0, 200)}`); continue; }
    enviados++;
    if (modo === "prueba") break;
    await db.from("auto_cotizacion").update({ retoma_n: (c.retoma_n ?? 0) + 1, retoma_ultimo: new Date().toISOString() }).eq("id", c.id);
    await new Promise((f) => setTimeout(f, 600)); // límite de Resend por segundo
  }
  return new Response(JSON.stringify({ candidatos, enviados, modo }), { headers: { "content-type": "application/json" } });
});
