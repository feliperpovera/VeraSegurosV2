// Seguro de autos SURA directo con la API de SURA (API Center, "Cotización y Expedición movilidad").
// La usa solo la landing de pauta /seguros-autos-sura/. Ciudades, marcas, versiones y SMS siguen en la función autos.
// Secretos: SURA_APIKEY, SURA_ASESOR, SURA_OFICINA, SURA_DNI, SURA_ORG, SURA_CANAL,
//           SURA_COTIZA_URL y SURA_EXPIDE_URL (por defecto el laboratorio api.labsura.com).
// Sin SURA_APIKEY u oficina la página sigue funcionando: guarda el lead, avisa al equipo y responde "pendiente".
// Acciones (POST JSON): cotizar, expedir, estado.
import { createClient } from "jsr:@supabase/supabase-js@2";

const ORIGENES = ["https://veraseguros.com", "https://www.veraseguros.com", "http://localhost:4173"];
const env = (k: string, d = "") => (Deno.env.get(k) ?? d).trim();
const COTIZA = env("SURA_COTIZA_URL", "https://api.labsura.com/apicotizacionmovilidad/v1");
const EXPIDE = env("SURA_EXPIDE_URL", "https://api.labsura.com/apiexpedicionmovilidad/v1");
const POR_IP_DIA = 5, TOPE_DIA = 80; // ponytail: límite anti-abuso fijo; ajustar si SURA define cupos
const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

const txt = (v: unknown, n = 80) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const dig = (v: unknown, n: number) => txt(String(v ?? ""), n * 2).replace(/\D/g, "").slice(0, n);
const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))), (b) => b.toString(16).padStart(2, "0")).join("");
const peso = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
// DANE municipio (5 dígitos, el que usa el cotizador) → centro poblado de SURA (8) y departamento ("CO05").
const ciudad8 = (c: string) => c.padStart(5, "0") + "000";
const depto = (c: string) => "CO" + c.padStart(5, "0").slice(0, 2);
const lista = () => !!env("SURA_APIKEY") && !!env("SURA_OFICINA");

async function sura(url: string, init: RequestInit = {}) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000),
    headers: { "x-apikey": env("SURA_APIKEY"), "content-type": "application/json", accept: "application/json" } });
  const body = await r.json().catch(() => null);
  if (r.status >= 400) console.error(`sura ${url.replace(/^https:\/\/[^/]+/, "")} ${r.status} ${JSON.stringify(body).slice(0, 400)}`);
  return { status: r.status, body };
}

// Twilio Verify: el mismo servicio que el cotizador general (el SMS lo envía la función autos).
async function smsOk(tel: string, code: string) {
  if (!code) return false;
  const r = await fetch(`https://verify.twilio.com/v2/Services/${env("TWILIO_VERIFY_SID")}/VerificationCheck`, { method: "POST",
    headers: { authorization: "Basic " + btoa(`${env("TWILIO_SID")}:${env("TWILIO_TOKEN")}`), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: "+57" + tel, Code: code }) });
  return r.ok && (await r.json()).status === "approved";
}

