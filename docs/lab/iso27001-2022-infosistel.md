# ISO/IEC 27001:2022 aplicado a INFOSISTEL

## Documento de soporte para la Actividad N°1 y para el capítulo de hardening de la tesis

**Organización:** INFOSISTEL E.I.R.L.
**Sistema:** INFOSISTEL v2 — sitio público, tienda online y panel `/taller-control`
**Autor:** Zarate
**Fecha de referencia:** noviembre de 2026
**Normas de referencia:** ISO/IEC 27001:2022, ISO/IEC 27002:2022, ISO/IEC 27005:2022
**Marcos complementarios:** NIST SP 800-53 Rev. 5, OWASP ASVS 5.0, OWASP Top 10:2021

---

## 0. Aclaración importante: norma ≠ ley

ISO/IEC 27001:2022 **no es una ley**. Es una norma internacional voluntaria que
define los requisitos para establecer, implementar, mantener y mejorar un
**Sistema de Gestión de la Seguridad de la Información (SGSI)**. Una empresa
puede adoptarla por decisión propia, por exigencia contractual de un cliente o
para certificarse; la certificación la otorga un organismo acreditado (en Perú,
acreditado por INACAL).

Lo que sí son obligatorias son las leyes peruanas que tocan la materia:

| Norma | Qué regula | Implicancia para INFOSISTEL |
|---|---|---|
| **Ley N° 29733** — Protección de Datos Personales | Tratamiento de datos personales (nombre, teléfono, DNI, dirección) | Los pedidos, reparaciones y clientes de internet contienen PII: se necesita consentimiento, finalidad, seguridad y confidencialidad. |
| **Reglamento de la Ley N° 29733** (D.S. 003-2013-JUS y normas modificatorias) | Obligaciones concretas: registro de bancos de datos, medidas de seguridad, deber de confidencialidad | Aplica al almacenamiento de teléfonos, DNI y direcciones. Verificar la versión vigente y las modificaciones publicadas. |
| **Ley N° 30096** — Delitos Informáticos (modificada por Ley N° 30171) | Acceso no autorizado, interceptación, daño informático, fraude | Aun en un laboratorio, el acceso a sistemas de terceros sin autorización es delito. El laboratorio debe ser propio y aislado. |
| **SUNAT / comprobantes electrónicos** | Conservación de comprobantes y registros | Los datos de facturación tienen plazos de conservación; los backups deben respetarlos. |

Además, si en el futuro se procesan tarjetas, aplicaría **PCI DSS**; hoy el
negocio usa efectivo/Yape y no almacena datos de tarjeta, por lo que ese
requisito se declara **no aplicable**.

---

## 1. Contexto de la organización (cláusula 4)

> La cláusula 4 de ISO/IEC 27001:2022 pide entender la organización, las
> necesidades de las partes interesadas, el alcance del SGSI y los procesos
> que lo componen. Es el punto de partida antes de elegir controles.

### 4.1 Comprensión de la organización y de su contexto

**Factores externos**

| Categoría | Situación de INFOSISTEL | Efecto en seguridad |
|---|---|---|
| Mercado | Comercio minorista de tecnología y soporte técnico en Perú; clientes personas y pequeñas empresas. | Alto volumen de PII y de pedidos; estacionalidad (campañas, fin de año). |
| Tecnología | Next.js 16, React 19, SQLite, VPS Hostinger, GitHub, Nubefact, DeepSeek, Serper. | Superficie web expuesta a Internet; dependencia de terceros y de la cadena de suministro npm. |
| Proveedores | Hostinger (VPS), GitHub (código), Nubefact (facturación), DeepSeek/Serper (IA). | Riesgo de acceso compartido, caídas y filtraciones en terceros. |
| Legal | Ley 29733, Ley 30096, normativa SUNAT. | Multas, responsabilidad civil y penal; obligación de proteger PII. |
| Amenazas | Phishing, SQLi, ransomware, escaneo automatizado, fuerza bruta, fuga de datos. | Escenarios del caso NovaTech perfectamente trasladables a INFOSISTEL. |
| Clientes | Esperan disponibilidad, confidencialidad de sus datos y respuesta rápida. | La confianza es un activo comercial; una brecha afecta la reputación. |

**Factores internos**

