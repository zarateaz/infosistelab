# Toolkit de demo — INFOSISTEL LAB (20 minutos)

Este kit deja la sustentación en **cuatro comandos** y separa claramente los dos
actos de la demo:

| Perfil | Qué hace | Repo / modo |
|---|---|---|
| `preflight` | Revisa que la app, la BD y las herramientas estén listas | — |
| `antes` | Ataca `/api/lab/*`: SQLi, IDOR/PII, `costPrice`, login sin MFA | `LAB_MODE=1` |
| `despues` | Verifica hardening: cabeceras, CSP, SQLi 403, panel 307/401, `costPrice` 0, rate limit | rutas públicas |
| `infra` | nmap, TLS, SSH 2244, Hydra/Fail2ban y rate limit Nginx (opcional) | Nginx + Firewalld + Fail2ban |
| `victima` | SQLite: AES-GCM, HMAC, permisos 600, backup, MFA y `tokenVersion` | se ejecuta en la VM víctima |

> **Regla de oro:** las rutas `/api/lab/*` son el **"antes"**. Nunca las uses
> para demostrar P-07, P-11 o P-14 del "después". Para el "después" usa las
> rutas públicas (`/`, `/catalogo`, `/tienda`, `/p/1`, `/taller-control`).

---

## 1. Arranque en la VM víctima (Kali)

```bash
cd ~/infosistelab
chmod +x scripts/lab/demo/*.sh

# Opción recomendada: PM2 en modo producción
bash scripts/lab/demo/start-pm2.sh

# Si aún no tienes PM2:
#   sudo npm install -g pm2
#   bash scripts/lab/demo/start-pm2.sh

# Alternativa sin PM2 (deja la terminal ocupada):
#   bash scripts/lab/run-lab.sh --prod
```

Comprueba:

```bash
pm2 list
curl -skI http://127.0.0.1:3000/taller-control/login | head
```

> **Ojo:** `scripts/lab/vps/04-desplegar-app.sh` **no existe en este repo**.
> Ese script pertenece a `infosistelv2`. Aquí usa `start-pm2.sh` o
> `run-lab.sh --prod`.

### Credenciales

| Campo | Valor |
|---|---|
| URL | `http://IP_DE_LA_VM:3000/taller-control/login` |
| Usuario | `labadmin` |
| Contraseña | `Lab2026!` |
| MFA | Desactivado a propósito en el seed (perfil "antes") |

---

## 2. Preflight (VM atacante o la misma VM)

```bash
cd ~/infosistelab
BASE_URL=http://10.10.10.20:3000 bash scripts/lab/demo/preflight.sh
```

Debe mostrar: app responde, `LAB_MODE=1`, `.env.lab` y `lab.db` en 600,
administrador `labadmin`, pedido legacy presente y HTTPS ausente (aún).

---

## 3. Acto 1 — "antes" (5 min)

```bash
BASE_URL=http://10.10.10.20:3000 bash scripts/lab/demo/10-antes.sh
```

Qué demuestra:

- **A1/A2:** SQL Injection con `id=1 OR 1=1` y con comilla simple.
- **A3:** `/api/lab/orders` sin autenticación (IDOR + PII descifrada).
- **A4:** pedido `LAB-Legacy` con teléfono `955443322` en texto plano.
- **A5:** `costPrice` (margen) expuesto.
- **A6:** login sin MFA (`labadmin` / `Lab2026!`).
- **A7:** comando de ransomware simulado para ejecutar en la víctima.

Evidencia: `evidencias/<fecha>/`.

---

## 4. Acto 2 — "después" (10–12 min)

```bash
BASE_URL=http://10.10.10.20:3000 bash scripts/lab/demo/20-despues.sh
```

Si ya montaste Nginx + TLS:

```bash
BASE_URL=https://infosistel.lab \
VPS_IP=10.10.10.20 \
DOMAIN=infosistel.lab \
bash scripts/lab/demo/20-despues.sh
```

Qué demuestra:

| Check | Prueba del PDF |
|---|---|
| D1 cabeceras + HSTS + CSP con nonce | P-05 |
| D2 TLS 1.2/1.3 + redirect HTTP→HTTPS | P-04 |
| D3 SQLi `UNION SELECT` / comilla / `union+select` → 403 | P-07 |
| D4 `/.env`, `/.git/config`, `/dev.db`, TRACE/PUT | P-06 |
| D5 panel 307, APIs 401, JWT `alg:none` rechazado | P-10 |
| D6 `costPrice` = 0 en `/catalogo`, `/tienda`, `/p/1` | P-11 |
| D7 rate limit de app → 429 (sustituto de P-09 sin Nginx) | P-09 (parcial) |

---

## 5. Verificación en la VM víctima (P-14 y P-13)

En la **VM víctima**:

```bash
cd ~/infosistelab
bash scripts/lab/demo/40-victima.sh
```

Si quieres limpiar el pedido legacy para el "después":

```bash
bash scripts/lab/demo/40-victima.sh --clean-legacy
```

Qué demuestra:

