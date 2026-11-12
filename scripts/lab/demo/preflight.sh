#!/usr/bin/env bash
# ============================================================================
#  preflight.sh — revisa que la VM víctima esté lista antes de la demo
# ============================================================================
#  Uso (en la VM víctima o donde corre la app):
#    bash scripts/lab/demo/preflight.sh
#    BASE_URL=http://10.10.10.20:3000 bash scripts/lab/demo/preflight.sh
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT" || exit 1
export EVID="${EVID:-$ROOT/evidencias/$(date +%Y%m%d-%H%M%S)}"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"

section "PREFLIGHT — INFOSISTEL LAB"
info "Repo:     $ROOT"
info "Base URL: $BASE_URL"
info "Evidencias: $EVID"

section "1. Herramientas"
for cmd in curl openssl sqlite3; do
  if need_cmd "$cmd"; then ok "comando disponible: $cmd"; else bad "falta el comando: $cmd"; fi
done
for cmd in nmap pm2 jq npx node; do
  if need_cmd "$cmd"; then info "opcional disponible: $cmd"; else skip "opcional no instalado: $cmd"; fi
done

section "2. La aplicación responde"
root_code="$(http_code "$BASE_URL/" "$EVID/preflight-root.html")"
if [ "$root_code" = "000" ]; then
  bad "No hay respuesta en $BASE_URL"
  note "Arranca la app con:"
  note "  bash scripts/lab/demo/start-pm2.sh"
  note "  # o: bash scripts/lab/run-lab.sh --prod"
else
  ok "GET / -> HTTP $root_code"
fi

login_code="$(http_code "$BASE_URL/taller-control/login" "$EVID/preflight-login.html")"
if [ "$login_code" = "200" ]; then ok "GET /taller-control/login -> HTTP 200"; else bad "GET /taller-control/login -> HTTP $login_code"; fi

section "3. Modo del laboratorio (LAB_MODE)"
lab_code="$(http_code "$BASE_URL/api/lab/products?id=1" "$EVID/preflight-lab-mode.json")"
if [ "$lab_code" = "200" ]; then
  info "LAB_MODE=1: /api/lab/* está ACTIVO (perfil 'antes' disponible)."
  grep -o '"count":[0-9]*' "$EVID/preflight-lab-mode.json" 2>/dev/null | head -1 || true
elif [ "$lab_code" = "404" ]; then
  info "LAB_MODE=0: /api/lab/* responde 404 (perfil 'después' limpio)."
else
  skip "No se pudo determinar LAB_MODE (HTTP $lab_code)."
fi

section "4. Archivos y base de datos"
if [ -f .env.lab ]; then
  ok ".env.lab existe"
  stat -c '  permisos .env.lab: %a %U:%G' .env.lab 2>/dev/null || true
  grep -E '^(LAB_MODE|DATABASE_URL)=' .env.lab 2>/dev/null | sed 's/^/  /' || true
else
  info "Sin .env.lab: preflight en modo ATACANTE (se omite la revisión de la BD local)."
fi

# Cargar variables del lab para localizar la BD.
if [ -f .env.lab ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.lab
  set +a
fi
DB="${DATABASE_URL:-}"
DB="${DB#file:}"
[ -f "$DB" ] || DB="$ROOT/lab-data/lab.db"

if [ -f "$DB" ] && need_cmd sqlite3; then
  ok "Base de datos: $DB"
  stat -c '  permisos BD: %a %U:%G' "$DB" 2>/dev/null || true
  admins="$(sqlite3 "$DB" 'SELECT COUNT(*) FROM Admin;' 2>/dev/null || echo '?')"
  info "Administradores en BD: $admins"
  sqlite3 -header -column "$DB" 'SELECT username, role, tokenVersion, totpEnabled FROM Admin;' 2>/dev/null | sed 's/^/  /' || true
  legacy="$(sqlite3 "$DB" "SELECT COUNT(*) FROM \"Order\" WHERE customerName LIKE 'LAB-Legacy%';" 2>/dev/null || echo '?')"
  if [ "$legacy" = "0" ]; then
    ok "Sin pedido legacy en texto plano (P-14 limpio)."
  else
    info "Pedidos legacy (texto plano) para el 'antes': $legacy"
    note "Para el 'después': bash scripts/lab/demo/40-victima.sh --clean-legacy"
  fi
elif [ -f "$DB" ]; then
  skip "sqlite3 no está instalado; no se puede inspeccionar la BD."
elif [ ! -f .env.lab ]; then
  info "BD local no aplica en la VM atacante (no hay .env.lab)."
else
  bad "No se encontró la BD del laboratorio ($DB)."
fi

section "5. Capa Nginx / TLS (opcional)"
https_code="$(http_code "https://$DOMAIN/" "$EVID/preflight-https.html")"
if [ "$https_code" = "000" ]; then
  info "No hay HTTPS en https://$DOMAIN/ (normal si aún no montas Nginx)."
  note "Mientras no haya Nginx, P-04/P-08/P-09 general y parte de P-01 se demoran."
else
  ok "HTTPS responde en https://$DOMAIN/ -> HTTP $https_code"
fi

section "6. PM2 (si está instalado)"
if need_cmd pm2; then
  pm2 list 2>/dev/null | sed 's/^/  /' || skip "pm2 no responde"
else
  skip "pm2 no instalado (puedes usar run-lab.sh --prod)"
fi

summary
