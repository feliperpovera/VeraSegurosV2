// Webhook "Inbound Messages" del canal de Woztell: marca el código Ref como conversación real.
// Solo actualiza códigos de los últimos 7 días; no guarda el texto ni el teléfono.
// Si existe el secret WOZTELL_SECRET, valida X-Woztell-Signature (HMAC-SHA256 base64 del body).
import { createClient } from "jsr:@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SECRETO = Deno.env.get("WOZTELL_SECRET");
const ok = (b: unknown) => new Response(JSON.stringify(b), { headers: { "Content-Type": "application/json" } });
async function firmaValida(raw: string, firma: string | null) {
  if (!SECRETO) return true;
  if (!firma) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRETO), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(raw)));
  return btoa(String.fromCharCode(...s)) === firma;
}
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const raw = await req.text().catch(() => "");
  if (!(await firmaValida(raw, req.headers.get("x-woztell-signature")))) return new Response("forbidden", { status: 403 });
  let texto = raw;
  try { const j = JSON.parse(raw); texto = j?.data?.text ?? JSON.stringify(j); } catch { /* texto plano */ }
  const m = String(texto).match(/Ref[:\s]+([A-HJ-NP-Z2-9]{6})\b/i);
  if (!m) return ok({ ok: true, ref: null });
  const desde = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data } = await db.from("wa_ref").update({ conversado_at: new Date().toISOString() })
    .eq("ref", m[1].toUpperCase()).is("conversado_at", null).gte("creado_at", desde).select("ref");
  return ok({ ok: true, marcado: (data?.length ?? 0) > 0 });
});
