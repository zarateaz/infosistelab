// Los métodos de pago son datos compartidos por Caja, Productos e
// Inventario; la definición canónica vive en lib/paymentMethods.ts.
// Se reexportan aquí para que los imports existentes de este módulo sigan
// funcionando igual.
export {
  PAYMENT_METHODS,
  PAYMENT_METHOD_INFO,
  type PaymentMethodDetail,
  type PaymentMethodType,
} from "@/lib/paymentMethods";
