/**
 * Métodos de pago de la tienda física y de Caja — fuente única.
 *
 * Vive en lib/ (y no en caja/constants.ts) porque lo consumen tanto el
 * módulo de Caja como el flujo "Vender" de Productos/Inventario y el
 * servidor que crea la venta + el ingreso de Caja en una sola transacción.
 * Caja reexporta desde aquí para no romper sus imports existentes.
 */
export const PAYMENT_METHODS = ["EFECTIVO", "YAPE 1", "YAPE 2"] as const;

export type PaymentMethodType = (typeof PAYMENT_METHODS)[number];

export interface PaymentMethodDetail {
  id: PaymentMethodType;
  name: string;
  titular: string;
  phone?: string;
  formattedPhone?: string;
  labelSelect: string;
}

export const PAYMENT_METHOD_INFO: Record<PaymentMethodType, PaymentMethodDetail> = {
  EFECTIVO: {
    id: "EFECTIVO",
    name: "Efectivo",
    titular: "Caja Física",
    labelSelect: "EFECTIVO (Caja física)",
  },
  "YAPE 1": {
    id: "YAPE 1",
    name: "Yape 1",
    titular: "Laboratorio INFOSISTEL",
    phone: "900000000",
    formattedPhone: "900 000 000",
    labelSelect: "YAPE 1 — Laboratorio INFOSISTEL (900 000 000)",
  },
  "YAPE 2": {
    id: "YAPE 2",
    name: "Yape 2",
    titular: "Yape Caja",
    phone: "963193838",
    formattedPhone: "963 193 838",
    labelSelect: "YAPE 2 — Yape Caja (963 193 838)",
  },
};
