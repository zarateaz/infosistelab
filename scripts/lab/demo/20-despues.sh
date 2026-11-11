#!/usr/bin/env bash
# ============================================================================
#  20-despues.sh — ACTO 2: verificación del hardening (perfil "después")
# ============================================================================
#  Se ejecuta desde la VM ATACANTE contra la app endurecida.
#  Funciona con HTTP directo (:3000) y con HTTPS detrás de Nginx.
#
#  Uso:
#    BASE_URL=http://10.10.10.20:3000 bash scripts/lab/demo/20-despues.sh
#    BASE_URL=https://infosistel.lab DOMAIN=infosistel.lab VPS_IP=10.10.10.20 \
#      bash scripts/lab/demo/20-despues.sh
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT" || exit 1
export EVID="${EVID:-$ROOT/evidencias/$(date +%Y%m%d-%H%M%S)}"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"

section "ACTO 2 — DESPUÉS (hardening)"
info "Base URL: $BASE_URL"

section "D1. Cabeceras HTTP, HSTS, huella y CSP con nonce"
curl -skI -m 10 "$BASE_URL/" > "$EVID/headers-1.txt" 2>/dev/null || true
curl -skI -m 10 "$BASE_URL/" > "$EVID/headers-2.txt" 2>/dev/null || true

assert_header "D1 HSTS"              "$EVID/headers-1.txt" "strict-transport-security" "max-age="
assert_header "D1 nosniff"           "$EVID/headers-1.txt" "x-content-type-options"    "nosniff"
assert_header "D1 X-Frame DENY"      "$EVID/headers-1.txt" "x-frame-options"           "DENY"
assert_header "D1 Referrer-Policy"   "$EVID/headers-1.txt" "referrer-policy"           "strict-origin-when-cross-origin"
assert_header "D1 Permissions-Policy" "$EVID/headers-1.txt" "permissions-policy"        "camera=()"
assert_no_header "D1 sin X-Powered-By" "$EVID/headers-1.txt" "x-powered-by"

csp1="$(grep -i '^content-security-policy:' "$EVID/headers-1.txt" 2>/dev/null | head -1 | tr -d '\r')"
csp2="$(grep -i '^content-security-policy:' "$EVID/headers-2.txt" 2>/dev/null | head -1 | tr -d '\r')"
nonce1="$(printf '%s' "$csp1" | grep -o "nonce-[A-Za-z0-9+/=_-]*" | head -1)"
nonce2="$(printf '%s' "$csp2" | grep -o "nonce-[A-Za-z0-9+/=_-]*" | head -1)"

if [ -n "$csp1" ]; then ok "D1 CSP presente"; else bad "D1 CSP ausente"; fi
if [ -n "$nonce1" ] && [ -n "$nonce2" ] && [ "$nonce1" != "$nonce2" ]; then
  ok "D1 nonce distinto entre dos requests ($nonce1 != $nonce2)"
elif [ -n "$nonce1" ] && [ "$nonce1" = "$nonce2" ]; then
  bad "D1 el nonce NO cambia entre requests"
else
  skip "D1 no se pudo extraer el nonce (¿estás en dev sin CSP?)"
fi

script_src="$(printf '%s' "$csp1" | sed -n 's/.*script-src\([^;]*\).*/\1/p')"
if [ -n "$script_src" ]; then
  if printf '%s' "$script_src" | grep -q "'unsafe-inline'"; then
    bad "D1 script-src contiene 'unsafe-inline'"
  else
    ok "D1 script-src sin 'unsafe-inline'"
  fi
else
  skip "D1 no se pudo aislar script-src"
fi

section "D2. TLS 1.2/1.3 y redirección HTTP -> HTTPS (requiere Nginx)"
https_code="$(http_code "https://$DOMAIN/" "$EVID/https-probe.html")"
if [ "$https_code" = "000" ]; then
  skip "D2 no hay HTTPS en https://$DOMAIN/ (monta Nginx + certificado para P-04)"
else
  ok "D2 HTTPS responde -> HTTP $https_code"
  assert_code "D2 HTTP -> HTTPS" "301 302 307 308" "http://$DOMAIN/"

  if need_cmd openssl; then
    for proto in tls1_2 tls1_3; do
      out="$EVID/openssl-$proto.txt"
      timeout 8 openssl s_client -connect "$VPS_IP:443" -servername "$DOMAIN" -"$proto" </dev/null >"$out" 2>&1 || true
      if grep -Eq 'Protocol[[:space:]]*:[[:space:]]*TLSv1\.[23]' "$out"; then
        ok "D2 $proto aceptado ($(grep -Eo 'TLSv1\.[23]' "$out" | head -1))"
      else
        bad "D2 $proto NO negoció"
      fi
    done

    for proto in tls1 tls1_1; do
      out="$EVID/openssl-$proto.txt"
      timeout 8 openssl s_client -connect "$VPS_IP:443" -servername "$DOMAIN" -"$proto" </dev/null >"$out" 2>&1 || true
      if grep -Eq 'Protocol[[:space:]]*:[[:space:]]*TLSv1(\.[01])?' "$out" && grep -qi 'Cipher is' "$out"; then
        bad "D2 $proto fue aceptado (debería rechazarse)"
      else
        ok "D2 $proto rechazado"
      fi
    done
  else
    skip "D2 openssl no está instalado"
  fi
