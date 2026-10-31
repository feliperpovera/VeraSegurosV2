// Contraseñas del CRM: solo un gerente activo crea o cambia la contraseña de un empleado (por correo) o de "junta".
// POST { email | usuario, clave } con la sesión del gerente. La cuenta queda lista para entrar (sin correo de confirmación).
import { createClient } from "jsr:@supabase/supabase-js@2";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ORIGENES = ["https://veraseguros.com", "https://www.veraseguros.com", "http://localhost:4173"];

async function idPorCorreo(email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const u = data?.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u.id;
    if (!data || data.users.length < 200) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = { "Access-Control-Allow-Origin": ORIGENES.includes(origin) ? origin : ORIGENES[0], "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const res = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: cors });
  if (req.method !== "POST" || !ORIGENES.includes(origin)) return res({ ok: false }, 403);

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const yo = jwt ? (await db.auth.getUser(jwt)).data?.user?.email?.toLowerCase() : null;
  const { data: g } = yo ? await db.from("empleado").select("id").eq("email", yo).eq("rol", "gerente").eq("activo", true).maybeSingle() : { data: null };
  if (!g) return res({ ok: false, error: "Solo acceso total" }, 403);

  const b = await req.json().catch(() => ({}));
  const clave = typeof b.clave === "string" ? b.clave : "";
  if (clave.length < 10 || !/[A-Za-z]/.test(clave) || !/\d/.test(clave)) return res({ ok: false, error: "Mínimo 10 caracteres, con letras y números" });

  // A quién: un lector (junta) por usuario, o un empleado activo con acceso (no socios sin usuario) por correo.
  let email = "", lectorId = "";
  if (b.usuario) {
    const { data: l } = await db.from("lector").select("id,email").eq("usuario", String(b.usuario)).eq("activo", true).maybeSingle();
    if (l) { email = l.email; lectorId = l.id; }
  } else {
    const { data: e } = await db.from("empleado").select("email").eq("email", String(b.email ?? "").toLowerCase()).eq("activo", true).in("rol", ["gerente", "asesor"]).maybeSingle();
    if (e) email = e.email;
  }
  if (!email) return res({ ok: false, error: "Usuario no existe o no tiene acceso" }, 404);

  const id = await idPorCorreo(email);
  const { data, error } = id
    ? await db.auth.admin.updateUserById(id, { password: clave, email_confirm: true, user_metadata: { clave_creada: true } })
    : await db.auth.admin.createUser({ email, password: clave, email_confirm: true, user_metadata: { clave_creada: true } });
  if (error || !data.user) { console.error(`cuentas ${email}: ${error?.message}`); return res({ ok: false, error: "No se pudo guardar" }); }
  if (lectorId) await db.from("lector").update({ user_id: data.user.id }).eq("id", lectorId);
  return res({ ok: true });
});
