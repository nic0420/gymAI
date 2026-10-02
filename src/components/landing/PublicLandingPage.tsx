"use client";

import { apiFetch } from "@/lib/api-client";
import React, { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleCheck,
  CircleX,
  Dumbbell,
  Fingerprint,
  HeartPulse,
  Lock,
  LogIn,
  Menu,
  MessageCircle,
  Receipt,
  ScanLine,
  Tablet,
  TriangleAlert,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { SaaSSubscriptionModal } from "@/components/billing/SaaSSubscriptionModal";
import { SpotterLogo, SpotterMark } from "@/components/brand/SpotterLogo";
import { BRAND, salesWhatsappLink } from "@/lib/brand";

interface PublicLandingProps {
  onEnterApp: (tab?: string) => void;
  onLaunchKiosk: () => void;
  onLaunchTour: (tourId: string) => void;
  onOpenLogin?: () => void;
  isAuthenticated?: boolean;
}

type DemoState = "pass" | "warn" | "deny";

const DEMO_STATES: Record<
  DemoState,
  { label: string; tone: string; ring: string; icon: React.ReactNode; name: string; detail: string; dni: string }
> = {
  pass: {
    label: "Adelante",
    tone: "text-emerald-400",
    ring: "border-emerald-400/60 bg-emerald-400/[0.06]",
    icon: <CircleCheck className="w-7 h-7" aria-hidden />,
    name: "Julián Álvarez",
    detail: "Pase libre · vence 24/10 · apto al día",
    dni: "42.333.444",
  },
  warn: {
    label: "Pasa con aviso",
    tone: "text-amber-400",
    ring: "border-amber-400/60 bg-amber-400/[0.06]",
    icon: <TriangleAlert className="w-7 h-7" aria-hidden />,
    name: "Enzo Pérez",
    detail: "La cuota vence en 2 días",
    dni: "36.222.333",
  },
  deny: {
    label: "No pasa",
    tone: "text-rose-400",
    ring: "border-rose-400/60 bg-rose-400/[0.06]",
    icon: <CircleX className="w-7 h-7" aria-hidden />,
    name: "Lautaro Martínez",
    detail: "Cuota vencida hace 5 días",
    dni: "41.666.777",
  },
};

const PLANS = [
  {
    key: "starter",
    name: "Starter Barrial",
    price: "19.900",
    pitch: "Para el gimnasio de barrio que quiere dejar la planilla.",
    features: [
      "Hasta 150 socios activos",
      "Control de acceso por DNI",
      "Cobros en mostrador",
      "1 sede",
    ],
  },
  {
    key: "pro",
    name: "Pro Performance",
    price: "34.900",
    pitch: "El que elige la mayoría: caja, salud y rutinas bajo control.",
    featured: true,
    features: [
      "Hasta 500 socios activos",
      "Fichas médicas cifradas",
      "Cobros mixtos: efectivo + Mercado Pago",
      "Arqueo de caja ciego",
      "Rutinas y seguimiento de 1RM",
    ],
  },
  {
    key: "enterprise",
    name: "Cadenas",
    price: "59.900",
    pitch: "Varias sedes, un solo tablero.",
    features: [
      "Socios ilimitados · multisede",
      "Kiosco de autoservicio en tablet",
      "Mapa de calor de horarios 7×24",
      "Tours de capacitación para el staff",
      "Soporte prioritario por WhatsApp",
    ],
  },
];

const FAQS = [
  {
    q: "¿Tengo que instalar algo?",
    a: "No. SpotterApp funciona en el navegador de la compu de recepción, en una tablet o en el celular. Para el kiosco de autoservicio alcanza con una tablet en modo pantalla completa.",
  },
  {
    q: "Tengo todo en Excel, ¿lo puedo pasar?",
    a: "Sí. Pegás o subís tu planilla (DNI, nombre, apellido, teléfono, plan) y el sistema la importa, valida los datos y te avisa qué filas tienen problemas.",
  },
  {
    q: "¿Qué pasa con los datos médicos de mis socios?",
    a: "Las condiciones, medicación y alergias se guardan cifradas con AES-256. Sólo las ve el personal con permiso, y cada gimnasio tiene sus datos aislados del resto.",
  },
  {
    q: "¿Qué es el arqueo ciego?",
    a: "Al cerrar el turno, el recepcionista cuenta la plata y declara el monto sin ver cuánto debería haber. Recién ahí el sistema muestra el faltante o sobrante. Es el control que usan los comercios grandes.",
  },
  {
    q: "¿Y si se corta internet?",
    a: "Hoy la recepción puede validar a mano y seguir atendiendo. Estamos terminando el modo sin conexión para que el check-in funcione solo y sincronice cuando vuelve la red.",
  },
  {
    q: "¿Cómo se paga?",
    a: "Abono mensual en pesos por transferencia. Nos mandás el comprobante por WhatsApp y activamos o renovamos tu licencia.",
  },
];

export function PublicLandingPage({
  onEnterApp,
  onLaunchKiosk,
  onLaunchTour,
  onOpenLogin,
  isAuthenticated = false,
}: PublicLandingProps) {
  const [demoState, setDemoState] = useState<DemoState>("pass");
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [planPick, setPlanPick] = useState<"starter" | "pro" | "enterprise">("pro");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [roiMembers, setRoiMembers] = useState(200);
  const [roiFee, setRoiFee] = useState(25000);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  const demoLink = salesWhatsappLink(`Hola! Quiero ver una demo de ${BRAND.name} para mi gimnasio.`);

  // Supuesto de la calculadora: se recupera ~6% de cuotas que hoy se escapan
  const recovered = Math.round(roiMembers * 0.06 * roiFee);
  const planCost = 34900;
  const net = Math.max(0, recovered - planCost);
  const paybackDays = recovered > 0 ? Math.max(1, Math.min(30, Math.round(planCost / (recovered / 30)))) : 30;

  // Carga de datos demo: sólo para un administrador logueado (ver auditoría QA)
  const handleSeedDemo = async () => {
    if (!isAuthenticated) {
      onOpenLogin?.();
      return;
    }
    setSeedingDemo(true);
    setSeedMsg(null);
    try {
      const res = await apiFetch("/api/v1/admin/seed-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) {
        setSeedMsg(data.error || data.message || "No se pudieron cargar los datos demo");
      } else {
        setSeedMsg("Datos demo cargados. Entrando al sistema…");
        setTimeout(() => onEnterApp("checkin"), 900);
      }
    } catch {
      setSeedMsg("No se pudo conectar con el servidor");
    } finally {
      setSeedingDemo(false);
    }
  };

  const current = DEMO_STATES[demoState];

  return (
    <div className="min-h-screen bg-ink text-graphite-100 flex flex-col">
      {/* ================================================================ NAV */}
      <header className="sticky top-0 z-40 border-b border-graphite-800 bg-ink/90 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5" aria-label="Principal">
          <a href="#inicio" aria-label={`${BRAND.name} — inicio`}>
            <SpotterLogo size="sm" />
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {[
              ["Funciones", "#funciones"],
              ["Cómo funciona", "#como-funciona"],
              ["Precios", "#precios"],
              ["Preguntas", "#faq"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="text-sm font-medium text-graphite-300 transition-colors hover:text-graphite-50">
                {label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => (isAuthenticated ? onEnterApp() : onOpenLogin?.())}
              className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-graphite-200 hover:text-graphite-50"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              {isAuthenticated ? "Ir al sistema" : "Ingresar"}
            </button>
            <a
              href={demoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-volt-400 px-4 text-sm font-bold text-ink transition-colors hover:bg-volt-300"
            >
              Pedí tu demo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>

          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-graphite-700 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {menuOpen && (
          <div className="border-t border-graphite-800 bg-ink px-5 py-4 md:hidden">
            <div className="flex flex-col gap-1">
              {[
                ["Funciones", "#funciones"],
                ["Cómo funciona", "#como-funciona"],
                ["Precios", "#precios"],
                ["Preguntas", "#faq"],
              ].map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)} className="py-3 text-base font-medium text-graphite-200">
                  {label}
                </a>
              ))}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  isAuthenticated ? onEnterApp() : onOpenLogin?.();
                }}
                className="mt-2 h-12 rounded-lg border border-graphite-700 text-sm font-semibold"
              >
                {isAuthenticated ? "Ir al sistema" : "Ingresar"}
              </button>
              <a
                href={demoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex h-12 items-center justify-center rounded-lg bg-volt-400 text-sm font-bold text-ink"
              >
                Pedí tu demo
              </a>
            </div>
          </div>
        )}
      </header>

      <main id="inicio">
        {/* ================================================================ HERO */}
        <section className="bg-plate relative overflow-hidden border-b border-graphite-800">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 md:pb-28 md:pt-24 lg:grid-cols-[1.15fr_1fr]">
            <div className="animate-rise-in">
              <p className="label-industrial mb-6 inline-flex items-center gap-2 text-volt-400">
                <span className="h-px w-8 bg-volt-400" aria-hidden />
                Software de gestión para gimnasios
              </p>
              <h1 className="font-display text-[3.25rem] font-extrabold leading-[0.9] tracking-tight text-graphite-50 sm:text-7xl lg:text-[5.5rem]">
                Alguien te tiene que <span className="text-volt-400">cuidar la barra.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-graphite-300">
                {BRAND.name} controla quién entra, quién debe y cuánta plata hay en la caja. Vos ocupate de entrenar a tu gente;
                del resto nos encargamos nosotros.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href={demoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-volt-400 px-7 text-base font-bold text-ink transition-colors hover:bg-volt-300"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden />
                  Pedí tu demo por WhatsApp
                </a>
                <a
                  href="#precios"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-lg border border-graphite-600 px-7 text-base font-semibold text-graphite-100 transition-colors hover:border-graphite-400"
                >
                  Ver precios
                </a>
              </div>
              <p className="mt-5 text-sm text-graphite-400">Desde $19.900 por mes · sin instalar nada · hecho en el Litoral</p>
            </div>

            {/* Terminal de molinete interactiva */}
            <div className="relative animate-rise-in [animation-delay:80ms]">
              <div className="absolute inset-x-0 -top-3 h-2 hazard-stripe rounded-sm" aria-hidden />
              <div className="rounded-xl border border-graphite-700 bg-graphite-900 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
                <div className="mb-4 flex items-center justify-between">
                  <span className="label-industrial text-graphite-400">Recepción · Molinete 01</span>
                  <span className="label-industrial inline-flex items-center gap-1.5 text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                    En línea
                  </span>
                </div>

                <div className="rounded-lg border border-graphite-700 bg-ink px-4 py-3">
                  <span className="label-industrial text-graphite-500">DNI</span>
                  <p className="font-mono text-3xl font-bold tracking-[0.12em] text-graphite-50">{current.dni}</p>
                </div>

                <div
                  key={demoState}
                  className={`mt-4 rounded-lg border-2 p-5 transition-colors animate-rise-in ${current.ring}`}
                  aria-live="polite"
                >
                  <div className={`flex items-center gap-3 ${current.tone}`}>
                    {current.icon}
                    <span className="font-display text-3xl font-extrabold uppercase">{current.label}</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-graphite-50">{current.name}</p>
                  <p className="text-sm text-graphite-300">{current.detail}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-graphite-700/70 pt-3">
                    <span className="label-industrial text-graphite-500">Validado en</span>
                    <span className="font-mono text-sm text-graphite-200">1,8 ms</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Probar estados del semáforo">
                  {(Object.keys(DEMO_STATES) as DemoState[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setDemoState(s)}
                      aria-pressed={demoState === s}
                      className={`h-11 rounded-md border text-xs font-bold uppercase tracking-wide transition-colors ${
                        demoState === s
                          ? "border-graphite-300 bg-graphite-100 text-ink"
                          : "border-graphite-700 text-graphite-300 hover:border-graphite-500"
                      }`}
                    >
                      {s === "pass" ? "Al día" : s === "warn" ? "Por vencer" : "Deudor"}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-graphite-500">Tocá los estados: así lo ve tu recepción.</p>
            </div>
          </div>
        </section>

        {/* ================================================================ TIRA TÉCNICA */}
        <section aria-label="Especificaciones" className="border-b border-graphite-800 bg-graphite-900">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 divide-graphite-800 px-5 md:grid-cols-4 md:divide-x">
            {[
              ["< 2 ms", "por check-in"],
              ["AES-256", "en fichas médicas"],
              ["Ciego", "arqueo de caja"],
              ["Efectivo + MP", "en un mismo cobro"],
            ].map(([k, v]) => (
              <div key={k} className="py-7 md:px-6">
                <dt className="font-display text-3xl font-extrabold uppercase text-graphite-50">{k}</dt>
                <dd className="label-industrial mt-1 text-graphite-400">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ================================================================ PROBLEMA */}
        <section className="mx-auto max-w-6xl px-5 py-24 md:py-32">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="label-industrial text-volt-400">El problema</p>
              <h2 className="mt-4 font-display text-5xl font-extrabold text-graphite-50 md:text-6xl">
                Tu gimnasio pierde plata por tres lados.
              </h2>
              <p className="mt-6 max-w-md text-lg text-graphite-300">
                No es falta de socios. Es lo que se escapa entre la puerta, la caja y la planilla.
              </p>
            </div>
            <ol className="divide-y divide-graphite-800 border-y border-graphite-800">
              {[
                {
                  n: "01",
                  t: "Gente que entra debiendo",
                  d: "Sin control en la puerta, la cuota vencida se transforma en pase libre. El semáforo por DNI lo corta en el momento, sin discusiones en el mostrador.",
                },
                {
                  n: "02",
                  t: "Una caja que nunca cierra",
                  d: "Efectivo, transferencias y QR mezclados en un cuaderno. Con el arqueo ciego cada turno cierra con faltante o sobrante a la vista.",
                },
                {
                  n: "03",
                  t: "Aptos médicos vencidos",
                  d: "El riesgo legal más ignorado del rubro. El sistema avisa antes de que venzan y no deja pasar a quien no lo tiene al día.",
                },
              ].map((item) => (
                <li key={item.n} className="grid grid-cols-[auto_1fr] gap-6 py-8">
                  <span className="font-mono text-sm text-volt-400">{item.n}</span>
                  <div>
                    <h3 className="text-2xl font-bold text-graphite-50">{item.t}</h3>
                    <p className="mt-2 text-base leading-relaxed text-graphite-300">{item.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ================================================================ FUNCIONES (bento) */}
        <section id="funciones" className="border-t border-graphite-800 bg-graphite-900/50 py-24 md:py-32">
          <div className="mx-auto max-w-6xl px-5">
            <p className="label-industrial text-volt-400">Funciones</p>
            <h2 className="mt-4 max-w-3xl font-display text-5xl font-extrabold text-graphite-50 md:text-6xl">
              Todo lo que pasa en tu gimnasio, en un solo lugar.
            </h2>

            <div className="mt-14 grid gap-4 md:grid-cols-6">
              {/* Protagonista: recepción */}
              <article className="rounded-xl border border-graphite-700 bg-ink p-7 md:col-span-4 md:row-span-2 flex flex-col">
                <ScanLine className="h-7 w-7 text-volt-400" aria-hidden />
                <h3 className="mt-5 text-3xl font-bold text-graphite-50">Recepción con semáforo</h3>
                <p className="mt-3 max-w-lg text-base leading-relaxed text-graphite-300">
                  El socio pone su DNI y en milisegundos sabés si pasa, pasa con aviso o no pasa: cuota, vencimiento y apto médico
                  evaluados de una. Desde la recepción, mandás el recordatorio por WhatsApp con un toque.
                </p>
                <div className="mt-auto grid grid-cols-3 gap-2 pt-8">
                  {[
                    ["Verde", "bg-emerald-400", "Al día"],
                    ["Amarillo", "bg-amber-400", "Por vencer"],
                    ["Rojo", "bg-rose-400", "Deudor o sin apto"],
                  ].map(([c, bg, t]) => (
                    <div key={c} className="rounded-md border border-graphite-800 p-3">
                      <span className={`block h-1.5 w-8 rounded-full ${bg}`} aria-hidden />
                      <p className="mt-3 text-sm font-semibold text-graphite-100">{c}</p>
                      <p className="text-xs text-graphite-400">{t}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-graphite-700 bg-ink p-6 md:col-span-2">
                <Wallet className="h-6 w-6 text-volt-400" aria-hidden />
                <h3 className="mt-4 text-xl font-bold text-graphite-50">Caja con arqueo ciego</h3>
                <p className="mt-2 text-sm leading-relaxed text-graphite-300">
                  Cobros mixtos, gastos del turno y cierre sin ver el saldo teórico. Se acabaron los “faltaron dos lucas”.
                </p>
              </article>

              <article className="rounded-xl border border-graphite-700 bg-ink p-6 md:col-span-2">
                <HeartPulse className="h-6 w-6 text-volt-400" aria-hidden />
                <h3 className="mt-4 text-xl font-bold text-graphite-50">Fichas médicas cifradas</h3>
                <p className="mt-2 text-sm leading-relaxed text-graphite-300">
                  Apto físico, alergias y contacto de emergencia, protegidos y a mano cuando hacen falta.
                </p>
              </article>

              <article className="rounded-xl border border-graphite-700 bg-ink p-6 md:col-span-2">
                <Dumbbell className="h-6 w-6 text-volt-400" aria-hidden />
                <h3 className="mt-4 text-xl font-bold text-graphite-50">Rutinas y récords</h3>
                <p className="mt-2 text-sm leading-relaxed text-graphite-300">
                  Armá planes por día, asignalos en un clic y seguí el 1RM estimado de cada socio.
                </p>
              </article>

              <article className="rounded-xl border border-graphite-700 bg-ink p-6 md:col-span-2">
                <BarChart3 className="h-6 w-6 text-volt-400" aria-hidden />
                <h3 className="mt-4 text-xl font-bold text-graphite-50">Números del negocio</h3>
                <p className="mt-2 text-sm leading-relaxed text-graphite-300">
                  Cobrado en 30 días, socios activos y deudores, y el mapa de calor de tus horarios pico.
                </p>
              </article>

              <article className="rounded-xl border border-graphite-700 bg-ink p-6 md:col-span-2">
                <Tablet className="h-6 w-6 text-volt-400" aria-hidden />
                <h3 className="mt-4 text-xl font-bold text-graphite-50">Kiosco de autoservicio</h3>
                <p className="mt-2 text-sm leading-relaxed text-graphite-300">
                  Una tablet en la entrada y el socio se anota solo, con sonido de confirmación.
                </p>
                <button
                  onClick={onLaunchKiosk}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-volt-400 hover:text-volt-300"
                >
                  Abrir kiosco <ArrowUpRight className="h-4 w-4" aria-hidden />
                </button>
              </article>
            </div>
          </div>
        </section>

        {/* ================================================================ CÓMO FUNCIONA */}
        <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-24 md:py-32">
          <p className="label-industrial text-volt-400">Cómo funciona</p>
          <h2 className="mt-4 font-display text-5xl font-extrabold text-graphite-50 md:text-6xl">Arrancás en una tarde.</h2>
          <ol className="mt-14 grid gap-10 md:grid-cols-3">
            {[
              {
                icon: <Upload className="h-6 w-6" aria-hidden />,
                t: "Cargás tu padrón",
                d: "Subís tu Excel o CSV de socios. El sistema valida DNI, planes y estados, y te marca lo que hay que corregir.",
              },
              {
                icon: <Fingerprint className="h-6 w-6" aria-hidden />,
                t: "El socio pone su DNI",
                d: "En recepción o en el kiosco. Semáforo al instante y registro de cada ingreso.",
              },
              {
                icon: <Receipt className="h-6 w-6" aria-hidden />,
                t: "Vos mirás los números",
                d: "Cobros, caja del día, deudores y horarios pico. Sin cuadernos ni planillas.",
              },
            ].map((step, i) => (
              <li key={step.t} className="relative">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-volt-400 text-ink">{step.icon}</span>
                  <span className="font-mono text-sm text-graphite-500">Paso {i + 1}</span>
                </div>
                <h3 className="mt-6 text-2xl font-bold text-graphite-50">{step.t}</h3>
                <p className="mt-2 text-base leading-relaxed text-graphite-300">{step.d}</p>
              </li>
            ))}
          </ol>
          <button
            onClick={() => onLaunchTour("receptionist")}
            className="mt-12 inline-flex items-center gap-2 text-sm font-semibold text-graphite-200 underline decoration-graphite-600 underline-offset-4 hover:text-graphite-50"
          >
            Ver el tour guiado de recepción
          </button>
        </section>

        {/* ================================================================ CALCULADORA */}
        <section className="border-y border-graphite-800 bg-graphite-900">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 md:py-28 lg:grid-cols-2">
            <div>
              <p className="label-industrial text-volt-400">Hacé la cuenta</p>
              <h2 className="mt-4 font-display text-5xl font-extrabold text-graphite-50">¿Cuánto se te escapa por mes?</h2>
              <p className="mt-5 max-w-md text-base text-graphite-300">
                Estimación simple: si el control en la puerta y los recordatorios recuperan el 6% de las cuotas que hoy no se cobran.
              </p>

              <div className="mt-10 space-y-8">
                <label className="block">
                  <span className="flex items-baseline justify-between text-sm font-semibold text-graphite-200">
                    Socios activos
                    <span className="font-mono text-xl text-graphite-50">{roiMembers}</span>
                  </span>
                  <input
                    type="range"
                    min={50}
                    max={1000}
                    step={10}
                    value={roiMembers}
                    onChange={(e) => setRoiMembers(Number(e.target.value))}
                    className="mt-3 w-full"
                  />
                </label>
                <label className="block">
                  <span className="flex items-baseline justify-between text-sm font-semibold text-graphite-200">
                    Cuota promedio
                    <span className="font-mono text-xl text-graphite-50">${roiFee.toLocaleString("es-AR")}</span>
                  </span>
                  <input
                    type="range"
                    min={10000}
                    max={60000}
                    step={1000}
                    value={roiFee}
                    onChange={(e) => setRoiFee(Number(e.target.value))}
                    className="mt-3 w-full"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col justify-center rounded-xl border border-graphite-700 bg-ink p-8">
              <span className="label-industrial text-graphite-400">Recuperás aprox. por mes</span>
              <p className="mt-2 font-display text-6xl font-extrabold text-volt-400 md:text-7xl">
                ${recovered.toLocaleString("es-AR")}
              </p>
              <dl className="mt-8 space-y-3 border-t border-graphite-800 pt-6 text-sm">
                <div className="flex justify-between">
                  <dt className="text-graphite-400">Plan Pro</dt>
                  <dd className="font-mono text-graphite-200">−${planCost.toLocaleString("es-AR")}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-graphite-400">Te queda de más</dt>
                  <dd className="font-mono font-bold text-graphite-50">${net.toLocaleString("es-AR")}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-graphite-400">Se paga solo en</dt>
                  <dd className="font-mono text-graphite-200">
                    {paybackDays >= 30 ? "más de un mes" : `${paybackDays} día${paybackDays === 1 ? "" : "s"}`}
                  </dd>
                </div>
              </dl>
              <p className="mt-6 text-xs text-graphite-500">Es una estimación orientativa, no una promesa de resultado.</p>
            </div>
          </div>
        </section>

        {/* ================================================================ PRECIOS */}
        <section id="precios" className="mx-auto max-w-6xl px-5 py-24 md:py-32">
          <div className="max-w-2xl">
            <p className="label-industrial text-volt-400">Precios</p>
            <h2 className="mt-4 font-display text-5xl font-extrabold text-graphite-50 md:text-6xl">
              Cuesta menos que un socio por mes.
            </h2>
            <p className="mt-5 text-lg text-graphite-300">Precios finales en pesos argentinos, abono mensual.</p>
          </div>

          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <article
                key={plan.key}
                className={`relative flex flex-col rounded-xl border p-7 ${
                  plan.featured ? "border-volt-400 bg-graphite-900" : "border-graphite-700 bg-ink"
                }`}
              >
                {plan.featured && (
                  <span className="label-industrial absolute -top-3 left-7 rounded-sm bg-volt-400 px-2 py-1 font-bold text-ink">
                    El más elegido
                  </span>
                )}
                <h3 className="text-2xl font-bold text-graphite-50">{plan.name}</h3>
                <p className="mt-2 min-h-[3rem] text-sm text-graphite-400">{plan.pitch}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="text-lg text-graphite-400">$</span>
                  <span className="font-display text-6xl font-extrabold text-graphite-50">{plan.price}</span>
                  <span className="ml-1 text-sm text-graphite-400">/ mes</span>
                </p>
                <ul className="mb-10 mt-8 space-y-3 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-3 text-graphite-200">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-volt-400" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    setPlanPick(plan.key as "starter" | "pro" | "enterprise");
                    setIsSubscriptionOpen(true);
                  }}
                  className={`mt-auto h-12 rounded-lg text-sm font-bold transition-colors ${
                    plan.featured
                      ? "bg-volt-400 text-ink hover:bg-volt-300"
                      : "border border-graphite-600 text-graphite-100 hover:border-graphite-400"
                  }`}
                >
                  Contratar {plan.name}
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* ================================================================ FAQ */}
        <section id="faq" className="border-t border-graphite-800 bg-graphite-900/50">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 md:py-32 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="label-industrial text-volt-400">Preguntas</p>
              <h2 className="mt-4 font-display text-5xl font-extrabold text-graphite-50">Lo que siempre nos preguntan.</h2>
            </div>
            <div className="divide-y divide-graphite-800 border-y border-graphite-800">
              {FAQS.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div key={item.q}>
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-6 py-6 text-left"
                    >
                      <span className="text-lg font-semibold text-graphite-50">{item.q}</span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-graphite-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </button>
                    {open && <p className="-mt-2 pb-6 pr-10 text-base leading-relaxed text-graphite-300">{item.a}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================================================================ CTA FINAL */}
        <section className="relative overflow-hidden">
          <div className="hazard-stripe h-3" aria-hidden />
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 py-24 md:flex-row md:items-end md:justify-between">
            <div>
              <SpotterMark className="h-14 w-14" />
              <h2 className="mt-6 max-w-2xl font-display text-5xl font-extrabold text-graphite-50 md:text-7xl">
                Dejá de cuidar la caja. Volvé a cuidar a tus socios.
              </h2>
            </div>
            <a
              href={demoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 shrink-0 items-center gap-2 rounded-lg bg-volt-400 px-7 text-base font-bold text-ink hover:bg-volt-300"
            >
              Pedí tu demo
              <ArrowRight className="h-5 w-5" aria-hidden />
            </a>
          </div>
        </section>
      </main>

      {/* ================================================================ FOOTER */}
      <footer className="border-t border-graphite-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm text-graphite-400 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <SpotterLogo size="sm" showTag={false} />
            <span>
              © {new Date().getFullYear()} {BRAND.name}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button onClick={() => setIsSubscriptionOpen(true)} className="hover:text-graphite-100">
              Pagar licencia
            </button>
            <button
              onClick={() => (isAuthenticated ? onEnterApp() : onOpenLogin?.())}
              className="inline-flex items-center gap-1.5 hover:text-graphite-100"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Acceso clientes
            </button>
            {isAuthenticated && (
              <button onClick={handleSeedDemo} disabled={seedingDemo} className="hover:text-graphite-100 disabled:opacity-50">
                {seedingDemo ? "Cargando…" : "Cargar datos demo"}
              </button>
            )}
          </div>
        </div>
        {seedMsg && <p className="pb-6 text-center text-sm text-volt-300">{seedMsg}</p>}
        <p className="pb-5 text-center text-[10px] tracking-wide text-graphite-600">Web hecha por {BRAND.company}</p>
      </footer>

      {isSubscriptionOpen && (
        <SaaSSubscriptionModal
          isOpen
          defaultPlan={planPick}
          onClose={() => setIsSubscriptionOpen(false)}
          gymName="tu gimnasio"
        />
      )}
    </div>
  );
}
