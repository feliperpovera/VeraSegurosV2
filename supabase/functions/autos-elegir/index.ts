// "Quiero esta" del cotizador de autos: el cliente elige una oferta y el equipo recibe el aviso al instante
// para escribirle por WhatsApp. Luego el cliente sigue con un asesor o expide en la página (función autos, accion expedir).
import { createClient } from "jsr:@supabase/supabase-js@2";
const ORIGENES = ["https://veraseguros.com", "https://www.veraseguros.com", "http://localhost:4173"];
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const EQUIPO = (Deno.env.get("CORREO_INTERNO") ?? "info@veraseguros.com,comercial@veraseguros.com,feliperestrepo@veraseguros.com").split(",");
const txt = (v: unknown, n = 80) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const peso = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));

async function elegir(b: any) {
  const { data: c } = await db.from("auto_cotizacion").select("id,token,datos,opp_id,wa_eleccion").eq("id", txt(b.id, 40)).maybeSingle();
  if (!c || c.token !== b.t) return { status: 403, body: { ok: false } };
  // La oferta tiene que ser de esta cotización (no se confía en el precio que manda el navegador).
  const { data: ofs } = await db.from("auto_oferta").select("data").eq("cotizacion_id", c.id).eq("evento", "oferta");
  const of = (ofs ?? []).map((x) => x.data).find((o) => (b.oferta?.id && String(o.id) === String(b.oferta.id)) || (!b.oferta?.id && o.aseguradora === b.oferta?.aseguradora && o.plan === b.oferta?.plan));
  if (!of) return { status: 400, body: { ok: false, error: "oferta" } };
  const p = c.wa_eleccion ?? {};
  if (p.via === "web") return { status: 200, body: { ok: true } }; // ya expidió en la página
  // Un aviso por oferta cada 6 h: volver a tocar el botón no llena de correos al equipo.
  if (p.via === "web-elegir" && p.plan === of.plan && p.aseguradora === of.aseguradora && Date.now() - Date.parse(p.fecha) < 6 * 3_600_000) return { status: 200, body: { ok: true } };
  await db.from("auto_cotizacion").update({ wa_eleccion: { aseguradora: of.aseguradora, plan: of.plan, precio: of.precio, fecha: new Date().toISOString(), via: "web-elegir" } }).eq("id", c.id);
  const d = c.datos ?? {}, veh = d.placa ? "placa " + d.placa : "vehículo 0 km", precio = of.precio ? peso(of.precio) : "—";
  const msg = `Hola ${String(d.nombre || "").split(" ")[0]}, te escribe Vera Seguros. Vimos que elegiste ${of.aseguradora} ${of.plan} (${precio} al año) para tu ${veh}. ¿Te ayudo con la expedición?`;
  const fila = (k: string, v: unknown) => `<tr><td style="padding:4px 12px 4px 0;color:#646a78">${k}</td><td style="padding:4px 0">${esc(v || "—")}</td></tr>`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:680px;color:#1d2433">
  <h2 style="color:#203152;margin:0 0 6px">QUIERE EXPEDIR: ${esc(d.nombre)} ${esc(d.apellido)} · ${esc(veh)}</h2>
  <p style="font-size:15px;margin:0 0 14px"><b>${esc(of.aseguradora)} · ${esc(of.plan)}</b>${of.nivel ? " (" + esc(of.nivel) + ")" : ""} · <b>${precio}</b> al año · Ref. Agente Motor ${esc(c.opp_id || "—")}</p>
  <p style="font-size:14px;background:#fff8e1;padding:10px 12px;border-radius:8px">El cliente tocó <b>"Quiero esta"</b> en el cotizador. Escríbele ya por WhatsApp: puede que todavía no haya enviado SARLAFT ni documentos (si los envía en la página, te llega otro correo "EXPEDIR").</p>
  <table style="font-size:14px;border-collapse:collapse">${fila("Celular", d.tel)}${fila("Correo", d.email)}${fila("Cédula", d.doc)}</table>
  <p style="margin:20px 0"><a href="https://wa.me/57${esc(d.tel)}?text=${encodeURIComponent(msg)}" style="background:#25D366;color:#0b2217;padding:10px 18px;border-radius:980px;text-decoration:none;font-weight:600">Escribirle por WhatsApp</a>
  &nbsp; <a href="https://veraseguros.com/seguros/auto/?ver=${c.id}.${c.token}#cotizador" style="color:#2d4777">Ver sus ofertas</a></p></div>`;
  const llave = Deno.env.get("RESEND_API_KEY");
  if (llave) {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${llave}`, "content-type": "application/json" },
      body: JSON.stringify({ from: Deno.env.get("CORREO_DE") ?? "Vera Seguros <cotizaciones@veraseguros.com>", reply_to: "info@veraseguros.com", to: EQUIPO,
        subject: `QUIERE EXPEDIR autos: ${d.nombre} ${d.apellido} · ${veh} · ${of.aseguradora} ${of.plan} ${precio}`, html }) });
    if (!r.ok) console.error(`correo ${r.status} ${(await r.text()).slice(0, 200)}`);
  }
  return { status: 200, body: { ok: true } };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = { "Access-Control-Allow-Origin": ORIGENES.includes(origin) ? origin : ORIGENES[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST" || !ORIGENES.includes(origin)) return new Response('{"ok":false}', { status: 403, headers: cors });
  try {
    const r = await elegir(await req.json().catch(() => ({})));
    return new Response(JSON.stringify(r.body), { status: r.status, headers: cors });
  } catch (e) {
    console.error(`elegir ${e}`);
    return new Response('{"ok":false}', { status: 500, headers: cors });
  }
});