| Categoría | Situación | Efecto |
|---|---|---|
| Tamaño | Microempresa; pocas personas con acceso al panel. | Un solo administrador concentra privilegios: riesgo de dependencia y de mal uso. |
| Cultura | Digitalización reciente; el dueño también desarrolla y opera. | Poco tiempo para seguridad; necesidad de controles simples y automatizados. |
| Infraestructura | Un VPS; SQLite; despliegue con PM2/standalone. | Punto único de falla; backups en el mismo VPS. |
| Código | Aplicación propia con asistencia de IA; repositorio Git. | Riesgo de dependencias vulnerables y de errores de codificación (SQLi, control de acceso). |
| Documentación | `hardening-log.md`, guías de despliegue, informes SENATI. | Base para la trazabilidad y la evidencia de la tesis. |
| Presupuesto | Limitado; no hay SOC ni equipo de seguridad 24/7. | Se priorizan controles preventivos de alto impacto y bajo costo. |

### 4.2 Necesidades y expectativas de las partes interesadas

| Parte interesada | Necesidad / expectativa | Requisito que la recoge |
|---|---|---|
| Dueño / dirección | Continuidad del negocio, reputación, cumplimiento | Cláusulas 5, 6, 9 y 10; A.5.29, A.5.30, A.8.13 |
| Clientes | Que sus datos no se filtren ni se usen para otro fin | Ley 29733; A.5.34, A.8.11, A.8.12, A.8.24 |
| Personal / técnicos | Acceso solo a lo necesario; instrucciones claras | A.5.15, A.5.18, A.8.2, A.6.3 |
| Proveedores (Hostinger, Nubefact, DeepSeek) | Claridad de responsabilidades y uso aceptable | A.5.19–A.5.23, A.8.30 |
| Autoridad de protección de datos | Cumplimiento y capacidad de demostrar medidas | Ley 29733; A.5.34, A.8.15 |
| SUNAT | Conservación e integridad de comprobantes | A.8.13, A.5.33 |
| Docente / jurado / cliente de la tesis | Evidencia reproducible del antes y el después | A.8.29, A.8.34, A.5.28 |

### 4.3 Alcance del SGSI

**Dentro del alcance:**

- El sitio público `infosistel.com.pe` (catálogo, tienda, seguimiento,
  cotizaciones).
- El panel interno `/taller-control` (productos, ventas, caja, clientes,
  reparaciones, servicios técnicos, facturación, usuarios).
- La base de datos SQLite (`dev.db` en el VPS; `lab-data/lab.db` en el
  laboratorio).
- El VPS Hostinger, el proceso Node/PM2, Nginx y los scripts de despliegue.
- El repositorio GitHub y el pipeline de build.
- El laboratorio aislado `10.10.10.0/24` usado para las pruebas de seguridad.
- Los procesos de: desarrollo seguro, gestión de accesos, backups,
  respuesta a incidentes, gestión de proveedores y capacitación.

**Fuera del alcance (con justificación):**

- La seguridad física del datacenter de Hostinger: es responsabilidad del
  proveedor (se documenta en el acuerdo y se revisa su certificación).
- El procesamiento de tarjetas: no se almacenan datos de tarjeta.
- Los servicios SaaS de Nubefact, DeepSeek y Serper: se evalúan como
  proveedores, pero su operación interna no está bajo control directo.
- La aplicación anterior de INFOSISTEL: se reemplaza por v2; se mantiene
  solo como referencia histórica.

### 4.4 Sistema de gestión y sus procesos

| Proceso | Objetivo | Responsable | Evidencia |
|---|---|---|---|
| Desarrollo seguro | Que cada cambio pase por revisión y pruebas de seguridad | Dueño/desarrollador | `hardening-log.md`, commits, revisión de PR |
| Gestión de accesos | Solo personas autorizadas, con mínimo privilegio y MFA | Dueño | `Admin.role`, `requireSuperAdmin`, `tokenVersion`, MFA |
| Gestión de cambios y despliegue | Desplegar sin romper ni filtrar datos | Dueño | `scripts/deploy-vps.sh`, backups previos, rollback |
| Gestión de backups | Poder restaurar ante pérdida o ransomware | Dueño | Copias en `infosistel-v2-data/backups/`, prueba de restore |
| Gestión de incidentes | Detectar, contener, erradicar, recuperar y aprender | Dueño | `hardening-log.md`, este laboratorio, logs |
| Gestión de proveedores | Evaluar riesgo de Hostinger, GitHub, Nubefact, IA | Dueño | Registro de proveedores |
| Concienciación | Reducir el riesgo de phishing | Dueño | Charla, simulación, guía |
| Auditoría y mejora | Revisar controles y corregir brechas | Dueño/docente | Informe de auditoría, KPIs |

