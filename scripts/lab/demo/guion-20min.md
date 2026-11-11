# Guion de 20 minutos — sustentación en vivo

> **VM víctima:** Kali `10.10.10.20` · Nginx + PM2 + SQLite
> **VM atacante:** Kali `10.10.10.10` · nmap, curl, sqlmap, hydra, Burp/ZAP
> **Dominio:** `infosistel.lab` (en `/etc/hosts` de ambas VMs)

---

## Minuto 0–2 — Mostrar el servidor real (VM víctima)

```bash
pm2 list
sudo systemctl is-active nginx firewalld fail2ban ssh
sudo firewall-cmd --list-all
sudo fail2ban-client status sshd
ss -tlnp | grep -E ':80|:443|:2244|:3000'
curl -skI https://infosistel.lab/ | head -20
```

**Mensaje:** “Aquí están Nginx, Next.js 16 bajo PM2, SQLite, Firewalld y
Fail2ban. El puerto 3000 de Node no se expone: solo Nginx habla con él.”

---

## Minuto 2–5 — Acto 1: el “antes” (VM atacante)

```bash
cd ~/infosistelab
bash scripts/lab/demo/10-antes.sh
```

**Mensaje:** “La misma aplicación, en modo laboratorio, permite SQLi, IDOR,
fuga de `costPrice` y un login sin MFA. Este es el punto de partida que la
tesis documentó en el Capítulo III.”

---

## Minuto 5–8 — Cabeceras, CSP y archivos (VM atacante)

```bash
bash scripts/lab/demo/20-despues.sh
```

Si solo tienes 3 minutos, muestra:

```bash
curl -skI https://infosistel.lab/ | grep -Ei 'strict-transport|x-content|x-frame|referrer|permissions|content-security'
curl -skI https://infosistel.lab/ | grep -i content-security-policy
curl -skI https://infosistel.lab/ | grep -i content-security-policy
```

**Mensaje:** “Dos peticiones seguidas devuelven un nonce distinto. Sin
`X-Powered-By`, con HSTS, `nosniff`, `DENY` y CSP sin `unsafe-inline` en
scripts.”

---

## Minuto 8–12 — Acceso, JWT y `costPrice` (VM atacante)

```bash
curl -skI https://infosistel.lab/taller-control | head -5
curl -sk -o /dev/null -w 'scanner -> %{http_code}\n' -X POST https://infosistel.lab/api/scanner
curl -sk -o /dev/null -w 'admin-chat -> %{http_code}\n' -X POST https://infosistel.lab/api/admin-chat

for r in /catalogo /tienda /p/1; do
  printf '%-12s costPrice=%s\n' "$r" "$(curl -sk "https://infosistel.lab$r" | grep -c costPrice)"
done
```

**Mensaje:** “El panel sin sesión redirige (307), las APIs internas responden
401 y el margen `costPrice` tiene 0 ocurrencias en el HTML público.”

### P-12 manual (solo si el jurado pide Burp/MFA)

1. Abre `https://infosistel.lab/tienda`, agrega un producto y abre el carrito.
2. En Burp, activa **Intercept** y pulsa **Realizar pedido**.
3. En el POST de la Server Action agrega `"total":1` y `"price":1`; envía
   (**Forward**). El servidor ignora esos campos y guarda el precio real.
4. Envía `"customerPhone":"123"` → Zod rechaza antes de tocar SQLite.
5. Haz 5 logins fallidos: el 6.º muestra “Demasiados intentos” (la Server
   Action devuelve mensaje, no HTTP 429).
6. En la víctima, muestra la auditoría:
   ```bash
   sqlite3 lab-data/lab.db \
     'SELECT action, username, ipAddress, createdAt FROM AuditLog ORDER BY createdAt DESC LIMIT 5;'
   ```
7. Activa MFA en `/taller-control/seguridad`, cierra sesión y vuelve a entrar:
   el sistema debe pedir el TOTP de 6 dígitos.

> El checkout público real es `/tienda` (carrito). `/cotizacion/[code]` solo
> muestra una cotización compartida, no es un checkout.

---

## Minuto 12–15 — Base de datos y criptografía (VM víctima)

```bash
bash scripts/lab/demo/40-victima.sh
```

Muestra en pantalla:

- `customerPhone`/`dniEncrypted` como `iv:tag:cipher`.
- `customerPhoneIndex`/`dniIndex` de 64 hex.
- `.env.lab` y `lab.db` en 600.
- `PRAGMA integrity_check = ok`.
- JWT viejo: 200 antes de incrementar `tokenVersion`, 307 después; API 401.

**Mensaje:** “Si roban el backup, no obtienen teléfonos ni DNI en claro. Y si
roban una cookie, el logout invalida el token en el servidor.”

---

## Minuto 15–18 — Cierre agresivo (VM atacante, solo si está montado)

```bash
RUN_HYDRA=1 RUN_RATE=1 VPS_IP=10.10.10.20 DOMAIN=infosistel.lab \
  bash scripts/lab/demo/30-infra.sh
```

En la víctima:

```bash
sudo fail2ban-client status sshd
sudo fail2ban-client set sshd unbanip 10.10.10.10
```

**Mensaje:** “Tras 4 fallos, Fail2ban banea la IP atacante; las ráfagas reciben
429; `UNION SELECT` y sqlmap reciben 403; y los escáneres reciben 444.”

> Si Hydra no dispara la jail (SSH solo-llave), explica la diferencia y muestra
> el estado de la jail + el baneo manual documentado en la guía de infra.

---

## Minuto 18–20 — Cierre

Tabla mental para el jurado:

| Antes | Después |
|---|---|
| SQLi devuelve `costPrice` | `UNION SELECT` → 403; `costPrice` = 0 |
| `/api/lab/orders` público | Panel 307; APIs 401; JWT revocado |
| Login sin MFA | MFA TOTP + rate limit |
| PII en claro (legacy) | AES-256-GCM + HMAC + permisos 600 |
| :3000 expuesto | Solo 80/443/2244; 3000 filtrado |

**Frase de cierre:** “No demostré que la página sea invulnerable; demostré que
sé encontrar sus fallos, medirlos, corregirlos y dejar evidencia.”

---

## Plan B si algo falla

| Fallo | Plan B |
|---|---|
| La app no responde | `pm2 logs infosistel-lab --lines 50`; reinicia con `start-pm2.sh` |
| Nginx/TLS no está listo | Ejecuta `20-despues.sh` con `BASE_URL=http://127.0.0.1:3000`; P-04/P-08/P-09 quedan como SKIP |
| Hydra no banea | Muestra `fail2ban-client status sshd` y explica `mode = aggressive` |
| El backup falla | Muestra `sqlite3 lab-data/lab.db ".backup '/tmp/b.db'"` y `PRAGMA integrity_check` |
| No hay proyector | Ten `evidencias/<fecha>/RESUMEN-*.md` y capturas |
