/**
 * lib/invoicing.ts
 * Fase 5 — orquestación de facturación electrónica SUNAT. Decide serie/tipo
 * de comprobante, reserva un correlativo atómico, cifra el DNI del cliente
 * (mismo patrón que Repair.dniEncrypted, ver lib/crypto.ts), llama a
 * NubeFacT (lib/nubefact.ts) y persiste el resultado como un Invoice.
 *
 * Contrato importante: emitInvoice() NUNCA lanza. Un fallo de red, de
 * validación de NubeFacT, o un rechazo de SUNAT queda registrado como un
 * Invoice en estado ERROR/RECHAZADO — la venta o el pedido que lo originó
 * ya se guardó antes de llamar esto y no debe revertirse por un problema
 * de facturación electrónica.
 *
 * Cada intento (incluyendo un reintento manual) reserva un correlativo
 * NUEVO en vez de reutilizar el de un intento fallido — un hueco en la
 * numeración es aceptable para SUNAT, reusar un número ya es un problema
 * (podría haber llegado a SUNAT pese a que el cliente vio un timeout).
 */
import { prisma } from "@/lib/prisma";
import { encryptPII, decryptPII } from "@/lib/crypto";
import { sanitizeName, sanitizePhone, digitsOnly } from "@/lib/sanitize";
import { emitirComprobanteNubefact, type NubefactItemInput } from "@/lib/nubefact";

export interface EmitInvoiceItem {
  descripcion: string;
  cantidad: number;
  /** Precio unitario con IGV incluido. */
  precioUnitarioConIgv: number;
}

export interface EmitInvoiceInput {
  docNumber?: string | null;
  nombre?: string | null;
  email?: string | null;
  /** Solo se usa para /taller-control/facturas ("Enviar por WhatsApp"). Un
   *  Order ya tiene su propio customerPhone cifrado — esto es sobre todo
   *  para ventas de mostrador (Sale), que no capturan teléfono en ningún
   *  otro lado. */
  telefono?: string | null;
  items: EmitInvoiceItem[];
  total: number;
  orderId?: string;
  saleId?: string;
}

interface DocClassification {
  tipo: "FACTURA" | "BOLETA";
  clienteTipoDoc: "6" | "1" | "0";
  numDocPlain: string | null;
  tipoDeComprobante: 1 | 2;
  serie: string;
}

/** Nunca confía en un "tipo de documento" declarado por el cliente — lo
 *  deriva de la cantidad de dígitos, igual que el total del pedido nunca
 *  viene del cliente (ver tienda/actions.ts). */
function classifyDocument(rawDocNumber: string | null | undefined): DocClassification {
  const digits = digitsOnly(rawDocNumber ?? "");
  if (digits.length === 11) {
    return {
      tipo: "FACTURA",
      clienteTipoDoc: "6",
      numDocPlain: digits,
      tipoDeComprobante: 1,
      serie: process.env.NUBEFACT_SERIE_FACTURA || "F001",
    };
  }
  if (digits.length === 8) {
    return {
      tipo: "BOLETA",
      clienteTipoDoc: "1",
      numDocPlain: digits,
      tipoDeComprobante: 2,
      serie: process.env.NUBEFACT_SERIE_BOLETA || "B001",
    };
  }
  return {
    tipo: "BOLETA",
    clienteTipoDoc: "0",
    numDocPlain: null,
    tipoDeComprobante: 2,
    serie: process.env.NUBEFACT_SERIE_BOLETA || "B001",
  };
}

function sanitizeEmail(raw: string | null | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed && trimmed.includes("@") ? trimmed : undefined;
}

function sanitizeTelefono(raw: string | null | undefined): string | undefined {
  const phone = sanitizePhone(raw ?? "");
  return phone && digitsOnly(phone).length >= 7 ? phone : undefined;
}

/** Incrementa el contador de la serie dentro de una transacción — reemplazo
 *  seguro del patrón `prisma.repair.count()` usado para Repair.code, que no
 *  es atómico ni sirve para un correlativo legal. */
