// Renovaciones de autos en el CRM (solo empleados activos, sesión de Supabase Auth):
//  leer    { contenido }           → lector propio (lector.ts, sin IA ni API) + datos del cliente en el CRM por placa, póliza o documento; el asesor corrige antes de cotizar
//  corregir { muestra, datos }     → guarda lo que quedó corregido: alimenta el ciclo de mejora del lector (tools/lector-loop.mjs)
//  excluir { id, t, excluir }      → compañías que se quitan del comparativo
//  vista   { id, t }               → a quién le llega, asunto y cuántas opciones lleva
//  enviar  { id, t, mensaje, reenviar } → correo al cliente DESDE comunicaciones@, con copia a info@ y operaciones2@
// Solo renovaciones: lo exige datos.renovacion. Secreto: RESEND_API_KEY.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getDocumentProxy, extractText } from "npm:unpdf@0.12.1";
import { leerTexto } from "./lector.ts";
const ORIGENES = ["https://veraseguros.com", "https://www.veraseguros.com", "http://localhost:4173"];
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const DE = "Vera Seguros <comunicaciones@veraseguros.com>", RESPUESTA = "comunicaciones@veraseguros.com";
const COPIA = ["info@veraseguros.com", "operaciones2@veraseguros.com"], OCULTA = ["comunicaciones@veraseguros.com"]; // Resend no deja rastro en Enviados de Outlook
const MAX_B64 = 11_000_000; // ~8 MB
const txt = (v: unknown, n = 80) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const peso = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]!));
const norm = (v: unknown) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const canon = (v: unknown) => norm(v).replace(/^liberty.*/, "hdi").replace(/.*colpatria.*|^axa.*/, "axa");
const CIAS = ["sura", "bolivar", "hdi", "allianz", "axa", "mapfre", "sbs", "zurich", "qualitas", "solidaria"];
const cia = (v: unknown) => ({ liberty: "HDI", colpatria: "AXA Colpatria", bolivar: "Bolívar", sura: "SURA", mapfre: "MAPFRE" }[norm(v)] ?? String(v ?? ""));
const POR_KM = /kil[oó]metr|por\s*km/i;
const fechaTxt = (f: string) => { const [a, m, d] = f.split("-").map(Number); return a ? `${d} de ${["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][m - 1]} de ${a}` : ""; };

async function empleado(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const email = (await db.auth.getUser(jwt)).data?.user?.email?.toLowerCase();
  if (!email) return null;
  return (await db.from("empleado").select("id,nombre,email,rol").eq("email", email).eq("activo", true).maybeSingle()).data;
}

