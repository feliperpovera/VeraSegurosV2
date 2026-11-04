// Factura electrónica DIAN: el ZIP trae un AttachedDocument cuyo XML lleva la factura adentro (CDATA o escapada).
export const NIT_VERA = "901039892";
const sinEscapar = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const campo = (x: string | undefined, t: string) => x?.match(new RegExp(`<cbc:${t}(?: [^>]*)?>([^<]*)<`))?.[1]?.trim() ?? null;
const bloque = (x: string, t: string) => x.match(new RegExp(`<cac:${t}[ >][\\s\\S]*?</cac:${t}>`))?.[0];
const numero = (v: string | null) => (v == null ? null : Number(v));

export function leerFactura(xml: string) {
  let f = xml.match(/<!\[CDATA\[\s*(<\?xml[\s\S]*?(?:Invoice|CreditNote)[\s\S]*?)\]\]>/)?.[1] ?? xml;
  if (!f.includes("<cbc:IssueDate")) f = sinEscapar(f);
  const inicio = f.search(/<(?:\w+:)?(?:Invoice|CreditNote)[ >]/); // lo de antes es el sobre, con su propio cbc:ID
  if (inicio < 0) return null;
  f = f.slice(inicio);
  const tipo = /^<(?:\w+:)?CreditNote/.test(f) ? "nota_credito" : "factura";
  const emisor = bloque(f, "AccountingSupplierParty"), cliente = bloque(f, "AccountingCustomerParty");
  const totales = bloque(f, "LegalMonetaryTotal") ?? bloque(f, "RequestedMonetaryTotal");
  const lineas = [...f.matchAll(/<cac:(?:Invoice|CreditNote)Line>[\s\S]*?<\/cac:(?:Invoice|CreditNote)Line>/g)].map(([l]) => ({
    descripcion: campo(bloque(l, "Item"), "Description"), valor: numero(campo(l, "LineExtensionAmount")) }));
  return { numero: campo(f, "ID"), tipo, fecha: campo(f, "IssueDate"), emisor: campo(emisor, "CompanyID"),
    cliente: campo(cliente, "RegistrationName"), nit: campo(cliente, "CompanyID"),
    subtotal: numero(campo(totales, "LineExtensionAmount")), total: numero(campo(totales, "PayableAmount")),
    nota: [...f.matchAll(/<cbc:Note(?: [^>]*)?>([^<]*)</g)].map((m) => m[1].trim()).filter(Boolean).join(" · ").slice(0, 500) || null, lineas };
}
