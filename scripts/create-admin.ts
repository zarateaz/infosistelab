import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";

/**
 * Crea/actualiza un administrador.
 *
 * En este repo de laboratorio los valores por defecto son ficticios:
 *   usuario: zarate / contraseña: Zarate2026!
 *
 * Para producción, pasa credenciales por argumentos o variables de entorno:
 *   npx tsx --env-file=.env scripts/create-admin.ts <usuario> <password> [rol]
 *   ADMIN_USERNAME=... ADMIN_PASSWORD=... npx tsx --env-file=.env scripts/create-admin.ts
 */
async function main() {
  const username = process.argv[2] ?? process.env.ADMIN_USERNAME ?? "zarate";
  const password = process.argv[3] ?? process.env.ADMIN_PASSWORD ?? "Zarate2026!";
  const role = process.argv[4] ?? process.env.ADMIN_ROLE ?? "superadmin";

  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.admin.upsert({
    where: { username },
    update: {
      passwordHash,
      role,
      totpEnabled: false,
      totpSecret: null,
    },
    create: {
      username,
      passwordHash,
      role,
    },
  });

  console.log(`Usuario ${admin.username} creado/actualizado con rol ${admin.role} (ID ${admin.id}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