---

## 2. Ciclo PDCA aplicado al hardening de INFOSISTEL

| Fase | Actividades realizadas | Evidencia | Responsable |
|---|---|---|---|
| **Plan** | Definir alcance; inventariar activos; evaluar riesgos (phishing, SQLi, IDOR, ransomware); seleccionar controles; redactar la Declaración de Aplicabilidad; fijar objetivos (MFA 100 %, 0 vulnerabilidades críticas, restore probado). | Este documento; matriz de riesgos; SoA; `hardening-log.md` | Dueño |
| **Do** | Implementar: scrypt, JWT, MFA, rate limit, CSP con nonce, headers, cifrado AES-256-GCM, índice ciego HMAC, consultas parametrizadas, `select` explícito, roles, backups, permisos 600, hardening del VPS. | Commits; `src/lib/*`; `src/proxy.ts`; `next.config.ts`; `scripts/deploy-vps.sh` | Dueño |
| **Check** | Ejecutar el laboratorio (phishing, SQLmap, IDOR, ransomware); medir; revisar logs; `npm audit`; probar restauración; auditoría interna; revisar KPIs. | `docs/lab/*`; capturas; salidas de SQLmap; resultados de restore | Dueño + docente |
| **Act** | Corregir brechas: backup fuera del VPS, cron fijo, prueba de restore periódica, revisión de dependencias, capacitación continua; actualizar el riesgo residual y la SoA. | Plan de acción; nuevo `hardening-log.md`; informe de mejora | Dueño |

### 2.1 Objetivos medibles (cláusula 6.2)

| Objetivo | Indicador | Meta | Frecuencia |
|---|---|---|---|
| Proteger las cuentas administrativas | % de admins con MFA | 100 % | Mensual |
| Reducir el riesgo de SQLi | N.º de consultas con SQL concatenado | 0 | Cada release |
| Proteger la PII | % de campos sensibles cifrados | 100 % | Cada release |
| Asegurar la recuperación | % de restauraciones exitosas | 100 % | Trimestral |
| Gestionar vulnerabilidades | Días para parchar CVEs críticas | ≤ 7 días | Mensual |
| Reducir el phishing | % de usuarios que reportan un correo sospechoso | ≥ 80 % | Semestral |

### 2.2 Matriz de riesgos (metodología 5×5)

**Escala:** probabilidad 1–5; impacto 1–5; riesgo = P × I.
**Niveles:** 1–4 bajo; 5–9 medio; 10–16 alto; 17–25 crítico.

| ID | Escenario | Activo | P (antes) | I (antes) | Riesgo antes | Controles aplicados | P (después) | I (después) | Riesgo después |
|---|---|---|---|---|---|---|---|---|---|
| R1 | Phishing / robo de credenciales del panel | Credenciales, panel | 4 | 5 | **20 crítico** | MFA TOTP, rate limit, scrypt, errores genéricos, capacitación | 2 | 4 | **8 medio** |
| R2 | SQL Injection en API pública | BD, precios de costo | 3 | 5 | **15 alto** | Prisma parametrizado, `select` allowlist, validación, WAF/regla de borde | 1 | 2 | **2 bajo** |
| R3 | IDOR / endpoint sin autenticación | Pedidos, PII | 4 | 5 | **20 crítico** | `requireSession`, roles, ruta pública eliminada, cifrado + índice ciego | 1 | 3 | **3 bajo** |
| R4 | Ransomware / cifrado de la BD | BD, backups | 3 | 5 | **15 alto** | Backups previos al deploy, permisos 600, restore probado, segmentación | 2 | 3 | **6 medio** |
| R5 | Fuga de PII en un backup | PII | 3 | 5 | **15 alto** | AES-256-GCM, HMAC, permisos, backups cifrados (recomendado) | 1 | 4 | **4 bajo** |
| R6 | Dependencia npm vulnerable | Cadena de suministro | 3 | 4 | **12 alto** | `npm audit`, `overrides`, actualización, lockfile | 2 | 3 | **6 medio** |
| R7 | Denegación de servicio / abuso del chatbot | Disponibilidad, costo | 3 | 3 | **9 medio** | Rate limit, recorte de historial, 503 controlado | 2 | 2 | **4 bajo** |
| R8 | Pérdida total del VPS | Continuidad | 2 | 5 | **10 alto** | Backup externo (pendiente), runbook, RTO/RPO | 2 | 4 | **8 medio** |

