#!/usr/bin/env bash
# ============================================================================
#  30-infra.sh — pruebas de infraestructura (Nginx / TLS / Firewalld / SSH)
# ============================================================================
#  Se ejecuta desde la VM ATACANTE. Requiere nmap y, para TLS, openssl.
#  Si aún no montas Nginx/Firewalld/Fail2ban, las pruebas se marcan SKIP.
#
#  Uso:
#    VPS_IP=10.10.10.20 DOMAIN=infosistel.lab bash scripts/lab/demo/30-infra.sh
#
#  Opcionales (¡al final de la demo!):
#    RUN_HYDRA=1  lanza Hydra contra SSH 2244 (puede banear tu IP)
#    RUN_RATE=1   lanza una ráfaga contra Nginx (puede dejarte limitado)
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT" || exit 1
export EVID="${EVID:-$ROOT/evidencias/$(date +%Y%m%d-%H%M%S)}"
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib.sh"

section "BLOQUE INFRA — Nginx / TLS / Firewalld / SSH"
info "VPS_IP: $VPS_IP"
info "Dominio: $DOMAIN"

port_state() {
  local port="$1" file="$2"
  awk -v p="$port" '$1 ~ ("^" p "/tcp$") { print $2; exit }' "$file" 2>/dev/null
}

check_open() {
  local port="$1" state
  state="$(port_state "$port" "$EVID/nmap.txt")"
  if [ "$state" = "open" ]; then ok "puerto $port/tcp open"; else bad "puerto $port/tcp ${state:-sin dato} (esperado open)"; fi
}

check_not_open() {
  local port="$1" state
  state="$(port_state "$port" "$EVID/nmap.txt")"
  if [ -z "$state" ]; then
    skip "puerto $port/tcp sin dato en nmap"
  elif [ "$state" = "open" ]; then
    bad "puerto $port/tcp open (debería estar filtered/closed)"
  else
    ok "puerto $port/tcp $state"
  fi
}

section "I1. Superficie de red (nmap)"
if ! need_cmd nmap; then
  skip "I1 nmap no está instalado"
elif [ -z "$VPS_IP" ]; then
  skip "I1 VPS_IP vacío"
else
  nmap -Pn -sT -p 22,80,443,2244,3000,3010 --reason "$VPS_IP" > "$EVID/nmap.txt" 2>&1 || true
  sed 's/^/  /' "$EVID/nmap.txt"
  check_open 80
  check_open 443
  check_open 2244
  check_not_open 22
  check_not_open 3000
  check_not_open 3010
fi

section "I2. TLS y redirección (Nginx)"
https_code="$(http_code "https://$DOMAIN/" "$EVID/https-probe.html")"
if [ "$https_code" = "000" ]; then
  skip "I2 no hay HTTPS en https://$DOMAIN/"
else
  ok "I2 HTTPS responde -> HTTP $https_code"
  assert_code "I2 HTTP -> HTTPS" "301 302 307 308" "http://$DOMAIN/"

  if need_cmd openssl; then
    for proto in tls1_2 tls1_3; do
      out="$EVID/infra-openssl-$proto.txt"
      timeout 8 openssl s_client -connect "$VPS_IP:443" -servername "$DOMAIN" -"$proto" </dev/null >"$out" 2>&1 || true
      if grep -Eq 'Protocol[[:space:]]*:[[:space:]]*TLSv1\.[23]' "$out"; then
        ok "I2 $proto aceptado"
      else
        bad "I2 $proto NO negoció"
      fi
    done
    for proto in tls1 tls1_1; do
      out="$EVID/infra-openssl-$proto.txt"
      timeout 8 openssl s_client -connect "$VPS_IP:443" -servername "$DOMAIN" -"$proto" </dev/null >"$out" 2>&1 || true
      if grep -Eq 'Protocol[[:space:]]*:[[:space:]]*TLSv1(\.[01])?' "$out" && grep -qi 'Cipher is' "$out"; then
        bad "I2 $proto aceptado (debería rechazarse)"
      else
        ok "I2 $proto rechazado"
      fi
    done
  else
    skip "I2 openssl no está instalado"
  fi
