#!/usr/bin/env bash
# ============================================================================
#  40-victima.sh — verificaciones que se ejecutan EN LA VM VÍCTIMA
# ============================================================================
#  Cubre P-14 (cifrado/índice/permisos/backup), P-13 (tokenVersion),
#  estado de MFA y, si está disponible, la configuración efectiva de sshd.
#
#  Uso (en la VM víctima, desde la raíz del repo):
#    bash scripts/lab/demo/40-victima.sh
#    bash scripts/lab/demo/40-victima.sh --clean-legacy
#
#  --clean-legacy elimina el pedido LAB-Legacy en texto plano. Úsalo después
#  de mostrar el "antes" y antes de la verificación P-14 del "después".
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT" || exit 1
export EVID="${EVID:-$ROOT/evidencias/$(date +%Y%m%d-%H%M%S)}"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"

CLEAN_LEGACY="${CLEAN_LEGACY:-0}"
for arg in "$@"; do
  case "$arg" in
    --clean-legacy) CLEAN_LEGACY=1 ;;
    *) info "Argumento ignorado: $arg" ;;
  esac
done

if [ -f .env.lab ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.lab
  set +a
fi
DB="${DATABASE_URL#file:}"
[ -f "$DB" ] || DB="$ROOT/lab-data/lab.db"

section "VM VÍCTIMA — verificaciones de datos y sesión"
info "Base URL: $BASE_URL"
info "BD:       $DB"

if ! need_cmd sqlite3; then
  skip "sqlite3 no está instalado; no se puede verificar P-14/P-13."
  summary
  exit 0
fi
if [ ! -f "$DB" ]; then
  bad "No existe la BD: $DB"
  summary
  exit 1
fi

section "V0. Limpieza previa del pedido legacy (opcional)"
if [ "$CLEAN_LEGACY" = "1" ]; then
  before_del="$(sqlite3 "$DB" "SELECT COUNT(*) FROM \"Order\" WHERE customerName LIKE 'LAB-Legacy%';" 2>/dev/null || echo 0)"
  sqlite3 "$DB" "DELETE FROM \"Order\" WHERE customerName LIKE 'LAB-Legacy%';" 2>/dev/null || true
  sqlite3 "$DB" 'VACUUM;' 2>/dev/null || true
  after_del="$(sqlite3 "$DB" "SELECT COUNT(*) FROM \"Order\" WHERE customerName LIKE 'LAB-Legacy%';" 2>/dev/null || echo 0)"
  info "Pedidos legacy antes: $before_del · después: $after_del"
  if [ "$after_del" = "0" ]; then ok "V0 pedido legacy eliminado"; else bad "V0 quedan $after_del pedidos legacy"; fi
else
  skip "V0 limpieza no solicitada (usa --clean-legacy antes del 'después')"
fi

section "V1. Cifrado de PII en reposo (P-14)"
orders_total="$(sqlite3 "$DB" 'SELECT COUNT(*) FROM "Order";' 2>/dev/null || echo 0)"
repairs_total="$(sqlite3 "$DB" 'SELECT COUNT(*) FROM Repair;' 2>/dev/null || echo 0)"
info "Pedidos: $orders_total · Reparaciones: $repairs_total"

sqlite3 -header -column "$DB" \
  "SELECT substr(customerPhone,1,40) || '...' AS phone_AES_GCM, substr(customerPhoneIndex,1,24) || '...' AS hmac_index FROM \"Order\" LIMIT 3;" \
  2>/dev/null | tee "$EVID/pii-orders.txt" | sed 's/^/  /' || true

sqlite3 -header -column "$DB" \
  "SELECT code, substr(dniEncrypted,1,40) || '...' AS dni_AES_GCM, substr(dniIndex,1,24) || '...' AS hmac_index FROM Repair LIMIT 3;" \
  2>/dev/null | tee "$EVID/pii-repairs.txt" | sed 's/^/  /' || true

