# Guion de exposición — Actividad N°1

## «De NovaTech a INFOSISTEL: la misma kill chain, con evidencia del antes y el después»

**Duración objetivo:** 12–15 minutos + 5 minutos de preguntas.
**Formato:** 14 diapositivas. Las diapositivas 4–7 son demos en vivo.
**Regla de oro:** si una demo falla, no improvises una disculpa: muestra la
evidencia grabada y sigue. El jurado evalúa el razonamiento, no el wifi.

---

## Diapositiva 1 — Portada

**Título:**
> De NovaTech a INFOSISTEL
> La misma *kill chain*, con evidencia del antes y el después

**Subtítulo:**
> Actividad N°1 · Caso de estudio NovaTech Retail S.A.
> ISO/IEC 27001:2022 — cláusula 4 y ciclo PDCA
> [Tu nombre] · SENATI · Noviembre 2026

**Texto del expositor (20 s):**
> «Buenos días. Voy a mostrar cómo el ataque de NovaTech se replica —de forma
> controlada— sobre mi propia empresa, INFOSISTEL. No voy a hablar solo de
> teoría: voy a ejecutar los tres ataques del caso en un laboratorio con dos
> máquinas Kali y voy a demostrar, con el mismo sistema, qué cambia cuando se
> aplica el hardening.»

---

## Diapositiva 2 — El caso NovaTech en 30 segundos

**Título:** NovaTech: una cadena, tres eslabones, un negocio parado

**Contenido (viñetas):**
- **Phishing (el ingreso):** un analista de RR. HH. entrega credenciales de la VPN por *spear-phishing*.
- **SQL Injection (escalada y exfiltración):** una app interna desactualizada permite extraer la base de clientes y credenciales de TI en texto claro.
- **Ransomware (impacto):** con privilegios de administrador, Ryuk/LockBit cifra facturación y logística; rescate millonario.
- **Lección:** no fue un solo fallo, fue una **cadena**. Cada eslabón se apoya en el anterior.

**Texto del expositor (40 s):**
> «NovaTech no cayó por un virus. Cayó porque un correo llevó a una contraseña,
> esa contraseña llevó a una aplicación vieja, esa aplicación llevó a la base
> de datos, y la base de datos llevó a los servidores. La pregunta de esta
> actividad es: ¿qué pasaría si esa cadena se intentara contra INFOSISTEL?»

---

## Diapositiva 3 — De NovaTech a INFOSISTEL

**Título:** El mismo ataque, mi propia empresa

**Tabla:**

| Eslabón NovaTech | En INFOSISTEL | Ejercicio |
|---|---|---|
| Phishing a RR. HH. | Login del panel `/taller-control/login` | 1 |
| SQL Injection en app interna | API pública de productos (`costPrice`) | 2 |
| Credenciales de admin → servidores | Endpoint de pedidos sin autenticación | 3 |
| Ransomware en servidores | Cifrado de la base SQLite | 4 |

**Texto del expositor (30 s):**
> «No necesité inventar un caso. Mi propio proyecto tenía el mismo patrón:
> un panel, una API que exponía el precio de costo, un endpoint de pedidos sin
> autenticación y una base SQLite sin una prueba de restauración. Eso es lo que
> voy a atacar, en mi laboratorio, con mi código.»

---

## Diapositiva 4 — Arquitectura del laboratorio

**Título:** Dos Kali, una red aislada, un solo objetivo

**Diagrama (texto):**

```
VM NEGRA 10.10.10.10          VM AZUL 10.10.10.20
┌─────────────────────┐      ┌─────────────────────┐
│ Kali atacante       │      │ Kali víctima        │
│ setoolkit           │◄────►│ INFOSISTEL v2       │
│ sqlmap              │      │ Next.js :3000       │
│ python3             │      │ SQLite lab-data/    │
└─────────────────────┘      └─────────────────────┘
        red interna 10.10.10.0/24 (sin Internet)
```

