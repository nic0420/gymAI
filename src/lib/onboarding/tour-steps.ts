export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right" | "center";
  icon?: string;
}

export interface TourDefinition {
  id: string;
  role: "ALL" | "RECEPCIONISTA" | "ENTRENADOR" | "SOCIO" | "SUPERADMIN";
  title: string;
  description: string;
  steps: TourStep[];
}

export const TOURS: Record<string, TourDefinition> = {
  receptionist: {
    id: "receptionist",
    role: "RECEPCIONISTA",
    title: "Tour del Personal de Recepción y Caja",
    description: "Aprende el flujo diario de atención, cobros y arqueo de caja en 4 simples pasos.",
    steps: [
      {
        targetId: "nav-tab-checkin",
        title: "1. Control de Asistencia y Semáforo",
        description: "Ingresa el DNI del socio o utiliza el lector de código de barras. El sistema valida su cuota y apto médico en < 2ms mostrando 🟢 Verde, 🟡 Amarillo o 🔴 Rojo.",
        position: "bottom",
        icon: "🚦",
      },
      {
        targetId: "btn-register-member",
        title: "2. Alta Rápida de Socios",
        description: "Registra nuevos clientes ingresando sus datos personales, plan de membresía y ficha médica cifrada (antecedentes de salud con AES-256-GCM).",
        position: "bottom",
        icon: "👤",
      },
      {
        targetId: "nav-tab-caja",
        title: "3. Cobros Divididos (Split Payments)",
        description: "Liquida facturas combinando múltiples medios de pago (ej. Efectivo + QR Mercado Pago) en una sola operación con cálculo automático de vuelto.",
        position: "bottom",
        icon: "💳",
      },
      {
        targetId: "nav-tab-caja",
        title: "4. Arqueo Ciego de Caja (Blind Closing)",
        description: "Al finalizar el turno, declara el efectivo físico en caja a ciegas. El sistema audita la diferencia y sella el turno de forma inmutable.",
        position: "top",
        icon: "🔒",
      },
    ],
  },
  coach: {
    id: "coach",
    role: "ENTRENADOR",
    title: "Tour del Entrenador (Workout Builder & 1RM)",
    description: "Domina el diseño de rutinas personalizadas y el tracking de fuerza de tus atletas.",
    steps: [
      {
        targetId: "nav-tab-rutinas",
        title: "1. Diseñador de Rutinas y Plantillas",
        description: "Crea rutinas maestras por grupos musculares y asígnalas a tus socios con un solo clic personalizando series, repeticiones y RPE.",
        position: "bottom",
        icon: "🏋️",
      },
      {
        targetId: "btn-quick-log-workout",
        title: "2. Registro en Vivo & Fórmula Epley",
        description: "Registra las cargas en tiempo real. El algoritmo calcula automáticamente el 1RM estimado y notifica los Récords Personales (PRs).",
        position: "top",
        icon: "🔥",
      },
    ],
  },
  bi_owner: {
    id: "bi_owner",
    role: "SUPERADMIN",
    title: "Tour Ejecutivo de Business Intelligence",
    description: "Analiza la salud financiera y operativa de tu gimnasio en tiempo real.",
    steps: [
      {
        targetId: "nav-tab-dashboard",
        title: "1. KPIs Financieros y MRR",
        description: "Monitorea los Ingresos Mensuales Recurrentes, la tasa de retención de socios y el volumen de cobros liquidados.",
        position: "bottom",
        icon: "📈",
      },
      {
        targetId: "section-heatmap-card",
        title: "2. Mapa de Calor 7x24 de Afluencia",
        description: "Identifica con precisión matemática las horas pico y valles para optimizar los horarios de staff y equipamiento.",
        position: "top",
        icon: "🔥",
      },
    ],
  },
};
