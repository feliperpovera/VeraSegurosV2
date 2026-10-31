// Envío desde el CRM: correo (Resend, diseño Vera) o plantilla de WhatsApp (Woztell) a un cliente.
// Solo empleados activos (sesión de Supabase Auth). Solo al correo/celular guardado del cliente: no se puede escribir a otra dirección.
// POST { accion: "vista" | "enviar", persona_id, plantilla_id, mensaje? }. Secretos: RESEND_API_KEY, WOZTELL_TOKEN.
import { createClient } from "jsr:@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ORIGENES = ["https://veraseguros.com", "https://www.veraseguros.com", "http://localhost:4173"];
const TOPE_DIA = 60; // envíos por empleado en 24 h
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase());

async function empleado(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data } = await db.auth.getUser(jwt);
  const email = data?.user?.email?.toLowerCase();
  if (!email) return null;
  return (await db.from("empleado").select("id,nombre,email").eq("email", email).eq("activo", true).maybeSingle()).data;
}

// Valores ya escapados para HTML; en WhatsApp se usan sin escapar.
function variables(p: any, emp: any, mensaje: string) {
  const completo = titulo(String(p.nombre ?? "").trim());
  return { nombre: completo.split(" ")[0] || "cliente", nombre_completo: completo, asesor: emp.nombre, asesor_correo: emp.email, mensaje };
}
const llenar = (t: string, v: Record<string, string>, html: boolean) =>
  t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (html ? (k === "mensaje" ? esc(v.mensaje).replace(/\n/g, "<br>") : esc(v[k] ?? "")) : v[k] ?? ""));

// Diseño de los correos de Vera (igual a los de cotizaciones de autos). Si la plantilla trae su propio HTML completo, va tal cual.
function correoHtml(cuerpo: string, v: Record<string, string>) {
  const c = llenar(cuerpo, v, true).replace(/<p>\s*<\/p>/g, "");
  if (/^\s*(<!doctype|<html)/i.test(cuerpo)) return c;
  return `<div style="background:#f5f5f7;padding:24px 12px"><div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e3e8;border-radius:22px;padding:28px;color:#1d2433;font-size:15px;line-height:1.55">
  <img src="https://veraseguros.com/assets/logo-vera-wordmark.png" alt="Vera Seguros" width="120" style="display:block;margin:0 0 18px">
  ${c}
  <p style="margin:24px 0 4px"><b>${esc(v.asesor)}</b><br><span style="color:#646a78">Asesor · Vera Seguros</span></p>
  <p style="margin:18px 0"><a href="https://wa.me/573156705627" style="background:#25D366;color:#0b2217;padding:11px 20px;border-radius:980px;text-decoration:none;font-weight:600;display:inline-block">Escríbenos por WhatsApp</a></p>
  <p style="font-size:12px;color:#646a78;line-height:1.5;margin-top:24px;border-top:1px solid #e2e3e8;padding-top:14px">Vera Asesores Ltda., NIT 901.039.892-0, Medellín. Tratamos tus datos según nuestra <a href="https://veraseguros.com/politica-tratamiento-datos.html" style="color:#2d4777">política de datos</a>. Si no quieres recibir más correos, responde "no más".</p>
  </div></div>`;
}

