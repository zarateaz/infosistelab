#!/usr/bin/env bash
# ============================================================================
#  SMOKE TEST DEL LABORATORIO — verifica que los 4 escenarios respondan
# ============================================================================
#  Uso:
#    ./scripts/lab/smoke-test.sh
#    BASE_URL=http://10.10.10.20:3000 ./scripts/lab/smoke-test.sh
#
#  No ejecuta SQLmap ni SET: solo comprueba que las rutas y los datos estén
#  listos antes de la exposición. Todas las pruebas son de solo lectura.
# ============================================================================

set -uo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
PASS=0
FAIL=0

check() {
  local name="$1" expected="$2" url="$3" needle="${4:-}"
  local body status
  body="$(curl -sS -m 10 -w $'\n%{http_code}' "$url" 2>&1)" || true
  status="$(printf '%s' "$body" | tail -n1)"
  body="$(printf '%s' "$body" | sed '$d')"

  if [ "$status" != "$expected" ]; then
    echo "FAIL  $name -> HTTP $status (esperado $expected)"
    FAIL=$((FAIL + 1))
    return
  fi

  if [ -n "$needle" ] && ! printf '%s' "$body" | grep -q "$needle"; then
    echo "FAIL  $name -> respuesta sin '$needle'"
    FAIL=$((FAIL + 1))
    return
  fi

  echo "OK    $name"
  PASS=$((PASS + 1))
}

echo ""
echo "Smoke test contra $BASE_URL"
echo "------------------------------------------------------------"

check "1. SQLi base (id=1)" 200 "$BASE_URL/api/lab/products?id=1" '"costPrice"'
check "2. SQLi bypass (id=1 OR 1=1)" 200 "$BASE_URL/api/lab/products?id=1%20OR%201=1" '"sql"'
check "3. SQLi string (q=...)" 200 "$BASE_URL/api/lab/products?q=mouse" '"costPrice"'
check "4. IDOR sin auth (orders)" 200 "$BASE_URL/api/lab/orders" '"customerPhone"'
check "5. Versión segura (sin costPrice)" 200 "$BASE_URL/api/lab/products-secure?id=1" '"vulnerable":false'
check "6. Login disponible" 200 "$BASE_URL/taller-control/login" ''

echo "------------------------------------------------------------"
echo "Resultado: $PASS OK, $FAIL FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
