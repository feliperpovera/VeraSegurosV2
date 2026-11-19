// Correo de Felipe Restrepo pidiendo reseña en Google a quienes escribieron por WhatsApp (Woztell) la última semana
// (pg_cron: sábados y domingos 11 a. m. Bogotá). Personalizado con el primer nombre y el seguro del que hablamos.
// Candidatos: public.resena_candidatos(7) — correo válido, sin no_contactar, sin baja y sin correo de reseña en 180 días.
// ?baja=<id>.<token> (GET o POST de un clic) agrega el correo a resena_baja.
// Modos (header x-tarea = config_interna.tareas_token): "" solo cuenta · prueba: un ejemplo a Felipe · enviar: envío real.
import { createClient } from "jsr:@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const LOTE = 90; // ponytail: tope por corrida bajo el límite diario de Resend (100); si la semana trae más, el resto entra en la siguiente corrida.
const FELIPE = "feliperestrepo@veraseguros.com";
const BASE = "https://cwfvqusyvfdohjmgefli.supabase.co/functions/v1/resena-semanal";
const RESENA = "https://g.page/r/CXbdOkdCPaR4EAI/review";
const EMPRESA = /\b(s\.?a\.?s|ltda|s\.?a\.?|cia|corp|fundaci|asociaci|grupo|inversiones|constructora|colegio|comercializadora)\b/i;
// Seguro del que hablamos (oportunidad o póliza en el CRM). Sin dato: frase neutra.
const TEMA: Record<string, string> = {
  Autos: "tu seguro de carro", "Autos Colectivos": "tu seguro de carro", SOAT: "tu SOAT", Salud: "tu seguro de salud",
  Vida: "tu seguro de vida", Hogar: "tu seguro de hogar", Arrendamiento: "tu seguro de arrendamiento", Viajes: "tu seguro de viaje",
  Cumplimiento: "tu póliza de cumplimiento", "Responsabilidad civil": "tu póliza de responsabilidad civil", Empresarial: "los seguros de tu empresa",
};
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
const primerNombre = (n: string) => EMPRESA.test(n) ? "" : (n.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/^\p{L}/u, (c) => c.toUpperCase());
const pagina = (t: string) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:-apple-system,Roboto,Arial,sans-serif;text-align:center;padding:48px 20px;color:#203152"><h1 style="font-size:20px">${t}</h1><p>Vera Seguros</p>`, { headers: { "content-type": "text/html; charset=utf-8" } });

