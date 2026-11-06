/**
 * lib/nubefact.ts
 * Fase 5 — cliente HTTP de bajo nivel para la API de facturación electrónica
 * de NubeFacT (https://www.nubefact.com). No conoce Prisma ni las reglas de
 * negocio de Infosistel — solo arma el JSON que NubeFacT espera y hace el
 * POST. La orquestación (correlativo, cifrado de DNI, persistencia del
 * Invoice) vive en lib/invoicing.ts.
 *
 * VERIFICAR ANTES DE ACTIVAR: el shape de abajo (nombres de campo, URL del
 * endpoint, header de autenticación) es el estándar público de NubeFacT,
 * pero no se pudo confirmar contra la documentación real de la cuenta del
 * usuario (la doc pública requiere JS para renderizar). Antes de emitir un
 * comprobante real, comparar esto contra Configuración > API dentro de la
 * cuenta de NubeFacT ya activada.
 */

const NUBEFACT_URL = process.env.NUBEFACT_URL || "https://api.nubefact.com/api/v1";
const IGV_RATE = 0.18;

export interface NubefactItemInput {
  descripcion: string;
  cantidad: number;
  /** Precio unitario CON IGV incluido (así es como se manejan los precios en todo el resto del sistema). */
  precioUnitarioConIgv: number;
}

export interface NubefactPayloadInput {
  /** 1 = Factura, 2 = Boleta */
  tipoDeComprobante: 1 | 2;
  serie: string;
  numero: number;
  /** "6" RUC | "1" DNI | "0" sin documento */
  clienteTipoDeDocumento: "6" | "1" | "0";
  clienteNumeroDeDocumento: string;
  clienteDenominacion: string;
  clienteEmail?: string;
  items: NubefactItemInput[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Arma el body JSON de "generar_comprobante". Único lugar a tocar si los
 *  nombres de campo reales de la cuenta difieren de este estándar. */
export function buildNubefactPayload(input: NubefactPayloadInput) {
  const items = input.items.map((item) => {
    const valorUnitario = round2(item.precioUnitarioConIgv / (1 + IGV_RATE));
    const subtotal = round2(valorUnitario * item.cantidad);
    const igv = round2(item.precioUnitarioConIgv * item.cantidad - subtotal);
    const total = round2(subtotal + igv);
    return {
      unidad_de_medida: "NIU",
      codigo: "",
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      valor_unitario: valorUnitario,
      precio_unitario: item.precioUnitarioConIgv,
      descuento: "",
      subtotal,
      tipo_de_igv: 1,
      igv,
      total,
      anticipo_regularizacion: false,
    };
  });

  const totalGravada = round2(items.reduce((sum, i) => sum + i.subtotal, 0));
  const totalIgv = round2(items.reduce((sum, i) => sum + i.igv, 0));
  const total = round2(totalGravada + totalIgv);

  const fecha = new Date();
  const fechaDeEmision = `${String(fecha.getDate()).padStart(2, "0")}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${fecha.getFullYear()}`;

  return {
    operacion: "generar_comprobante",
    tipo_de_comprobante: input.tipoDeComprobante,
    serie: input.serie,
    numero: input.numero,
    sunat_transaction: 1,
    cliente_tipo_de_documento: input.clienteTipoDeDocumento,
    cliente_numero_de_documento: input.clienteNumeroDeDocumento,
    cliente_denominacion: input.clienteDenominacion,
    cliente_email: input.clienteEmail || "",
    fecha_de_emision: fechaDeEmision,
    moneda: 1,
    porcentaje_de_igv: IGV_RATE * 100,
    total_gravada: totalGravada,
    total_igv: totalIgv,
    total: total,
    enviar_automaticamente_a_la_sunat: true,
    enviar_automaticamente_a_cliente: Boolean(input.clienteEmail),
    condiciones_de_pago: "Contado",
    formato_de_pdf: "A4",
    items,
  };
}

export interface NubefactSuccess {
  aceptadaPorSunat: boolean;
  pdfUrl: string | null;
  xmlUrl: string | null;
  cdrUrl: string | null;
  hash: string | null;
  descripcion: string | null;
  raw: unknown;
}

export type NubefactResult = { ok: true; data: NubefactSuccess } | { ok: false; mensaje: string };

/** Nunca lanza — un fallo de red o rechazo de SUNAT se devuelve como
 *  `{ ok: false }` para que el llamador pueda registrar un Invoice en
 *  estado ERROR sin que la venta/pedido que lo originó se vea afectada. */
export async function emitirComprobanteNubefact(input: NubefactPayloadInput): Promise<NubefactResult> {
  const token = process.env.NUBEFACT_TOKEN;
  const ruc = process.env.NUBEFACT_RUC;
  if (!token || !ruc) {
    console.error("NUBEFACT_TOKEN o NUBEFACT_RUC no configurados — no se puede emitir el comprobante.");
    return { ok: false, mensaje: "Facturación electrónica no configurada (falta NUBEFACT_TOKEN/NUBEFACT_RUC)." };
  }

  const payload = buildNubefactPayload(input);

  try {
    const response = await fetch(`${NUBEFACT_URL}/${ruc}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok || !body) {
      const mensaje =
        (body && typeof body === "object" && "errors" in body && String((body as { errors: unknown }).errors)) ||
        `NubeFacT respondió ${response.status}`;
      return { ok: false, mensaje };
    }

    const data = body as Record<string, unknown>;
    return {
      ok: true,
      data: {
        aceptadaPorSunat: Boolean(data.aceptada_por_sunat),
        pdfUrl: typeof data.enlace_del_pdf === "string" ? data.enlace_del_pdf : null,
        xmlUrl: typeof data.enlace_del_xml === "string" ? data.enlace_del_xml : null,
        cdrUrl: typeof data.enlace_del_cdr === "string" ? data.enlace_del_cdr : null,
        hash: typeof data.codigo_hash === "string" ? data.codigo_hash : null,
        descripcion: typeof data.sunat_description === "string" ? data.sunat_description : null,
        raw: body,
      },
    };
  } catch (err) {
    return { ok: false, mensaje: err instanceof Error ? err.message : "No se pudo conectar con NubeFacT." };
  }
}
