# ⚡ GymAI - Enterprise SaaS Gym Management Platform

Plataforma SaaS Integral y de Alta Disponibilidad para la Gestión, Facturación, Control de Acceso y Entrenamiento Inteligente en Gimnasios y Cadenas Deportivas.

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.30-C5F74F?style=flat-square)
![Automated Tests](https://img.shields.io/badge/Tests-122%20Passing-emerald?style=flat-square)

---

## 🌟 Características Principales

### 1. 🔐 Arquitectura Multi-Tenant & Seguridad de Nivel Bancario
* **Claves Primarias UUIDv7 (RFC 9562)**: Ordenamiento cronológico con resolución en milisegundos y contador monotónico de 12 bits.
* **Envelope Encryption (AES-256-GCM)**: Cifrado en reposo para antecedentes médicos y alergias de socios.
* **Blind Indexing (HMAC-SHA256)**: Búsquedas de DNI en tiempo constante $O(1)$ sin exponer información sensible.
* **Refresh Token Rotation (RTR)**: Sesiones seguras de 14 días con detección y revocación automática ante ataques de reúso.

### 2. 🚦 Control de Asistencia y Semáforo Inteligente (< 2ms)
* **Semáforo Visual**: 🟢 Verde (Al día), 🟡 Amarillo (Vencimiento próximo o gracia), 🔴 Rojo (Cuota vencida o sin apto).
* **Contingencia Offline-First**: Soporte de marcación sin internet mediante IndexedDB y sincronización idempotente en batch.

### 3. 💳 Finanzas, Split Payments y Arqueo Ciego
* **Split Payments**: Cobro combinado de facturas (ej. Efectivo + QR Mercado Pago) con reactivación automática de planes.
* **Arqueo Ciego (Blind Closing)**: Cierre de turno donde el cajero declara el efectivo físico sin conocer el saldo teórico del sistema.
* **Webhooks Idempotentes**: Verificación de firmas HMAC-SHA256 con protección contra cobros duplicados.

### 4. 🏋️ Workout Builder, 1RM Epley y Business Intelligence
* **Diseñador de Rutinas**: Catálogo clasificado por grupos musculares y clonación instantánea de plantillas maestras.
* **Tracking en Vivo con 1RM**: Cálculo automático con la **Fórmula de Epley** ($1\text{RM} = \text{Peso} \times (1 + \frac{\text{Reps}}{30})$) y detección de Récords Personales (PRs).
* **Mapa de Calor 7x24**: Matriz visual de afluencia por día y hora para optimización de staff.

### 5. 📱 Modo Kiosco Táctil & Tours Guiados
* **Terminal de Auto-Atención**: Teclado numérico táctil en pantalla, feedback auditivo Web Audio API nativo y auto-reset de 8 segundos.
* **Onboarding Interactivo**: Tours guiados para Recepción, Entrenadores y Dueños.

---

## 🛠️ Requisitos Previos

* Node.js >= 18.17.0
* npm o pnpm o yarn

---

## 🚀 Instalación y Puesta en Marcha Local

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/TU_USUARIO/GymAi.git
   cd GymAi
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env.local
   ```

4. **Ejecutar suite de pruebas automatizadas (122 tests)**:
   ```bash
   npm test
   ```

5. **Iniciar en modo desarrollo**:
   ```bash
   npm run dev
   ```
   Abrir [http://localhost:3000](http://localhost:3000).

---

## ☁️ Despliegue en Vercel

1. Sube tu código a un repositorio en **GitHub**.
2. Ve a [Vercel](https://vercel.com) e importa tu repositorio de GitHub.
3. En **Environment Variables**, agrega las variables definidas en `.env.example`:
   * `JWT_SECRET`
   * `JWT_REFRESH_SECRET`
   * `ENCRYPTION_MASTER_KEY`
   * `BLIND_INDEX_SALT`
   * `PAYMENT_GATEWAY_WEBHOOK_SECRET`
4. Haz clic en **Deploy**.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