plain_orders="$(sqlite3 "$DB" "SELECT COUNT(*) FROM \"Order\" WHERE customerPhone NOT GLOB '*:*:*';" 2>/dev/null || echo 0)"
plain_repairs="$(sqlite3 "$DB" "SELECT COUNT(*) FROM Repair WHERE dniEncrypted NOT GLOB '*:*:*';" 2>/dev/null || echo 0)"
if [ "$plain_orders" = "0" ]; then
  ok "V1 ningún teléfono en texto plano en Order"
else
  bad "V1 $plain_orders teléfono(s) en texto plano en Order (¿pedido legacy?)"
fi
if [ "$plain_repairs" = "0" ]; then
  ok "V1 ningún DNI en texto plano en Repair"
else
  bad "V1 $plain_repairs DNI(s) en texto plano en Repair"
fi

bad_idx="$(sqlite3 "$DB" 'SELECT (SELECT COUNT(*) FROM "Order" WHERE length(customerPhoneIndex)!=64) + (SELECT COUNT(*) FROM Repair WHERE length(dniIndex)!=64);' 2>/dev/null || echo 0)"
if [ "$bad_idx" = "0" ]; then
  ok "V1 índices ciegos HMAC-SHA256 de 64 hex"
else
  bad "V1 $bad_idx índice(s) con longitud distinta de 64"
fi

for needle in 987654321 12345678; do
  if grep -a -q "$needle" "$DB"; then
    bad "V1 el valor $needle aparece en texto plano dentro de $DB"
  else
    ok "V1 $needle no aparece en claro dentro de la BD"
  fi
done
if grep -a -q '955443322' "$DB"; then
  info "V1 el pedido legacy 955443322 sigue en texto plano (es el 'antes')"
else
  ok "V1 sin teléfono legacy en texto plano"
fi

section "V2. Permisos 600 (P-14)"
for f in .env.lab "$DB"; do
  if [ -f "$f" ]; then
    mode="$(stat -c '%a' "$f" 2>/dev/null || echo '?')"
    if [ "$mode" = "600" ]; then ok "V2 $f -> $mode"; else bad "V2 $f -> $mode (esperado 600)"; fi
  else
    skip "V2 no existe $f"
  fi
done

section "V3. Backup y integridad (P-14)"
backup="$EVID/backup-demo.db"
if sqlite3 "$DB" ".backup '$backup'" 2>"$EVID/backup-error.txt"; then
  ok "V3 backup generado: $backup"
  integrity="$(sqlite3 "$backup" 'PRAGMA integrity_check;' 2>/dev/null || echo 'error')"
  if [ "$integrity" = "ok" ]; then ok "V3 PRAGMA integrity_check = ok"; else bad "V3 integrity_check = $integrity"; fi
  rows="$(sqlite3 "$backup" 'SELECT COUNT(*) FROM "Order";' 2>/dev/null || echo '?')"
  info "V3 pedidos en el backup: $rows"
else
  bad "V3 no se pudo generar el backup (ver $EVID/backup-error.txt)"
fi

section "V4. Estado de MFA (P-12d)"
sqlite3 -header -column "$DB" 'SELECT username, role, tokenVersion, totpEnabled FROM Admin;' 2>/dev/null | tee "$EVID/mfa-status.txt" | sed 's/^/  /' || true
active_mfa="$(sqlite3 "$DB" 'SELECT COUNT(*) FROM Admin WHERE totpEnabled = 1;' 2>/dev/null || echo 0)"
if [ "$active_mfa" -gt 0 ]; then
  ok "V4 hay $active_mfa admin(s) con MFA activo"
else
  info "V4 ningún admin tiene MFA activo (actívalo en /taller-control/seguridad para el 'después')"
fi

section "V5. Revocación de sesión en servidor (P-13)"
row="$(sqlite3 -separator '|' "$DB" 'SELECT id, username, role, tokenVersion FROM Admin ORDER BY createdAt LIMIT 1;' 2>/dev/null || true)"
if [ -z "$row" ]; then
  skip "V5 no hay administradores en la BD"