const asunto = (n: string) => n ? `${n}, ¿me regalas 1 minuto?` : "¿Me regalas 1 minuto?";
const IMG = "https://veraseguros.com/assets/email-resena-google.jpg?v=2"; // 1080x760; muestra la calificación (4,9), no el número de reseñas
const PREVIEW ="Una calificación tuya en Google nos ayuda muchísimo. Es 1 minuto.";
// Pensado para celular: texto corto, botón ancho (fácil de tocar con el pulgar) arriba del pliegue.
function html(n: string, tema: string | null, ir: string, baja: string) {
  const sobre = TEMA[tema ?? ""] ? ` sobre ${TEMA[tema!]}` : "";
  const btn = (t: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px"><tr><td align="center" bgcolor="#203152" style="border-radius:14px">
    <a href="${ir}" style="display:block;padding:18px 12px;color:#ffffff;text-decoration:none;font-weight:700;font-size:18px;line-height:1.2;border-radius:14px">${t}</a></td></tr></table>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>Vera Seguros</title></head>
  <body style="margin:0;padding:0;background:#ffffff">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${PREVIEW}&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px 18px;color:#1d2433;font-size:17px;line-height:1.55">
  <a href="${ir}" style="display:block;margin:0 0 20px"><img src="${IMG}" width="444" alt="¿Nos regalas 1 minuto? Califica a Vera Seguros en Google" style="display:block;width:100%;max-width:444px;height:auto;border:0;border-radius:16px"></a>
  <p style="margin:0 0 12px">Hola${n ? " " + esc(n) : ""},</p>
  <p style="margin:0 0 20px">Esta semana hablamos por WhatsApp${esc(sobre)}. ¿Nos calificas en Google? Es 1 minuto y ayuda a que otras familias nos encuentren.</p>
  ${btn("Calificar a Vera en Google")}
  <p style="margin:0 0 20px;font-size:15px;color:#4b5263">Dinos con sinceridad cómo te atendimos. Si algo no salió bien, también puedes responder este correo y lo resuelvo yo.</p>
  <p style="margin:0 0 24px">Gracias,<br><strong>Felipe Restrepo</strong><br><span style="color:#4b5263">Vera Seguros · Medellín</span></p>
  <p style="font-size:12px;color:#646a78;line-height:1.5;border-top:1px solid #e2e3e8;padding-top:14px;margin:0">Recibes este correo porque nos escribiste por WhatsApp. Vera Asesores Ltda., NIT 901.039.892-0. <a href="${baja}" style="color:#2d4777">No recibir más correos</a>.</p></div></body></html>`;
}
// Versión en texto plano: mejora la entrega en la bandeja principal.
const texto = (n: string, tema: string | null, ir: string, baja: string) =>
  `Hola${n ? " " + n : ""},\n\nEsta semana hablamos por WhatsApp${TEMA[tema ?? ""] ? " sobre " + TEMA[tema!] : ""}. ¿Nos calificas en Google? Es 1 minuto:\n${ir}\n\nDinos con sinceridad cómo te atendimos. Si algo no salió bien, responde este correo y lo resuelvo yo.\n\nGracias,\nFelipe Restrepo\nVera Seguros · Medellín\n\nNo recibir más correos: ${baja}`;

Deno.serve(async (req) => {
  const url = new URL(req.url), baja = url.searchParams.get("baja"), ir = url.searchParams.get("ir");
  // ?ir=<id>.<token>: registra el clic (para medir y no insistir a quien ya calificó) y lleva a la reseña de Google.
  if (ir) {
    const [id, t] = ir.split(".");
    const { data: e } = await db.from("resena_envio").select("token,clic").eq("id", String(id).slice(0, 40)).maybeSingle();
    if (e && t && e.token === t && !e.clic) await db.from("resena_envio").update({ clic: new Date().toISOString() }).eq("id", id);
    return Response.redirect(RESENA, 302);
  }
  if (baja) {
    const [id, t] = baja.split(".");
    const { data: e } = await db.from("resena_envio").select("email,token").eq("id", String(id).slice(0, 40)).maybeSingle();
    if (!e || !t || e.token !== t) return pagina("Enlace no válido");
    await db.from("resena_baja").upsert({ email: e.email });
    return pagina("Listo, no te enviaremos más correos.");
  }
  const { data: k } = await db.from("config_interna").select("v").eq("k", "tareas_token").single();
  if (!k || req.headers.get("x-tarea") !== k.v) return new Response("no", { status: 403 });
  const modo = url.searchParams.get("modo") ?? "";
  const { data: cs, error } = await db.rpc("resena_candidatos", { p_dias: 7 });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  // prueba: siempre un ejemplo a Felipe, aunque no haya candidatos esta semana.
  const lista = modo === "prueba" ? [{ persona_id: null, email: FELIPE, nombre: "Felipe", tema: "Autos" }] : (cs ?? []);
  let enviados = 0, fallidos = 0;
  for (const c of modo ? lista.slice(0, LOTE) : []) {
    const id = crypto.randomUUID(), token = crypto.randomUUID().replace(/-/g, "");
    const linkBaja = `${BASE}?baja=${id}.${token}`, n = primerNombre(c.nombre ?? "");
    const linkIr = modo === "prueba" ? RESENA : `${BASE}?ir=${id}.${token}`; // la prueba no queda registrada, va directo
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "content-type": "application/json" },
      body: JSON.stringify({ from: `Felipe Restrepo · Vera Seguros <${FELIPE}>`, reply_to: FELIPE, to: [c.email],
        subject: `${modo === "prueba" ? "[EJEMPLO] " : ""}${asunto(n)}`, html: html(n, c.tema, linkIr, linkBaja), text: texto(n, c.tema, linkIr, linkBaja),
        headers: { "List-Unsubscribe": `<${linkBaja}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }) });
    if (!r.ok) { fallidos++; console.error(`resena ${r.status} ${(await r.text()).slice(0, 200)}`); continue; }
    enviados++;
    if (modo === "prueba") break;
    await db.from("resena_envio").insert({ id, email: c.email, persona_id: c.persona_id, token, origen: "semanal" });
    await db.from("evento").insert({ persona_id: c.persona_id, canal: "correo", texto: "Correo enviado: reseña Google (semanal)" });
    await new Promise((f) => setTimeout(f, 600)); // límite de Resend por segundo
  }
  return new Response(JSON.stringify({ candidatos: cs?.length ?? 0, enviados, fallidos, modo }), { headers: { "content-type": "application/json" } });
});