> **Lectura para la exposición:** el riesgo residual nunca es cero. Lo que
> cambia es que pasa de "crítico/alto" a "medio/bajo" y queda **documentado**
> con evidencia. Eso es exactamente lo que pide ISO 27001: no eliminar el
> riesgo, sino gestionarlo.

---

## 3. Declaración de Aplicabilidad (SoA) — extracto

La SoA completa debería listar los 93 controles del Anexo A. Este extracto
cubre los aplicables al alcance web/PII y justifica las exclusiones.

| Control | Nombre | ¿Aplica? | Justificación / estado |
|---|---|---|---|
| A.5.1 | Políticas para la seguridad de la información | Sí | `hardening-log.md` y este documento; aprobadas por la dirección. |
| A.5.7 | Inteligencia de amenazas | Sí | Seguimiento de OWASP Top 10, CVEs de Next.js/Prisma, avisos de GitHub. |
| A.5.15 | Control de acceso | Sí | Roles `admin`/`superadmin`; rutas protegidas. |
| A.5.17 | Información de autenticación | Sí | `scrypt` + MFA + recuperación de códigos. |
| A.5.18 | Derechos de acceso | Sí | Alta/baja de usuarios; `tokenVersion` invalida sesiones. |
| A.5.23 | Seguridad en el uso de servicios en la nube | Sí | Hostinger/GitHub/Nubefact/IA evaluados como proveedores. |
| A.5.24 | Planificación y preparación de incidentes | Sí | Runbook y laboratorio de simulación. |
| A.5.25 | Evaluación y decisión sobre eventos | Sí | Logs de auditoría; criterios de severidad. |
| A.5.26 | Respuesta a incidentes | Sí | Procedimiento de contención/erradicación/recuperación. |
| A.5.27 | Aprendizaje de incidentes | Sí | Lecciones del caso NovaTech y del laboratorio. |
| A.5.28 | Recopilación de evidencia | Sí | Capturas, comandos, hashes, `docs/lab/evidencias/`. |
| A.5.29 | Seguridad durante la interrupción | Sí | Backups y plan de continuidad. |
| A.5.30 | Preparación de las TIC para la continuidad | Sí | RTO/RPO definidos; restore probado. |
| A.5.34 | Privacidad y protección de PII | Sí | Ley 29733; cifrado y minimización. |
| A.6.3 | Concienciación, educación y formación | Sí | Charla de phishing y buenas prácticas. |
| A.6.8 | Notificación de eventos | Sí | Canal para reportar incidentes. |
| A.7.1 | Perímetros de seguridad física | Parcial | Responsabilidad de Hostinger; se revisa su certificación. |
| A.7.4 | Monitoreo de seguridad física | No aplica | Datacenter del proveedor. |
| A.8.1 | Dispositivos de usuario final | Parcial | Portátiles del personal; recomendaciones de disco cifrado. |
| A.8.2 | Derechos de acceso privilegiado | Sí | Solo `superadmin` gestiona usuarios; MFA. |
| A.8.3 | Restricción de acceso a la información | Sí | `select` explícito; rutas privadas. |
| A.8.5 | Autenticación segura | Sí | JWT firmado, cookie httpOnly, MFA, rate limit. |
| A.8.7 | Protección contra malware | Sí | EDR/antivirus en estaciones; no ejecutar adjuntos; restore. |
| A.8.8 | Gestión de vulnerabilidades técnicas | Sí | `npm audit`, revisión de dependencias, SQLmap/ZAP. |
| A.8.9 | Gestión de la configuración | Sí | `.env` validado con zod; headers; PM2/Nginx versionados. |
| A.8.11 | Enmascaramiento de datos | Sí | `costPrice` fuera del público; PII cifrada. |
| A.8.12 | Prevención de fuga de datos | Sí | Allowlist de campos; CSP; sin endpoints públicos de pedidos. |
| A.8.13 | Copia de seguridad | Sí | Backup antes de migrar; **brecha:** falta destino externo y cron. |
| A.8.14 | Redundancia de instalaciones | Parcial | Un solo VPS; se recomienda réplica/snapshot. |
| A.8.15 | Registro | Sí | `AuditLog` de login, fallos, cambios. |
| A.8.16 | Actividades de seguimiento | Sí | Revisión de logs y KPIs. |
| A.8.20 | Seguridad de redes | Sí | Nginx, TLS/HSTS, rate limit, segmentación del laboratorio. |
| A.8.24 | Uso de criptografía | Sí | AES-256-GCM, HMAC-SHA256, scrypt, TLS. |
| A.8.25 | Ciclo de vida de desarrollo seguro | Sí | Ramas, revisión, pruebas, laboratorio. |
| A.8.26 | Requisitos de seguridad de aplicaciones | Sí | Historias de seguridad; checklist OWASP. |
| A.8.27 | Arquitectura e ingeniería seguras | Sí | Separación público/privado; mínimo privilegio. |
| A.8.28 | Codificación segura | Sí | Consultas parametrizadas, sanitización, validación zod. |
| A.8.29 | Pruebas de seguridad en desarrollo y aceptación | Sí | Este laboratorio + SQLmap + pruebas manuales. |
| A.8.31 | Separación de entornos | Sí | `lab-data/lab.db`, `dev.db`, VPS; repo `infosistel-lab`. |
| A.8.32 | Gestión de cambios | Sí | Commits, backups, rollback, `deploy-vps.sh`. |
| A.8.33 | Información de prueba | Sí | Datos ficticios en el laboratorio; no PII real. |
| A.8.34 | Protección durante auditorías | Sí | Evidencias controladas; acceso temporal. |