// Nombres de los grupos de coberturas que devuelve SURA (cdGrupoCoberturasResultadoTarifa).
const GRUPOS: Record<string, string> = {
  PADanosAlCarroGrp: "Daños al carro", PAHurtoAlCarroGrp: "Hurto", PADanosATerceros: "Responsabilidad civil",
  PACarroDeReemplazo: "Carro de reemplazo", PAAsistencia: "Asistencia", PAAccidentes: "Accidentes personales",
  PAPequenosEventos: "Pequeños eventos", PALlaves: "Llaves", PAViajes: "Viajes",
};
// Solo lo que la página necesita de cada plan.
function plan(x: any) {
  const base = { codigo: txt(x?.plan?.codigoPlan, 10), nombre: txt(x?.plan?.nombrePlan, 80) || "Plan SURA" };
  if (x?.codigoResultado !== "Exitoso" || !Array.isArray(x?.tarifa) || !x.tarifa.length)
    return { ...base, ok: false, motivo: String(x?.mensaje ?? x?.error ?? "No disponible").split("|")[0].replace(/^\d+-ERR-/, "").slice(0, 200) };
  const t0 = x.tarifa[0];
  return { ...base, ok: true, idCotizacion: String(t0.idCotizacion ?? ""), idSolicitud: String(x.idSolicitud ?? ""),
    vigencia: { desde: txt(x.feInicioVigencia, 10), hasta: txt(x.feFinVigencia, 10) },
    valorAsegurado: Number(x.vehiculo?.valorTotalAsegurado ?? x.vehiculo?.valorAsegurado) || 0,
    pagos: x.tarifa.map((t: any) => ({ forma: txt(t.formaDePago?.descripcion, 40).replace(/^\w\s+/, ""), cuotas: Number(t.formaDePago?.numeroCuotas) || 1,
      primaAnual: Number(t.primaAnual) || 0, iva: Number(t.totalImpuesto) || 0, primaTotal: Number(t.primaTotal) || 0, cuota: Number(t.primaFraccionada) || 0 })),
    coberturas: (t0.coberturasTarifadas ?? []).map((g: any) => ({ grupo: GRUPOS[g.cdGrupoCoberturasResultadoTarifa] ?? String(g.cdGrupoCoberturasResultadoTarifa ?? "").replace(/^PA|Grp$/g, ""),
      items: (g.coberturasResultadoTarifa ?? []).flatMap((c: any) => (c.gruposOpcionesResultadoTarifa ?? []).map((o: any) => ({
        nombre: txt(o.dsGrupoOpcionesResultadoTarifa ?? o.cdGrupoOpcionesResultadoTarifa, 80), valor: txt(o.dsOpcionTarifada ?? o.cdOpcionTarifada, 80) }))) })) };
}
function vehiculoDe(arr: any[]) {
  const v = arr.find((x) => x?.vehiculo)?.vehiculo;
  return v ? { marca: txt(v.dsMarca, 40), linea: txt(v.dsLinea, 60), version: txt(v.dsLineaEspecifica, 80), modelo: txt(String(v.modelo ?? ""), 4), placa: txt(v.placa, 7),
    fasecolda: txt(v.cdFasecolda, 10), valor: Number(v.valorTotalAsegurado ?? v.valorAsegurado) || 0 } : null;
}