// PDF con clave: la de las carátulas de Vera y el NIT (igual que en el lector del correo).
async function textoPdf(bytes: Uint8Array, claves: string[]) {
  for (const c of [undefined, ...claves]) try { return String((await extractText(await getDocumentProxy(bytes.slice(), c ? { password: c } : {}), { mergePages: true })).text); } catch { /* otra clave */ }
  return null;
}
// Cliente en el CRM: por la placa, el número de póliza o el documento leídos.
async function clienteCrm(d: any) {
  const dig = (v: unknown) => String(v ?? "").replace(/\D/g, ""), campos = "nombre,cedula,tipo_doc,telefono,email,ciudad,nacimiento,genero,empresa,direccion";
  const por = async (col: string, v: string) => (v ? (await db.from("poliza").select(`persona:persona_id(${campos})`).eq(col, v).not("persona_id", "is", null).order("vigencia_desde", { ascending: false }).limit(1).maybeSingle()).data?.persona as any : null);
  let p = await por("datos->>placa", d.placa ?? ""), via = "placa";
  if (!p) { p = await por("numero", d.numero ?? ""); via = "póliza"; }
  if (!p && dig(d.documento).length >= 6) { p = (await db.from("persona").select(campos).in("cedula", [dig(d.documento), dig(d.documento_original)].filter(Boolean)).limit(1).maybeSingle()).data; via = "documento"; }
  return p ? { ...p, via } : null;
}
async function leer(b: any) {
  const pdf = typeof b.contenido === "string" ? b.contenido.replace(/^data:[^,]+,/, "") : "";
  if (!pdf.startsWith("JVBER")) return { status: 400, body: { ok: false, error: "Sube la carátula en PDF." } };
  if (pdf.length > MAX_B64) return { status: 400, body: { ok: false, error: "El PDF pesa más de 8 MB." } };
  const bytes = Uint8Array.from(atob(pdf), (ch) => ch.charCodeAt(0)), { data: k } = await db.from("config_interna").select("v").eq("k", "pdf_clave").maybeSingle();
  const texto = await textoPdf(bytes, [k?.v ?? "", "9010398920", "39892"].filter(Boolean));
  if (texto === null) return { status: 200, body: { ok: false, error: "El PDF tiene clave o está dañado. Sube una copia sin clave." } };
  const d = leerTexto(texto);
  if (!d.es_auto && !d.escaneado) return { status: 200, body: { ok: false, error: "El PDF no parece una carátula de carro o moto." } };
  const ruta = `renovaciones/${crypto.randomUUID()}.pdf`, { error } = await db.storage.from("caratulas").upload(ruta, bytes, { contentType: "application/pdf" });
  if (error) console.error(`storage ${error.message}`);
  const { data: m } = d.escaneado ? { data: null } : await db.from("lector_muestra").insert({ texto: texto.replace(/\s+/g, " ").slice(0, 20000), leido: d }).select("id").maybeSingle();
  return { status: 200, body: { ok: true, pdf: error ? "" : ruta, datos: d, muestra: m?.id ?? null, crm: await clienteCrm(d).catch(() => null),
    aviso: d.escaneado ? "El PDF es una imagen escaneada y no tiene texto. Guardamos la carátula: llena los datos." : "" } };
}
async function corregir(b: any) {
  const d: any = {}; for (const k of ["aseguradora", "plan", "numero", "vence", "placa", "documento", "tomador", "rc", "ptd", "pth", "ppd", "reemplazo", "grua"]) d[k] = txt(b.datos?.[k], 100);
  d.prima = Math.round(Number(b.datos?.prima) || 0); d.valor = Math.round(Number(b.datos?.valor) || 0);
  await db.from("lector_muestra").update({ corregido: d }).eq("id", txt(b.muestra, 40));
  return { status: 200, body: { ok: true } };
}

async function buscar(b: any) {
  const { data: c } = await db.from("auto_cotizacion").select("id,token,datos,opp_id,creado,veh:respuesta->data->insurable_objects->0->vehicle").eq("id", txt(b.id, 40)).maybeSingle();
  return c && c.token === b.t && c.datos?.renovacion ? c : null;
}
async function ofertas(c: any) {
  const { data: o } = await db.from("auto_oferta").select("data").eq("cotizacion_id", c.id).eq("evento", "oferta");
  const m = new Map<string, any>(), fuera = c.datos.excluir ?? [];
  for (const { data: x } of o ?? []) if (x.precio && !POR_KM.test(x.plan) && (x.renovacion || !fuera.includes(canon(x.aseguradora)))) m.set(`${x.aseguradora}|${x.plan}`, x);
  const l = [...m.values()].sort((a, z) => a.precio - z.precio);
  return { ren: l.find((x) => x.renovacion), otras: l.filter((x) => !x.renovacion) };
}
const cob = (o: any, tag: string) => (o?.coberturas ?? []).find((x: any) => x.tag === tag)?.valor ?? "";
const vehiculo = (c: any) => [c.veh?.brand, c.veh?.line].filter(Boolean).join(" ") + (c.veh?.model ? ` · ${c.veh.model}` : "");
const saludo = (d: any) => String(d.empresa?.rep?.nombre || d.nombre || "").toLowerCase().replace(/(^|\s)\p{L}/gu, (x) => x.toUpperCase()).split(" ")[0];
const asunto = (c: any) => `Renovación de tu seguro de ${c.datos.placa || "tu vehículo"}: opciones y tarifas`;