async function enviarCorreo(para: string, asunto: string, html: string, emp: any) {
  const llave = Deno.env.get("RESEND_API_KEY");
  if (!llave) return "Falta RESEND_API_KEY";
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${llave}`, "content-type": "application/json" },
    body: JSON.stringify({ from: `${emp.nombre.replace(/[<>"]/g, "")} · Vera Seguros <cotizaciones@veraseguros.com>`, reply_to: emp.email, to: [para], bcc: [emp.email], subject: asunto, html }) });
  return r.ok ? "" : `Resend ${r.status} ${(await r.text()).slice(0, 150)}`;
}
async function enviarWa(tel: string, t: any, v: Record<string, string>) {
  const llave = Deno.env.get("WOZTELL_TOKEN");
  if (!llave) return "Falta WOZTELL_TOKEN";
  const params = (t.variables ?? []).map((k: string) => ({ type: "text", text: (v[k] ?? "").slice(0, 900) || "-" }));
  const r = await fetch(`https://bot.api.woztell.com/sendResponses?accessToken=${encodeURIComponent(llave)}`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ channelId: Deno.env.get("WOZTELL_CANAL") ?? "68fa428f24db78a9c72f8dcc", recipientId: "57" + tel,
      response: [{ type: "TEMPLATE", elementName: t.meta_nombre, languageCode: t.idioma, components: params.length ? [{ type: "body", parameters: params }] : [] }] }) });
  const j = await r.json().catch(() => ({}));
  return r.ok && j.ok === 1 ? "" : `Woztell ${r.status} ${JSON.stringify(j).slice(0, 150)}`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = { "Access-Control-Allow-Origin": ORIGENES.includes(origin) ? origin : ORIGENES[0], "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const res = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: cors });
  if (req.method !== "POST" || !ORIGENES.includes(origin)) return res({ ok: false }, 403);
  const emp = await empleado(req);
  if (!emp) return res({ ok: false, error: "Sin acceso" }, 401);

  const b = await req.json().catch(() => ({}));
  const mensaje = typeof b.mensaje === "string" ? b.mensaje.trim().slice(0, 2000) : "";
  const [{ data: p }, { data: t }] = await Promise.all([
    db.from("persona").select("id,nombre,email,telefono,no_contactar").eq("id", String(b.persona_id ?? "")).maybeSingle(),
    db.from("plantilla").select("*").eq("id", String(b.plantilla_id ?? "")).eq("activa", true).maybeSingle()]);
  if (!p || !t) return res({ ok: false, error: "Cliente o plantilla no existe" }, 404);
  if (p.no_contactar) return res({ ok: false, error: "El cliente pidió no recibir mensajes" });
  const v = variables(p, emp, mensaje);
  const asunto = t.canal === "correo" ? llenar(t.asunto, v, false).slice(0, 200) : "";

  if (b.accion === "vista") return res({ ok: true, canal: t.canal, para: t.canal === "correo" ? p.email : p.telefono, asunto,
    html: t.canal === "correo" ? correoHtml(t.cuerpo, v) : "", textos: t.canal === "whatsapp" ? (t.variables ?? []).map((k: string) => `${k}: ${v[k as keyof typeof v] ?? ""}`) : [] });
  if (b.accion !== "enviar") return res({ ok: false }, 400);

  const { count } = await db.from("envio").select("id", { count: "exact", head: true }).eq("empleado_id", emp.id).gte("creado", new Date(Date.now() - 864e5).toISOString());
  if ((count ?? 0) >= TOPE_DIA) return res({ ok: false, error: `Límite de ${TOPE_DIA} envíos en 24 h` }, 429);

  let error = "";
  if (t.canal === "correo") error = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email ?? "") ? await enviarCorreo(p.email, asunto, correoHtml(t.cuerpo, v), emp) : "El cliente no tiene correo";
  else error = /^3\d{9}$/.test(p.telefono ?? "") ? await enviarWa(p.telefono, t, v) : "El cliente no tiene celular";

  await db.from("envio").insert({ empleado_id: emp.id, persona_id: p.id, plantilla_id: t.id, canal: t.canal, ok: !error, detalle: error || null });
  if (error) { console.error(`enviar ${t.canal}: ${error}`); return res({ ok: false, error }); }
  await db.from("evento").insert({ persona_id: p.id, canal: t.canal, empleado_id: emp.id,
    texto: t.canal === "correo" ? `Correo enviado: ${asunto}` : `WhatsApp enviado: ${t.nombre}` });
  return res({ ok: true });
});
