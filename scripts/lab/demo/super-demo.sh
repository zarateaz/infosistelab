#!/usr/bin/env bash
# ============================================================================
#  super-demo.sh — UN SOLO COMANDO para toda la demo
# ============================================================================
#  Uso:
#    bash scripts/lab/demo/super-demo.sh --all
#    bash scripts/lab/demo/super-demo.sh --before
#    bash scripts/lab/demo/super-demo.sh --after
#    bash scripts/lab/demo/super-demo.sh --compare \
#      --vuln http://127.0.0.1:3000 --secure https://10.10.10.20
#    bash scripts/lab/demo/super-demo.sh --all --jury
#    bash scripts/lab/demo/super-demo.sh --all --on-victim
#
#  Perfiles:
#    --before     ataca la instancia LAB_MODE=1
#    --after      verifica la instancia endurecida
#    --compare    A/B lado a lado (mismos payloads)
#    --infra      nmap/TLS/SSH/Hydra/Nginx
#    --victim     SQLite/AES/tokenVersion (en la VM víctima)
#    --all        preflight + before + compare + after + victim + infra
#
#  Variables:
#    VULN_URL     instancia LAB_MODE=1 (default http://127.0.0.1:3000)
#    SECURE_URL   instancia endurecida (default VULN_URL)
#    VPS_IP       IP víctima (default 10.10.10.20)
#    DOMAIN       dominio (default infosistel.lab)
#    SKIP_INFRA=1 omite el bloque infra
#    EVID         carpeta de evidencias
# ============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT" || exit 1

MODE="all"
JURY=0
ON_VICTIM="${ON_VICTIM:-0}"
VULN_URL="${VULN_URL:-http://127.0.0.1:3000}"
SECURE_URL="${SECURE_URL:-$VULN_URL}"
VPS_IP="${VPS_IP:-10.10.10.20}"
DOMAIN="${DOMAIN:-infosistel.lab}"

for arg in "$@"; do
  case "$arg" in
    --all)        MODE="all" ;;
    --before)     MODE="before" ;;
    --after)      MODE="after" ;;
    --compare)    MODE="compare" ;;
    --infra)      MODE="infra" ;;
    --victim)     MODE="victim" ;;
    --jury)       JURY=1 ;;
    --on-victim)  ON_VICTIM=1 ;;
    --vuln=*)     VULN_URL="${arg#*=}" ;;
    --secure=*)   SECURE_URL="${arg#*=}" ;;
    --vuln)       shift; VULN_URL="${1:-$VULN_URL}" ;;
    --secure)     shift; SECURE_URL="${1:-$SECURE_URL}" ;;
    --skip-infra) export SKIP_INFRA=1 ;;
    -h|--help)    sed -n '2,32p' "$0"; exit 0 ;;
    *) echo "Opción no reconocida: $arg"; exit 1 ;;
  esac
done

export EVID="${EVID:-$ROOT/evidencias/$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$EVID"
export VULN_URL SECURE_URL VPS_IP DOMAIN

# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"

run_step() {
  local label="$1"; shift
  if [ "$JURY" = "1" ]; then
    printf '\n%s────────────────────────────────────────────────────────────%s\n' "$C_BOLD" "$C_RESET"
    printf '%s SIGUIENTE: %s%s\n' "$C_BOLD" "$label" "$C_RESET"
    printf '%s────────────────────────────────────────────────────────────%s\n' "$C_BOLD" "$C_RESET"
    read -r -p "Presiona Enter para ejecutar..." _ || true
  fi
  "$@" || true
}

section "SUPER DEMO — INFOSISTEL LAB"
info "Modo: $MODE"
info "ANTES: $VULN_URL"
info "DESPUÉS: $SECURE_URL"
info "Evidencias: $EVID"
if [ "$VULN_URL" = "$SECURE_URL" ]; then
  info "Aviso: VULN_URL y SECURE_URL son iguales; el A/B no tendrá contraste."
  note "Usa, por ejemplo, --vuln http://127.0.0.1:3000 --secure https://10.10.10.20"
fi
if [ "$JURY" = "1" ]; then info "Modo jurado: pausa entre bloques"; fi