async function cotizar(b: any, ip: string) {
  const placa = txt(b.placa, 7).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const fasecolda = dig(b.fasecolda, 10), modelo = dig(b.modelo, 4), ceroKm = !!b.ceroKm;
  const tipoDoc = b.tipoDoc === "E" ? "E" : "C", doc = dig(b.doc, 12), ciudad = dig(b.ciudad, 5);
  const nombres = txt(b.nombres, 60).replace(/\s+/g, " "), apellidos = txt(b.apellidos, 60).replace(/\s+/g, " ");
  const nac = /^\d{4}-\d{2}-\d{2}$/.test(b.nacimiento) ? b.nacimiento : "", tel = dig(b.telefono, 10), email = txt(b.email, 120);
  if ((!placa && !(fasecolda && modelo)) || (placa && !/^[A-Z0-9]{5,7}$/.test(placa)) || doc.length < 5 || ciudad.length < 4 || !nombres || !apellidos || !nac
    || !/^3\d{9}$/.test(tel) || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email) || b.acepta !== true) return { status: 400, body: { ok: false, error: "datos" } };
  if (!(await smsOk(tel, dig(b.codigo, 8)))) return { status: 200, body: { ok: false, error: "codigo" } };

  const ip_hash = await sha(ip + new Date().toISOString().slice(0, 10)), desde = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: mias }, { count: total }] = await Promise.all([
    db.from("sura_cotizacion").select("id", { count: "exact", head: true }).eq("ip_hash", ip_hash).gte("creado", desde),
    db.from("sura_cotizacion").select("id", { count: "exact", head: true }).gte("creado", desde)]);
  if ((mias ?? 0) >= POR_IP_DIA || (total ?? 0) >= TOPE_DIA) return { status: 429, body: { ok: false, error: "limite" } };

  const [n1, ...n2] = nombres.split(" "), [a1, ...a2] = apellidos.split(" ");
  const datos = { placa, fasecolda, modelo, ceroKm, tipoDoc, doc, ciudad, nombres, apellidos, nac, tel, email, utm: b.utm ?? null,
    consentimiento: { fecha: new Date().toISOString(), version: "2026-11-27" } };
  const t = crypto.randomUUID().replace(/-/g, "");
  const { data: c, error } = await db.from("sura_cotizacion").insert({ token: t, ip_hash, datos }).select("id").single();
  if (error) { console.error(error); return { status: 500, body: { ok: false } }; }

  if (!lista()) { // API aún sin credenciales: lead para el equipo
    await db.from("sura_cotizacion").update({ estado: "pendiente_api" }).eq("id", c.id);
    await correo(`Autos SURA (pauta) SIN API: ${nombres} ${apellidos} · ${placa || "0 km"}`, htmlInterno(datos, [], "La API de SURA aún no está activa: cotízalo manualmente."));
    return { status: 200, body: { ok: false, id: c.id, t, error: "pendiente" } };
  }

  const r = await sura(`${COTIZA}/cotizacion/individual`, { method: "POST", body: JSON.stringify({
    vehiculo: { placa: placa || null, cdFasecolda: placa ? null : fasecolda, modelo: placa ? null : modelo, cdCiudadCirculacion: ciudad8(ciudad),
      esCeroKm: ceroKm, esBlindado: false, tieneThermoKing: false, tieneGasVehicular: false, valorAccesorios: 0, valorAccesoriosEspeciales: 0 },
    asegurado: { tipoIdentificacion: tipoDoc, numeroIdentificacion: doc, primerNombre: n1, segundoNombre: n2.join(" ") || null, primerApellido: a1,
      segundoApellido: a2.join(" ") || null, fechaNacimiento: nac, celular: tel, correoElectronico: email },
    asesor: { cdAsesor: env("SURA_ASESOR", "10146"), cdOficina: env("SURA_OFICINA"), cdOrganizacion: env("SURA_ORG") || null, cdCanal: env("SURA_CANAL") || null, dni: env("SURA_DNI") || null },
  }) });
  const arr = Array.isArray(r.body) ? r.body : r.body ? [r.body] : [];
  const planes = arr.filter((x: any) => x?.plan).map(plan), vehiculo = vehiculoDe(arr);
  const buenos = planes.filter((p: any) => p.ok);
  // Solo 200 y 400 son respuestas de negocio; 401/403 (llave), 429 (cupo) y 5xx son fallas nuestras o de SURA.
  const estado = buenos.length ? "cotizada" : r.status === 200 || r.status === 400 ? "sin_planes" : "error";
  await db.from("sura_cotizacion").update({ estado, planes, respuesta: r.body }).eq("id", c.id);
  await correo(`Autos SURA (pauta) ${buenos.length ? "cotizada" : estado === "error" ? `ERROR SURA ${r.status}` : "SIN PLANES"}: ${nombres} ${apellidos} · ${placa || "0 km"}`,
    htmlInterno(datos, planes, buenos.length ? "" : esc(r.body?.mensaje ?? r.body?.errors?.[0]?.message ?? `HTTP ${r.status}`).slice(0, 300)));
  if (!buenos.length) return { status: 200, body: { ok: false, id: c.id, t, error: estado === "error" ? "servicio" : "rechazo",
    motivo: String(r.body?.mensaje ?? planes.find((p: any) => p.motivo)?.motivo ?? "").split("|")[0].replace(/^\d+-ERR-/, "").slice(0, 200) } };
  return { status: 200, body: { ok: true, id: c.id, t, planes, vehiculo } };
}

async function fila(b: any) {
  const { data: c } = await db.from("sura_cotizacion").select("id,token,estado,datos,planes,expedicion").eq("id", txt(b.id, 40)).maybeSingle();
  return c && c.token === b.t ? c : null;
}

