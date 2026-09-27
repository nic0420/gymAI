# Reporte de QA — GymAI

**Fecha:** 27/09/2026 · **Alcance:** código completo del repositorio (`src/`, `scripts/`, `tests/`, configuración) · **Versión auditada:** commit `9f9aa87`

---

## 1. Resumen ejecutivo

La base del sistema es sólida en lo conceptual (UUIDv7, cifrado AES-256-GCM, scrypt, RTR, blind index, semáforo de acceso), pero **la seguridad estaba implementada como librería y no conectada a la aplicación**. El resultado era que cualquier persona con la URL podía leer y modificar los datos de cualquier gimnasio, incluidas las fichas médicas descifradas, y marcar facturas como pagas.

Además había varios **defectos funcionales que rompían flujos centrales** en el uso real: el kiosco táctil siempre mostraba "Error de red", la caja nunca se podía abrir desde la UI, el efectivo cobrado no entraba al arqueo y un socio con la cuota que vencía "hoy" era rechazado en el molinete después de las 21 hs.

La suite de tests original pasaba al 100% porque probaba las funciones internas por separado y nunca las rutas HTTP ni la integración con el frontend.

| | Cantidad | Estado |
|---|---|---|
| Hallazgos críticos | 9 | 9 corregidos (1 requiere acción manual adicional) |
| Hallazgos altos | 15 | 15 corregidos |
| Hallazgos medios / bajos | 24 | 24 corregidos |
| Riesgos de arquitectura (requieren decisión) | 7 | Documentados en §5 |
| Tests | 158 → **199** | 15 suites, 100% pasando |

**Verificación:** `tsc --noEmit` sin errores · `npm test` 199/199 · `next build` OK · prueba E2E con navegador real (alta de gimnasio → login → carga demo → check-in en recepción → kiosco).

---

## 2. Acciones urgentes que debés hacer vos

Estas no se pueden resolver sólo con código:

1. **Cambiá ya las contraseñas de las cuentas `litoral-dev` y `gimnasio-libertad`.** Estaban escritas en `LoginModal.tsx` (que se envía al navegador de cualquier visitante) y en `scripts/provision-accounts.ts`. Ya las saqué del código, pero siguen en el historial de git. Si el repo en GitHub es o fue público, consideralas filtradas y purgá el historial (`git filter-repo` o BFG).
2. **Configurá las variables de entorno en Vercel** (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `APP_MASTER_KEY`, `BLIND_INDEX_SALT`, `PAYMENT_GATEWAY_WEBHOOK_SECRET`). Ahora **la app no arranca en producción si faltan**, a propósito: antes usaba en silencio claves públicas del repo. Ojo: si cambiás `APP_MASTER_KEY` o `BLIND_INDEX_SALT` respecto de las que tengas hoy en producción, las fichas médicas ya cifradas y las búsquedas por DNI dejan de funcionar. Usá las mismas que estén en uso o migrá los datos.
3. **Revisá la base de datos en producción** (ver §5.1): SQLite en Vercel no persiste los datos.
4. **Los cambios están aplicados en tu carpeta pero sin commitear.** Revisalos con `git diff` y commiteá cuando estés conforme. Tu rama local está 2 commits detrás de `origin/main` (sólo cambios de README, sin conflictos).

---

## 3. Hallazgos y correcciones

Severidad: 🔴 Crítico · 🟠 Alto · 🟡 Medio · ⚪ Bajo

### 3.1 Seguridad

