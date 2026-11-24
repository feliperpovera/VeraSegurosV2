// "Quiero esta" del cotizador de autos: el cliente elige una oferta y el equipo recibe el aviso al instante.
// La expedición solo queda completa cuando el cliente llena el SARLAFT y sube cédula y tarjeta de propiedad en la página
// (función autos, accion expedir → correo "EXPEDIR" con todo adjunto). Por eso este aviso y el correo al cliente llevan ese enlace.
// GET ?docs=<id>.<token>: enlace corto para WhatsApp (bot o asesor) que abre el formulario de documentos de la oferta elegida.
import { createClient } from "jsr:@supabase/supabase-js@2";
const ORIGENES = ["https://veraseguros.com", "https://www.veraseguros.com", "http://localhost:4173"];
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const EQUIPO = (Deno.env.get("CORREO_INTERNO") ?? "info@veraseguros.com,comercial@veraseguros.com,feliperestrepo@veraseguros.com").split(",");
const CORTO = "https://cwfvqusyvfdohjmgefli.supabase.co/functions/v1/autos-elegir?docs=";
const txt = (v: unknown, n = 80) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const peso = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
const linkDocs = (c: any, ofId: unknown, canal: string) =>
  `https://veraseguros.com/seguros/auto/?ver=${c.id}.${c.token}${ofId ? "&exp=" + encodeURIComponent(String(ofId)) : ""}&utm_source=${canal}&utm_medium=enlace&utm_campaign=autos_documentos#cotizador`;

async function correo(to: string[], subject: string, html: string, reply_to = "info@veraseguros.com") {
  const llave = Deno.env.get("RESEND_API_KEY");
  if (!llave) return false;
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${llave}`, "content-type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("CORREO_DE") ?? "Vera Seguros <cotizaciones@veraseguros.com>", reply_to, to, subject, html }) });
  if (!r.ok) console.error(`correo ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.ok;
}