async function expedir(b: any) {
  const c = await fila(b);
  if (!c) return { status: 403, body: { ok: false } };
  const p = (c.planes ?? []).find((x: any) => x.ok && x.idCotizacion === txt(b.idCotizacion, 50));
  if (!p) return { status: 400, body: { ok: false, error: "plan" } };
  if (c.expedicion?.respuesta?.codigoResultado === "Exitoso") return { status: 200, body: { ok: true, ya: true } };
  const d = c.datos, x = b.expedicion ?? {};
  const placa = (d.placa || txt(x.placa, 7)).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const chasis = txt(x.chasis, 50).toUpperCase().replace(/[^A-Z0-9]/g, ""), motor = txt(x.motor, 50).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const fexp = /^\d{4}-\d{2}-\d{2}$/.test(x.fechaExpedicion) ? x.fechaExpedicion : "", dir = txt(x.direccion, 200), cres = dig(x.ciudad, 5);
  if (!/^[A-Z0-9]{5,7}$/.test(placa) || chasis.length < 5 || motor.length < 3 || !fexp || dir.length < 5 || cres.length < 4 || x.declara !== true)
    return { status: 400, body: { ok: false, error: "datos" } };

  const [n1, ...n2] = d.nombres.split(" "), [a1, ...a2] = d.apellidos.split(" ");
  const persona = { tipoIdentificacion: d.tipoDoc, numeroIdentificacion: d.doc, primerNombre: n1, ...(n2.length ? { segundoNombre: n2.join(" ") } : {}), primerApellido: a1,
    ...(a2.length ? { segundoApellido: a2.join(" ") } : {}), fechaNacimiento: d.nac + "T00:00:00", celular: d.tel, correoElectronico: d.email,
    direccion: { detalleDireccion: dir, departamento: depto(cres), ciudad: ciudad8(cres) } };
  const solicitud = { numeroCotizacion: p.idCotizacion,
    infoVehiculo: { placa, chasis, motor, tieneRemolque: x.remolque === true, transportaCombustible: x.combustible === true },
    tomadores: [{ ...persona, esTomadorPrincipal: true, fechaExpedicionDocumento: fexp + "T00:00:00", codigoNacionalidad: env("SURA_NACIONALIDAD", "CO") }],
    asegurados: [persona] };
  const r = await sura(`${EXPIDE}/expedir`, { method: "POST", body: JSON.stringify(solicitud) });
  const ok = r.status === 200 && r.body?.codigoResultado === "Exitoso";
  const pago = (p.pagos ?? []).find((g: any) => g.forma === txt(b.forma, 40)) ?? p.pagos?.[0];
  await db.from("sura_cotizacion").update({ estado: ok ? "expedicion_enviada" : "expedicion_error",
    expedicion: { plan: p.nombre, idCotizacion: p.idCotizacion, pago, fecha: new Date().toISOString(), solicitud, respuesta: r.body, http: r.status } }).eq("id", c.id);
  await correo(`Autos SURA (pauta) EXPEDICIÓN ${ok ? "enviada" : "con ERROR"}: ${d.nombres} ${d.apellidos} · ${placa} · ${p.nombre}`,
    htmlInterno({ ...d, placa }, [p], `${ok ? "SURA recibió la solicitud de expedición." : "SURA rechazó la expedición: " + esc(r.body?.mensaje ?? r.status)}<br>Forma de pago elegida: ${esc(pago?.forma ?? "—")} (${pago ? peso(pago.primaTotal) : ""}). Chasis ${esc(chasis)} · Motor ${esc(motor)} · Dirección ${esc(dir)}. Cobrar al cliente y hacer seguimiento al estado.`));
  return { status: 200, body: { ok, error: ok ? undefined : r.status >= 500 ? "servicio" : "rechazo", motivo: ok ? undefined : String(r.body?.mensaje ?? "").split("|")[0].slice(0, 200) } };
}

