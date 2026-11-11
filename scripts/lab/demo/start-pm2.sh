#!/usr/bin/env bash
# ============================================================================
#  start-pm2.sh — arranca INFOSISTEL LAB con PM2 (modo producción)
# ============================================================================
#  Se ejecuta en la VM VÍCTIMA, desde la raíz del repo.
#
#  Uso:
#    bash scripts/lab/demo/start-pm2.sh
#    LAB_MODE=0 bash scripts/lab/demo/start-pm2.sh      # perfil "después"
#    LAB_HOST=127.0.0.1 bash scripts/lab/demo/start-pm2.sh  # detrás de Nginx
#    SEED=0 bash scripts/lab/demo/start-pm2.sh          # no re-sembrar
#
#  Requisitos: Node >= 20.9, npm, PM2, openssl, sqlite3.
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT"

log()  { printf '\n\033[1;36m== %s ==\033[0m\n' "$*"; }
die()  { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; exit 1; }

command -v node >/dev/null || die "Falta Node.js >= 20.9."
command -v npm  >/dev/null || die "Falta npm."
command -v pm2  >/dev/null || die "Falta PM2. Instala con: sudo npm install -g pm2"
command -v openssl >/dev/null || die "Falta openssl."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
NODE_MINOR="$(node -p 'process.versions.node.split(".")[1]')"
if [ "$NODE_MAJOR" -lt 20 ] || { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -lt 9 ]; }; then
  die "Node $(node -v) es demasiado antiguo (se requiere >= 20.9)."
fi

mkdir -p lab-data

# ---------------------------------------------------------------------------
# 1. .env.lab (solo se genera si no existe; nunca sobreescribe secretos)
# ---------------------------------------------------------------------------
if [ ! -f .env.lab ]; then
  log "Generando .env.lab con secretos aleatorios de laboratorio"
  umask 077
  cat > .env.lab <<EOF
# LAB ONLY — generado por scripts/lab/demo/start-pm2.sh. No usar en producción.
LAB_MODE=1
DATABASE_URL="file:$ROOT/lab-data/lab.db"
JWT_SECRET="$(openssl rand -base64 64 | tr -d '\n')"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
DNI_HMAC_SECRET="$(openssl rand -hex 32)"
EOF
fi
chmod 600 .env.lab

set -a
# shellcheck disable=SC1091
. ./.env.lab
set +a

export LAB_MODE="${LAB_MODE:-1}"
export PORT="${PORT:-3000}"
export LAB_HOST="${LAB_HOST:-0.0.0.0}"
export NODE_ENV=production

log "Configuración"
echo "  Repo:      $ROOT"
echo "  LAB_MODE:  $LAB_MODE"
echo "  BD:        $DATABASE_URL"
echo "  Escucha:   $LAB_HOST:$PORT"
echo "  PM2 app:   infosistel-lab"

# ---------------------------------------------------------------------------
# 2. Dependencias / Prisma / semilla
# ---------------------------------------------------------------------------
if [ ! -d node_modules ]; then
  log "Instalando dependencias (npm install)"
  npm install
fi

log "Sincronizando esquema Prisma"
npx prisma generate
npx prisma db push

if [ "$LAB_MODE" = "1" ] && [ "${SEED:-1}" = "1" ]; then
  log "Sembrando datos del laboratorio (labadmin / Lab2026!)"
  npx tsx --env-file=.env.lab scripts/lab/seed-lab.ts
else
  log "Seed omitido (LAB_MODE=$LAB_MODE, SEED=${SEED:-1})"
fi

# ---------------------------------------------------------------------------
# 3. Build de producción
# ---------------------------------------------------------------------------
log "Compilando Next.js (modo standalone)"
npm run build

# ---------------------------------------------------------------------------
# 4. PM2
# ---------------------------------------------------------------------------
log "Reiniciando PM2"
pm2 delete infosistel-lab >/dev/null 2>&1 || true
pm2 start ecosystem.config.js --update-env
pm2 save

log "Health check"
sleep 2
CODE="$(curl -sk -m 10 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/taller-control/login" 2>/dev/null || echo 000)"
if [ "$CODE" = "200" ]; then
  echo "  OK: http://127.0.0.1:$PORT/taller-control/login -> HTTP 200"
else
  echo "  AVISO: HTTP $CODE. Revisa: pm2 logs infosistel-lab --lines 40"
fi

cat <<EOF

============================================================
  INFOSISTEL LAB arriba con PM2
============================================================
  Panel:      http://<IP-DE-LA-VM>:$PORT/taller-control/login
  Usuario:    labadmin
  Contraseña: Lab2026!
  MFA:        $( [ "$LAB_MODE" = "1" ] && echo "desactivado a propósito (perfil 'antes')" || echo "según la BD (actívalo en /taller-control/seguridad)" )
  LAB_MODE:   $LAB_MODE
  PM2:        pm2 list
  Logs:       pm2 logs infosistel-lab
============================================================
EOF