async function elegir(b: any) {
  const { data: c } = await db.from("auto_cotizacion").select("id,token,datos,opp_id,wa_eleccion").eq("id", txt(b.id, 40)).maybeSingle();
  if (!c || c.token !== b.t) return { status: 403, body: { ok: false } };
  // La oferta tiene que ser de esta cotización (no se confía en el precio que manda el navegador).
  const { data: ofs } = await db.from("auto_oferta").select("data").eq("cotizacion_id", c.id).eq("evento", "oferta");
  const of = (ofs ?? []).map((x) => x.data).find((o) => (b.oferta?.id && String(o.id) === String(b.oferta.id)) || (!b.oferta?.id && o.aseguradora === b.oferta?.aseguradora && o.plan === b.oferta?.plan));
  if (!of) return { status: 400, body: { ok: false, error: "oferta" } };
  const p = c.wa_eleccion ?? {};
  if (p.via === "web") return { status: 200, body: { ok: true } }; // ya expidió en la página
  // Un aviso por oferta cada 6 h: volver a tocar el botón (o abrir el enlace de documentos) no llena de correos.
  if (p.via === "web-elegir" && p.plan === of.plan && p.aseguradora === of.aseguradora && Date.now() - Date.parse(p.fecha) < 6 * 3_600_000) return { status: 200, body: { ok: true } };
  await db.from("auto_cotizacion").update({ wa_eleccion: { id: of.id ?? null, aseguradora: of.aseguradora, plan: of.plan, precio: of.precio, fecha: new Date().toISOString(), via: "web-elegir" } }).eq("id", c.id);
  const d = c.datos ?? {}, veh = d.placa ? "placa " + d.placa : "vehículo 0 km", precio = of.precio ? peso(of.precio) : "—", n = String(d.empresa?.rep?.nombre || d.nombre || "").split(" ")[0];
  // Empresas y renovaciones: los documentos y el pago los gestiona un asesor (el formulario en línea es solo para personas).
  const asesor = !!d.empresa || !!of.renovacion, accion = of.renovacion ? "renovar" : "expedir";
  const piden = d.empresa ? `RUT, cámara de comercio (máximo 30 días), cédula del representante legal y ${d.placa ? "tarjeta de propiedad" : "factura de compra"}` : "";
  const corto = CORTO + `${c.id}.${c.token}`;
  // Cotización de precio menor (función autos-menor): el equipo debe expedir con el valor asegurado de esa oferta.
  const va = (of.coberturas ?? []).find((x: any) => x.tag === "VALASE")?.valor;
  const menor = d.valor ? `<p style="font-size:14px;background:#fdecea;padding:10px 12px;border-radius:8px"><b>POR DEBAJO DEL VALOR FASECOLDA.</b> El cliente pidió ${peso(d.valor)} (valor Fasecolda ${peso(d.guia)}) y esta oferta asegura ${esc(va || "un valor por confirmar")}. Confirma el valor con la aseguradora antes de expedir.</p>` : "";
  const avisoCliente = d.valor ? `<p style="font-size:15px;line-height:1.5;background:#fff8e1;color:#5c4400;padding:12px 14px;border-radius:10px"><b>Ten en cuenta:</b> pediste asegurar tu vehículo por ${peso(d.valor)}, por debajo del valor Fasecolda (${peso(d.guia)}). Esta oferta asegura <b>${esc(va || "un valor por confirmar")}</b>: en pérdida total o hurto recibirías como máximo ese valor, menos el deducible. Algunas aseguradoras pagan los daños parciales en proporción.</p>` : "";
  const msg = asesor ? `Hola ${n}, te escribe Vera Seguros. Vimos que quieres ${accion} ${of.aseguradora} ${of.plan} (${precio} al año) para tu ${veh}.${piden ? ` Para hacerlo necesitamos: ${piden}. Puedes enviarlos por aquí.` : " Te ayudamos con la renovación y el pago."}` : `Hola ${n}, te escribe Vera Seguros. Vimos que elegiste ${of.aseguradora} ${of.plan} (${precio} al año) para tu ${veh}${d.valor ? `, por debajo del valor Fasecolda (asegura ${va || "un valor por confirmar"}; Fasecolda ${peso(d.guia)})` : ""}. Para expedirla necesitamos el formulario SARLAFT y las fotos de tu cédula y ${d.placa ? "tarjeta de propiedad" : "factura de compra"}. Los subes aquí en 4 minutos: ${corto}`;
  const fila = (k: string, v: unknown) => `<tr><td style="padding:4px 12px 4px 0;color:#646a78">${k}</td><td style="padding:4px 0">${esc(v || "—")}</td></tr>`;
  const aviso = asesor
    ? `El cliente quiere <b>${accion}</b> esta opción${d.empresa ? ` para la empresa ${esc(d.empresa.razon)}, NIT ${esc(d.empresa.nit)}-${esc(d.empresa.dv)}` : ""}. <b>Lo gestiona un asesor</b>${piden ? `: pedir ${esc(piden)}` : ""}.`
    : `El cliente tocó <b>"Quiero esta"</b>. <b>Todavía faltan SARLAFT, cédula y ${d.placa ? "tarjeta de propiedad" : "factura de compra"}.</b> Ya le enviamos por correo el enlace para subirlos. Cuando los envíe, llega el correo <b>"EXPEDIR"</b> con todo adjunto. Si le escribes por WhatsApp, el botón de abajo ya lleva el enlace.`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:680px;color:#1d2433">
  <h2 style="color:#203152;margin:0 0 6px">ELIGIÓ OFERTA: ${esc(d.nombre)} ${esc(d.apellido)} · ${esc(veh)}</h2>
  <p style="font-size:15px;margin:0 0 14px"><b>${esc(of.aseguradora)} · ${esc(of.plan)}</b>${of.nivel ? " (" + esc(of.nivel) + ")" : ""} · <b>${precio}</b> al año · Ref. Agente Motor ${esc(c.opp_id || "—")}</p>${menor}
  <p style="font-size:14px;background:#fff8e1;padding:10px 12px;border-radius:8px">${aviso}</p>
  <table style="font-size:14px;border-collapse:collapse">${fila("Celular", d.tel)}${fila("Correo", d.email)}${fila(d.empresa ? "NIT" : "Cédula", d.doc)}</table>
  <p style="margin:20px 0"><a href="https://wa.me/57${esc(d.tel)}?text=${encodeURIComponent(msg)}" style="background:#25D366;color:#0b2217;padding:10px 18px;border-radius:980px;text-decoration:none;font-weight:600">${asesor ? "Escribirle" : "Pedirle documentos"} por WhatsApp</a>${asesor ? "</p>" : `
  &nbsp; <a href="${linkDocs(c, of.id, "asesor")}" style="color:#2d4777">Formulario de documentos</a></p>
  <p style="font-size:13px;color:#646a78">Enlace para pegar en el chat: ${esc(corto)}</p>`}</div>`;
  await correo(EQUIPO, `${d.valor ? "[DEBAJO DE FASECOLDA] " : ""}${of.renovacion ? "QUIERE RENOVAR" : d.empresa ? "ELIGIÓ OFERTA (empresa)" : "ELIGIÓ OFERTA (faltan documentos)"} autos: ${d.nombre} ${d.apellido} · ${veh} · ${of.aseguradora} ${of.plan} ${precio}`, html);
  if (!asesor && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email ?? "")) await correo([d.email], `${n}, completa tus documentos para expedir ${of.aseguradora}`, `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1d2433">
  <img src="https://veraseguros.com/assets/logo-vera-wordmark.png" alt="Vera Seguros" width="120" style="margin:16px 0">
  <h1 style="font-size:22px;color:#203152;margin:0 0 8px">${esc(n)}, falta un paso para expedir tu póliza</h1>
  <p style="font-size:15px;line-height:1.5;color:#4b5263">Elegiste <b>${esc(of.aseguradora)} · ${esc(of.plan)}</b> por <b>${precio}</b> al año para tu ${esc(veh)}. Para expedirla, la aseguradora pide:</p>
  <ul style="font-size:15px;line-height:1.6;color:#4b5263;padding-left:20px"><li>El formulario SARLAFT (lo llenas en línea)</li><li>Foto de tu cédula, frente y reverso</li><li>Foto de la ${d.placa ? "tarjeta de propiedad" : "factura de compra del vehículo"}</li></ul>${avisoCliente}
  <p style="margin:24px 0"><a href="${linkDocs(c, of.id, "correo")}" style="background:#203152;color:#fff;padding:14px 24px;border-radius:980px;text-decoration:none;font-weight:600;display:inline-block">Completar mis documentos (4 min)</a></p>
  <p style="font-size:15px;line-height:1.5;color:#4b5263">¿Prefieres que te ayudemos? Responde este correo o escríbenos por <a href="https://wa.me/573156705627" style="color:#1f7a3d">WhatsApp</a>.</p>
  <p style="font-size:12px;color:#646a78;line-height:1.5;margin-top:28px">La expedición está sujeta a la aceptación de la aseguradora, a la inspección del vehículo cuando aplique y al pago. Vera Asesores Ltda., NIT 901.039.892-0, Medellín.</p></div>`);
  return { status: 200, body: { ok: true } };
}

// Enlace corto: abre el formulario de documentos de la oferta elegida (o la cotización, si aún no eligió).
async function docs(ref: string) {
  const [id, t] = ref.split(".");
  const { data: c } = await db.from("auto_cotizacion").select("id,token,wa_eleccion").eq("id", txt(id, 40)).maybeSingle();
  if (!c || c.token !== t) return new Response("Enlace no válido", { status: 404 });
  const e = c.wa_eleccion ?? {};
  let ofId = e.id;
  if (!ofId && e.aseguradora) { // elecciones guardadas antes de tener id: se busca por aseguradora y plan
    const { data: ofs } = await db.from("auto_oferta").select("data").eq("cotizacion_id", c.id).eq("evento", "oferta");
    ofId = (ofs ?? []).map((x) => x.data).find((o) => o.aseguradora === e.aseguradora && o.plan === e.plan)?.id;
  }
  return new Response(null, { status: 302, headers: { location: linkDocs(c, ofId, "whatsapp") } });
}

Deno.serve(async (req) => {
  const ref = new URL(req.url).searchParams.get("docs");
  if (ref && req.method === "GET") return docs(ref);
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
