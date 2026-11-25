// Correo de Felipe Restrepo para recuperar a clientes que hoy no tienen ningún seguro con Vera.
// Solo escribe a las filas de public.correo_caida (lista fija aprobada) sin omitir, sin enviar y sin baja, y vuelve a comprobar que sigan en plan_caida.
// ?baja=<id>.<token> (GET o POST de un clic): no se le vuelve a escribir (persona.no_contactar).
// Modos (header x-tarea = config_interna.tareas_token): "" solo cuenta · prueba: un ejemplo a Felipe · enviar: envío real, hasta LOTE por corrida.
import { createClient } from "jsr:@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const LOTE = 60, FELIPE = "feliperestrepo@veraseguros.com";
const BASE = "https://cwfvqusyvfdohjmgefli.supabase.co/functions/v1/correo-caida";
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
const pagina = (t: string) => new Response(`${t}\n\nVera Seguros`, { headers: { "content-type": "text/plain; charset=utf-8" } }); // Supabase no sirve text/html por GET
const asunto = (c: any) => `${c.nombre}, ¿te ayudo a retomar ${c.seguro}?`;
// WhatsApp de Felipe (pedido suyo); los demás enlaces del sitio van al de Vera.
const wa = (c: any) => `https://wa.me/573176678204?text=${encodeURIComponent(`Hola, soy ${c.nombre}. Quiero cotizar de nuevo ${String(c.seguro).replace(/^tu /, "mi ").replace(/ y tu /g, " y mi ").replace(/ de tu /g, " de mi ")}.`)}`;
const activo = (c: any) => c.varios ? "ya no están activos y me gustaría ayudarte a tenerlos de nuevo" : "ya no está activo y me gustaría ayudarte a tenerlo de nuevo";

function html(c: any, baja: string) {
  const paso = (n: number, t: string) => `<tr><td width="34" valign="top" style="padding:0 0 12px"><div style="width:26px;height:26px;border-radius:50%;background:#e7ecf8;color:#203152;font-weight:700;font-size:13px;line-height:26px;text-align:center">${n}</div></td><td valign="top" style="padding:2px 0 12px;font-size:16px;color:#1d2433">${t}</td></tr>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>Vera Seguros</title></head>
  <body style="margin:0;padding:0;background:#f5f5f7">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">Comparo varias compañías por ti y te envío opciones y precios, sin compromiso.&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
  <div style="padding:24px 12px"><div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:22px;padding:30px 28px;color:#1d2433;font-size:16px;line-height:1.55">
  <img src="https://veraseguros.com/assets/logo-vera-wordmark.png" alt="Vera Seguros" width="110" style="display:block;margin:0 0 22px;border:0">
  <p style="margin:0 0 14px">Hola ${esc(c.nombre)},</p>
  <p style="margin:0 0 14px">Soy Felipe Restrepo, de Vera Seguros. Vi que ${esc(c.seguro)} con nosotros ${activo(c)}.</p>
  <p style="margin:0 0 20px">Volver a asegurarte es fácil:</p>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 10px">${paso(1, "Me escribes por WhatsApp o respondes este correo.")}${paso(2, "Comparo varias compañías y te envío opciones y precios, sin compromiso.")}${paso(3, "Eliges la que más te sirva y te acompaño en todo el proceso.")}</table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 22px"><tr><td align="center" bgcolor="#25D366" style="border-radius:980px"><a href="${wa(c)}" style="display:block;padding:16px 12px;color:#0b2217;text-decoration:none;font-weight:700;font-size:17px;line-height:1.2;border-radius:980px">Quiero que me coticen</a></td></tr></table>
  <p style="margin:0 0 24px">Un abrazo,<br><strong>Felipe Restrepo</strong><br><span style="color:#4b5263">Vera Seguros · Medellín</span></p>
  <p style="font-size:12px;color:#646a78;line-height:1.5;border-top:1px solid #e2e3e8;padding-top:14px;margin:0">Recibes este correo porque tuviste un seguro con Vera Seguros. Vera Asesores Ltda., NIT 901.039.892-0, Medellín. <a href="${baja}" style="color:#2d4777">No recibir más correos</a>.</p></div></div></body></html>`;
}
const texto = (c: any, baja: string) => `Hola ${c.nombre},\n\nSoy Felipe Restrepo, de Vera Seguros. Vi que ${c.seguro} con nosotros ${activo(c)}.\n\nVolver a asegurarte es fácil:\n1. Me escribes por WhatsApp o respondes este correo.\n2. Comparo varias compañías y te envío opciones y precios, sin compromiso.\n3. Eliges la que más te sirva y te acompaño en todo el proceso.\n\nEscríbeme: ${wa(c)}\n\nUn abrazo,\nFelipe Restrepo\nVera Seguros · Medellín\n\nNo recibir más correos: ${baja}`;