fi

section "I3. SSH endurecido en puerto 2244"
if ! need_cmd ssh; then
  skip "I3 ssh no está instalado"
else
  out="$EVID/ssh-password-attempt.txt"
  timeout 10 ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -o PreferredAuthentications=password -o PubkeyAuthentication=no \
    -o NumberOfPasswordPrompts=0 -o ConnectTimeout=5 \
    -p 2244 "kali@$VPS_IP" true >"$out" 2>&1 || true
  if grep -qi 'Permission denied (publickey)' "$out"; then
    ok "I3 SSH rechaza contraseña (solo publickey)"
  elif grep -qi 'Permission denied' "$out"; then
    info "I3 SSH respondió: $(tr '\n' ' ' < "$out" | head -c 200)"
    note "Revisa que PasswordAuthentication esté en no."
  elif grep -qi 'Connection refused' "$out"; then
    bad "I3 no hay SSH en el puerto 2244"
  else
    skip "I3 respuesta inesperada: $(tr '\n' ' ' < "$out" | head -c 200)"
  fi

  out_root="$EVID/ssh-root-attempt.txt"
  timeout 10 ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -o PreferredAuthentications=publickey -o ConnectTimeout=5 \
    -p 2244 "root@$VPS_IP" true >"$out_root" 2>&1 || true
  if grep -qi 'Permission denied' "$out_root"; then
    ok "I3 root rechazado"
  else
    info "I3 root: $(tr '\n' ' ' < "$out_root" | head -c 200)"
  fi
fi

section "I4. Hydra + Fail2ban (opcional y agresivo)"
if [ "${RUN_HYDRA:-0}" != "1" ]; then
  skip "I4 Hydra desactivado (usa RUN_HYDRA=1 al final de la demo)"
else
  if ! need_cmd hydra; then
    skip "I4 hydra no está instalado"
  else
    printf '123456\nadmin\npassword\nqwerty\ninfosistel\n' > /tmp/pass-demo.txt
    timeout 60 hydra -l kali -P /tmp/pass-demo.txt -t 4 "ssh://$VPS_IP:2244" \
      > "$EVID/hydra.txt" 2>&1 || true
    sed 's/^/  /' "$EVID/hydra.txt"
    info "Ahora en la VM víctima:"
    note "sudo fail2ban-client status sshd"
    note "sudo fail2ban-client set sshd unbanip 10.10.10.10"
    note "Si no aparece baneada, revisa 'mode = aggressive' en la jail (ver README)."
  fi
fi

section "I5. Rate limiting de Nginx (opcional y agresivo)"
if [ "${RUN_RATE:-0}" != "1" ]; then
  skip "I5 ráfaga desactivada (usa RUN_RATE=1 al final de la demo)"
else
  : > "$EVID/nginx-rate-codes.txt"
  for i in $(seq 1 120); do
    curl -sk -m 5 -o /dev/null -w '%{http_code}\n' "https://$DOMAIN/" 2>/dev/null >> "$EVID/nginx-rate-codes.txt" || true
  done
  n429="$(grep -c '^429$' "$EVID/nginx-rate-codes.txt" 2>/dev/null || true)"
  n429="${n429:-0}"
  if [ "$n429" -gt 0 ]; then
    ok "I5 Nginx devolvió $n429 respuestas 429"
  else
    bad "I5 no se observó 429 (revisa burst/rate en nginx.conf)"
  fi
fi

section "I6. Bloqueo de escáneres por User-Agent (Nginx 444)"
if [ "$https_code" = "000" ]; then
  skip "I6 no hay HTTPS/Nginx para probar User-Agent 444"
else
  for ua in "sqlmap/1.8" "Nikto/2.5" ""; do
    code="$(curl -sk -m 5 -A "$ua" -o /dev/null -w '%{http_code}' "https://$DOMAIN/" 2>/dev/null || true)"
    if [ "$code" = "000" ]; then
      ok "I6 UA '${ua:-vacío}' -> conexión cerrada (444)"
    else
      bad "I6 UA '${ua:-vacío}' -> HTTP $code (esperado conexión cerrada)"
    fi
  done
fi

summary