function html(c: any, ren: any, otras: any[], mensaje: string, asesor: string) {
  const d = c.datos, x = d.renovacion, u = "utm_source=correo&utm_medium=email&utm_campaign=autos_renovacion";
  const ver = `https://veraseguros.com/seguros/auto/?ver=${c.id}.${c.token}&${u}#cotizador`, pdf = `https://veraseguros.com/cotizador-de-autos/?ver=${c.id}.${c.token}&pdf=1&${u}`;
  const wa = "https://wa.me/573156705627?text=" + encodeURIComponent(`Hola Vera Seguros, quiero renovar el seguro de mi vehículo ${d.placa || ""}.`);
  const dato = (k: string, v: unknown) => v ? `<tr><td style="padding:4px 14px 4px 0;color:#646a78">${k}</td><td style="padding:4px 0;font-weight:600">${esc(v)}</td></tr>` : "";
  const dif = (p: number) => { const n = p - ren.precio; return Math.abs(n) < 1000 ? "igual" : n < 0 ? `<span style="color:#1d6b54">${peso(-n)} menos</span>` : `${peso(n)} más`; };
  const fila = (o: any) => `<tr><td style="padding:9px 6px 9px 0;border-bottom:1px solid #e2e3e8"><b>${esc(cia(o.aseguradora))}</b><br><span style="color:#646a78;font-size:13px">${esc(o.plan)}${cob(o, "VALASE") ? ` · asegura ${esc(cob(o, "VALASE"))}` : ""}${cob(o, "DEBPPD") ? ` · daños parciales: ${esc(cob(o, "DEBPPD"))}` : ""}</span></td><td style="padding:9px 0;border-bottom:1px solid #e2e3e8;text-align:right;white-space:nowrap"><b style="color:#203152">${peso(o.precio)}</b>${o.renovacion ? "" : `<br><span style="font-size:12.5px;color:#646a78">${dif(o.precio)}</span>`}</td></tr>`;
  const grupo = (t: string) => { const l = otras.filter((o) => (o.nivel || "Básica") === t); return l.length ? `<h3 style="font-size:16px;color:#203152;margin:22px 0 4px">${t === "Premium" ? "Premium: el plan más completo" : t === "Esencial" ? "Esencial: plan intermedio" : "Básica: plan de entrada"}</h3><table style="width:100%;border-collapse:collapse;font-size:14.5px">${l.map(fila).join("")}</table>` : ""; };
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1d2433;font-size:15px;line-height:1.5">
  <img src="https://veraseguros.com/assets/logo-vera-wordmark.png" alt="Vera Seguros" width="120" style="margin:16px 0">
  <h1 style="font-size:22px;color:#203152;margin:0 0 8px">${esc(saludo(d))}, esta es la renovación de tu seguro</h1>
  <p style="color:#4b5263;margin:0 0 14px">${mensaje ? esc(mensaje).replace(/\n/g, "<br>") : "Revisamos la renovación que envió tu aseguradora y la comparamos con otras compañías para el mismo vehículo."}</p>
  <table style="font-size:14px;border-collapse:collapse;margin-bottom:16px">${d.empresa ? dato("Empresa", `${d.empresa.razon} · NIT ${d.empresa.nit}-${d.empresa.dv}`) : ""}${dato("Vehículo", vehiculo(c))}${dato("Placa", d.placa)}${dato("Código Fasecolda", c.veh?.codification?.code)}${dato("Póliza actual", x.numero)}${dato("Vence", x.vence ? fechaTxt(x.vence) : "")}</table>
  <div style="background:#eef6f2;border:2px solid #218166;border-radius:14px;padding:14px 16px"><p style="margin:0;font-size:13px;font-weight:700;color:#218166;text-transform:uppercase">Tu renovación</p>
  <p style="margin:4px 0 2px;font-size:18px;font-weight:700;color:#203152">${esc(cia(x.aseguradora))}${x.plan ? " · " + esc(x.plan) : ""} · ${peso(x.prima)} al año</p>
  <p style="margin:0;font-size:13.5px;color:#4b5263">${[x.valor ? `Valor asegurado ${peso(x.valor)}` : "", ...[["RESEXT", "Responsabilidad civil"], ["DEBPTD", "Pérdida total daños"], ["DEBPTH", "Pérdida total hurto"], ["DEBPPD", "Daños parciales"], ["VEHRPT", "Reemplazo"], ["SERGRU", "Grúa"]].map(([k, t]) => x.cob?.[k] ? `${t}: ${x.cob[k]}` : "")].filter(Boolean).map(esc).join(" · ")}</p></div>
  ${otras.length ? `<h2 style="font-size:18px;color:#203152;margin:26px 0 0">Otras opciones para comparar</h2><p style="font-size:13px;color:#646a78;margin:2px 0 0">Precio anual y diferencia frente a tu renovación.</p>${["Premium", "Esencial", "Básica"].map(grupo).join("")}` : ""}
  <p style="margin:26px 0 10px"><a href="${wa}" style="background:#25D366;color:#0b2217;padding:14px 24px;border-radius:980px;text-decoration:none;font-weight:700;display:inline-block">Quiero renovar</a></p>
  <p style="font-size:14px"><a href="${pdf}" style="color:#2d4777">Ver comparativo en PDF</a> &nbsp;·&nbsp; <a href="${ver}" style="color:#2d4777">Ver todas las coberturas</a></p>
  <p style="margin:18px 0 0"><b>${esc(asesor)}</b><br><span style="color:#646a78">Vera Seguros</span></p>
  <p style="font-size:12px;color:#646a78;line-height:1.5;margin-top:24px">${d.renovacion.pdf ? "La carátula de la renovación va adjunta. " : ""}Las otras opciones son precios de referencia a la fecha, sujetos a inspección y aceptación de cada aseguradora. Vera Asesores Ltda., NIT 901.039.892-0, Medellín.</p></div>`;
}

async function vista(b: any) {
  const c = await buscar(b);
  if (!c) return { status: 403, body: { ok: false } };
  const { ren, otras } = await ofertas(c);
  return { status: 200, body: { ok: true, para: c.datos.email || "", de: RESPUESTA, copia: COPIA, asunto: asunto(c), renovacion: ren ? `${cia(ren.aseguradora)} · ${peso(ren.precio)}` : "", opciones: otras.length, companias: [...new Set(otras.map((o) => cia(o.aseguradora)))], adjunto: !!c.datos.renovacion.pdf, enviada: c.datos.renovacion_enviada ?? null } };
}
async function enviar(b: any, emp: any) {
  const c = await buscar(b);
  if (!c) return { status: 403, body: { ok: false } };
  const d = c.datos;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email ?? "")) return { status: 200, body: { ok: false, error: "El cliente no tiene un correo válido." } };
  if (d.renovacion_enviada && b.reenviar !== true) return { status: 200, body: { ok: false, error: "enviada", enviada: d.renovacion_enviada } };
  const { ren, otras } = await ofertas(c);
  if (!ren) return { status: 200, body: { ok: false, error: "Falta la oferta de renovación." } };
  let adjuntos: any[] = [];
  if (d.renovacion.pdf) {
    const { data: f } = await db.storage.from("caratulas").download(d.renovacion.pdf);
    if (!f) return { status: 200, body: { ok: false, error: "No se pudo adjuntar la carátula. Intenta de nuevo." } };
    const by = new Uint8Array(await f.arrayBuffer()); let s = ""; for (let i = 0; i < by.length; i += 32768) s += String.fromCharCode(...by.subarray(i, i + 32768));
    adjuntos = [{ filename: `Renovacion ${d.placa || "vehiculo"}.pdf`, content: btoa(s) }];
  }
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "content-type": "application/json" },
    body: JSON.stringify({ from: DE, reply_to: RESPUESTA, to: [d.email], cc: COPIA, bcc: OCULTA, subject: asunto(c), html: html(c, ren, otras, txt(b.mensaje, 1500), emp.nombre), ...(adjuntos.length ? { attachments: adjuntos } : {}) }) });
  if (!r.ok) { console.error(`renovacion ${r.status} ${(await r.text()).slice(0, 200)}`); return { status: 200, body: { ok: false, error: "El correo no salió. Intenta de nuevo." } }; }
  const fecha = new Date().toISOString();
  await db.from("auto_cotizacion").update({ datos: { ...d, renovacion_enviada: fecha, renovacion_enviada_por: emp.email } }).eq("id", c.id);
  const { data: p } = await db.from("persona").select("id").or(`cedula.eq.${String(d.doc).replace(/\D/g, "")},telefono.eq.${String(d.tel).replace(/\D/g, "").slice(-10)}`).limit(1).maybeSingle();
  if (p) await db.from("evento").insert({ persona_id: p.id, canal: "correo", texto: `Renovación autos enviada: ${cia(d.renovacion.aseguradora)} ${peso(d.renovacion.prima)} y ${otras.length} opciones · ${d.placa || ""}`, empleado_id: emp.id });
  return { status: 200, body: { ok: true, para: d.email, enviada: fecha } };
}
async function excluir(b: any) {
  const c = await buscar(b);
  if (!c) return { status: 403, body: { ok: false } };
  const lista = (Array.isArray(b.excluir) ? b.excluir : []).map(canon).filter((x: string) => CIAS.includes(x));
  await db.from("auto_cotizacion").update({ datos: { ...c.datos, excluir: [...new Set(lista)] } }).eq("id", c.id);
  return { status: 200, body: { ok: true, excluir: lista } };
}

async function recientes() {
  const { data } = await db.from("auto_cotizacion").select("id,token,creado,datos").not("datos->renovacion", "is", null).order("creado", { ascending: false }).limit(30);
  return { status: 200, body: { ok: true, lista: (data ?? []).map((c: any) => ({ ref: `${c.id}.${c.token}`, creado: c.creado, nombre: c.datos.empresa?.razon || `${c.datos.nombre} ${c.datos.apellido}`.trim(), placa: c.datos.placa, cia: cia(c.datos.renovacion.aseguradora), prima: c.datos.renovacion.prima, vence: c.datos.renovacion.vence, enviada: c.datos.renovacion_enviada ?? null })) } };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = { "Access-Control-Allow-Origin": ORIGENES.includes(origin) ? origin : ORIGENES[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST" || !ORIGENES.includes(origin)) return new Response('{"ok":false}', { status: 403, headers: cors });
  const res = (r: any) => new Response(JSON.stringify(r.body), { status: r.status, headers: cors });
  try {
    const emp = await empleado(req);
    if (!emp || emp.rol === "junta") return res({ status: 403, body: { ok: false, error: "Entra al CRM de nuevo." } });
    const b = await req.json().catch(() => ({}));
    return res(b.accion === "leer" ? await leer(b) : b.accion === "corregir" ? await corregir(b) : b.accion === "excluir" ? await excluir(b) : b.accion === "vista" ? await vista(b) : b.accion === "recientes" ? await recientes() : b.accion === "enviar" ? await enviar(b, emp) : { status: 400, body: { ok: false } });
  } catch (e) { console.error(`renovacion ${e}`); return res({ status: 502, body: { ok: false, error: "No se pudo completar. Intenta de nuevo." } }); }
});
