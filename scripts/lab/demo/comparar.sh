#!/usr/bin/env bash
# ============================================================================
#  comparar.sh — A/B: mismos payloads contra "antes" y "después"
# ============================================================================
#  Uso:
#    VULN_URL=http://127.0.0.1:3000 \
#    SECURE_URL=https://10.10.10.20 \
#      bash scripts/lab/demo/comparar.sh
#
#    bash scripts/lab/demo/comparar.sh \
#      --vuln http://127.0.0.1:3000 \
#      --secure https://10.10.10.20
#
#  La versión "antes" debe estar con LAB_MODE=1.
#  La versión "después" debe estar con LAB_MODE=0 (o sin /api/lab/*).
#
#  No inventa resultados: cada fila es un curl real contra cada URL.
# ============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT" || exit 1

VULN_URL="${VULN_URL:-http://127.0.0.1:3000}"
SECURE_URL="${SECURE_URL:-https://10.10.10.20}"

for arg in "$@"; do
  case "$arg" in
    --vuln=*)   VULN_URL="${arg#*=}" ;;
    --secure=*) SECURE_URL="${arg#*=}" ;;
    --vuln)     shift; VULN_URL="${1:-$VULN_URL}" ;;
    --secure)   shift; SECURE_URL="${1:-$SECURE_URL}" ;;
    -h|--help)
      sed -n '2,25p' "$0"
      exit 0
      ;;
  esac
done

export EVID="${EVID:-$ROOT/evidencias/$(date +%Y%m%d-%H%M%S)}"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"

MD="$EVID/COMPARACION.md"
OK=0
REVIEW=0

probe() { # url outfile -> code
  local url="$1" out="$2" code
  code="$(curl -sk -m 10 -o "$out" -w '%{http_code}' "$url" 2>/dev/null)" || true
  printf '%s' "${code:-000}"
}

has() { grep -q -- "$2" "$1" 2>/dev/null; }
count() { grep -o -- "$2" "$1" 2>/dev/null | wc -l | tr -d ' '; }

row() {
  local test="$1" before="$2" after="$3" verdict="$4"
  printf '  %-32s | %-28s | %-28s | %s\n' "$test" "$before" "$after" "$verdict"
  printf '| %s | %s | %s | %s |\n' "$test" "$before" "$after" "$verdict" >> "$MD"
  if [ "$verdict" = "OK" ]; then OK=$((OK + 1)); else REVIEW=$((REVIEW + 1)); fi
}

section "COMPARACIÓN A/B — ANTES vs DESPUÉS"
info "ANTES  (LAB_MODE=1): $VULN_URL"
info "DESPUÉS (endurecido): $SECURE_URL"
info "Evidencias: $EVID"

{
  printf '# Comparación A/B — %s\n\n' "$(date -Is)"
  printf -- '- ANTES: `%s`\n' "$VULN_URL"
  printf -- '- DESPUÉS: `%s`\n\n' "$SECURE_URL"
  printf '| Prueba | ANTES | DESPUÉS | Veredicto |\n|---|---|---|---|\n'
} > "$MD"

printf '\n  %-32s | %-28s | %-28s | %s\n' "PRUEBA" "ANTES (vuln)" "DESPUÉS (secure)" "VEREDICTO"
printf '  %s\n' "----------------------------------------------------------------------------------------------------------------------"

# 1) SQLi en ruta de laboratorio
v="$(probe "$VULN_URL/api/lab/products?id=1%20OR%201=1" "$EVID/cmp-sqli-vuln.json")"
s="$(probe "$SECURE_URL/api/lab/products?id=1%20OR%201=1" "$EVID/cmp-sqli-secure.json")"
if [ "$v" = "200" ] && has "$EVID/cmp-sqli-vuln.json" '"costPrice"'; then
  vres="$v + costPrice"
else
  vres="$v"
fi
if [ "$v" = "200" ] && [ "$vres" = "200 + costPrice" ] && [[ " 403 404 " == *" $s "* ]]; then
  row "SQLi en /api/lab/products" "$vres" "$s" "OK"
else
  row "SQLi en /api/lab/products" "$vres" "$s" "REVISAR"
fi

# 2) IDOR/PII
v="$(probe "$VULN_URL/api/lab/orders" "$EVID/cmp-idor-vuln.json")"
s="$(probe "$SECURE_URL/api/lab/orders" "$EVID/cmp-idor-secure.json")"
if [ "$v" = "200" ] && has "$EVID/cmp-idor-vuln.json" '"customerPhone"'; then
  vres="$v + PII"
else
  vres="$v"
fi
if [ "$v" = "200" ] && [ "$vres" = "200 + PII" ] && [[ " 403 404 " == *" $s "* ]]; then
  row "IDOR/PII en /api/lab/orders" "$vres" "$s" "OK"
