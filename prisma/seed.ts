import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = ["RAM", "SSD", "TECLADO", "MOUSE", "LAPTOPS", "IMPRESORAS", "PC", "MONITORES"];

// No hay fotografía propia de producto todavía (Fase 3 lo resuelve con el
// panel admin) — `image: null` hace que la tarjeta muestre el ícono de la
// categoría en vez de una foto genérica de stock que luego habría que
// reemplazar de todas formas.
const PRODUCTS = [
  { name: "Kingston FURY Beast 16GB DDR4 3200MHz", category: "RAM", description: "Memoria RAM para gaming y multitarea pesada.", price: 189, costPrice: 140, stock: 14, isFeatured: true },
  { name: "Kingston FURY Beast 32GB (2x16GB) DDR4", category: "RAM", description: "Kit dual channel de alto rendimiento.", price: 349, costPrice: 270, stock: 6 },
  { name: "Kingston NV2 1TB NVMe M.2", category: "SSD", description: "SSD NVMe de alta velocidad para arranque y carga de juegos.", price: 259, costPrice: 190, stock: 20, onSale: true, salePrice: 219 },
  { name: "Kingston A400 480GB SATA", category: "SSD", description: "Repotenciación económica para laptops y PC antiguas.", price: 129, costPrice: 90, stock: 25 },
  { name: "Teclado Mecánico RGB Redragon K552", category: "TECLADO", description: "Switches mecánicos, retroiluminado, para gaming y oficina.", price: 189, costPrice: 130, stock: 10, isFeatured: true },
  { name: "Teclado Membrana Genius KB-110", category: "TECLADO", description: "Teclado de oficina, resistente a derrames.", price: 39, costPrice: 22, stock: 30 },
  { name: "Mouse Gamer Logitech G203", category: "MOUSE", description: "8000 DPI, iluminación RGB, ideal para gaming.", price: 79, costPrice: 55, stock: 18, onSale: true, salePrice: 65 },
  { name: "Mouse Inalámbrico Logitech M170", category: "MOUSE", description: "Cómodo y silencioso, para uso diario de oficina.", price: 45, costPrice: 30, stock: 22 },
  { name: 'Laptop Lenovo IdeaPad Slim 3 15.6"', category: "LAPTOPS", description: "Ryzen 5, 16GB RAM, 512GB SSD — ideal para estudio y trabajo remoto.", price: 2399, costPrice: 1950, stock: 4, isFeatured: true },
  { name: 'Laptop ASUS TUF Gaming F15', category: "LAPTOPS", description: "Intel i5, RTX 3050, 16GB RAM — gaming y diseño.", price: 3899, costPrice: 3200, stock: 3, onSale: true, salePrice: 3499 },
  { name: "Impresora Multifuncional Epson L3250", category: "IMPRESORAS", description: "Sistema de tinta continua, WiFi, escáner y copiadora.", price: 899, costPrice: 720, stock: 8, isFeatured: true },
  { name: "Impresora HP DeskJet Ink Advantage 2775", category: "IMPRESORAS", description: "Compacta, WiFi, ideal para el hogar.", price: 449, costPrice: 350, stock: 12 },
  { name: "PC Armada Ryzen 5 + RTX 4060", category: "PC", description: "16GB RAM, SSD 1TB — gaming y edición de video.", price: 4299, costPrice: 3600, stock: 2, isFeatured: true },
  { name: "PC Oficina Intel i3 + SSD 480GB", category: "PC", description: "8GB RAM — ideal para trámites, Office e internet.", price: 1399, costPrice: 1100, stock: 7 },
  { name: 'Monitor LG 24" Full HD IPS', category: "MONITORES", description: "75Hz, colores precisos, ideal para oficina y diseño.", price: 549, costPrice: 430, stock: 9, onSale: true, salePrice: 479 },
  { name: 'Monitor Gamer 27" 144Hz Curvo', category: "MONITORES", description: "Tiempo de respuesta 1ms, ideal para gaming competitivo.", price: 899, costPrice: 720, stock: 5 },
] as const;

async function main() {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const p of PRODUCTS) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (existing) continue;
    const maxItem = await prisma.product.findFirst({ orderBy: { itemNumber: 'desc' }, select: { itemNumber: true } });
    const itemNumber = (maxItem?.itemNumber ?? 0) + 1;
    await prisma.product.create({
      data: {
        name: p.name,
        category: p.category,
        description: p.description,
        price: p.price,
        costPrice: p.costPrice,
        stock: p.stock,
        itemNumber,
        image: null,
        isFeatured: "isFeatured" in p ? p.isFeatured : false,
        onSale: "onSale" in p ? p.onSale : false,
        salePrice: "salePrice" in p ? p.salePrice : null,
      },
    });
  }

  console.log(`Seed listo: ${CATEGORIES.length} categorías, ${PRODUCTS.length} productos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
