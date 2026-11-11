#!/usr/bin/env bash
# ============================================================================
#  build-lab.sh — build de producción con .env.lab cargado
# ============================================================================
#  Next.js valida DATABASE_URL / JWT_SECRET / ENCRYPTION_KEY / DNI_HMAC_SECRET
#  al importar src/lib/env.ts. `npm run build` a secas NO carga .env.lab y
#  falla en "Collecting page data". Este wrapper carga el entorno y limpia
#  .next para evitar cachés de builds fallidos.
#
#  Uso:
#    bash scripts/lab/demo/build-lab.sh
#    npm run lab:build
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT"

log() { printf '\n\033[1;36m== %s ==\033[0m\n' "$*"; }
die() { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; exit 1; }

[ -f .env.lab ] || die "No existe .env.lab. Ejecuta: bash scripts/lab/demo/start-pm2.sh"

set -a
# shellcheck disable=SC1091
. ./.env.lab
set +a

for v in DATABASE_URL JWT_SECRET ENCRYPTION_KEY DNI_HMAC_SECRET; do
  [ -n "${!v:-}" ] || die "Falta $v en .env.lab"
done

log "Limpiando .next"
rm -rf .next

log "Compilando Next.js (modo standalone)"
npm run build

log "Build listo"
echo "  Siguiente: pm2 delete infosistel-lab 2>/dev/null || true"
echo "             pm2 start ecosystem.config.js --update-env && pm2 save"