| ID | Sev. | Hallazgo | Impacto | Corrección |
|---|---|---|---|---|
| SEC-01 | 🔴 | **Ninguna ruta de negocio validaba identidad.** `rbac.ts` y `verifyAccessToken` existían pero no se usaban en ningún lado. | Cualquier persona podía listar socios, crear usuarios, abrir y cerrar cajas, cobrar y leer métricas de cualquier gimnasio. | Nuevo `lib/auth/guard.ts` (`requireAuth` + permisos atómicos) aplicado a las 20 rutas de negocio. |
| SEC-02 | 🔴 | El aislamiento multi-tenant dependía del `tenantId` que enviaba el cliente por query o body. | `GET /users/{id}` devolvía **fichas médicas descifradas** (condiciones, medicación, alergias) de cualquier gimnasio. | El tenant sale del token firmado; si el cliente manda otro, se responde 403. Todas las consultas por ID quedan filtradas por tenant. |
| SEC-03 | 🔴 | `POST /users` aceptaba `role: "SUPERADMIN"` sin autenticación. | Cualquiera podía crearse un administrador en cualquier gimnasio. | Sólo un SUPERADMIN crea personal; recepción sólo da de alta socios. |
| SEC-04 | 🔴 | `PATCH /users/{id}` hacía `.set({...body})` (*mass assignment*). | Se podía cambiar `role`, `passwordHash`, `tenantId` o `dni` de cualquier usuario. | Esquema Zod `.strict()` con los campos editables; cambiar el rol requiere SUPERADMIN. |
| SEC-05 | 🔴 | **El webhook de pagos no verificaba la firma**: `verifyWebhookSignature` se importaba pero nunca se llamaba. | Con un POST falso se marcaban facturas como pagas y se reactivaban membresías. | Firma HMAC obligatoria; sin secreto configurado el webhook responde 503. El tenant se deriva de la factura, no del payload. |
| SEC-06 | 🔴 | **Credenciales reales en el código**: pre-cargadas en `LoginModal` con botones de "acceso rápido" y en el script de aprovisionamiento. | Acceso SUPERADMIN a tu cuenta maestra y a la de un cliente para cualquier visitante del sitio. | Eliminadas. El script ahora lee `PROVISION_*_PASSWORD` del entorno. **Requiere rotación manual (§2).** |
| SEC-07 | 🔴 | Secretos con valores por defecto hardcodeados, y `.env.example` con nombres distintos a los que lee el código (`JWT_SECRET` en lugar de `JWT_ACCESS_SECRET`, `ENCRYPTION_MASTER_KEY` en lugar de `APP_MASTER_KEY`). | Quien siguiera el `.env.example` quedaba en producción con claves públicas: podía falsificar JWT de cualquier rol y descifrar fichas médicas. | `lib/config/secrets.ts`: en producción, un secreto faltante es un error fatal. `.env.example` corregido. |
| SEC-08 | 🟠 | `POST /admin/seed-demo` era público y la landing lo invocaba con el slug de un cliente real. | Cualquiera podía inyectar 12 socios, facturas y asistencias falsas en el gimnasio de un cliente. | Requiere SUPERADMIN, usa el tenant de la sesión y en producción está deshabilitado salvo `ALLOW_DEMO_SEED=true`. |
| SEC-09 | 🟠 | Contraseñas iniciales predecibles: `Gym` + últimos 4 dígitos del DNI para altas manuales y `Socio1234!` para todos los importados. | Toma de cuentas de socios trivial. | Contraseñas aleatorias criptográficas. |
| SEC-10 | 🟠 | El frontend arrancaba directamente como "Nicolas Ojeda – SUPERADMIN" sin login y descartaba el `accessToken`. | No existía sesión real en la UI. | Login obligatorio, restauración de sesión con la cookie HttpOnly y `lib/api-client.ts` que adjunta el token y lo renueva solo. |
| SEC-11 | 🟠 | Los recordatorios por WhatsApp usaban **tu alias y CVU personales por defecto** para los socios de cualquier gimnasio. | Los socios de un cliente recibían instrucciones para transferirte a vos. | Sin datos configurados, el mensaje remite a recepción. Configurable con `NEXT_PUBLIC_GYM_PAYMENT_ALIAS` y `NEXT_PUBLIC_GYM_PAYMENT_CVU`. |
| SEC-12 | 🟡 | Inyección de fórmulas en los CSV exportados; comillas sin escapar. | Un socio registrado como `=HYPERLINK(...)` ejecutaba la fórmula al abrir el Excel del contador. | `csvCell()` neutraliza fórmulas y escapa comillas, respetando los teléfonos. |
| SEC-13 | 🟡 | Login: enumeración de usuarios por diferencia de tiempos, rate limit evadible variando `X-Forwarded-For` y email sensible a mayúsculas. | — | Hash señuelo, IP tomada del primer salto y comparación de email sin distinguir mayúsculas. Alta de gimnasios limitada a 5 por hora por IP. |

### 3.2 Lógica de negocio y datos

