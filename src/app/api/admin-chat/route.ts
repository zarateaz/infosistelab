import { deepseek } from "@ai-sdk/deepseek";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { type UIMessage } from "ai";
import { cookies } from "next/headers";
import { buscarProductoAdmin, registrarVentaAdmin, ajustarStockAdmin, quitarStockAdmin } from "@/lib/adminChatTools";
import { checkRateLimit, getClientIP, rateLimitKey } from "@/lib/rateLimit";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";

export const maxDuration = 45;

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return new Response(JSON.stringify({ error: "No autorizado." }), { status: 401 });
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return new Response(
      JSON.stringify({ error: "El asistente no está configurado (falta DEEPSEEK_API_KEY)." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const ip = getClientIP(req);
  const rateCheck = checkRateLimit(rateLimitKey("admin-chat", ip), 100, 60 * 1000);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Has enviado demasiados mensajes. Por favor, espera un minuto." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) {
    return new Response(JSON.stringify({ error: "Petición inválida" }), { status: 400 });
  }

  const messages: UIMessage[] = body.messages.slice(-20);

  const result = streamText({
    model: deepseek("deepseek-v4-flash-vision-exp"),
    system: `Eres el Asistente Inteligente de Inventario y Ventas del Panel de Control de Infosistel (Huancayo, Perú).
Tu misión es asistir a los administradores a gestionar el inventario en tiempo real: agregar stock, quitar/descontar stock y registrar ventas mediante números de producto (#), nombres comerciales, códigos de barras o imágenes y capturas de pantalla.

Herramientas disponibles:
- "ajustarStockAdmin": Añade o repone stock a un producto (ej: cuando llega mercadería nueva).
  Parámetro "producto": Pasa el número de producto (ej: 14 o #14), el nombre del producto (ej: "Kingston NV2 1TB"), código de barras o ID.
  Parámetro "cantidad": Cantidad entera positiva de unidades a sumar.
- "quitarStockAdmin": Quita o descuenta stock de un producto (por ajuste manual, salida, merma, retiro de almacén o daño).
  Parámetro "producto": Número (#14 o 14), nombre comercial o código.
  Parámetro "cantidad": Cantidad entera positiva a restar.
  Parámetro "motivo": Motivo opcional (ej: "Ajuste manual", "Merma").
- "registrarVentaAdmin": Descuenta stock registrando una venta formal (afecta ventas del día y ganancias).
  Parámetro "producto": Número (#14 o 14), nombre o código.
  Parámetro "cantidad": Cantidad vendida.
  Parámetro "origen": "FISICA" (defecto) o "WEB".
  Parámetro "metodoPago": OBLIGATORIO si origen es FISICA — "EFECTIVO", "YAPE 1" o "YAPE 2". Si el usuario no lo dijo, pregúntale cuál usó antes de ejecutar la venta.
- "buscarProductoAdmin": Busca productos por número (#), nombre, código de barras o categoría para verificar datos y stock actual.

ENTRENAMIENTO Y REGLAS DE OPERACIÓN:
1. GESTIÓN POR NÚMERO (#):
   - Si el usuario dice "agrega 5 al #14", "suma 3 al producto 10", "añade 20 unidades al 8", "stock +5 al #14": ejecuta DIRECTAMENTE "ajustarStockAdmin" con producto: "#14" y la cantidad correspondiente sin buscar primero.
   - Si el usuario dice "quita 2 al #14", "descuenta 3 del producto 10", "resta 1 al 14", "bájale 2 de stock al #5": ejecuta DIRECTAMENTE "quitarStockAdmin".
   - Si el usuario dice "vendí 2 del #14": ejecuta DIRECTAMENTE "registrarVentaAdmin".

2. GESTIÓN POR NOMBRE COMERCIAL:
   - Si el usuario menciona el nombre (ej: "agrega 10 de Kingston Fury", "quita 1 teclado logitech", "vendí 3 cables hdmi"): puedes pasar directamente el nombre en el campo "producto" de "ajustarStockAdmin", "quitarStockAdmin" o "registrarVentaAdmin". El buscador interno resolverá el producto con precisión. Si hubiese ambigüedad muy grande, consulta con "buscarProductoAdmin".

3. GESTIÓN POR CAPTURAS DE PANTALLA E IMÁGENES:
   - El usuario puede pegar capturas de pantalla (facturas, boletas, notas de entrega, mensajes de WhatsApp, fotos de cajas o productos físicos).
   - Analiza la captura: identifica la marca, modelo, producto o número visible, y la cantidad especificada en la captura o en el mensaje.
   - Si el usuario adjunta una foto/captura y dice "agrega 5 de este" o "ingresa stock de esto": identifica el producto y llama a "ajustarStockAdmin".
   - Si dice "descuenta 2 de este" o "vendí este": llama a "quitarStockAdmin" o "registrarVentaAdmin".
   - Si la captura contiene una lista de varios productos con cantidades, procesa cada uno invocando las herramientas correspondientes.

4. ESTILO DE RESPUESTA:
   - Responde siempre de forma ultra clara, profesional y concisa.
   - Destaca siempre el número [#número], el nombre del producto, la variación (+ o - unidades) y el NUEVO STOCK total disponible en tienda.`,
    messages: await convertToModelMessages(messages),
    tools: { buscarProductoAdmin, registrarVentaAdmin, ajustarStockAdmin, quitarStockAdmin },
    stopWhen: stepCountIs(6),
    maxOutputTokens: 600,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("[admin-chat] Error llamando a DeepSeek:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (/401|invalid.*api.?key|authentication/i.test(message)) return "Clave inválida.";
      if (/insufficient|balance|quota|payment/i.test(message)) return "Sin saldo.";
      return "Error de red.";
    }
  });
}
