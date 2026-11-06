import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Feeds the system prompt's category list at request time instead of
// hardcoding it in route.ts — categories are admin-editable
// (/taller-control/categorias), so a hardcoded list silently goes stale
// the moment someone adds or renames one (caught "WIRELESS ROUTERS" and
// "SIN CATEGORÍA" missing from the old static list). "SIN CATEGORÍA" is
// filtered out — it's the internal catch-all for unsorted products, not
// something to describe to a customer as a browsable category.
export async function getCategoryNames(): Promise<string[]> {
  const categories = await prisma.category.findMany({
    where: { name: { not: "SIN CATEGORÍA" } },
    orderBy: { name: "asc" },
    select: { name: true },
  });
  return categories.map((c) => toSentenceCase(c.name));
}

function toSentenceCase(s: string): string {
  const lower = s.toLocaleLowerCase("es-PE");
  return lower.charAt(0).toLocaleUpperCase("es-PE") + lower.slice(1);
}

// Shape shared by buscarProductos and productosPopulares — ProductResults en
// ChatBot.tsx renderiza las fotos de cualquiera de las dos sin distinguir
// cuál las trajo.
function serializeProduct(p: {
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  onSale: boolean;
  salePrice: number | null;
  image: string | null;
}) {
  return {
    nombre: p.name,
    categoria: p.category,
    especificaciones: p.description.slice(0, 200),
    precio: `S/. ${(p.onSale && p.salePrice ? p.salePrice : p.price).toFixed(2)}`,
    precioRegular: p.onSale && p.salePrice ? `S/. ${p.price.toFixed(2)}` : null,
    disponible: p.stock > 0,
    stock: p.stock,
    imagen: p.image ?? null,
  };
}

const productSelect = {
  name: true,
  category: true,
  description: true,
  price: true,
  stock: true,
  onSale: true,
  salePrice: true,
  image: true,
} as const;

// Lets the chatbot answer price/stock questions against the real catalog
// instead of guessing or blanket-deferring to WhatsApp. Read-only, public
// data only — same field allowlist as the /tienda queries (no costPrice).
export const buscarProductos = tool({
  description:
    "Busca productos en el catálogo real de la tienda por nombre, categoría o descripción. " +
    "Úsala siempre que el cliente pregunte por un producto, precio o stock concreto — nunca inventes esos datos.",
  inputSchema: z.object({
    consulta: z
      .string()
      .min(1)
      .max(100)
      .describe('Término de búsqueda, p. ej. "ssd 480", "mouse logitech", "ram".'),
  }),
  execute: async ({ consulta }) => {
    // Match each word independently (AND across words, OR across fields) —
    // "mouse logitech" must find "Mouse Gamer Logitech G203" even though
    // that exact phrase never appears contiguously in any single field.
    const words = consulta.split(/\s+/).filter(Boolean).slice(0, 6);
    const products = await prisma.product.findMany({
      where: {
        AND: words.map((word) => ({
          OR: [
            { name: { contains: word } },
            { description: { contains: word } },
            { category: { contains: word } },
          ],
        })),
      },
      // costPrice is admin-only — never select it into a response the model can relay.
      select: { id: true, ...productSelect },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    if (products.length === 0) {
      return { encontrados: 0, productos: [] };
    }

    // Alimenta productosPopulares — cuenta cuántas veces cada producto salió
    // en una búsqueda del chat, no cuántas veces se vendió (eso ya lo mide
    // Sale). No bloquea la respuesta al cliente por un fallo aquí.
    prisma.product
      .updateMany({
        where: { id: { in: products.map((p) => p.id) } },
        data: { searchHits: { increment: 1 } },
      })
      .catch((err) => console.error("[chat] no se pudo incrementar searchHits:", err));

    return {
      encontrados: products.length,
      productos: products.map(serializeProduct),
    };
  },
});

// Para cuando el cliente pregunta algo vago ("qué me recomiendas", "qué
// tienen en oferta", "qué es lo más vendido") en vez de un producto
// puntual — responde con datos reales de qué se busca/destaca más en el
// catálogo, en vez de que el modelo invente una recomendación.
export const productosPopulares = tool({
  description:
    "Devuelve los productos más buscados/destacados del catálogo real, sin necesitar un término de búsqueda. " +
    "Úsala cuando el cliente pida una recomendación general, pregunte qué hay en oferta o qué es lo más vendido.",
  inputSchema: z.object({}),
  execute: async () => {
    const products = await prisma.product.findMany({
      where: { stock: { gt: 0 } },
      select: productSelect,
      orderBy: [{ searchHits: "desc" }, { isFeatured: "desc" }, { createdAt: "desc" }],
      take: 6,
    });

    if (products.length === 0) {
      return { encontrados: 0, productos: [] };
    }

    return {
      encontrados: products.length,
      productos: products.map(serializeProduct),
    };
  },
});

// No entrega nada al modelo ni cambia su respuesta — es puramente una señal
// para medir cuánto del tráfico del chat es gente pidiendo algo fuera del
// negocio (código, tareas, ensayos...) antes de gastar tokens en ello. El
// system prompt le pide al modelo llamarla justo antes de rechazar un
// pedido así. Deliberadamente no recibe el texto del cliente — solo una
// categoría corta — para no dejar nada personal en los logs de `pm2 logs`.
export const marcarFueraDeTema = tool({
  description:
    "Regístrala SIEMPRE justo antes de responder a un pedido fuera del alcance de INFOSISTEL " +
    "(código, tareas escolares, ensayos, traducciones, opinión personal, etc.) — no le muestra nada al cliente.",
  inputSchema: z.object({
    categoria: z
      .enum(["codigo", "tarea_escolar", "escritura", "traduccion", "opinion_personal", "otro"])
      .describe("Categoría del pedido fuera de tema, sin citar el mensaje del cliente."),
  }),
  execute: async ({ categoria }) => {
    console.log(`[chat] fuera-de-tema categoria=${categoria}`);
    return { registrado: true };
  },
});
