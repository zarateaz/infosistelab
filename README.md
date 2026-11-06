# INFOSISTEL LAB — Actividad N°1 (caso NovaTech)

> **Repositorio de laboratorio aislado.** Contiene una copia de INFOSISTEL v2
> con las rutas `/api/lab/*` **deliberadamente vulnerables** para demostrar
> phishing, SQL injection, IDOR/PII y ransomware simulado.
>
> **No usar en producción, en el VPS real ni en el dominio `infosistel.com.pe`.**
> Solo para las VMs Kali del laboratorio (`10.10.10.0/24`) y datos ficticios.

Este repo es **independiente** de `infosistelv2` (el proyecto endurecido).
La idea es que puedas atacar, romper y documentar el "antes" sin tocar el
sistema real; el "después" se muestra con el repo endurecido o con
`LAB_MODE=0` en este mismo repo.

---

## Arranque rápido

Requisitos: Node.js ≥ 20.9 (recomendado 22 LTS), npm, Python 3, `openssl`.

```bash
# En la VM azul (Kali víctima)
git clone <URL_DE_ESTE_REPO> infosistel-lab
cd infosistel-lab
chmod +x scripts/lab/run-lab.sh scripts/lab/smoke-test.sh scripts/lab/ransomware-sim.py
./scripts/lab/run-lab.sh --prod
```

El script genera `.env.lab` con secretos aleatorios, crea `lab-data/lab.db`,
siembra datos ficticios y levanta la app en `0.0.0.0:3000`.

**Credenciales de demo:**

| Campo | Valor |
|---|---|
| URL del panel | `http://IP_DE_LA_VM:3000/taller-control/login` |
| Usuario | `labadmin` |
| Contraseña | `Lab2026!` |
| MFA | Desactivado a propósito (el "antes") |

**Productos:** 8 productos ficticios con `costPrice` (margen) para el
ejercicio de SQLi. **Pedidos:** 4, uno con teléfono en texto plano para el
ejercicio de PII.

---

## Los 4 ejercicios

| # | Ejercicio | Ruta / script | Documento |
|---|---|---|---|
| 1 | Phishing (SET) | `/taller-control/login` | `docs/lab/README.md` §4 |
| 2 | SQL Injection | `/api/lab/products?id=1` | `docs/lab/README.md` §5 |
| 3 | IDOR / PII | `/api/lab/orders` | `docs/lab/README.md` §6 |
| 4 | Ransomware simulado | `scripts/lab/ransomware-sim.py` | `docs/lab/README.md` §7 |

Prueba rápida desde la VM atacante:

```bash
curl http://10.10.10.20:3000/api/lab/products?id=1
curl "http://10.10.10.20:3000/api/lab/products?id=1%20OR%201=1"
curl http://10.10.10.20:3000/api/lab/orders
```

SQLmap:

```bash
sqlmap -u "http://10.10.10.20:3000/api/lab/products?id=1" -p id \
  --batch --dbms=SQLite --dump -T Product
```

Ransomware (desde la VM azul, donde vive el proyecto):

```bash
python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db
python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db --restore
```

---

## Documentación

- **Runbook completo:** [`docs/lab/README.md`](docs/lab/README.md)
- **ISO/IEC 27001:2022 (cláusula 4 + PDCA + SoA):**
  [`docs/lab/iso27001-2022-infosistel.md`](docs/lab/iso27001-2022-infosistel.md)
- **Guion de exposición (14 diapositivas):**
  [`docs/lab/guion-exposicion.md`](docs/lab/guion-exposicion.md)
- **Hardening del proyecto original:** [`docs/security/hardening-log.md`](docs/security/hardening-log.md)

---

## Seguridad del repositorio

- Las rutas `/api/lab/*` responden **404** si `LAB_MODE` no vale `1`.
- La base de datos del laboratorio es `lab-data/lab.db` (gitignored).
- `.env.lab` se genera solo, es gitignored y contiene secretos aleatorios.
- No hay credenciales reales, ni PII real, ni la base de datos de producción.
- Los teléfonos, RUC y datos de clientes son ficticios (`900 000 000`,
  RUC `20000000000`). Los scripts operativos que contenían datos reales del
  negocio (deudas, pagos históricos, backups del VPS) **no** se incluyeron.
- No hagas merge de este repo con `infosistelv2`; son propósitos distintos.

---

## Subir a GitHub (repo nuevo)

```bash
cd /home/zarate/infosistelab
git init -b main
git add .
git commit -m "Laboratorio INFOSISTEL — Actividad N°1 (NovaTech)"
# Crea el repo vacío en GitHub (sin README ni .gitignore) y luego:
git remote add origin https://github.com/TU_USUARIO/infosistel-lab.git
git push -u origin main
```

Si usas SSH:

```bash
git remote add origin git@github.com:TU_USUARIO/infosistel-lab.git
git push -u origin main
```

---

## Nota sobre el "después"

Este repo ya contiene el código endurecido de INFOSISTEL v2; lo único
"vulnerable" son las rutas `/api/lab/*` y el seed sin MFA. Para mostrar el
contraste:

1. **Opción A (recomendada):** usa el repo original `infosistelv2` (`main`),
   que no tiene las rutas de laboratorio.
2. **Opción B:** en este repo, arranca con `LAB_MODE=0`; las rutas
   `/api/lab/*` responden 404 y los controles de hardening siguen activos.
   Activa MFA en `/taller-control/seguridad` para el login.

La comparación completa está en `docs/lab/guion-exposicion.md`, diapositiva 9.