fi

section "D3. Filtro Anti-SQLi (Edge Proxy -> 403)"
assert_code "D3 UNION SELECT" "403" "$BASE_URL/?id=1%20UNION%20SELECT%201"
assert_code "D3 comilla / OR 1=1" "403" "$BASE_URL/catalogo?q=%27%20OR%20%271%27%3D%271"
assert_code "D3 union+select" "403" "$BASE_URL/?q=union+select"

section "D4. Archivos sensibles y métodos peligrosos"
for path in /.env /.git/config /dev.db /package.json; do
  assert_code "D4 $path" "400 403 404" "$BASE_URL$path"
done

for method in TRACE PUT; do
  file="$EVID/metodo-$(printf '%s' "$method" | tr '[:upper:]' '[:lower:]').out"
  code="$(http_method_code "$method" "$BASE_URL/" "$file")"
  if [[ " 400 403 404 405 " == *" $code "* ]]; then
    ok "D4 método $method -> HTTP $code"
  elif [ "$method" = "TRACE" ] && [ "$code" = "500" ]; then
    # Next.js rechaza TRACE con 500 antes de llegar al proxy. Con Nginx
    # delante, la whitelist de métodos lo corta con 405 (ver 30-infra.sh).
    skip "D4 método TRACE -> 500 en Next directo; Nginx lo bloqueará con 405"
  else
    bad "D4 método $method -> HTTP $code (esperado 400/403/404/405)"
  fi
done

section "D5. Control de acceso, APIs internas y JWT falso"
assert_code "D5 panel sin sesión" "301 302 307 308" "$BASE_URL/taller-control"

scanner_code="$(http_post_code "$BASE_URL/api/scanner" "$EVID/d5-scanner.out" '{}')"
if [ "$scanner_code" = "401" ]; then
  ok "D5 POST /api/scanner sin sesión -> HTTP 401"
else
  bad "D5 POST /api/scanner sin sesión -> HTTP $scanner_code (esperado 401)"
fi

chat_code="$(http_post_code "$BASE_URL/api/admin-chat" "$EVID/d5-admin-chat.out" '{}')"
if [ "$chat_code" = "401" ]; then
  ok "D5 POST /api/admin-chat sin sesión -> HTTP 401"
else
  bad "D5 POST /api/admin-chat sin sesión -> HTTP $chat_code (esperado 401)"
fi

forged="$(make_alg_none_jwt)"
forged_code="$(curl -sk -m 10 -o "$EVID/jwt-alg-none.html" -w '%{http_code}' \
  -H "Cookie: infosistel_session=$forged" "$BASE_URL/taller-control" 2>/dev/null)" || forged_code=000
if [[ " 301 302 307 308 " == *" $forged_code "* ]]; then
  ok "D5 JWT alg:none rechazado -> HTTP $forged_code"
else
  bad "D5 JWT alg:none -> HTTP $forged_code (esperado redirección)"
fi

section "D6. costPrice fuera del HTML/JSON público"
for route in /catalogo /tienda /p/1; do
  name="D6 costPrice $route"
  assert_code "$name" "200" "$BASE_URL$route"
  # assert_code deja el cuerpo en LAST_FILE
  if [ -f "$LAST_FILE" ]; then
    n="$(count_in_file "$LAST_FILE" 'costPrice')"
    if [ "$n" = "0" ]; then
      ok "$name -> 0 ocurrencias"
    else
      bad "$name -> $n ocurrencias de costPrice"
    fi
  fi
done

section "D7. Rate limiting de aplicación (sustituto de P-09 sin Nginx)"
if need_cmd curl; then
  info "Enviando 121 requests a /api/image-proxy (límite 120/5min)..."
  : > "$EVID/rate-limit-codes.txt"
  for i in $(seq 1 121); do
    curl -sk -m 5 -o /dev/null -w '%{http_code}\n' "$BASE_URL/api/image-proxy" 2>/dev/null >> "$EVID/rate-limit-codes.txt" || true
  done
  n429="$(grep -c '^429$' "$EVID/rate-limit-codes.txt" 2>/dev/null || true)"
  n429="${n429:-0}"
  if [ "$n429" -gt 0 ]; then
    ok "D7 rate limit de aplicación -> $n429 respuestas HTTP 429"
  else
    bad "D7 no se observó 429 (revisa $EVID/rate-limit-codes.txt)"
  fi
  note "Esto demuestra el limitador de la app. El 429 de Nginx (300 r/m) requiere la capa Nginx."
else
  skip "D7 curl no está instalado"
fi

section "D8. Revocación de sesión (tokenVersion)"
skip "D8 se ejecuta en la VM víctima: bash scripts/lab/demo/40-victima.sh"

summary
