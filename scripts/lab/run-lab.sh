#!/usr/bin/env bash
# ============================================================================
#  ARRANQUE DEL LABORATORIO — INFOSISTEL (rama lab-vulnerable)
# ============================================================================
#  Uso:
#    ./scripts/lab/run-lab.sh              # next dev en 0.0.0.0:3000
#    ./scripts/lab/run-lab.sh --prod       # build + next start
#    ./scripts/lab/run-lab.sh --no-seed    # no re-sembrar datos
#    ./scripts/lab/run-lab.sh --port=3001
#
#  Genera .env.lab la primera vez (gitignored) con secretos aleatorios y una
#  DATABASE_URL ABSOLUTA a lab-data/lab.db, para que Prisma CLI y el adapter
#  better-sqlite3 apunten exactamente al mismo archivo.
# ============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MODE="dev"
SEED=1
PORT="${PORT:-3000}"
# Permite `LAB_MODE=0 ./scripts/lab/run-lab.sh` para el "después" sin editar
# .env.lab. Si no se pasa, manda lo que diga .env.lab (por defecto 1).
REQUESTED_LAB_MODE="${LAB_MODE:-}"

for arg in "$@"; do
  case "$arg" in
    --prod) MODE="prod" ;;
    --no-seed) SEED=0 ;;
    --port=*) PORT="${arg#*=}" ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "[lab] Argumento no reconocido: $arg"
      exit 1
      ;;
  esac
done

mkdir -p lab-data

if [ ! -f .env.lab ]; then
  echo "[lab] Generando .env.lab (gitignored) con secretos aleatorios de laboratorio..."
  umask 077
  cat > .env.lab <<EOF
# LAB ONLY — generado por scripts/lab/run-lab.sh. No usar en producción.
LAB_MODE=1
DATABASE_URL="file:$ROOT/lab-data/lab.db"
JWT_SECRET="$(openssl rand -base64 64 | tr -d '\n')"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
DNI_HMAC_SECRET="$(openssl rand -hex 32)"
EOF
fi

set -a
# shellcheck disable=SC1091
source ./.env.lab
set +a

if [ -n "$REQUESTED_LAB_MODE" ]; then
  export LAB_MODE="$REQUESTED_LAB_MODE"
fi
export LAB_MODE="${LAB_MODE:-1}"
export PORT

echo ""
echo "############################################################"
if [ "$LAB_MODE" = "1" ]; then
  echo "#  INFOSISTEL — LAB (DELIBERADAMENTE VULNERABLE)             #"
else
  echo "#  INFOSISTEL — MODO ENDURECIDO (rutas /api/lab = 404)      #"
fi
echo "############################################################"
echo "  Node:        $(node -v)"
echo "  BD:          ${DATABASE_URL}"
echo "  LAB_MODE:    ${LAB_MODE}"
echo "  Modo:        ${MODE}"
echo "  Escucha en:  0.0.0.0:${PORT}"
echo "############################################################"
echo ""

if [ ! -d node_modules ]; then
  echo "[lab] node_modules no existe; ejecutando npm install..."
  npm install
fi

if [ ! -d src/generated/prisma ]; then
  echo "[lab] Generando Prisma Client..."
  npx prisma generate
fi

echo "[lab] Sincronizando el esquema con la BD del laboratorio..."
# `migrate deploy` NO alcanza para esta BD: el esquema tiene columnas
# (p. ej. Admin.tokenVersion) que se aplicaron en el VPS con `db push` y no
# tienen migración versionada. Como lab-data/lab.db es desechable, `db push`
# garantiza que el esquema coincida exactamente con prisma/schema.prisma.
npx prisma db push

if [ "$SEED" = "1" ] && [ "$LAB_MODE" = "1" ]; then
  echo "[lab] Sembrando admin, productos y pedidos de demostración..."
  npx tsx --env-file=.env.lab scripts/lab/seed-lab.ts
elif [ "$SEED" = "1" ]; then
  echo "[lab] LAB_MODE=0: se omite el seed de laboratorio."
  echo "[lab] Usa los datos existentes o corre el seed normal del proyecto."
fi

echo "[lab] Iniciando servidor..."
if [ "$MODE" = "prod" ]; then
  npm run build
  # `output: "standalone"` (next.config.ts) está pensado para correr con
  # node .next/standalone/server.js, no con `next start` (Next 16 avisa que
  # no es la combinación soportada). `npm run postbuild` ya copia public/ y
  # .next/static dentro del standalone.
  exec env NODE_ENV=production HOSTNAME=0.0.0.0 PORT="$PORT" node .next/standalone/server.js
else
  exec npx next dev -H 0.0.0.0 -p "$PORT"
fi
