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
function html(n: string, tema: string | null, baja: string) {
  const sobre = TEMA[tema ?? ""] ? ` sobre ${TEMA[tema!]}` : "";
  const btn = "display:inline-block;background:#203152;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 28px;border-radius:980px";
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px 12px;color:#1d2433;font-size:16px;line-height:1.6">
  <p style="margin:0 0 14px">Hola${n ? " " + esc(n) : ""},</p>
  <p style="margin:0 0 14px">Esta semana hablamos por WhatsApp${esc(sobre)}. Gracias por escribirnos.</p>
  <p style="margin:0 0 22px">Te pido un favor directo: ¿nos calificas en Google? Es 1 minuto y nos ayuda muchísimo a que otras familias de Medellín nos encuentren. Dinos con sinceridad cómo te atendimos.</p>
  <p style="margin:0 0 24px;text-align:center"><a href="${RESENA}" style="${btn}">Calificar a Vera en Google</a></p>
  <p style="margin:0 0 26px">Gracias,<br><strong>Felipe Restrepo</strong><br>Vera Seguros · Medellín</p>
  <p style="font-size:12px;color:#646a78;line-height:1.5;border-top:1px solid #e2e3e8;padding-top:14px;margin:0">Recibes este correo porque nos escribiste por WhatsApp. Vera Asesores Ltda., NIT 901.039.892-0, Medellín. <a href="${baja}" style="color:#2d4777">No recibir más correos</a>.</p></div>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url), baja = url.searchParams.get("baja");
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
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "content-type": "application/json" },
      body: JSON.stringify({ from: `Felipe Restrepo <${FELIPE}>`, reply_to: FELIPE, to: [c.email],
        subject: `${modo === "prueba" ? "[EJEMPLO] " : ""}${asunto(n)}`, html: html(n, c.tema, linkBaja),
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
