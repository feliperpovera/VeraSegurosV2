// Cuentas sin correo real (usuario "junta"): solo un gerente activo crea o cambia su contraseña.
// POST { usuario: "junta", clave } con la sesión del gerente. La clave nunca se guarda fuera de Supabase Auth.
import { createClient } from "jsr:@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ORIGENES = ["https://veraseguros.com", "https://www.veraseguros.com", "http://localhost:4173"];

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = { "Access-Control-Allow-Origin": ORIGENES.includes(origin) ? origin : ORIGENES[0], "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const res = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: cors });
  if (req.method !== "POST" || !ORIGENES.includes(origin)) return res({ ok: false }, 403);

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const email = jwt ? (await db.auth.getUser(jwt)).data?.user?.email?.toLowerCase() : null;
  const { data: g } = email ? await db.from("empleado").select("id").eq("email", email).eq("rol", "gerente").eq("activo", true).maybeSingle() : { data: null };
  if (!g) return res({ ok: false, error: "Solo acceso total" }, 403);

  const b = await req.json().catch(() => ({}));
  const clave = typeof b.clave === "string" ? b.clave : "";
  if (clave.length < 10 || !/[A-Za-z]/.test(clave) || !/\d/.test(clave)) return res({ ok: false, error: "Mínimo 10 caracteres, con letras y números" });
  const { data: l } = await db.from("lector").select("id,email,user_id").eq("usuario", String(b.usuario ?? "")).maybeSingle();
  if (!l) return res({ ok: false, error: "Usuario no existe" }, 404);

  if (l.user_id) {
    const { error } = await db.auth.admin.updateUserById(l.user_id, { password: clave });
    if (error) return res({ ok: false, error: "No se pudo cambiar" });
  } else {
    const { data, error } = await db.auth.admin.createUser({ email: l.email, password: clave, email_confirm: true });
    if (error || !data.user) return res({ ok: false, error: "No se pudo crear" });
    await db.from("lector").update({ user_id: data.user.id }).eq("id", l.id);
  }
  return res({ ok: true });
});
