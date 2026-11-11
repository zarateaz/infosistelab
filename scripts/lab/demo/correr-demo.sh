#!/usr/bin/env bash
# ============================================================================
#  correr-demo.sh — orquestador del toolkit de demo
# ============================================================================
#  Uso:
#    bash scripts/lab/demo/correr-demo.sh preflight
#    bash scripts/lab/demo/correr-demo.sh antes
#    bash scripts/lab/demo/correr-demo.sh despues
#    bash scripts/lab/demo/correr-demo.sh infra
#    bash scripts/lab/demo/correr-demo.sh victima
#    bash scripts/lab/demo/correr-demo.sh todo
#
#  Variables:
#    BASE_URL   URL de la app (default http://127.0.0.1:3000)
#    VPS_IP     IP víctima (default 10.10.10.20)
#    DOMAIN     dominio (default infosistel.lab)
#    SKIP_INFRA=1   omite el bloque infra en 'todo'
#    ON_VICTIMA=1   incluye 40-victima.sh en 'todo'
# ============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT" || exit 1

MODE="${1:-todo}"
STAMP="${STAMP:-$(date +%Y%m%d-%H%M%S)}"
export EVID="${EVID:-$ROOT/evidencias/$STAMP}"
mkdir -p "$EVID"
export BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
export VPS_IP="${VPS_IP:-10.10.10.20}"
export DOMAIN="${DOMAIN:-infosistel.lab}"

run() {
  local script="$1"
  printf '\n>>> %s\n' "$script"
  bash "$SCRIPT_DIR/$script" || true
}

case "$MODE" in
  preflight) run preflight.sh ;;
  antes)     run 10-antes.sh ;;
  despues)   run 20-despues.sh ;;
  infra)     run 30-infra.sh ;;
  victima)   run 40-victima.sh ;;
  todo)
    run preflight.sh
    run 10-antes.sh
    # La infra va antes de 20-despues porque D7 agota el rate limit de la IP
    # durante unos minutos y podría contaminar las pruebas HTTP posteriores.
    if [ "${SKIP_INFRA:-0}" != "1" ]; then run 30-infra.sh; fi
    run 20-despues.sh
    if [ "${ON_VICTIMA:-0}" = "1" ]; then run 40-victima.sh; fi
    ;;
  *)
    echo "Uso: $0 [preflight|antes|despues|infra|victima|todo]"
    exit 1
    ;;
esac

printf '\n============================================================\n'
printf ' Evidencias de esta corrida:\n'
printf '   %s\n' "$EVID"
printf ' Resúmenes:\n'
ls -1 "$EVID"/RESUMEN-*.md 2>/dev/null | sed 's/^/   /' || true
printf '============================================================\n'