**Exclusiones principales:** A.7.4 (monitoreo físico del datacenter), A.7.5
(protección contra amenazas físicas), A.7.6 (trabajo en áreas seguras),
A.7.7 (escritorio limpio/pantalla limpia) en su parte física, A.7.10 (medios
de almacenamiento) y A.7.14 (eliminación de equipos) se gestionan a nivel del
proveedor cloud o no aplican al alcance declarado. La justificación debe
quedar firmada en la SoA completa.

---

## 4. Mapeo del caso NovaTech → INFOSISTEL

| Eslabón NovaTech | Equivalente en INFOSISTEL | Ejercicio del laboratorio | Control ISO 27001:2022 |
|---|---|---|---|
| *Spear-phishing* a RR. HH. → credenciales VPN | Phishing al login `/taller-control/login` | **Ejercicio 1** | A.5.17, A.6.3, A.8.5 |
| Aplicación interna desactualizada → SQL Injection → dump de clientes y credenciales | `/api/products` exponía `costPrice`; ruta vulnerable con SQL concatenado | **Ejercicio 2** | A.8.8, A.8.25, A.8.28, A.8.29 |
| Credenciales de admin → acceso a servidores | Endpoint público de pedidos sin auth → PII | **Ejercicio 3** | A.5.15, A.8.2, A.8.3, A.8.12 |
| Ransomware (Ryuk/LockBit) → cifrado y rescate | Cifrado de `lab-data/lab.db` sin restore probado | **Ejercicio 4** | A.5.24–A.5.30, A.8.7, A.8.13 |
| — | Contexto, partes interesadas, alcance y PDCA | Documento completo | Cláusula 4 + cláusulas 6, 9 y 10 |

---

## 5. Respuesta a incidentes aplicada (A.5.24–A.5.28)

| Fase | Acción concreta en INFOSISTEL | Evidencia |
|---|---|---|
| Preparación | Runbook, contactos, laboratorio, backups, roles | `docs/lab/README.md`, `hardening-log.md` |
| Detección | `AuditLog`, logs de Nginx/PM2, alertas de fallos de login, revisión de CSP | Consultas a `AuditLog`; `journalctl`/PM2 |
| Contención | Revocar sesiones (`tokenVersion++`), cambiar contraseña, bloquear IP, restaurar snapshot | `logoutAction`, `requireSession` |
| Erradicación | Parchear la vulnerabilidad, actualizar dependencias, rotar secretos | Commit + `npm audit` |
| Recuperación | Restaurar backup verificado, validar integridad, monitorear | `scripts/backup-db.sh`, prueba de restore |
| Lecciones aprendidas | Actualizar matriz de riesgos, SoA y capacitación | Informe post-incidente |

**Tiempos objetivo (recomendados):**

- **RTO** (tiempo de recuperación): 4 horas.
- **RPO** (pérdida máxima de datos): 24 horas.
- **MTTD** (detección): < 1 hora para eventos críticos.
- **MTTR** (resolución): < 24 horas para incidentes críticos.