| ID | Sev. | Hallazgo | Corrección |
|---|---|---|---|
| BUG-01 | 🔴 | **Al renovar el token (cada 15 min) todo usuario quedaba como `SOCIO`**: `rotateRefreshToken` emitía el access token con `role: "SOCIO"` y el DNI vacío. | El controller emite el token con los datos frescos del usuario. El refresh ahora también devuelve usuario, gimnasio y sedes. |
| BUG-02 | 🟠 | Se podían cobrar facturas de otro gimnasio: `processPaymentTransaction` no verificaba el tenant. | La factura, la caja y la suscripción se filtran por tenant. |
| BUG-03 | 🟠 | Se permitía el sobrepago (`paidAmount > totalAmount`). | Se rechaza en backend (`PAYMENT_EXCEEDS_BALANCE`) y en el modal de cobro. |
| BUG-04 | 🟠 | **El efectivo cobrado no ingresaba a la caja** (la tabla de facturas nunca recibía `cashShiftId`), y además se podía registrar efectivo en una caja ya cerrada. | Un cobro en efectivo exige una caja ABIERTA del mismo gimnasio; la UI la busca sola al cobrar. |
| BUG-05 | 🟠 | Pagos y alta de gimnasio sin transacción: un fallo a mitad dejaba datos inconsistentes. | `db.transaction` atómica en ambos flujos, con montos redondeados a centavos. |
| BUG-06 | 🟠 | **El arqueo "ciego" no era ciego**: el recepcionista veía en vivo el "Efectivo en cajón". | El saldo teórico y los totales sólo los ve quien tiene permiso de reportes; recepción los ve recién al cerrar el turno. |
| BUG-07 | 🟠 | Webhook: si faltaba el ID del evento se inventaba `evt_${Date.now()}`, y si faltaba el tipo se asumía `payment.approved`. | Ambos campos son obligatorios (400). |
| BUG-08 | 🟡 | Un webhook `FAILED` nunca se reprocesaba, y dos entregas simultáneas del mismo evento se procesaban dos veces. | Los eventos FAILED se reintentan; índice UNIQUE `(gateway, external_event_id)`. |
| BUG-09 | 🟠 | Sync offline: un DNI desconocido se insertaba con `userId = "OFFLINE_UNKNOWN_USER"`, violaba la FK y **el lote entero respondía 500**, quedando sincronizado a medias. | Se rechaza ese evento puntual y se informa. También se validan sede, tenant y fecha, con un máximo de 500 eventos por lote. |
| BUG-10 | 🟡 | La importación CSV no validaba nada: estados como "activo" o "moroso" llegaban a la BD, los DNI con puntos generaban duplicados y la factura usaba el precio del CSV aunque el plan existente tuviera otro. | Validación Zod por fila, detección de duplicados dentro del archivo, precio real del plan y un máximo de 2.000 filas. |
| BUG-11 | 🟠 | El esquema Drizzle declaraba `UNIQUE(tenant_id, dni/email)` e índices, pero **`init.ts` no creaba ninguno**. | 18 índices creados; si una base existente tuviera duplicados, se avisa sin tirar abajo la app. Tu `local.db` no tiene duplicados. |
| BUG-12 | 🟠 | **Zona horaria**: se usaba la fecha UTC. En Argentina, desde las 21:00 hs, "hoy" ya era mañana: un socio con cuota que vence hoy era **rechazado en el horario pico**. En Vercel (UTC) el heatmap además aparecía corrido 3 horas. | `lib/time/dates.ts` con la zona del gimnasio (`APP_TIMEZONE`), aplicada en check-in, renovaciones, importación, seed y heatmap. |
| BUG-13 | 🟡 | Récords personales: 3 series crecientes del mismo ejercicio contaban como 3 PR. En el Live Tracker el PR estaba fijo en "≥ 130 kg". | Se cuenta un PR por ejercicio contra el mejor histórico y de la sesión. |
| BUG-14 | 🔴 | **El kiosco táctil no funcionaba nunca**: enviaba sólo el DNI (400) y leía `data.evaluation`, un campo que la API no devuelve. Siempre mostraba "Error de red". | Envía gimnasio y sede y mapea la respuesta real. Verificado con navegador. |
| BUG-15 | 🟠 | IDs ficticios hardcodeados (`demo-tenant-id`, `demo-branch-id`, `USER_RECEPCION`, `USER_DEMO_SOCIO`): **la caja nunca se podía abrir** (error de FK) y los errores se tragaban en silencio. El selector mostraba 3 sedes inventadas. | IDs tomados de la sesión, selector con las sedes reales y mensajes de error visibles. |
| BUG-16 | 🟡 | BI: el "MRR" sumaba todas las facturas pagas de la historia, las "asistencias del mes" eran todas y el heatmap contaba los rechazos. | MRR = cobros aprobados de los últimos 30 días; asistencias efectivas de 30 días; heatmap de 90 días sin rechazos. |
| BUG-17 | 🟠 | Si se caía la red en recepción, se mostraba **AMARILLO (paso autorizado) para cualquier DNI**, incluso inexistente. | Pide validación manual y marca el modo offline. |
| BUG-18 | 🟡 | Seed demo: reutilizaba planes y ejercicios de otros gimnasios (búsqueda sin tenant) e inventaba una sede inexistente. | Búsquedas por tenant y uso de una sede real, o creación de una. |
| BUG-19 | 🟡 | **Los tests escribían en tu `local.db` de desarrollo**: hoy tiene 11 gimnasios de prueba. El test de BI usaba fechas fijas y se iba a romper solo al mes. | Los tests usan una base en memoria (`tests/setup-env.ts`) y fechas relativas. |

