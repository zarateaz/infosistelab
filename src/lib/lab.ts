/**
 * lib/lab.ts
 * ============================================================================
 *  SOLO LABORATORIO — RAMA `lab-vulnerable` — NO FORMA PARTE DE `main`
 * ============================================================================
 *
 * Este módulo existe únicamente para la Actividad N°1 (caso NovaTech) y para
 * la evidencia "antes" del hardening de INFOSISTEL. Todo lo que importa este
 * archivo queda desactivado por defecto: si `LAB_MODE` no vale exactamente
 * "1", las rutas `/api/lab/*` responden 404 y no ejecutan ninguna consulta.
 *
 * Reglas de uso:
 *  1. Solo en las dos VMs aisladas del laboratorio (Kali atacante + Kali
 *     defensa), nunca en el VPS de producción ni en el dominio real.
 *  2. La base de datos del laboratorio es `lab-data/lab.db` (ver
 *     scripts/lab/run-lab.sh); nunca `dev.db` ni la BD del VPS.
 *  3. No se hace merge de esta rama a `main`. La versión endurecida se queda
 *     en `main` / `lab-vulnerable` solo con LAB_MODE=0.
 *
 * La "vulnerabilidad" es deliberada y está comentada en cada endpoint para
 * que sirva como material didáctico, no como código que alguien copie.
 */

export function isLabMode(): boolean {
  // Función (no constante) para que Next no inline el valor en build y se
  // pueda activar/desactivar el laboratorio sin recompilar.
  return process.env.LAB_MODE === "1";
}

if (process.env.LAB_MODE === "1") {
  console.warn(
    "[LAB] LAB_MODE=1 activo: /api/lab/* es DELIBERADAMENTE VULNERABLE. " +
      "No exponer fuera de la red aislada 10.10.10.0/24."
  );
}

export const LAB_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
  "X-Lab-Mode": "deliberately-vulnerable",
  "X-Robots-Tag": "noindex, nofollow",
};

/**
 * Devuelve una respuesta 404 si el laboratorio no está habilitado.
 * Se llama al inicio de CADA endpoint /api/lab/* para que la rama pueda
 * desplegarse sin LAB_MODE y comportarse como si las rutas no existieran.
 */
export function labGuard(): Response | null {
  if (isLabMode()) return null;

  return Response.json(
    { error: "Not found" },
    { status: 404, headers: LAB_HEADERS }
  );
}

/** Respuesta JSON del laboratorio, con cabeceras que delatan el modo. */
export function labJson(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: LAB_HEADERS });
}

/**
 * SQLite devuelve algunos enteros como BigInt; JSON.stringify no los puede
 * serializar. Los normalizamos a Number solo para la respuesta del demo.
 */
export function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => (typeof val === "bigint" ? Number(val) : val))
  ) as T;
}