async function estado(b: any) {
  const c = await fila(b);
  if (!c?.expedicion?.idCotizacion) return { status: 403, body: { ok: false } };
  const r = await sura(`${EXPIDE}/expedicion/consulta/${encodeURIComponent(c.expedicion.idCotizacion)}`);
  return { status: 200, body: { ok: r.status === 200, estado: txt(r.body?.estado, 60), mensaje: txt(r.body?.mensaje, 300),
    impedimentos: (r.body?.impedimentos ?? []).map((i: any) => txt(i?.descripcion, 300)).filter(Boolean) } };
}

// Aviso al equipo (mismos destinatarios que la función autos).
const EQUIPO = env("CORREO_INTERNO", "info@veraseguros.com,comercial@veraseguros.com,feliperestrepo@veraseguros.com").split(",");
async function correo(asunto: string, html: string) {
  const llave = env("RESEND_API_KEY");
  if (!llave) return false;
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${llave}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env("CORREO_DE", "Vera Seguros <cotizaciones@veraseguros.com>"), reply_to: "info@veraseguros.com", to: EQUIPO, subject: asunto, html }) }).catch(() => null);
  if (r && !r.ok) console.error(`correo ${r.status} ${(await r.text()).slice(0, 200)}`);
  return !!r?.ok;
}
function htmlInterno(d: any, planes: any[], nota: string) {
  const f = (k: string, v: unknown) => `<tr><td style="padding:4px 12px 4px 0;color:#646a78">${k}</td><td>${esc(v || "—")}</td></tr>`;
  const wa = `https://wa.me/57${d.tel}?text=` + encodeURIComponent(`Hola ${d.nombres}, te escribo de Vera Seguros por tu seguro de autos SURA${d.placa ? " para la placa " + d.placa : ""}.`);
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:620px;color:#1d2433">
  <h2 style="color:#0033a0;margin:0 0 12px">Autos SURA (landing de pauta): ${esc(d.nombres)} ${esc(d.apellidos)}</h2>
  ${nota ? `<p style="background:#fff8e1;padding:10px 12px;border-radius:8px">${nota}</p>` : ""}
  <table style="font-size:14px;border-collapse:collapse">${f("Celular", d.tel)}${f("Correo", d.email)}${f("Documento", `${d.tipoDoc} ${d.doc}`)}${f("Nacimiento", d.nac)}${f("Ciudad (DANE)", d.ciudad)}${f("Vehículo", d.placa ? "Placa " + d.placa : `0 km · Fasecolda ${d.fasecolda} · ${d.modelo}`)}${f("Origen", d.utm ? [d.utm.source, d.utm.medium, d.utm.campaign].filter(Boolean).join(" / ") : "")}</table>
  ${planes.length ? `<h3 style="color:#0033a0">Planes</h3><table style="width:100%;font-size:14px;border-collapse:collapse">${planes.map((p) => `<tr><td style="padding:6px 0;border-bottom:1px solid #e2e3e8">${esc(p.nombre)}</td><td style="padding:6px 0;border-bottom:1px solid #e2e3e8;text-align:right">${p.ok ? `<b>${peso(p.pagos?.[0]?.primaTotal ?? 0)}</b> · cot. ${esc(p.idCotizacion)}` : esc(p.motivo)}</td></tr>`).join("")}</table>` : ""}
  <p style="margin:20px 0"><a href="${wa}" style="background:#25D366;color:#0b2217;padding:10px 18px;border-radius:980px;text-decoration:none;font-weight:600">Escribirle por WhatsApp</a></p></div>`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = { "Access-Control-Allow-Origin": ORIGENES.includes(origin) ? origin : ORIGENES[0], "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST" || !ORIGENES.includes(origin)) return new Response('{"ok":false}', { status: 403, headers: cors });
  const b = await req.json().catch(() => ({}));
  try {
    const r = b.accion === "cotizar" ? await cotizar(b, req.headers.get("x-forwarded-for")?.split(",")[0] ?? "")
      : b.accion === "expedir" ? await expedir(b) : b.accion === "estado" ? await estado(b) : { status: 400, body: { ok: false } };
    return new Response(JSON.stringify(r.body), { status: r.status, headers: cors });
  } catch (e) {
    console.error(e);
    return new Response('{"ok":false,"error":"servicio"}', { status: 502, headers: cors });
  }
});
