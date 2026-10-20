// Crea un código corto (Ref) para el mensaje de WhatsApp y lo une al clic del anuncio (gclid/gbraid/wbraid).
// Lo llama /gracias.html (solo páginas de salud). Sin datos personales.
import { createClient } from "jsr:@supabase/supabase-js@2";
const ORIGENES = ["https://veraseguros.com", "https://www.veraseguros.com", "http://localhost:4173"];
const ALFA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const limpio = (v: unknown, n = 200) => (typeof v === "string" && /^[\w\-.]{1,200}$/.test(v) ? v.slice(0, n) : null);
Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = { "Access-Control-Allow-Origin": ORIGENES.includes(origin) ? origin : ORIGENES[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST" || !ORIGENES.includes(origin)) return new Response('{"ok":false}', { status: 403, headers: cors });
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* vacío */ }
  const gclid = limpio(b.gclid), gbraid = limpio(b.gbraid), wbraid = limpio(b.wbraid);
  if (!gclid && !gbraid && !wbraid) return new Response('{"ok":true,"ref":null}', { headers: cors }); // tráfico orgánico: sin código
  for (let i = 0; i < 4; i++) {
    const ref = Array.from(crypto.getRandomValues(new Uint8Array(6)), (x) => ALFA[x % ALFA.length]).join("");
    const { error } = await db.from("wa_ref").insert({ ref, gclid, gbraid, wbraid, origen: limpio(b.origen) ?? (typeof b.origen === "string" ? String(b.origen).slice(0, 120) : null), boton: limpio(b.boton, 60) });
    if (!error) return new Response(JSON.stringify({ ok: true, ref }), { headers: cors });
  }
  return new Response('{"ok":false}', { status: 500, headers: cors });
});
