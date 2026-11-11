/**
 * scripts/lab/demo/generar-jwt.ts
 *
 * Genera un JWT de sesión válido para el laboratorio, usando exactamente la
 * misma función que la app (createSessionToken / HS256). Sirve para probar la
 * invalidación del lado del servidor (V3.3.1/V3.3.3): se emite un token con
 * el tokenVersion actual, se incrementa tokenVersion en la BD y se comprueba
 * que el token viejo deja de servir.
 *
 * Uso (desde la raíz del repo, con .env.lab cargado):
 *   npx tsx --env-file=.env.lab scripts/lab/demo/generar-jwt.ts <adminId> <username> <role> <tokenVersion>
 */
import { createSessionToken } from "../../../src/lib/session";

async function main() {
  const [sub, username, role, v] = process.argv.slice(2);
  if (!sub || !username || !role || v === undefined) {
    console.error("Uso: generar-jwt.ts <adminId> <username> <role> <tokenVersion>");
    process.exit(2);
  }
  const token = await createSessionToken({ sub, username, role, v: Number(v) });
  process.stdout.write(token);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