async function nextInvoiceNumber(serie: string): Promise<number> {
  const counter = await prisma.$transaction((tx) =>
    tx.invoiceCounter.upsert({
      where: { serie },
      create: { serie, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    })
  );
  return counter.lastNumber;
}

function toNubefactItems(items: EmitInvoiceItem[]): NubefactItemInput[] {
  return items.map((item) => ({
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    precioUnitarioConIgv: item.precioUnitarioConIgv,
  }));
}

export async function emitInvoice(input: EmitInvoiceInput) {
  if (!input.orderId && !input.saleId) {
    throw new Error("emitInvoice requiere orderId o saleId.");
  }

  const { tipo, clienteTipoDoc, numDocPlain, tipoDeComprobante, serie } = classifyDocument(input.docNumber);
  const nombre = sanitizeName(input.nombre ?? "", 100) || "Cliente varios";
  const email = sanitizeEmail(input.email);
  const telefono = sanitizeTelefono(input.telefono);
  const numero = await nextInvoiceNumber(serie);

  const result = await emitirComprobanteNubefact({
    tipoDeComprobante,
    serie,
    numero,
    clienteTipoDeDocumento: clienteTipoDoc,
    clienteNumeroDeDocumento: numDocPlain ?? "",
    clienteDenominacion: nombre,
    clienteEmail: email,
    items: toNubefactItems(input.items),
  });

  // DNI es dato personal → se cifra igual que Repair.dniEncrypted. El RUC
  // es información tributaria pública (se valida contra SUNAT en cada
  // comprobante), así que se guarda en claro.
  const clienteNumDoc = numDocPlain ? (clienteTipoDoc === "1" ? encryptPII(numDocPlain) : numDocPlain) : null;

  const baseData = {
    tipo,
    serie,
    numero,
    orderId: input.orderId ?? null,
    saleId: input.saleId ?? null,
    clienteTipoDoc,
    clienteNumDoc,
    clienteDenominacion: nombre,
    clienteEmail: email ?? null,
    clienteTelefono: telefono ? encryptPII(telefono) : null,
    total: input.total,
  };

  try {
    if (result.ok) {
      return await prisma.invoice.create({
        data: {
          ...baseData,
          estado: result.data.aceptadaPorSunat ? "ACEPTADO" : "RECHAZADO",
          pdfUrl: result.data.pdfUrl,
          xmlUrl: result.data.xmlUrl,
          cdrUrl: result.data.cdrUrl,
          hash: result.data.hash,
          mensajeError: result.data.aceptadaPorSunat ? null : result.data.descripcion,
        },
      });
    }
    return await prisma.invoice.create({
      data: { ...baseData, estado: "ERROR", mensajeError: result.mensaje },
    });
  } catch (err) {
    console.error("No se pudo registrar el Invoice tras llamar a NubeFacT:", err);
    return null;
  }
}

/** Reintenta un comprobante que quedó en ERROR/RECHAZADO, re-derivando los
 *  ítems desde el Order/Sale original (fuente de verdad de precios — nunca
 *  desde datos ya guardados en el Invoice fallido). Crea un Invoice nuevo;
 *  ver nota de "hueco en la numeración" arriba. */
export async function retryInvoiceEmission(invoiceId: string) {
  const failed = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!failed) return null;

  const docNumber =
    failed.clienteNumDoc && failed.clienteTipoDoc === "1" ? decryptPII(failed.clienteNumDoc) : failed.clienteNumDoc;
  const telefono = failed.clienteTelefono ? decryptPII(failed.clienteTelefono) : null;

  if (failed.orderId) {
    const order = await prisma.order.findUnique({ where: { id: failed.orderId }, include: { items: true } });
    if (!order) return null;
    return emitInvoice({
      orderId: order.id,
      docNumber,
      nombre: failed.clienteDenominacion,
      email: failed.clienteEmail,
      telefono,
      total: order.total,
      items: order.items.map((item) => ({
        descripcion: item.name,
        cantidad: item.quantity,
        precioUnitarioConIgv: item.unitPrice ?? 0,
      })),
    });
  }

  if (failed.saleId) {
    const sale = await prisma.sale.findUnique({ where: { id: failed.saleId } });
    if (!sale) return null;
    return emitInvoice({
      saleId: sale.id,
      docNumber,
      nombre: failed.clienteDenominacion,
      email: failed.clienteEmail,
      telefono,
      total: sale.price,
      items: [{ descripcion: sale.pName, cantidad: sale.quantity, precioUnitarioConIgv: sale.price / sale.quantity }],
    });
  }

  return null;
}