**Texto del expositor (30 s):**
> «La máquina negra ataca. La azul es una copia de INFOSISTEL en su versión
> vulnerable, aislada de Internet. No estoy atacando el VPS real ni el dominio
> real: estoy atacando una copia controlada, con datos ficticios, para poder
> repetir la demo y para no arriesgar la producción.»

---

## Diapositiva 5 — Ejercicio 1: Phishing (el ingreso)

**Título:** El eslabón más humano

**Contenido:**
- SET clona el login real: `http://10.10.10.20:3000/taller-control/login`.
- La víctima escribe `labadmin` / `Lab2026!` en el clon.
- El atacante captura las credenciales.
- **Antes:** esas credenciales bastan para entrar.
- **Después:** MFA (TOTP) + rate limit 5/15 min + `scrypt`.

**Texto del expositor (60 s, con demo):**
> «El login de INFOSISTEL es real, pero el sitio que ve la víctima es un clon.
> Con SET estoy capturando el usuario y la contraseña. Miren la terminal: ahí
> están. Ahora las uso en el login real… y en la versión vulnerable entro
> directamente. En la versión endurecida, este mismo intento se detiene en el
> segundo factor: la contraseña sola ya no alcanza.»

**Comando de respaldo (si SET falla):**
```bash
curl -i -c /tmp/cookies.txt \
  -X POST http://10.10.10.20:3000/taller-control/login \
  --data 'username=labadmin&password=Lab2026!'
```

---

## Diapositiva 6 — Ejercicio 2: SQL Injection (escalada y exfiltración)

**Título:** La API que contaba el margen

**Contenido:**
- Ruta vulnerable: `GET /api/lab/products?id=1`.
- `id=1 OR 1=1` → todos los productos, con `costPrice`.
- SQLmap → tablas, `Product`, `Admin`.
- **Antes:** SQL concatenado, errores verbosos, `costPrice` expuesto.
- **Después:** Prisma parametrizado + `select` allowlist; ruta 404.

**Texto del expositor (75 s, con demo):**
> «Esta es la joya del caso. Mi ruta de productos concatenaba el parámetro y
> devolvía el precio de costo. Con `id=1 OR 1=1` el atacante obtiene todo el
> catálogo y el margen. Con SQLmap puede enumerar tablas y llegar a los hashes
> de los administradores. La corrección no es “escapar comillas”: es dejar de
> construir SQL con strings y usar un `select` explícito. Miren la diferencia:
> la versión segura devuelve los mismos productos, pero sin `costPrice` y sin
> la consulta SQL en la respuesta.»

**Comandos de respaldo:**
```bash
curl -s 'http://10.10.10.20:3000/api/lab/products?id=1%20OR%201=1' | python3 -m json.tool
sqlmap -u "http://10.10.10.20:3000/api/lab/products?id=1" -p id --batch --dump -T Product
curl -s 'http://10.10.10.20:3000/api/lab/products-secure?id=1' | python3 -m json.tool
```

---

## Diapositiva 7 — Ejercicio 3: control de acceso y PII

**Título:** Cuando la puerta no tiene cerradura

**Contenido:**
- `GET /api/lab/orders` → pedidos **sin autenticación**.
- Devuelve nombre, teléfono descifrado, ítems y total.
- Un pedido “legacy” muestra el teléfono **en texto plano** (el antes de la Fase 4).
- **Antes:** IDOR + PII expuesta.
- **Después:** ruta pública eliminada; panel con sesión/rol; AES-256-GCM + HMAC.

**Texto del expositor (50 s, con demo):**
> «No todas las brechas son inyección. Este endpoint usa Prisma, así que es
> seguro contra SQLi. El fallo es otro: no pregunta “¿quién eres?”. Cualquiera
> en la red lista pedidos y lee teléfonos. En la versión endurecida esa ruta no
> existe públicamente, el panel exige sesión y rol, y el teléfono está cifrado
> en reposo. Si roban un backup, no obtienen los teléfonos en claro.»