### 3.3 Defectos menores corregidos

- La búsqueda de socios con `%` o `_` devolvía todo el padrón (el LIKE no estaba escapado).
- La búsqueda de socios hacía una petición por cada tecla; ahora tiene debounce de 300 ms.
- La cookie de refresh no se borraba ante una sesión inválida (`cookies.delete` usaba otro `path`).
- `PUT /medical` respondía "éxito" aunque el socio no tuviera ficha.
- Un dato cifrado corrupto tiraba 500 en toda la ficha del socio.
- Dos cierres de caja concurrentes podían pisarse; el cierre ahora es condicional a `status = OPEN`.
- La exportación de caja pasaba el objeto equivocado y el resumen salía en 0.
- Las facturas `VOIDED` y `DRAFT` se mostraban como "Pendiente" y se podían cobrar.
- La tabla de facturas mostraba "Socio" en lugar del nombre, sin teléfono para WhatsApp.
- Un rechazo por apto médico enviaba por WhatsApp un "recordatorio de deuda".
- Los teléfonos con prefijo 15 generaban links de WhatsApp a números inexistentes.
- Mutación directa del estado React en el Live Tracker y el Workout Builder.
- El 1RM máximo incluía series no completadas.
- Un día sin ejercicios en el Workout Builder fallaba sin avisar.
- Se podía asignar una rutina a un socio de otro gimnasio o usar ejercicios privados ajenos.
- Errores internos (`error.message`) filtrados en las respuestas de la API.

---

## 4. Tests agregados

Nueva suite **`tests/qa-regression.test.ts`** (40 casos). Cada uno reproduce un hallazgo de este reporte ejercitando **las rutas HTTP reales**, no sólo los servicios: 401/403 por tenant y rol, mass assignment, refresh que conserva el rol, arqueo ciego, sobrepago, caja cerrada, atomicidad, webhook falsificado, reintento de FAILED, lote offline, importación, índice UNIQUE, zona horaria, PR, CSV y WhatsApp.

```bash
npm test          # 15 suites, 199 casos, base en memoria (no toca local.db)
npx tsc --noEmit  # tipos
npm run build     # build de producción
```

---

## 5. Riesgos de arquitectura pendientes (requieren decisión)

1. **🔴 SQLite en Vercel.** El proyecto está vinculado a Vercel (`.vercel/`), pero el sistema de archivos de las funciones serverless es efímero: cada instancia arranca con una base vacía o de sólo lectura, y **los datos no persisten**. Recomendación: Turso/libSQL (el cambio más chico, sigue siendo SQLite y Drizzle lo soporta) o Postgres (Neon o Supabase).
2. **🟠 Sesiones RTR y rate limiter en memoria.** En serverless, cada instancia tiene su propio `Map`: el refresh falla aleatoriamente, el logout no revoca en otras instancias y el límite de intentos no se aplica de verdad. La tabla `user_sessions` ya existe en el esquema pero no se usa; conviene persistir ahí las sesiones y usar Upstash Redis para el rate limit.
3. **🟠 Verificación de webhooks por pasarela.** Implementé HMAC-SHA256 sobre el body, que sirve como capa genérica. Mercado Pago (`x-signature: ts=…,v1=…` sobre un *manifest*) y Stripe (`t=…,v1=…`) usan esquemas propios. Además, lo correcto es **no confiar en el `amount` del payload**: hay que consultar el pago en la API de la pasarela con su ID antes de acreditarlo.
4. **🟡 El modo offline no existe en la práctica.** `lib/offline/indexed-db.ts` nunca se usa y el botón "Modo Offline" es sólo visual. Falta cachear el padrón, evaluar localmente, encolar y sincronizar con `/attendance/sync-offline`, que ya está endurecido.
5. **🟡 El kiosco usa la sesión del staff.** En una tablet de autoservicio conviene un "token de dispositivo" con permiso sólo de `attendance:write`, para no dejar una sesión de recepción abierta en un equipo público.
6. **🟡 El DNI se guarda en texto plano** junto a su blind index, así que el índice ciego no protege nada. Hay que cifrar la columna `dni` o asumir que no es dato sensible y quitar la complejidad.
7. **🟡 Esquema duplicado.** El DDL manual de `init.ts` y el esquema Drizzle divergen (por eso faltaban los índices). Conviene usar `drizzle-kit generate/migrate` como única fuente de verdad.

