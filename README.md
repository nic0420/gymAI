# ⚡ GymAI — Enterprise SaaS Gym Management Platform

Plataforma SaaS Integral, Multi-Tenant y de Alta Disponibilidad para la Gestión, Facturación, Control de Acceso (<2ms) y Entrenamiento Inteligente en Cadenas de Gimnasios y Centros Deportivos.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.30-C5F74F?style=flat-square)](https://orm.drizzle.team/)
[![Automated Tests](https://img.shields.io/badge/Tests-122%20Passing-emerald?style=flat-square)](https://github.com/nic0420/gymAI)
[![Vercel Deployment](https://img.shields.io/badge/Deployment-Live%20on%20Vercel-black?style=flat-square&logo=vercel)](https://gymai-eta.vercel.app)

---

## 🌐 Enlaces de Producción
* 🚀 **Aplicación en Vivo:** [https://gymai-eta.vercel.app](https://gymai-eta.vercel.app)
* 📖 **Manual de Usuario Completo y Arquitectura:** [docs/MANUAL_DE_USO.md](docs/MANUAL_DE_USO.md)

---

## 🌟 Módulos y Capacidades Principales

### 1. 🌐 Landing Page Pública B2B
* **Hero de Alta Conversión:** Diseñado bajo la estética de herramientas para desarrolladores (*Vercel / Linear*).
* **Mockup Isométrico Interactivo:** Simulador en vivo del semáforo reactivo (<2ms) y mapa de calor de afluencia 7x24.
* **Bento Box Grid:** Explicación técnica de seguridad bancaria, velocidad turnstile y resiliencia offline.

### 2. 🚦 Control de Asistencia & Semáforo Inteligente (< 2ms)
* **Semáforo Visual Inmersivo:** 🟢 Verde (Acceso Concedido), 🟡 Amarillo (Período de Gracia / Vence Pronto), 🔴 Rojo (Cuota Vencida o Sin Apto Médico).
* **Modo Kiosco Táctil de Auto-Atención:** Teclado numérico ergonómico en pantalla completa, síntesis de sonido *Web Audio API* nativa y auto-reset tras 8 segundos de inactividad.
* **Contingencia Offline-First:** Sigue registrando asistencias aun sin internet gracias al motor local con `IndexedDB` y sincronización idempotente por lotes (*batch*).

### 3. 💳 Finanzas, Split Payments y Arqueo Ciego
* **Split Payments (Pagos Mixtos):** Liquidación flexible combinando Efectivo + QR de Mercado Pago / Tarjetas con reactivación automática de planes.
* **Arqueo Ciego (Blind Closing):** Cierre de turno de caja donde el cajero declara denominaciones físicas sin que el sistema revele el saldo teórico esperado, blindando la auditoría contable.
* **Webhooks Idempotentes:** Firmas criptográficas HMAC-SHA256 con protección anti-duplicados y prevención de ataques de repetición.

### 4. 🏋️ Workout Builder & Live Tracker (1RM Epley)
* **Diseñador de Rutinas:** Biblioteca clasificada por grupos musculares y clonación instantánea de plantillas maestras.
* **Seguimiento en Vivo con 1RM:** Cálculo automático mediante la **Fórmula de Epley** ($1\text{RM} = \text{Peso} \times (1 + \frac{\text{Reps}}{30})$).
* **Alertas de Récord Personal:** Banner visual `🏆 ¡Nuevo Récord Personal Detectado!` al superar marcas históricas.

### 5. 📊 Executive Business Intelligence & Heatmap 7x24
* **Métricas Clave:** MRR (Ingreso Recurrente), Socios Activos y Tasa de Retención con mini gráficos *sparklines*.
* **Matriz de Calor 7x24:** Visualización semanal de 06:00 a 22:00 hs para dimensionar personal de entrenadores y staff de mostrador.

### 6. 🔐 Seguridad & Privacidad de Nivel Bancario
* **Claves Primarias UUIDv7 (RFC 9562):** Ordenamiento cronológico con resolución en milisegundos y contador monotónico.
* **Envelope Encryption (AES-256-GCM):** Cifrado en reposo con vector de inicialización único para antecedentes médicos y alergias.
* **Blind Indexing (HMAC-SHA256):** Búsquedas ultrarrápidas de DNI en tiempo constante $O(1)$ sin exponer información sensible.
* **Refresh Token Rotation (RTR):** Sesiones seguras de 14 días con detección y revocación automática ante ataques de reúso.

---

## 🚀 Puesta en Marcha Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/nic0420/gymAI.git
cd gymAI

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local

# 4. Ejecutar suite de pruebas (122 tests)
npm test

# 5. Iniciar en modo desarrollo
npm run dev
```
Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

# ⚡ GymAI — Enterprise SaaS Gym Management Platform

Plataforma SaaS Integral, Multi-Tenant y de Alta Disponibilidad para la Gestión, Facturación, Control de Acceso (<2ms) y Entrenamiento Inteligente en Cadenas de Gimnasios y Centros Deportivos.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.30-C5F74F?style=flat-square)](https://orm.drizzle.team/)
[![Automated Tests](https://img.shields.io/badge/Tests-122%20Passing-emerald?style=flat-square)](https://github.com/nic0420/gymAI)
[![Vercel Deployment](https://img.shields.io/badge/Deployment-Live%20on%20Vercel-black?style=flat-square&logo=vercel)](https://gymai-eta.vercel.app)

---

## 🌐 Enlaces de Producción
* 🚀 **Aplicación en Vivo:** [https://gymai-eta.vercel.app](https://gymai-eta.vercel.app)
* 📖 **Manual de Usuario Completo y Arquitectura:** [docs/MANUAL_DE_USO.md](file:///c:/Users/Usuario/GymAi/docs/MANUAL_DE_USO.md)

---

## 🌟 Módulos y Capacidades Principales

### 1. 🌐 Landing Page Pública B2B
* **Hero de Alta Conversión:** Diseñado bajo la estética de herramientas para desarrolladores (*Vercel / Linear*).
* **Mockup Isométrico Interactivo:** Simulador en vivo del semáforo reactivo (<2ms) y mapa de calor de afluencia 7x24.
* **Bento Box Grid:** Explicación técnica de seguridad bancaria, velocidad turnstile y resiliencia offline.

### 2. 🚦 Control de Asistencia & Semáforo Inteligente (< 2ms)
* **Semáforo Visual Inmersivo:** 🟢 Verde (Acceso Concedido), 🟡 Amarillo (Período de Gracia / Vence Pronto), 🔴 Rojo (Cuota Vencida o Sin Apto Médico).
* **Modo Kiosco Táctil de Auto-Atención:** Teclado numérico ergonómico en pantalla completa, síntesis de sonido *Web Audio API* nativa y auto-reset tras 8 segundos de inactividad.
* **Contingencia Offline-First:** Sigue registrando asistencias aun sin internet gracias al motor local con `IndexedDB` y sincronización idempotente por lotes (*batch*).

### 3. 💳 Finanzas, Split Payments y Arqueo Ciego
* **Split Payments (Pagos Mixtos):** Liquidación flexible combinando Efectivo + QR de Mercado Pago / Tarjetas con reactivación automática de planes.
* **Arqueo Ciego (Blind Closing):** Cierre de turno de caja donde el cajero declara denominaciones físicas sin que el sistema revele el saldo teórico esperado, blindando la auditoría contable.
* **Webhooks Idempotentes:** Firmas criptográficas HMAC-SHA256 con protección anti-duplicados y prevención de ataques de repetición.

### 4. 🏋️ Workout Builder & Live Tracker (1RM Epley)
* **Diseñador de Rutinas:** Biblioteca clasificada por grupos musculares y clonación instantánea de plantillas maestras.
* **Seguimiento en Vivo con 1RM:** Cálculo automático mediante la **Fórmula de Epley** ($1\text{RM} = \text{Peso} \times (1 + \frac{\text{Reps}}{30})$).
* **Alertas de Récord Personal:** Banner visual `🏆 ¡Nuevo Récord Personal Detectado!` al superar marcas históricas.

### 5. 📊 Executive Business Intelligence & Heatmap 7x24
* **Métricas Clave:** MRR (Ingreso Recurrente), Socios Activos y Tasa de Retención con mini gráficos *sparklines*.
* **Matriz de Calor 7x24:** Visualización semanal de 06:00 a 22:00 hs para dimensionar personal de entrenadores y staff de mostrador.

### 6. 🔐 Seguridad & Privacidad de Nivel Bancario
* **Claves Primarias UUIDv7 (RFC 9562):** Ordenamiento cronológico con resolución en milisegundos y contador monotónico.
* **Envelope Encryption (AES-256-GCM):** Cifrado en reposo con vector de inicialización único para antecedentes médicos y alergias.
* **Blind Indexing (HMAC-SHA256):** Búsquedas ultrarrápidas de DNI en tiempo constante $O(1)$ sin exponer información sensible.
* **Refresh Token Rotation (RTR):** Sesiones seguras de 14 días con detección y revocación automática ante ataques de reúso.

---

## 🚀 Puesta en Marcha Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/nic0420/gymAI.git
cd gymAI

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local

# 4. Ejecutar suite de pruebas (122 tests)
npm test

# 5. Iniciar en modo desarrollo
npm run dev
```
Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