**Comandos de respaldo:**
```bash
curl -s 'http://10.10.10.20:3000/api/lab/orders' | python3 -m json.tool
curl -s 'http://10.10.10.20:3000/api/lab/orders?phone=987654321' | python3 -m json.tool
```

---

## Diapositiva 8 — Ejercicio 4: Ransomware (impacto final)

**Título:** El día que la base de datos dejó de abrir

**Contenido:**
- Simulación **no destructiva** (por defecto cifra una copia).
- `--live` cifra `lab-data/lab.db`; la app devuelve error.
- `--restore` recupera y valida la cabecera SQLite.
- **Antes:** sin restore probado; backup solo en el mismo VPS.
- **Después:** backup antes de migrar, permisos 600, restore documentado; **brecha:** copia externa + cron + prueba periódica.

**Texto del expositor (60 s, con demo):**
> «El impacto final de NovaTech fue el ransomware. Si cifro la base de
> INFOSISTEL, la aplicación deja de funcionar: no hay login, no hay catálogo,
> no hay pedidos. La diferencia no es “tener un backup”, es haber probado que
> el backup restaura. En mi hardening, el deploy respalda antes de migrar y los
> permisos son 600. La brecha que dejo documentada es que ese backup vive en el
> mismo VPS: el siguiente paso es replicarlo fuera y probar la restauración.»

**Comando de respaldo:**
```bash
python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db
python3 scripts/lab/ransomware-sim.py --target lab-data/lab.db --restore
```

---

## Diapositiva 9 — Antes vs. Después (la diapositiva clave)

**Título:** Antes vs. Después: el mismo sistema, dos niveles de riesgo

**Tabla (texto exacto para la diapositiva):**

| Control | Antes (laboratorio) | Después (hardening) | Evidencia |
|---|---|---|---|
| **Autenticación** | Login sin MFA; credenciales robadas suficientes | MFA TOTP + rate limit 5/15 min + `scrypt` | Login bloqueado en el segundo factor |
| **SQLi** | `$queryRawUnsafe`; `id=1 OR 1=1`; `costPrice` visible; error SQLite al cliente | Prisma parametrizado + `select` sin `costPrice`; ruta 404 | SQLmap + JSON de la ruta segura |
| **Control de acceso** | `/api/lab/orders` público; PII descifrada; pedido legacy en claro | Sin ruta pública; panel con sesión/rol; AES-256-GCM + HMAC | `curl` con PII vs. `sqlite3` con ciphertext |
| **Ransomware** | BD cifrada; app caída; sin restore probado | Backup previo al deploy; permisos 600; restore documentado | `sha256sum` + `--restore` + app funcionando |
| **Cabeceras** | (Se conservan las de `main`) | CSP con nonce, HSTS, `X-Frame-Options: DENY`, `nosniff` | `curl -sI` |
| **Dependencias** | (Se conserva el `overrides`) | `npm audit` revisado; las advisories nuevas se gestionan con `npm audit fix` | Salida de `npm audit` |
| **Datos en reposo** | Pedido “legacy” con teléfono en claro | Todos los teléfonos cifrados + índice ciego | `sqlite3` mostrando `iv:authTag:ciphertext` |

**Texto del expositor (60 s):**
> «Esta es la diapositiva que resume todo. No cambié de aplicación: cambié
> controles concretos. El riesgo de phishing pasó de crítico a medio; el de
> SQLi, de alto a bajo; el de IDOR/PII, de crítico a bajo; el de ransomware, de
> alto a medio. El riesgo residual no es cero: queda el backup externo y la
> capacitación. Eso también es ISO 27001: gestionar, no magia.»

---

## Diapositiva 10 — ISO/IEC 27001:2022 — cláusula 4 (contexto)

