#!/usr/bin/env bash
# ============================================================================
#  lib.sh — helpers comunes del toolkit de demo INFOSISTEL LAB
# ============================================================================
#  No se ejecuta solo: lo cargan los scripts 10/20/30/40 y preflight.
#  Variables de entorno:
#    BASE_URL   URL de la app (default http://127.0.0.1:3000)
#    VPS_IP     IP de la VM víctima (default 10.10.10.20)
#    DOMAIN     dominio del lab (default infosistel.lab)
#    EVID       carpeta de evidencias (default ./evidencias/<fecha-hora>)
# ============================================================================

set -uo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
VPS_IP="${VPS_IP:-10.10.10.20}"
DOMAIN="${DOMAIN:-infosistel.lab}"
EVID="${EVID:-$PWD/evidencias/$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$EVID"

PASS=0
FAIL=0
SKIP=0
LAST_FILE=""

if [ -t 1 ]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'
  C_OK=$'\033[1;32m'; C_BAD=$'\033[1;31m'; C_SKIP=$'\033[1;33m'; C_INFO=$'\033[1;36m'
else
  C_RESET=""; C_BOLD=""
  C_OK=""; C_BAD=""; C_SKIP=""; C_INFO=""
fi

ok()    { PASS=$((PASS + 1)); printf '  %sPASS%s  %s\n' "$C_OK" "$C_RESET" "$*"; }
bad()   { FAIL=$((FAIL + 1)); printf '  %sFAIL%s  %s\n' "$C_BAD" "$C_RESET" "$*"; }
skip()  { SKIP=$((SKIP + 1)); printf '  %sSKIP%s  %s\n' "$C_SKIP" "$C_RESET" "$*"; }
info()  { printf '  %sINFO%s  %s\n' "$C_INFO" "$C_RESET" "$*"; }
note()  { printf '        %s\n' "$*"; }
section() {
  printf '\n%s============================================================%s\n' "$C_BOLD" "$C_RESET"
  printf '%s %s%s\n' "$C_BOLD" "$*" "$C_RESET"
  printf '%s============================================================%s\n' "$C_BOLD" "$C_RESET"
}

slug() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9._-' '-'; }

need_cmd() { command -v "$1" >/dev/null 2>&1; }

# GET -> imprime el código HTTP y guarda el cuerpo en $2
http_code() {
  local url="$1" out="$2" code
  code="$(curl -sk -m 10 -o "$out" -w '%{http_code}' "$url" 2>/dev/null)" || true
  printf '%s' "${code:-000}"
}

# POST JSON -> imprime el código HTTP y guarda el cuerpo en $2
http_post_code() {
  local url="$1" out="$2" data="${3-}" code
  [ -z "$data" ] && data='{}'
  code="$(curl -sk -m 10 -o "$out" -w '%{http_code}' \
    -X POST -H 'Content-Type: application/json' --data "$data" "$url" 2>/dev/null)" || true
  printf '%s' "${code:-000}"
}

# Cualquier método -> imprime el código HTTP
http_method_code() {
  local method="$1" url="$2" out="$3" code
  code="$(curl -sk -m 10 -X "$method" -o "$out" -w '%{http_code}' "$url" 2>/dev/null)" || true
  printf '%s' "${code:-000}"
}

# assert_code "nombre" "200 301 302" "url"
assert_code() {
  local name="$1" expected="$2" url="$3"
  local file="$EVID/$(slug "$name").out" code
  code="$(http_code "$url" "$file")"
  LAST_FILE="$file"
  if [[ " $expected " == *" $code "* ]]; then
    ok "$name -> HTTP $code"
  else
    bad "$name -> HTTP $code (esperado: $expected)"
  fi
}

assert_present() {
  local name="$1" file="$2" needle="$3"
  if [ ! -f "$file" ]; then
    bad "$name -> no existe $file"
    return
  fi
  if grep -q -- "$needle" "$file"; then
    ok "$name -> contiene '$needle'"
  else
    bad "$name -> NO contiene '$needle'"
  fi
}

assert_absent() {
  local name="$1" file="$2" needle="$3"
  if [ ! -f "$file" ]; then
    bad "$name -> no existe $file"
    return
  fi
  if grep -q -- "$needle" "$file"; then
    bad "$name -> todavía contiene '$needle'"
  else
    ok "$name -> no contiene '$needle'"
  fi
}

assert_header() {
  local name="$1" file="$2" header="$3" needle="$4"
  local line
  line="$(grep -i "^${header}:" "$file" 2>/dev/null | head -1 | tr -d '\r')"
  if printf '%s' "$line" | grep -qi -- "$needle"; then
    ok "$name -> $line"
  else
    bad "$name -> falta o no coincide (${header}: ${line:-<vacío>})"
  fi
}

assert_no_header() {
  local name="$1" file="$2" header="$3"
  if grep -qi "^${header}:" "$file" 2>/dev/null; then
    bad "$name -> la cabecera ${header} sigue presente"
  else
    ok "$name -> sin ${header}"
  fi
}

b64url() { openssl base64 -A 2>/dev/null | tr '+/' '-_' | tr -d '='; }

make_alg_none_jwt() {
  local header payload
  header="$(printf '%s' '{"alg":"none","typ":"JWT"}' | b64url)"
  payload="$(printf '%s' '{"sub":"attacker","username":"attacker","role":"superadmin","v":0}' | b64url)"
  printf '%s.%s.' "$header" "$payload"
}

count_in_file() {
  local file="$1" needle="$2"
  [ -f "$file" ] || { echo 0; return; }
  grep -o -- "$needle" "$file" 2>/dev/null | wc -l | tr -d ' '
}

summary() {
  local script_name
  script_name="$(basename "${0:-demo}" .sh)"
  printf '\n%s============================================================%s\n' "$C_BOLD" "$C_RESET"
  printf '%s RESULTADO %s: PASS=%d  FAIL=%d  SKIP=%d\n' "$C_BOLD" "$C_RESET" "$PASS" "$FAIL" "$SKIP"
  printf ' Evidencias: %s\n' "$EVID"
  printf '%s============================================================%s\n' "$C_BOLD" "$C_RESET"

  {
    printf '# Resumen — %s\n\n' "$script_name"
    printf -- '- Fecha: %s\n' "$(date -Is)"
    printf -- '- Base: `%s`\n' "$BASE_URL"
    printf -- '- Evidencias: `%s`\n\n' "$EVID"
    printf '| Resultado | Cantidad |\n|---|---:|\n'
    printf '| PASS | %d |\n| FAIL | %d |\n| SKIP | %d |\n' "$PASS" "$FAIL" "$SKIP"
  } > "$EVID/RESUMEN-$script_name.md"

  [ "$FAIL" -eq 0 ]
}
