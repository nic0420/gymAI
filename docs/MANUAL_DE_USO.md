# 📖 Manual de Usuario y Arquitectura Técnica — GymAI Enterprise

**Versión:** 1.0 Enterprise  
**Producción:** [https://gymai-eta.vercel.app](https://gymai-eta.vercel.app)  
**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Drizzle ORM, SQLite/PostgreSQL, Web Audio API.

---

## 📑 Tabla de Contenidos
1. [Visión General de la Plataforma](#1-visión-general-de-la-plataforma)
2. [¿Qué Incluye GymAI? (Módulos del Sistema)](#2-qué-incluye-gymai-módulos-del-sistema)
   - [2.1 Landing Page Pública B2B](#21-landing-page-pública-b2b)
   - [2.2 Recepción, Control de Acceso & Semáforo <2ms](#22-recepción-control-de-acceso--semáforo-2ms)
   - [2.3 Modo Kiosco Táctil de Auto-Atención](#23-modo-kiosco-táctil-de-auto-atención)
   - [2.4 Socios y Ficha Médica Cifrada (AES-256)](#24-socios-y-ficha-médica-cifrada-aes-256)
   - [2.5 Finanzas, Split Payments y Arqueo Ciego](#25-finanzas-split-payments-y-arqueo-ciego)
   - [2.6 Workout Builder y Live Tracker (1RM Epley)](#26-workout-builder-y-live-tracker-1rm-epley)
   - [2.7 Executive Business Intelligence & Heatmap 7x24](#27-executive-business-intelligence--heatmap-7x24)
   - [2.8 Onboarding y Tours Guiados Interactivos](#28-onboarding-y-tours-guiados-interactivos)
3. [Guía de Uso Paso a Paso (Por Rol)](#3-guía-de-uso-paso-a-paso-por-rol)
   - [Guía para Recepcionistas](#31-guía-para-recepcionistas)
   - [Guía para Entrenadores y Coaches](#32-guía-para-entrenadores-y-coaches)
   - [Guía para Dueños y Gerentes de Sede (BI & Multi-Tenant)](#33-guía-para-dueños-y-gerentes-de-sede-bi--multi-tenant)
   - [Guía para Socios en Tótem de Auto-Atención](#34-guía-para-socios-en-tótem-de-auto-atención)
4. [Especificación de Seguridad Criptográfica](#4-especificación-de-seguridad-criptográfica)
5. [Referencia de API REST](#5-referencia-de-api-rest)
6. [Comandos de Desarrollo y Pruebas](#6-comandos-de-desarrollo-y-pruebas)

---

## 1. Visión General de la Plataforma

**GymAI** es una solución SaaS B2B Multi-Tenant de alto rendimiento diseñada para cadenas de gimnasios, boxes de CrossFit y centros deportivos que operan con altos volúmenes de socios y requieren:
* **Tolerancia cero a caídas:** Motor *Offline-First* con `IndexedDB` que permite validar accesos aun sin internet.
* **Velocidad extrema en recepción:** Semáforo inteligente con validación en memoria y búsqueda por Blind Index en tiempo constante $O(1)$ (< 2ms de latencia).
* **Seguridad de grado bancario:** Cifrado Envelope `AES-256-GCM` para historial médico, Blind Indexing con `HMAC-SHA256` y sesiones rotativas `RTR` con detección de ataques.
* **Control contra desvíos de caja:** Cierre de turno mediante *Arqueo Ciego*, donde el cajero no conoce el saldo teórico esperado.

---

## 2. ¿Qué Incluye GymAI? (Módulos del Sistema)

### 2.1 Landing Page Pública B2B
* **Hero Section:** Propuesta de valor clara (*"La infraestructura operativa para gimnasios de alto rendimiento"*), botones de conversión ("Iniciar Prueba Gratuita", "Agendar Demo", "Modo Kiosco").
* **Mockup Isométrico Interactivo:** Simulador de semáforo en vivo (Aprobado/Gracia/Denegado) y vista previa del mapa de afluencia 7x24.
* **Bento Box Grid:** Explicación técnica de los 3 pilares: Seguridad Criptográfica, Velocidad Turnstile y Resiliencia Offline-First.
* **Showcase Financiero:** Muestra del terminal POS con cobro mixto y cierre ciego.

### 2.2 Recepción, Control de Acceso & Semáforo <2ms
* **Teclado Numérico Táctil (Numpad):** Botones ergonómicos pensados para pantallas táctiles y lectores de código de barras.
* **Semáforo Semántico Visual:**
  * 🟢 **Verde (`GRANTED_GREEN`):** Socio al día con apto médico vigente. Habilita molinete.
  * 🟡 **Amarillo (`WARNING_YELLOW`):** Período de gracia o vencimiento próximo (3 días). Emite alerta preventiva.
  * 🔴 **Rojo (`DENIED_RED`):** Cuota vencida, socio no registrado o apto médico vencido. Bloquea el paso.
* **Badge de Conectividad:** Indica estado `Online (<50ms)` o `Modo Offline (IndexedDB)` con contador de eventos en cola de sincronización.

### 2.3 Modo Kiosco Táctil de Auto-Atención
* Pantalla completa para tótem táctil de entrada.
* **Web Audio API:** Sintetizador de sonido nativo con tonos diferenciados para toques de teclado, accesos aprobados (tono agudo limpio), advertencias y bloqueos (tono grave).
* **Temporizador de Auto-Reset:** Regresa automáticamente a la pantalla de espera a los 8 segundos de inactividad.

### 2.4 Socios y Ficha Médica Cifrada (AES-256)
* Registro de socios con nombre, apellido, DNI, teléfono y plan contratado.
* **Ficha Médica Protegida:** Almacena antecedentes cardíacos, cirugías, alergias y contacto de emergencia cifrados en reposo (`enc:v1:<iv>:<tag>:<ciphertext>`).
* **Blind Index:** Permite buscar al socio por DNI instantáneamente sin descifrar la base de datos completa.

### 2.5 Finanzas, Split Payments y Arqueo Ciego
* **Split Payments (Pagos Mixtos):** Posibilidad de abonar una factura dividiendo el monto (ej. $20.000 en Efectivo + $25.000 con QR de Mercado Pago).
* **Reactivación Automática:** La suscripción del socio se renueva automáticamente en la base de datos tan pronto la factura alcanza el estado `PAID`.
* **Arqueo Ciego (Blind Closing):**
  * Al cerrar el turno, el cajero ingresa el conteo de billetes físicos y comprobantes de POS.
  * La pantalla **nunca muestra el total esperado por el sistema** para evitar manipulaciones.
  * El sistema registra el faltante o sobrante de forma inmutable en el libro contable de auditoría.

### 2.6 Workout Builder y Live Tracker (1RM Epley)
* **Constructor de Rutinas:** Biblioteca de ejercicios por grupo muscular (Pecho, Espalda, Piernas, Hombros, Core) y plantilla maestra clonable.
* **Live Tracker para el Alumno:** Registro interactivo de series, repeticiones logradas y peso levantado.
* **Estimador de 1RM con Fórmula de Epley:**
  $$\text{1RM Estimado} = \text{Peso} \times \left(1 + \frac{\text{Reps}}{30}\right)$$
* **Detección de PRs (Récord Personal):** Banner animado `🏆 ¡Nuevo Récord Personal Detectado!` cuando el alumno supera su mejor registro histórico.
* **Temporizador de Descanso:** Cuenta regresiva animada entre series.

### 2.7 Executive Business Intelligence & Heatmap 7x24
* **KPI Cards:** MRR (Ingreso Recurrente Mensual), Socios Activos, Tasa de Morosos y Horario Pico.
* **Sparklines:** Micro-gráficos de tendencia de facturación y altas integrados en cada tarjeta.
* **Matriz de Calor 7x24:** Visualización semanal de 06:00 a 22:00 hs con gradientes de color para detectar horas valle y horas de congestión.

### 2.8 Onboarding y Tours Guiados Interactivos
* Modales guiados paso a paso para capacitar al personal en menos de 2 minutos:
  * 🛎️ **Tour de Recepción:** Check-in, semáforo, registro de socios y cobro POS.
  * 🏋️ **Tour de Entrenadores:** Catálogo de ejercicios, rutinas y 1RM Epley.
  * 📊 **Tour de Dueños / BI:** KPIs financieros, retención y matriz 7x24.

---

## 3. Guía de Uso Paso a Paso (Por Rol)

### 3.1 Guía para Recepcionistas

#### A. Registrar el Ingreso de un Socio
1. En la pestaña **Check-in Recepción**, escribe el DNI en el teclado en pantalla o con el teclado físico / lector de código de barras.
2. Presiona **Enter** o el botón verde **Validar Ingreso**.
3. Observa el semáforo en el panel lateral:
   * **Verde:** Permite el ingreso.
   * **Amarillo:** Notifica al socio que su membresía vence en los próximos días.
   * **Rojo:** Revisa el motivo (cuota impaga o falta de apto físico) y deriva a administración.

#### B. Cobrar una Membresía con Split Payment (Pago Mixto)
1. Ve a la pestaña **Finanzas & Arqueo Ciego**.
2. En la tabla de facturas pendientes, selecciona **Cobrar**.
3. Selecciona la modalidad de cobro:
   * *Pago Total en Efectivo:* Ingresa el importe total.
   * *Pago Mixto (Split):* Ingresa la parte en Efectivo (ej. $15.000) y registra la diferencia con Tarjeta/QR (ej. $20.000).
4. Confirma el cobro. La factura pasará a `PAID` y la membresía del socio se activará al instante.

#### C. Apertura y Cierre de Turno con Arqueo Ciego
1. **Al iniciar el turno:** Haz clic en **Abrir Turno de Caja** e ingresa el fondo inicial de cambio (ej. $15.000).
2. **Durante el turno:** Registra cobros de membresías o egresos de caja chica (ej. artículos de limpieza) con el botón **Registrar Egreso**.
3. **Al finalizar el turno:**
   * Haz clic en **Cerrar Turno (Arqueo Ciego)**.
   * Cuenta físicamente los billetes de la gaveta y digita el total exacto.
   * Presiona **Sellar Turno de Caja**.
   * El sistema generará el acta inmutable con el diferencial auditado (sobrante/faltante).

---

### 3.2 Guía para Entrenadores y Coaches

#### A. Armar y Asignar una Rutina
1. Dirígete a la pestaña **Workout Builder**.
2. Filtra los ejercicios en el panel izquierdo por grupo muscular (ej. *Pectorales*, *Dorsales*, *Piernas*).
3. Haz clic en **➕ Agregar a la Rutina** para insertar el ejercicio en la sesión activa.
4. Define la cantidad de series objetivo, repeticiones recomendadas y tiempo de descanso.
5. Haz clic en **Guardar Rutina**.

#### B. Seguimiento en Vivo con 1RM Epley
1. Ingresa a la pestaña **Live Tracker (1RM Epley)**.
2. Haz clic en **Iniciar Entrenamiento Hoy**.
3. A medida que el alumno completa cada serie, ingresa el **Peso levantado (kg)** y las **Repeticiones logradas**.
4. Haz clic en el botón de verificación `✓`.
5. El sistema calculará el 1RM automáticamente. Si el alumno rompe su récord previo, se desplegará el trofeo `🏆 ¡Nuevo PR!`.
6. Al terminar todos los ejercicios, haz clic en **Finalizar Sesión** para registrar el volumen total (kg) acumulado.

---

### 3.3 Guía para Dueños y Gerentes de Sede (BI & Multi-Tenant)

#### A. Cambio de Sucursal (Multi-Tenancy)
1. En la barra superior, haz clic en el selector de sucursal:
   * `Sede Belgrano (Principal)`
   * `Sede Palermo Soho`
   * `Sede Recoleta VIP`
2. Todas las métricas, socios y cajas se actualizarán al contexto de la sucursal seleccionada.

#### B. Análisis de Rentabilidad y Horarios Pico
1. Abre la pestaña **Business Intelligence & Heatmap**.
2. Revisa las tarjetas superiores:
   * **MRR:** Total mensual facturado y porcentaje de crecimiento (+12.4%).
   * **Socios Activos vs Padrón:** Ratio de retención de clientes.
   * **Morosos:** Clientes que requieren campaña de recupero.
3. Observa la **Matriz de Calor 7x24**:
   * Las celdas en **azul oscuro** representan baja ocupación (oportunidad para clases promocionales).
   * Las celdas en **esmeralda/rojo** indican horas pico (reforzar con más profesores en sala de musculación y personal en mostrador).

---

### 3.4 Guía para Socios en Tótem de Auto-Atención
1. Toca la pantalla del tótem o haz clic en **Kiosco Táctil** en la barra superior.
2. Digita tu número de DNI en el teclado gigante en pantalla.
3. Presiona **INGRESAR**.
4. Escucharás el tono de confirmación sonoro y verás tu ficha en pantalla grande:
   * Si está en 🟢 **Verde**, el molinete se destraba.
   * A los 8 segundos la pantalla vuelve al estado de bienvenida automáticamente.

---

## 4. Especificación de Seguridad Criptográfica

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      CAPAS DE SEGURIDAD DE NIVEL BANCARIO                       │
├───────────────────┬─────────────────────────┬───────────────────────────────────┤
│ Vector            │ Algoritmo               │ Propósito                         │
├───────────────────┼─────────────────────────┼───────────────────────────────────┤
│ Ficha Médica      │ AES-256-GCM (Envelope)  │ Cifrado en reposo con IV único    │
│ Búsqueda DNI      │ HMAC-SHA256 (Salted)    │ Blind Indexing en tiempo O(1)     │
│ Autenticación     │ JWT + RTR (14 días)     │ Rotación estricta de refresh token│
│ Webhooks Pasarela │ HMAC-SHA256 Signatures  │ Validación de firma y anti-replay │
│ Identificadores   │ UUIDv7 (RFC 9562)       │ Claves ordenables con milisegundos│
└───────────────────┴─────────────────────────┴───────────────────────────────────┘
```

---

## 5. Referencia de API REST

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/v1/attendance/check-in` | Valida el acceso por DNI en < 2ms |
| `POST` | `/api/v1/attendance/sync-offline` | Sincroniza en batch eventos offline |
| `GET`  | `/api/v1/analytics/dashboard` | Retorna MRR, retención y matriz 7x24 |
| `GET`  | `/api/v1/finance/cash-shifts` | Consulta estado de la caja de la sucursal |
| `POST` | `/api/v1/finance/cash-shifts` | Apertura de caja con fondo inicial |
| `POST` | `/api/v1/finance/cash-shifts/close` | Cierre con Arqueo Ciego inmutable |
| `POST` | `/api/v1/finance/payments` | Registra pagos parciales o split |
| `POST` | `/api/v1/webhooks/gateway` | Webhook idempotente para pasarelas (MP) |
| `GET`  | `/api/v1/workouts/routines` | Lista y crea plantillas de entrenamiento |

---

## 6. Comandos de Desarrollo y Pruebas

```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar la suite completa de pruebas (122 tests)
npm test

# 3. Iniciar el servidor local de desarrollo
npm run dev

# 4. Compilar para producción
npm run build

# 5. Desplegar a Vercel
npx vercel --prod
```
