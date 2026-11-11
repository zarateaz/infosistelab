/**
 * ============================================================================
 *  SEED DEL LABORATORIO — SOLO RAMA `lab-vulnerable`
 * ============================================================================
 *
 * Crea datos de demostración en `lab-data/lab.db`:
 *   - Un admin débil y SIN MFA (`zarate` / `Zarate2026!`) para el ejercicio de
 *     phishing (el "antes"). En la versión endurecida ese mismo login exige
 *     segundo factor.
 *   - 8 productos con `costPrice` (margen real) para demostrar la fuga por
 *     SQLi.
 *   - 3 pedidos con teléfono cifrado + índice ciego, para demostrar IDOR y
 *     exposición de PII en /api/lab/orders.
 *
 * Ejecutar SIEMPRE con LAB_MODE=1 y DATABASE_URL apuntando a lab-data/lab.db:
 *   npx tsx --env-file=.env.lab scripts/lab/seed-lab.ts
 *
 * El script es idempotente: re-crea el admin, hace upsert de productos por
 * `itemNumber` y borra/crea solo los pedidos cuyo nombre empieza con "LAB-".
 */

import { prisma } from "../../src/lib/prisma";
import { hashPassword } from "../../src/lib/auth";
import { encryptPII, blindIndex } from "../../src/lib/crypto";
import { digitsOnly } from "../../src/lib/sanitize";

if (process.env.LAB_MODE !== "1") {
  console.error(
    "[lab] Rechazado: exporta LAB_MODE=1 y usa DATABASE_URL=file:./lab-data/lab.db"
  );
  process.exit(1);
}

const LAB_ADMIN = {
  username: "zarate",
  password: "Zarate2026!",
  role: "superadmin",
};

const PRODUCTS = [
  {
    itemNumber: 1,
    name: "Laptop Lenovo IdeaPad Slim 3 15.6\"",
    category: "LAPTOPS",
    description: "Ryzen 5, 16GB RAM, 512GB SSD. Producto de demostración del laboratorio.",
    price: 2399,
    costPrice: 1950, // margen 18.7% — dato que NO debe salir al público
    stock: 4,
    isFeatured: true,
  },
  {
    itemNumber: 2,
    name: "Laptop ASUS TUF Gaming F15",
    category: "LAPTOPS",
    description: "Intel i5, RTX 3050, 16GB RAM. Producto de demostración.",
    price: 3899,
    costPrice: 3200, // margen 17.9%
    stock: 3,
    onSale: true,
    salePrice: 3499,
  },
  {
    itemNumber: 3,
    name: "PC Armada Ryzen 5 + RTX 4060",
    category: "PC",
    description: "16GB RAM, SSD 1TB. Producto de demostración.",
    price: 4299,
    costPrice: 3600, // margen 16.3%
    stock: 2,
    isFeatured: true,
  },
  {
    itemNumber: 4,
    name: "Monitor LG 24\" Full HD IPS",
    category: "MONITORES",
    description: "75Hz, IPS. Producto de demostración.",
    price: 549,
    costPrice: 430,
    stock: 9,
    onSale: true,
    salePrice: 479,
  },
  {
    itemNumber: 5,
    name: "Kingston NV2 1TB NVMe M.2",
    category: "SSD",
    description: "SSD NVMe. Producto de demostración.",
    price: 259,
    costPrice: 190,
    stock: 20,
  },
  {
    itemNumber: 6,
    name: "Teclado Mecánico RGB Redragon K552",
    category: "TECLADO",
    description: "Switches mecánicos. Producto de demostración.",
    price: 189,
    costPrice: 130,
    stock: 10,
  },
  {
    itemNumber: 7,
    name: "Mouse Gamer Logitech G203",
    category: "MOUSE",
    description: "8000 DPI. Producto de demostración.",
    price: 79,
    costPrice: 55,
    stock: 18,
  },
  {
    itemNumber: 8,
    name: "Impresora Multifuncional Epson L3250",
    category: "IMPRESORAS",
    description: "Tinta continua, WiFi. Producto de demostración.",
    price: 899,
    costPrice: 720,
    stock: 8,
  },
] as const;

interface LabCustomer {
  name: string;
  phone: string;
  total: number;
  plaintext?: boolean;
  items: Array<{
    productId: number;
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
  }>;
}