> Brecha actual: el backup se ejecuta solo durante un despliegue y vive en el
> mismo VPS. Para cumplir RTO/RPO hace falta un cron diario + copia externa +
> prueba de restauración mensual. Esto se documenta como acción de mejora
> (cláusula 10).

---

## 6. Evidencia "antes vs. después" para la tesis

| Escenario | Antes (repo `infosistel-lab`, `LAB_MODE=1`) | Después (repo `infosistelv2` o `LAB_MODE=0`) | Cómo se evidencia |
|---|---|---|---|
| Phishing | Login sin MFA; credenciales robadas suficientes | MFA TOTP + rate limit 5/15 min + scrypt | Captura de SET + intento de login bloqueado |
| SQLi | `$queryRawUnsafe` con `id=1 OR 1=1`; `costPrice` visible; error SQLite devuelto | Prisma parametrizado + `select` sin `costPrice`; ruta 404 | Salida de SQLmap + JSON de `/api/lab/products-secure` |
| IDOR / PII | `/api/lab/orders` sin auth; teléfono en claro; pedido legacy en texto plano | Sin ruta pública; panel con sesión/rol; AES-256-GCM + HMAC | `curl` con PII + `sqlite3` mostrando ciphertext en `main` |
| Ransomware | BD cifrada; app no abre; sin restore probado | Backup previo al deploy; permisos 600; restore documentado | `sha256sum` antes/después + `--restore` + app funcionando |
| Cabeceras | (El repo lab conserva las de `main`) | CSP con nonce, HSTS, `X-Frame-Options: DENY`, `nosniff` | `curl -sI` |
| Dependencias | (Se conserva el `overrides` de `main`) | `npm audit` revisado; las advisories nuevas se gestionan con `npm audit fix` | Salida de `npm audit` |

> Nota metodológica: el repo de laboratorio **no desactiva todos los
> controles**, solo los necesarios para los 4 ejercicios. Eso permite atribuir
> el cambio observado al control específico y no a "una versión distinta".

---

## 7. Conclusiones

1. **ISO/IEC 27001:2022 no se "aplica a una página web"**: se aplica a un
   **SGSI** cuyo alcance incluye la página, la base de datos, el VPS, el
   código y los procesos. La página es un activo dentro del sistema.
2. La **cláusula 4** obliga a mirar el contexto antes de elegir controles. En
   INFOSISTEL el contexto es: microempresa, un solo administrador, VPS único,
   PII de clientes, dependencia de terceros y recursos limitados.
3. El **ciclo PDCA** convierte el hardening en un proceso repetible: planificar
   el riesgo, implementar controles, verificarlos con pruebas reales y corregir
   lo que falle.
4. Los 4 ejercicios del laboratorio no son "trucos": son **evidencia de
   auditoría**. Cada uno demuestra un control del Anexo A y su efecto medible
   sobre el riesgo.
5. El riesgo residual sigue existiendo (backup externo, restauración
   periódica, capacitación continua). La madurez no es "no tener brechas",
   sino **conocerlas, priorizarlas y gestionarlas**.

---

## 8. Bibliografía

- ISO/IEC 27001:2022. *Information security, cybersecurity and privacy
  protection — Information security management systems — Requirements*.
- ISO/IEC 27002:2022. *Information security, cybersecurity and privacy
  protection — Information security controls*.
- ISO/IEC 27005:2022. *Information security, cybersecurity and privacy
  protection — Guidance on managing information security risks*.
- NIST SP 800-53 Rev. 5. *Security and Privacy Controls for Information
  Systems and Organizations*.
- OWASP Foundation. *OWASP Top 10:2021*.
- OWASP Foundation. *OWASP Application Security Verification Standard (ASVS) 5.0*.
- OWASP Foundation. *OWASP Cheat Sheet Series* (SQL Injection Prevention,
  Authentication, Session Management, File Upload).
- Perú. *Ley N° 29733 — Ley de Protección de Datos Personales*.
- Perú. *Decreto Supremo N° 003-2013-JUS — Reglamento de la Ley N° 29733*
  (y normas modificatorias).
- Perú. *Ley N° 30096 — Ley de Delitos Informáticos*, modificada por la
  *Ley N° 30171*.
- INFOSISTEL. *hardening-log.md* — registro de las fases 0 a 6.
- INFOSISTEL. *docs/lab/README.md* — runbook del laboratorio.
- INFOSISTEL. *docs/lab/guion-exposicion.md* — guion de la presentación.