else
  IFS='|' read -r admin_id admin_user admin_role admin_v <<< "$row"
  info "Admin: $admin_user ($admin_id), tokenVersion=$admin_v"

  token="$(npx tsx --env-file=.env.lab scripts/lab/demo/generar-jwt.ts "$admin_id" "$admin_user" "$admin_role" "$admin_v" 2>"$EVID/jwt-error.txt" || true)"
  if [ -z "$token" ]; then
    bad "V5 no se pudo generar el JWT (ver $EVID/jwt-error.txt)"
  else
    echo "$token" > "$EVID/jwt-generado.txt"
    ok "V5 JWT emitido (${#token} caracteres)"

    before="$(curl -sk -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: infosistel_session=$token" "$BASE_URL/taller-control" 2>/dev/null)" || before=000
    if [ "$before" = "200" ]; then
      ok "V5 el JWT válido abre /taller-control (HTTP 200)"
    else
      bad "V5 el JWT válido NO abre /taller-control (HTTP $before)"
    fi

    sqlite3 "$DB" "UPDATE Admin SET tokenVersion = tokenVersion + 1 WHERE id = '$admin_id';" 2>/dev/null || true
    new_v="$(sqlite3 "$DB" "SELECT tokenVersion FROM Admin WHERE id = '$admin_id';" 2>/dev/null || echo '?')"
    info "V5 tokenVersion incrementado: $admin_v -> $new_v"

    after="$(curl -sk -m 10 -o /dev/null -w '%{http_code}' -H "Cookie: infosistel_session=$token" "$BASE_URL/taller-control" 2>/dev/null)" || after=000
    if [[ " 301 302 307 308 " == *" $after "* ]]; then
      ok "V5 el JWT viejo ya NO abre el panel (HTTP $after)"
    else
      bad "V5 el JWT viejo sigue abriendo el panel (HTTP $after)"
    fi

    api_code="$(http_post_code "$BASE_URL/api/scanner" "$EVID/v5-scanner.out" '{}')"
    if [ "$api_code" = "401" ]; then
      ok "V5 /api/scanner rechaza el JWT viejo (HTTP 401)"
    else
      bad "V5 /api/scanner -> HTTP $api_code (esperado 401)"
    fi

    chat_code="$(curl -sk -m 10 -o "$EVID/v5-admin-chat.out" -w '%{http_code}' \
      -X POST -H 'Content-Type: application/json' \
      -H "Cookie: infosistel_session=$token" --data '{}' \
      "$BASE_URL/api/admin-chat" 2>/dev/null)" || chat_code=000
    if [ "$chat_code" = "401" ]; then
      ok "V5 /api/admin-chat rechaza el JWT viejo (HTTP 401)"
    else
      bad "V5 /api/admin-chat -> HTTP $chat_code (esperado 401)"
    fi
  fi
fi

section "V6. SSH endurecido (Nginx/Firewalld aparte)"
if need_cmd sshd; then
  if [ "$(id -u)" -eq 0 ]; then
    sshd_out="$(sshd -T 2>&1 || true)"
  else
    sshd_out="$(sudo -n sshd -T 2>&1 || true)"
  fi
  if [ -n "$sshd_out" ] && ! printf '%s' "$sshd_out" | grep -qi 'sudo:'; then
    echo "$sshd_out" > "$EVID/sshd-T.txt"
    for pair in "port 2244" "permitrootlogin no" "passwordauthentication no" "pubkeyauthentication yes" "maxauthtries 4"; do
      if printf '%s' "$sshd_out" | grep -Eqi "^$pair$"; then
        ok "V6 sshd: $pair"
      else
        bad "V6 sshd NO tiene: $pair"
      fi
    done
  else
    skip "V6 no se pudo leer sshd -T (ejecuta con sudo)"
  fi
else
  skip "V6 sshd no está instalado"
fi

summary