---

## 6. Sugerencias de mejora

### Producto

- **Cobranza automática:** un job diario que emita las facturas de renovación, marque `DEBTOR`/`PAST_DUE` al vencer (hoy el estado `DEBTOR` nunca se actualiza solo) y envíe recordatorios por la WhatsApp Business API en lugar de links manuales.
- **Datos de cobro por gimnasio** en `tenants.settings` (alias, CVU, días de gracia, horario), editables desde la UI, en lugar de variables de entorno globales.
- **Onboarding del socio:** forzar el cambio de la contraseña temporal en el primer login, más recuperación por email o WhatsApp.
- **QR personal del socio** (PWA) para el check-in; es más rápido y menos propenso a errores que tipear el DNI.
- **Integración real con Mercado Pago:** links de pago o suscripciones (preapproval) con conciliación automática.
- **Reservas de clases y cupos**, y un **panel de retención** (socios que dejaron de venir hace más de 14 días, bajas del mes, ticket promedio).
- **Auditoría (audit log)** de accesos a fichas médicas, cierres de caja y cambios de rol, útil además para la Ley 25.326 de protección de datos.
- **Apto médico en la importación:** hoy los socios importados quedan con apto `VALID` por 180 días por defecto. Sugiero `PENDING_REVIEW` para no habilitar a alguien sin certificado.

### Ingeniería

- **CI con GitHub Actions:** `tsc`, `npm test` y `next build` en cada push y PR.
- Migrar el runner de tests casero a **Vitest** y sumar **Playwright** para los flujos de recepción, kiosco y caja.
- **Montos en centavos enteros** (INTEGER) en lugar de `REAL`.
- **Cabeceras de seguridad** en `next.config.mjs`: CSP, `X-Frame-Options`, `Referrer-Policy` y HSTS.
- **Paginación real** en socios y facturas (hoy el límite fijo es 100) y totales con `COUNT(*)`.
- Cargar los **permisos individuales** en el token (hoy el login envía `permissions: []`, así que el RBAC dinámico por usuario no tiene efecto).
- Dividir `page.tsx` y la landing (800 líneas) y agregar un **error boundary**.
- Observabilidad: Sentry o similar y logs estructurados, sin datos personales en los `console.error`.

---

## 7. Archivos modificados

**62 archivos** (+2451 / −643 líneas).

**Nuevos:**

- `lib/auth/guard.ts`
- `lib/api-client.ts`
- `lib/config/secrets.ts`
- `lib/time/dates.ts`
- `lib/security/client-ip.ts`
- `tests/qa-regression.test.ts`
- `tests/setup-env.ts`
- `docs/REPORTE_QA.md`

**Modificados:**

- Las 22 rutas de la API.
- Los servicios de pagos, caja, webhook, check-in, BI y workouts.
- `db/init.ts` y `db/index.ts`.
- 12 componentes.
- `.env.example` y `scripts/provision-accounts.ts`.
- 3 tests existentes, ajustados al nuevo contrato del refresh y a fechas relativas.

**Cambios de comportamiento a tener en cuenta:**

- Ahora hay que iniciar sesión para usar la app.
- El webhook exige firma.
- El seed demo está deshabilitado en producción.
- La app no arranca en producción sin secretos.
- Recepción ya no ve el saldo teórico de la caja.
