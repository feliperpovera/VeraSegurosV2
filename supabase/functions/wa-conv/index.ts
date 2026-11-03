// Webhook "Inbound Messages" del canal de Woztell.
// 1) Marca el código Ref del anuncio como conversación real (últimos 7 días).
// 2) CRM: cada WhatsApp entrante crea o encuentra al cliente por celular, abre su oportunidad y deja el mensaje en el historial.
// Seguridad: firma X-Woztell-Signature (HMAC-SHA256 base64 del body con WOZTELL_SECRET) o ?clave= igual a config_interna.woztell_key.
// Sin una de las dos, solo hace el paso 1 (no escribe clientes).
import { createClient } from "jsr:@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SECRETO = Deno.env.get("WOZTELL_SECRET");
const ok = (b: unknown) => new Response(JSON.stringify(b), { headers: { "Content-Type": "application/json" } });
async function firma(raw: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRETO!), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(raw)))));
}
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const raw = await req.text().catch(() => "");
  const recibida = req.headers.get("x-woztell-signature");
  const firmada = !!SECRETO && !!recibida && (await firma(raw)) === recibida;
  const clave = new URL(req.url).searchParams.get("clave");
  const { data: cfg } = clave ? await db.from("config_interna").select("v").eq("k", "woztell_key").maybeSingle() : { data: null };
  const confiable = firmada || (!!cfg?.v && clave === cfg.v);
  if (SECRETO && !confiable) return new Response("forbidden", { status: 403 });

  let j: Record<string, any> = {};
  try { j = JSON.parse(raw); } catch { /* texto plano */ }
  const texto = String(j?.data?.text ?? (j?.type === "MISC" ? "(archivo)" : raw));
  let marcado = false;
  const m = texto.match(/Ref[:\s]+([A-HJ-NP-Z2-9]{6})\b/i);
  if (m) {
    const desde = new Date(Date.now() - 7 * 864e5).toISOString();
    const { data } = await db.from("wa_ref").update({ conversado_at: new Date().toISOString() })
      .eq("ref", m[1].toUpperCase()).is("conversado_at", null).gte("creado_at", desde).select("ref");
    marcado = (data?.length ?? 0) > 0;
  }
  // Solo mensajes del cliente (TEXT/MISC con from); no los del bot, agentes ni difusiones.
  const entrante = ["TEXT", "MISC"].includes(j?.type) && !j?.messageEvent && typeof j?.from === "string";
  if (!confiable || !entrante) return ok({ ok: true, marcado, crm: false });
  const { data: crm, error } = await db.rpc("wa_entrante", { p_tel: j.from, p_nombre: j?.memberExtra?.name ?? null, p_texto: texto });
  if (error) console.error("wa_entrante", error.message);
  return ok({ ok: true, marcado, crm });
});