else
  row "IDOR/PII en /api/lab/orders" "$vres" "$s" "REVISAR"
fi

# 3) costPrice en ruta de laboratorio
v="$(probe "$VULN_URL/api/lab/products?id=1" "$EVID/cmp-cost-vuln.json")"
s="$(probe "$SECURE_URL/api/lab/products?id=1" "$EVID/cmp-cost-secure.json")"
if [ "$v" = "200" ] && has "$EVID/cmp-cost-vuln.json" '"costPrice"'; then
  vres="$v + costPrice"
else
  vres="$v"
fi
if [ "$v" = "200" ] && [ "$vres" = "200 + costPrice" ] && [[ " 403 404 " == *" $s "* ]]; then
  row "costPrice en /api/lab/products" "$vres" "$s" "OK"
else
  row "costPrice en /api/lab/products" "$vres" "$s" "REVISAR"
fi

# 4) costPrice en catálogo público (debe ser 0 en ambos)
v="$(probe "$VULN_URL/catalogo" "$EVID/cmp-cat-vuln.html")"
s="$(probe "$SECURE_URL/catalogo" "$EVID/cmp-cat-secure.html")"
vc="$(count "$EVID/cmp-cat-vuln.html" 'costPrice')"
sc="$(count "$EVID/cmp-cat-secure.html" 'costPrice')"
if [ "$vc" = "0" ] && [ "$sc" = "0" ]; then
  row "costPrice en /catalogo" "0" "0" "OK"
else
  row "costPrice en /catalogo" "$vc" "$sc" "REVISAR"
fi

# 5) SQLi en ruta pública (debe ser 403 en ambos)
v="$(probe "$VULN_URL/?id=1%20UNION%20SELECT%201" "$EVID/cmp-pub-vuln.html")"
s="$(probe "$SECURE_URL/?id=1%20UNION%20SELECT%201" "$EVID/cmp-pub-secure.html")"
if [ "$v" = "403" ] && [ "$s" = "403" ]; then
  row "SQLi en ruta pública" "$v" "$s" "OK"
else
  row "SQLi en ruta pública" "$v" "$s" "REVISAR"
fi

# 6) Panel sin sesión (debe ser 307/302 en ambos)
v="$(probe "$VULN_URL/taller-control" "$EVID/cmp-panel-vuln.html")"
s="$(probe "$SECURE_URL/taller-control" "$EVID/cmp-panel-secure.html")"
if [[ " 301 302 307 308 " == *" $v "* ]] && [[ " 301 302 307 308 " == *" $s "* ]]; then
  row "Panel sin sesión" "$v" "$s" "OK"
else
  row "Panel sin sesión" "$v" "$s" "REVISAR"
fi

# 7) Archivo sensible (debe ser 404/403 en ambos)
v="$(probe "$VULN_URL/.env" "$EVID/cmp-env-vuln.html")"
s="$(probe "$SECURE_URL/.env" "$EVID/cmp-env-secure.html")"
if [[ " 400 403 404 " == *" $v "* ]] && [[ " 400 403 404 " == *" $s "* ]]; then
  row "Archivo /.env" "$v" "$s" "OK"
else
  row "Archivo /.env" "$v" "$s" "REVISAR"
fi

# 8) Cabeceras de seguridad (mismo código en ambos)
curl -skI -m 10 "$VULN_URL/" > "$EVID/cmp-h-vuln.txt" 2>/dev/null || true
curl -skI -m 10 "$SECURE_URL/" > "$EVID/cmp-h-secure.txt" 2>/dev/null || true
vh=0; sh=0
for h in strict-transport-security x-content-type-options x-frame-options referrer-policy permissions-policy; do
  grep -qi "^$h:" "$EVID/cmp-h-vuln.txt" && vh=$((vh + 1))
  grep -qi "^$h:" "$EVID/cmp-h-secure.txt" && sh=$((sh + 1))
done
if [ "$vh" -ge 5 ] && [ "$sh" -ge 5 ]; then
  row "5 cabeceras de seguridad" "$vh/5" "$sh/5" "OK"
else
  row "5 cabeceras de seguridad" "$vh/5" "$sh/5" "REVISAR"
fi

printf '  %s\n' "----------------------------------------------------------------------------------------------------------------------"
printf '  Filas OK: %d · Filas a revisar: %d\n' "$OK" "$REVIEW"
printf '  Comparación: %s\n' "$MD"

{
  printf '\n**Filas OK:** %d · **Filas a revisar:** %d\n' "$OK" "$REVIEW"
} >> "$MD"

if [ "$REVIEW" -eq 0 ]; then
  exit 0
else
  exit 1
fi