**Título:** Cláusula 4: entender antes de proteger

**Contenido (4.1 a 4.4):**
- **4.1 Contexto:** microempresa, un administrador, VPS único, PII de clientes, dependencia de Hostinger/GitHub/Nubefact/IA, amenazas de phishing y ransomware.
- **4.2 Partes interesadas:** dueño, clientes, técnicos, proveedores, autoridad de datos, SUNAT, jurado.
- **4.3 Alcance:** sitio público + panel + BD SQLite + VPS + repositorio + laboratorio; se excluye el datacenter del proveedor y el procesamiento de tarjetas.
- **4.4 Procesos:** desarrollo seguro, accesos, cambios/despliegue, backups, incidentes, proveedores, capacitación, auditoría.

**Texto del expositor (60 s):**
> «La cláusula 4 no pide un firewall: pide entender quién soy, qué protejo,
> quién depende de mí y qué me puede pasar. En INFOSISTEL el contexto manda:
> no tengo un SOC ni 20 personas; tengo un dueño que también desarrolla, un
> VPS y clientes que confían sus datos. Por eso los controles tienen que ser
> automatizables y de alto impacto, no un castillo de burocracia.»

---

## Diapositiva 11 — PDCA aplicado

**Título:** PDCA: el hardening como proceso, no como parche

**Tabla:**

| Fase | Qué hice en INFOSISTEL | Evidencia |
|---|---|---|
| **Plan** | Alcance, activos, riesgos, SoA, objetivos medibles | Matriz de riesgos + este documento |
| **Do** | `scrypt`, JWT, MFA, rate limit, CSP, AES-GCM, consultas parametrizadas, roles, backups, permisos 600 | Commits + `src/lib/*` + `scripts/deploy-vps.sh` |
| **Check** | Phishing, SQLmap, IDOR, ransomware, `npm audit`, restore | `docs/lab/*` + capturas + salidas |
| **Act** | Backup externo, cron, restore periódico, capacitación, actualización de la SoA | Plan de acción + nuevo `hardening-log.md` |

**Texto del expositor (45 s):**
> «El hardening no fue una lista de recetas: fue un ciclo. Planifiqué el
> riesgo, implementé controles, los probé con ataques reales y corregí lo que
> falló. La última fase, Act, es la que casi nadie hace: el backup externo y la
> prueba de restauración. Ahí es donde el proyecto sigue madurando.»

---

## Diapositiva 12 — SoA y controles clave

**Título:** Declaración de Aplicabilidad: qué controlo y qué no

**Contenido (selección):**
- **A.5.17 / A.8.5:** autenticación segura (scrypt, JWT, MFA).
- **A.8.28:** codificación segura (Prisma parametrizado, zod, sanitización).
- **A.8.12 / A.8.24:** fuga de datos y criptografía (AES-256-GCM, HMAC).
- **A.8.13 / A.5.29–5.30:** backups y continuidad.
- **A.8.8 / A.8.29:** vulnerabilidades y pruebas de seguridad.
- **A.6.3:** concienciación (phishing).
- **Exclusiones justificadas:** seguridad física del datacenter (Hostinger), datos de tarjeta (no aplica).

**Texto del expositor (30 s):**
> «La SoA es la respuesta honesta a “¿qué controles aplican?”. No se trata de
> marcar los 93 controles: se trata de justificar cuáles sí, cuáles no y con
> qué evidencia. Las exclusiones también se documentan.»

---

## Diapositiva 13 — Conclusiones

**Título:** Lo que demuestra este proyecto

**Contenido:**
1. **No existe “la página segura”**: existe un **SGSI** con alcance, riesgos y controles.
2. **La kill chain se corta en cualquier eslabón**: MFA corta el phishing; la consulta parametrizada corta el SQLi; el control de acceso corta la exfiltración; el backup corta el ransomware.
3. **La evidencia vale más que la opinión**: el laboratorio permite mostrar el antes y el después con comandos, capturas y hashes.
4. **El riesgo residual se documenta**: backup externo, restore periódico, capacitación.
5. **ISO 27001:2022 es un marco de gestión, no una ley**: las leyes peruanas (29733, 30096) son el piso legal; la norma es el sistema para cumplirlas.