case "$MODE" in
  before)
    run_step "Preflight" env BASE_URL="$VULN_URL" bash "$SCRIPT_DIR/preflight.sh"
    run_step "Acto ANTES" env BASE_URL="$VULN_URL" bash "$SCRIPT_DIR/10-antes.sh"
    ;;
  after)
    run_step "Preflight" env BASE_URL="$SECURE_URL" bash "$SCRIPT_DIR/preflight.sh"
    run_step "Acto DESPUÉS" env BASE_URL="$SECURE_URL" bash "$SCRIPT_DIR/20-despues.sh"
    ;;
  compare)
    run_step "Comparación A/B" env VULN_URL="$VULN_URL" SECURE_URL="$SECURE_URL" bash "$SCRIPT_DIR/comparar.sh"
    ;;
  infra)
    run_step "Bloque infra" env VPS_IP="$VPS_IP" DOMAIN="$DOMAIN" bash "$SCRIPT_DIR/30-infra.sh"
    ;;
  victim)
    run_step "Verificación en víctima" env BASE_URL="$SECURE_URL" bash "$SCRIPT_DIR/40-victima.sh"
    ;;
  all)
    run_step "1/6 Preflight" env BASE_URL="$SECURE_URL" bash "$SCRIPT_DIR/preflight.sh"
    run_step "2/6 Acto ANTES" env BASE_URL="$VULN_URL" bash "$SCRIPT_DIR/10-antes.sh"
    run_step "3/6 Comparación A/B" env VULN_URL="$VULN_URL" SECURE_URL="$SECURE_URL" bash "$SCRIPT_DIR/comparar.sh"
    run_step "4/6 Acto DESPUÉS" env BASE_URL="$SECURE_URL" bash "$SCRIPT_DIR/20-despues.sh"
    if [ "$ON_VICTIM" = "1" ]; then
      run_step "5/6 Datos y sesión (víctima)" env BASE_URL="$SECURE_URL" bash "$SCRIPT_DIR/40-victima.sh"
    else
      info "5/6 Víctima omitido (usa --on-victim en la VM víctima)"
    fi
    if [ "${SKIP_INFRA:-0}" = "1" ]; then
      info "6/6 Infra omitido (SKIP_INFRA=1)"
    else
      run_step "6/6 Infra" env VPS_IP="$VPS_IP" DOMAIN="$DOMAIN" bash "$SCRIPT_DIR/30-infra.sh"
    fi
    ;;
  *)
    echo "Modo inválido: $MODE"
    exit 1
    ;;
esac

# Reporte consolidado
REPORT="$EVID/REPORTE.md"
{
  printf '# Reporte de demo — %s\n\n' "$(date -Is)"
  printf -- '- Modo: `%s`\n- ANTES: `%s`\n- DESPUÉS: `%s`\n\n' "$MODE" "$VULN_URL" "$SECURE_URL"
  for f in "$EVID"/RESUMEN-*.md "$EVID"/COMPARACION.md; do
    [ -f "$f" ] || continue
    printf '## %s\n\n' "$(basename "$f")"
    cat "$f"
    printf '\n'
  done
} > "$REPORT" 2>/dev/null || true

section "REPORTE"
info "Evidencias: $EVID"
info "Reporte consolidado: $REPORT"
if [ -f "$REPORT" ]; then
  printf '\n  Archivos de evidencia:\n'
  ls -1 "$EVID" | sed 's/^/    - /'
fi

cat <<'EOF'

  Cobertura de las 14 pruebas:
    P-01 30-infra (nmap)              P-08 30-infra (User-Agent 444)
    P-02 30-infra (SSH 2244)          P-09 20-despues/30-infra (429)
    P-03 30-infra (Hydra/Fail2ban)    P-10 20-despues (panel/JWT)
    P-04 20-despues/30-infra (TLS)    P-11 20-despues (costPrice)
    P-05 20-despues (cabeceras/CSP)   P-12 manual (Burp/MFA)
    P-06 20-despues (archivos)        P-13 40-victima (tokenVersion)
    P-07 20-despues (SQLi 403)        P-14 40-victima (AES/HMAC/600)
EOF