Deno.serve(async (req) => {
  const url = new URL(req.url), baja = url.searchParams.get("baja");
  if (baja) {
    const [id, t] = baja.split(".");
    const { data: c } = await db.from("correo_caida").select("token,persona_id").eq("id", String(id).slice(0, 40)).maybeSingle();
    if (!c || !t || c.token !== t) return pagina("Enlace no válido");
    await db.from("correo_caida").update({ baja: new Date().toISOString() }).eq("id", id);
    await db.from("persona").update({ no_contactar: true }).eq("id", c.persona_id);
    return pagina("Listo, no te enviaremos más correos.");
  }
  const { data: k } = await db.from("config_interna").select("v").eq("k", "tareas_token").single();
  if (!k || req.headers.get("x-tarea") !== k.v) return new Response("no", { status: 403 });
  const modo = url.searchParams.get("modo") ?? "";
  const { data: filas, error } = await db.from("correo_caida").select("id,persona_id,email,nombre,seguro,varios,token").is("omitir", null).is("enviado", null).is("baja", null).order("creado").order("id");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const { data: plan } = await db.from("plan_caida").select("persona_id").limit(1000); // sigue sin ningún seguro y sin no_contactar
  const vale = new Set((plan ?? []).map((x: any) => x.persona_id));
  const lista = (filas ?? []).filter((c: any) => vale.has(c.persona_id));
  const id0 = crypto.randomUUID();
  const turno = modo === "prueba" ? [{ ...(lista.find((c: any) => c.seguro === "tu seguro de salud") ?? lista[0]), email: FELIPE }] : modo === "enviar" ? lista.slice(0, LOTE) : [];
  let enviados = 0, alto = ""; const fallidos: string[] = [];
  for (const c of turno as any[]) {
    const link = modo === "prueba" ? `${BASE}?baja=${id0}.ejemplo` : `${BASE}?baja=${c.id}.${c.token}`;
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "content-type": "application/json" },
      body: JSON.stringify({ from: `Felipe Restrepo · Vera Seguros <${FELIPE}>`, reply_to: FELIPE, to: [c.email], subject: `${modo === "prueba" ? "[EJEMPLO] " : ""}${asunto(c)}`, html: html(c, link), text: texto(c, link),
        headers: { "List-Unsubscribe": `<${link}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }) });
    if (!r.ok) { const e = `${r.status} ${(await r.text()).slice(0, 160)}`; fallidos.push(e); if (modo === "enviar") await db.from("correo_caida").update({ error: e }).eq("id", c.id); if (r.status === 429) { alto = e; break; } continue; }
    enviados++;
    if (modo === "prueba") break;
    await db.from("correo_caida").update({ enviado: new Date().toISOString(), error: null }).eq("id", c.id);
    await db.from("evento").insert({ persona_id: c.persona_id, canal: "correo", texto: `Correo enviado: ${asunto(c)}` });
    await new Promise((f) => setTimeout(f, 700)); // límite de Resend por segundo
  }
  return new Response(JSON.stringify({ pendientes: lista.length, enviados, fallidos: fallidos.slice(0, 5), alto, modo }), { headers: { "content-type": "application/json" } });
});