- **V1:** `customerPhone` y `dniEncrypted` en formato `iv:tag:cipher` (AES-256-GCM).
- **V1:** `customerPhoneIndex` y `dniIndex` de 64 hex (HMAC-SHA256).
- **V1:** `grep -a` no encuentra `987654321` ni `12345678` en claro.
- **V2:** `.env.lab` y `lab.db` en modo 600.
- **V3:** backup con `sqlite3 .backup` + `PRAGMA integrity_check = ok`.
- **V4:** estado de MFA.
- **V5:** JWT válido abre el panel (200); al incrementar `tokenVersion`, el
  mismo JWT pasa a 307 y `/api/scanner` a 401 (P-13).
- **V6:** `sshd -T` con puerto 2244, root no, password no, maxauthtries 4.

---

## 6. Bloque infra (cuando ya tengas Nginx/Firewalld/Fail2ban)

```bash
VPS_IP=10.10.10.20 DOMAIN=infosistel.lab \
  bash scripts/lab/demo/30-infra.sh
```

Opcional, **solo al final** (banea/limita tu IP):

```bash
RUN_HYDRA=1 VPS_IP=10.10.10.20 DOMAIN=infosistel.lab \
  bash scripts/lab/demo/30-infra.sh

RUN_RATE=1 VPS_IP=10.10.10.20 DOMAIN=infosistel.lab \
  bash scripts/lab/demo/30-infra.sh
```

Cubre **P-01** (nmap), **P-04** (TLS), **P-02** (SSH) y deja listo **P-03**
(Hydra + `fail2ban-client status sshd`) y **P-09** (429 de Nginx).

> **Nota sobre Hydra + Fail2ban:** si SSH está en modo solo-llave, Hydra no
> llega a probar contraseñas y Fail2ban puede no contar los intentos. Para
> que P-03 se vea de verdad, configura la jail `sshd` con `mode = aggressive`
> o usa un puerto/usuario de prueba con `PasswordAuthentication yes` **solo
> durante la demo**. Lo vemos en la fase de infraestructura.

---

## 7. Orden recomendado para 20 minutos

```bash
# 0-2 min: contexto y servicios
pm2 list
curl -skI http://127.0.0.1:3000/

# 2-5 min: ataques
bash scripts/lab/demo/10-antes.sh

# 5-14 min: hardening (en la atacante)
bash scripts/lab/demo/20-despues.sh

# 14-17 min: datos y sesión (en la víctima)
bash scripts/lab/demo/40-victima.sh

# 17-20 min: infra agresiva (si está montada)
RUN_HYDRA=1 RUN_RATE=1 bash scripts/lab/demo/30-infra.sh
```

Si el jurado te apura, salta directo a:

```bash
BASE_URL=http://10.10.10.20:3000 bash scripts/lab/demo/20-despues.sh
bash scripts/lab/demo/40-victima.sh
```

---

## 8. Modo "después" limpio (opcional)

Si quieres que `/api/lab/*` responda 404 durante el "después":

```bash
# En la víctima, reinicia con LAB_MODE=0
LAB_MODE=0 SEED=0 bash scripts/lab/demo/start-pm2.sh
```

Con eso:

- `/api/lab/products` → 404.
- El seed no se vuelve a ejecutar (no resetea MFA).
- Los controles de hardening siguen activos.

Vuelve al "antes" con:

```bash
LAB_MODE=1 SEED=1 bash scripts/lab/demo/start-pm2.sh
```

---

## 9. Problemas comunes

| Síntoma | Causa / solución |
|---|---|
| `No such file: scripts/lab/vps/04-desplegar-app.sh` | Ese script es de `infosistelv2`. Usa `start-pm2.sh`. |
| `No hay respuesta en http://...:3000` | La app no está arriba: `pm2 list`, `pm2 logs infosistel-lab`. |
| `/api/lab/products` → 404 | Estás en `LAB_MODE=0`; reinicia con `LAB_MODE=1`. |
| P-14 falla por `955443322` | Es el pedido legacy del "antes": `40-victima.sh --clean-legacy`. |
| El 6.º login no da HTTP 429 | Es una Server Action: devuelve mensaje, no status 429. Muéstralo en la UI. |
| `curl` a `/api/image-proxy` no da 429 | Reinicia la app (el limitador es en memoria) y repite. |
| `sqlite3: command not found` | `sudo apt install -y sqlite3`. |
| `npx tsx` falla en P-13 | Ejecuta desde la raíz del repo y con `--env-file=.env.lab`. |
| Build: `Cannot find module '@tailwindcss/postcss'` | `NODE_ENV=development npm install --include=dev`, luego `npm run lab:build`. |
| Build: `Invalid environment configuration` / `DATABASE_URL undefined` | `npm run build` a secas no carga `.env.lab`. Usa `npm run lab:build` o `SEED=0 bash scripts/lab/demo/start-pm2.sh`. |

---

## 10. Siguiente fase

Cuando termines la demo, el siguiente paso es montar en Kali:

1. **Nginx** con TLS 1.2/1.3, rate limit, anti-SQLi y `return 444`.
2. **Firewalld** dejando solo 80/443/2244.
3. **Fail2ban** sobre SSH 2244.
4. **SSH** en 2244, solo llave, root no.

Los scripts de referencia están en `~/infosistelv2/scripts/lab/vps/`
(`nginx-infosistel-lab.conf`, `01-certificado-lab.sh`, `02-ssh-firewall.sh`,
`03-fail2ban.sh`). La guía paso a paso, adaptada a `infosistelab`, está en
[`docs/lab/infra-kali.md`](../../../docs/lab/infra-kali.md).