**Texto del expositor (40 s):**
> «Si tuviera que resumirlo en una frase: no demostré que mi página es
> invulnerable; demostré que sé encontrar sus fallos, medirlos, corregirlos y
> dejar evidencia. Eso es lo que un ingeniero senior aporta a una empresa.»

---

## Diapositiva 14 — Cierre

**Título:** Gracias

**Contenido:**
> «La seguridad no es un producto que se compra; es un proceso que se repite.»
>
> Preguntas.

**Texto del expositor (15 s):**
> «Gracias. ¿Preguntas?»

---

## Anexo A — Plan de contingencia si falla una demo

| Fallo | Plan B |
|---|---|
| La VM azul no responde | Usa las capturas de `docs/lab/evidencias/` y el JSON guardado. |
| SET no captura | Muestra el `curl` con el POST de credenciales y el log del servidor. |
| SQLmap no detecta | Muestra la inyección manual (`id=1 OR 1=1`) y el `"sql"` en la respuesta. |
| La app no arranca | Muestra el `smoke-test.sh` grabado y el `sqlite3` del `.locked`. |
| El ransomware `--live` falla | Usa el modo sandbox (cifra una copia) y muestra el hash. |
| No hay proyector | Ten el guion impreso y las tablas en PDF. |

---

## Anexo B — Preguntas probables y respuestas cortas

**«¿No es peligroso tener código vulnerable en el repositorio?»**
> «Está en un repositorio separado (`infosistel-lab`), detrás de `LAB_MODE=1`, con
> datos ficticios, y `main` no la contiene. Además, las rutas devuelven 404 si
> el flag no está activo. Es el mismo principio de un entorno de pruebas: el
> código de test no se despliega a producción.»

**«¿Por qué no usaste un WAF en vez de corregir el código?»**
> «Un WAF es defensa en profundidad, no una corrección. La causa raíz era
> concatenar SQL; el WAF puede tener falsos negativos y no protege si el
> atacante codifica el payload. Primero se corrige el código; después se suma
> el borde.»

**«¿ISO 27001 me obliga a cifrar la base de datos?»**
> «La norma no dice “cifra AES-256-GCM”. Dice que identifiques el riesgo y
> apliques controles proporcionados (A.8.24). El cifrado es la medida elegida
> para el riesgo de fuga de PII, y la Ley 29733 refuerza esa necesidad.»

**«¿Por qué el riesgo residual no es cero?»**
> «Porque el riesgo nunca se elimina: se reduce y se transfiere. Quedan el
> backup externo, el error humano y la cadena de suministro. Lo importante es
> que esté identificado, con dueño y con plan.»

**«¿Esto sirve para certificar a INFOSISTEL?»**
> «No por sí solo. La certificación requiere un SGSI completo, auditoría
> interna, revisión por la dirección y un organismo acreditado. Este trabajo es
> la base técnica y la evidencia de los controles; falta el sistema de gestión
> formal.»

---

## Anexo C — Checklist de 10 minutos antes de exponer

- [ ] VM azul encendida, `run-lab.sh` corriendo, `smoke-test.sh` en verde.
- [ ] VM negra con SET y SQLmap instalados; navegador abierto en el clon.
- [ ] Snapshot de la VM azul tomado (si habrá `--live`).
- [ ] `docs/lab/evidencias/` con capturas y salidas de respaldo.
- [ ] PDF de la tesis abierto en la tabla "antes vs. después".
- [ ] Cronómetro: 12–15 min; demos de 60–75 s cada una.
- [ ] Frase de cierre memorizada: «La seguridad no es un producto; es un proceso».