const CUSTOMERS: LabCustomer[] = [
  {
    name: "LAB-Carlos Ramírez",
    phone: "987654321",
    total: 2399,
    items: [
      { productId: 1, name: "Laptop Lenovo IdeaPad Slim 3 15.6\"", category: "LAPTOPS", quantity: 1, unitPrice: 2399 },
    ],
  },
  {
    name: "LAB-María Fernández",
    phone: "912345678",
    total: 4948,
    items: [
      { productId: 2, name: "Laptop ASUS TUF Gaming F15", category: "LAPTOPS", quantity: 1, unitPrice: 3499 },
      { productId: 4, name: "Monitor LG 24\" Full HD IPS", category: "MONITORES", quantity: 3, unitPrice: 479 },
    ],
  },
  {
    name: "LAB-José Quispe",
    phone: "998877665",
    total: 4299,
    items: [
      { productId: 3, name: "PC Armada Ryzen 5 + RTX 4060", category: "PC", quantity: 1, unitPrice: 4299 },
    ],
  },
  {
    // Este pedido simula el estado ANTERIOR a la Fase 4: teléfono en texto
    // plano en la BD. Sirve para el "antes vs. después" del cifrado en reposo.
    name: "LAB-Legacy sin cifrar",
    phone: "955443322",
    total: 899,
    plaintext: true,
    items: [
      { productId: 8, name: "Impresora Multifuncional Epson L3250", category: "IMPRESORAS", quantity: 1, unitPrice: 899 },
    ],
  },
];

async function main() {
  // 1) Admin débil, sin MFA — el "antes" del phishing.
  const passwordHash = await hashPassword(LAB_ADMIN.password);

  // Limpia el admin anterior del laboratorio para no dejar credenciales
  // viejas activas. AuditLog.adminId es un string sin FK, así que el
  // historial de auditoría se conserva.
  await prisma.admin.deleteMany({ where: { username: "labadmin" } });

  await prisma.admin.upsert({
    where: { username: LAB_ADMIN.username },
    update: {
      passwordHash,
      role: LAB_ADMIN.role,
      totpEnabled: false,
      totpSecret: null,
      recoveryCodesHash: null,
    },
    create: {
      username: LAB_ADMIN.username,
      passwordHash,
      role: LAB_ADMIN.role,
      totpEnabled: false,
    },
  });

  // 2) Categorías (para que /tienda muestre los chips de filtro).
  const categoryNames = Array.from(new Set(PRODUCTS.map((product) => product.category)));
  for (const name of categoryNames) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 3) Catálogo con costPrice.
  const productIds = new Map<number, string>();
  for (const product of PRODUCTS) {
    const saved = await prisma.product.upsert({
      where: { itemNumber: product.itemNumber },
      update: { ...product, image: null },
      create: { ...product, image: null },
    });
    productIds.set(product.itemNumber, saved.id);
  }

  // 4) Pedidos con PII cifrada (para el IDOR).
  await prisma.order.deleteMany({
    where: { customerName: { startsWith: "LAB-" } },
  });

  const orderIds: string[] = [];
  for (const customer of CUSTOMERS) {
    const phoneDigits = digitsOnly(customer.phone);
    const order = await prisma.order.create({
      data: {
        customerName: customer.name,
        // En el pedido "legacy" se guarda en claro A PROPÓSITO para poder
        // demostrar el antes de la Fase 4; el resto usa AES-256-GCM.
        customerPhone: customer.plaintext ? phoneDigits : encryptPII(phoneDigits),
        customerPhoneIndex: blindIndex(phoneDigits),
        total: customer.total,
        items: {
          create: customer.items.map((item) => ({
            productId: productIds.get(item.productId) ?? null,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
    });
    orderIds.push(order.id);
  }

  // 5) Reparación de laboratorio con DNI cifrado (P-14 y /seguimiento).
  await prisma.repair.deleteMany({ where: { code: { startsWith: "LAB-" } } });
  const repair = await prisma.repair.create({
    data: {
      code: "LAB-REP-001",
      dniEncrypted: encryptPII("12345678"),
      dniIndex: blindIndex("12345678"),
      equipment: "Laptop Lenovo IdeaPad Slim 3",
      problem: "No enciende; posible falla del cargador.",
      progress: 35,
      statusText: "En diagnóstico",
    },
  });

  console.log("");
  console.log("============================================================");
  console.log("  LABORATORIO INFOSISTEL — datos listos");
  console.log("============================================================");
  console.log(`  Admin:      ${LAB_ADMIN.username} / ${LAB_ADMIN.password}`);
  console.log("  MFA:        DESACTIVADO (a propósito, para el 'antes')");
  console.log(`  Productos:  ${PRODUCTS.length} (itemNumber 1..8, con costPrice)`);
  console.log(`  Pedidos:    ${orderIds.length}`);
  console.log(`  Reparación: ${repair.code} (DNI 12345678 cifrado + índice ciego)`);
  console.log("");
  console.log("  IDs de pedidos para el ejercicio IDOR:");
  orderIds.forEach((id) => console.log(`    - ${id}`));
  console.log("");
  console.log("  Pruebas rápidas:");
  const port = process.env.PORT ?? "3000";
  console.log(`    curl 'http://127.0.0.1:${port}/api/lab/products?id=1'`);
  console.log(`    curl 'http://127.0.0.1:${port}/api/lab/products?id=1%20OR%201=1'`);
  console.log(`    curl 'http://127.0.0.1:${port}/api/lab/orders'`);
  console.log("============================================================");
  console.log("");
}

main()
  .catch((error) => {
    console.error("[lab] Error en el seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
