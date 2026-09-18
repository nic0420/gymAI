"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Zap,
  Lock,
  WifiOff,
  Clock,
  ArrowRight,
  CheckCircle2,
  Tv,
  ChevronRight,
  TrendingUp,
  CreditCard,
  QrCode,
  Activity,
  Layers,
  Flame,
  HelpCircle,
  Calculator,
  Sparkles,
  Database,
} from "lucide-react";
import { SaaSSubscriptionModal } from "@/components/billing/SaaSSubscriptionModal";

interface PublicLandingProps {
  onEnterApp: (tab?: string) => void;
  onLaunchKiosk: () => void;
  onLaunchTour: (tourId: string) => void;
  onOpenLogin?: () => void;
}

export function PublicLandingPage({
  onEnterApp,
  onLaunchKiosk,
  onLaunchTour,
  onOpenLogin,
}: PublicLandingProps) {
  const [activeTabDemo, setActiveTabDemo] = useState<"pass" | "warn" | "deny">("pass");
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [roiMembers, setRoiMembers] = useState(200);
  const [roiFee, setRoiFee] = useState(25000);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  const handleSeedDemo = async () => {
    setSeedingDemo(true);
    setSeedSuccess(null);
    try {
      const res = await fetch("/api/v1/admin/seed-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: "gimnasio-libertad" }),
      });
      const data = await res.json();
      if (data.success) {
        setSeedSuccess("¡Datos demo cargados con éxito! Entrando al sistema...");
        setTimeout(() => {
          onEnterApp("checkin");
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSeedingDemo(false);
    }
  };


  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Banner / Announcement */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/40 px-4 py-2 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 max-w-7xl mx-auto w-full gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-blue-400">GymAI v1.0 Enterprise</span> — Infraestructura distribuida con soporte Offline-First.
          {seedSuccess && (
            <span className="text-emerald-400 font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {seedSuccess}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSeedDemo}
            disabled={seedingDemo}
            className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-xs transition-all flex items-center gap-1.5"
            title="Cargar socios, asistencias y facturación de prueba para presentación"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{seedingDemo ? "Cargando..." : "⚡ Cargar Gimnasio Demo"}</span>
          </button>

          <button
            onClick={onOpenLogin}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-sm text-xs"
          >
            Iniciar Sesión / Acceso
          </button>
        </div>
      </div>


      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 border-b border-zinc-900">
        {/* Background Radial Glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[450px] bg-gradient-to-b from-blue-600/20 via-blue-900/10 to-transparent blur-[140px] rounded-full" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-zinc-300 mb-8 shadow-inner backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-400">SLA 99.99%</span>
            <span className="text-zinc-600">•</span>
            <span className="text-blue-400 font-semibold">AES-256-GCM + Blind Indexing</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6 max-w-5xl mx-auto">
            La infraestructura operativa para{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              gimnasios de alto rendimiento.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-3xl mx-auto text-lg sm:text-xl text-zinc-400 mb-10 leading-relaxed font-normal">
            Gestión multi-tenant, control de acceso en &lt;2ms y seguridad de nivel bancario. Diseñado para cadenas que no pueden permitirse estar offline.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => onEnterApp("checkin")}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              <span>Entrar al Sistema</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={handleSeedDemo}
              disabled={seedingDemo}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-500/30 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{seedingDemo ? "Generando datos..." : "Probar con Datos Demo (1-Click)"}</span>
            </button>
            <button
              onClick={() => onLaunchTour("receptionist")}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-semibold text-sm transition-all hover:text-white flex items-center justify-center gap-2"
            >
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span>Agendar Demo Interactiva</span>
            </button>
            <button
              onClick={onLaunchKiosk}
              className="w-full sm:w-auto px-5 py-4 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 hover:bg-emerald-950/20 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Tv className="w-4 h-4" />
              <span>Modo Kiosco Táctil</span>
            </button>
          </div>

          {/* Floating Isometric Interactive Mockup Preview */}
          <div className="relative mx-auto max-w-5xl rounded-3xl p-1 bg-gradient-to-b from-zinc-700/40 via-zinc-800/20 to-zinc-900/40 shadow-2xl shadow-blue-500/10">
            <div className="rounded-[22px] bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-xl p-6 sm:p-8 text-left">
              {/* Header Bar of Mockup */}
              <div className="flex items-center justify-between pb-6 border-b border-zinc-800/80 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-xs font-mono text-zinc-400 ml-2">
                    gym-ai.production.tenant-belgrano // Live Dashboard
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Motor &lt;2ms Online
                  </span>
                </div>
              </div>

              {/* Grid Inside Mockup: Semáforo + Heatmap */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Semáforo Demo */}
                <div className="lg:col-span-5 bg-zinc-900/70 rounded-2xl p-5 border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs uppercase font-mono font-bold text-zinc-400">
                        Validación de Acceso
                      </span>
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        1.84ms latencia
                      </span>
                    </div>

                    {/* State Selector Buttons */}
                    <div className="flex gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800/80 mb-4">
                      <button
                        onClick={() => setActiveTabDemo("pass")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          activeTabDemo === "pass"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Aprobado
                      </button>
                      <button
                        onClick={() => setActiveTabDemo("warn")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          activeTabDemo === "warn"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Gracia
                      </button>
                      <button
                        onClick={() => setActiveTabDemo("deny")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          activeTabDemo === "deny"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Bloqueado
                      </button>
                    </div>

                    {/* Result Card */}
                    {activeTabDemo === "pass" && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>ACCESO PERMITIDO 🟢</span>
                        </div>
                        <p className="text-xs text-zinc-300 font-medium">Lucía Fernández (DNI 38.492.102)</p>
                        <div className="flex justify-between text-[11px] text-zinc-400 pt-1 border-t border-emerald-500/10">
                          <span>Plan: Black VIP Anual</span>
                          <span className="text-emerald-400 font-medium">Apto Vigente</span>
                        </div>
                      </div>
                    )}

                    {activeTabDemo === "warn" && (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                          <Clock className="w-5 h-5 text-amber-400" />
                          <span>AVISO: VENCE EN 2 DÍAS 🟡</span>
                        </div>
                        <p className="text-xs text-zinc-300 font-medium">Martín Rodríguez (DNI 34.120.901)</p>
                        <div className="flex justify-between text-[11px] text-zinc-400 pt-1 border-t border-amber-500/10">
                          <span>Plan: Musculación Mensual</span>
                          <span className="text-amber-400 font-medium">Período de Gracia</span>
                        </div>
                      </div>
                    )}

                    {activeTabDemo === "deny" && (
                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                          <Lock className="w-5 h-5 text-rose-400" />
                          <span>ACCESO DENEGADO 🔴</span>
                        </div>
                        <p className="text-xs text-zinc-300 font-medium">Ignacio Paz (DNI 40.891.233)</p>
                        <div className="flex justify-between text-[11px] text-zinc-400 pt-1 border-t border-rose-500/10">
                          <span>Motivo: Cuota Vencida</span>
                          <span className="text-rose-400 font-medium">Sin Apto Médico</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-zinc-800 text-[11px] text-zinc-500 flex justify-between items-center">
                    <span>Sincronización: 0 pendientes</span>
                    <span className="text-emerald-400">IndexedDB Ready</span>
                  </div>
                </div>

                {/* Right: 7x24 Heatmap Preview */}
                <div className="lg:col-span-7 bg-zinc-900/70 rounded-2xl p-5 border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-xs uppercase font-mono font-bold text-zinc-300">
                          Matriz de Afluencia 7x24 (Sede Central)
                        </h4>
                        <p className="text-[11px] text-zinc-500">Distribución de accesos para balance de staff</p>
                      </div>
                      <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                        Pico: 18:00 - 20:00
                      </span>
                    </div>

                    {/* Mini visual matrix preview */}
                    <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-mono text-zinc-400 mb-2">
                      <span>L</span>
                      <span>M</span>
                      <span>X</span>
                      <span>J</span>
                      <span>V</span>
                      <span>S</span>
                      <span>D</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {/* Row 1 (08:00) */}
                      <div className="h-6 rounded bg-blue-950/60 border border-blue-900/30 flex items-center justify-center text-[10px] text-blue-300">22</div>
                      <div className="h-6 rounded bg-blue-900/60 border border-blue-800/40 flex items-center justify-center text-[10px] text-blue-300">35</div>
                      <div className="h-6 rounded bg-blue-900/60 border border-blue-800/40 flex items-center justify-center text-[10px] text-blue-300">31</div>
                      <div className="h-6 rounded bg-blue-900/60 border border-blue-800/40 flex items-center justify-center text-[10px] text-blue-300">38</div>
                      <div className="h-6 rounded bg-blue-950/60 border border-blue-900/30 flex items-center justify-center text-[10px] text-blue-300">24</div>
                      <div className="h-6 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-600">8</div>
                      <div className="h-6 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-600">4</div>

                      {/* Row 2 (18:00 Pico) */}
                      <div className="h-6 rounded bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center text-[10px]">98</div>
                      <div className="h-6 rounded bg-emerald-500/40 border border-emerald-500/60 text-emerald-200 font-black flex items-center justify-center text-[10px] shadow-sm shadow-emerald-500/20">112</div>
                      <div className="h-6 rounded bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center text-[10px]">94</div>
                      <div className="h-6 rounded bg-emerald-500/40 border border-emerald-500/60 text-emerald-200 font-black flex items-center justify-center text-[10px] shadow-sm shadow-emerald-500/20">108</div>
                      <div className="h-6 rounded bg-blue-800/60 border border-blue-700/50 text-blue-200 font-bold flex items-center justify-center text-[10px]">72</div>
                      <div className="h-6 rounded bg-blue-950/40 border border-blue-900/30 text-blue-400 flex items-center justify-center text-[10px]">19</div>
                      <div className="h-6 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-600">6</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      Retención promedio: <strong className="text-zinc-200">92.4%</strong>
                    </span>
                    <button
                      onClick={() => onEnterApp("analytics")}
                      className="text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-1 text-xs"
                    >
                      Explorar BI Dashboard <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Box Grid: Features Section */}
      <section className="py-24 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs uppercase font-mono tracking-wider text-blue-500 font-bold mb-3">
            ARQUITECTURA & SEGURIDAD DE NIVEL BANCARIO
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Tecnología construida para no detenerse jamás.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Seguridad */}
          <div className="glass-panel p-8 rounded-3xl border border-zinc-800 hover:border-zinc-700 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Seguridad & Blind Indexing
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Encriptación Envelope <strong className="text-zinc-200">AES-256-GCM</strong> y Blind Indexing con <strong className="text-zinc-200">HMAC-SHA256</strong>. Los datos médicos y personales de tus socios son matemáticamente impenetrables.
              </p>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl font-mono text-[11px] text-zinc-400 border border-zinc-800/80">
              <span className="text-blue-400 font-semibold">AES_GCM_256</span> + UUIDv7 Keys
            </div>
          </div>

          {/* Card 2: Velocidad */}
          <div className="glass-panel p-8 rounded-3xl border border-zinc-800 hover:border-zinc-700 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Control de Acceso en &lt;2ms
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Semáforo inteligente en tiempo constante $O(1)$. Elimina cuellos de botella en el molinete de recepción con validación instantánea de cuota y apto médico.
              </p>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl font-mono text-[11px] text-zinc-400 border border-zinc-800/80 flex justify-between items-center">
              <span>Turnstile Engine:</span>
              <span className="text-emerald-400 font-bold">&lt; 2.06 ms avg</span>
            </div>
          </div>

          {/* Card 3: Resiliencia */}
          <div className="glass-panel p-8 rounded-3xl border border-zinc-800 hover:border-zinc-700 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                <WifiOff className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Offline-First Engine
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Sigue marcando asistencia y recibiendo socios aunque se caiga el internet. Motor integrado con <strong className="text-zinc-200">IndexedDB</strong> y sincronización idempotente en batch sin duplicados.
              </p>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl font-mono text-[11px] text-zinc-400 border border-zinc-800/80 flex justify-between items-center">
              <span>Sync Protocol:</span>
              <span className="text-amber-400 font-semibold">Batch Idempotent</span>
            </div>
          </div>
        </div>
      </section>

      {/* POS Terminal & Blind Closing Showcase */}
      <section className="py-20 border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Description */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-400 mb-4">
                FINANZAS & ARQUEO SEGURO
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-6">
                Split Payments y Arqueo Ciego contra desvíos de caja.
              </h2>
              <p className="text-zinc-400 text-base leading-relaxed mb-6">
                Permite a tus socios abonar facturas combinando <strong className="text-zinc-200">Efectivo + QR de Mercado Pago</strong> en una única transacción atómica.
              </p>
              <p className="text-zinc-400 text-base leading-relaxed mb-8">
                Al finalizar el turno, el cajero realiza un <strong className="text-zinc-200">Arqueo Ciego</strong>: declara los billetes y vouchers que tiene en mano sin que el software le revele el total esperado, auditando faltantes o sobrantes de forma matemática e inmutable.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onEnterApp("finance")}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20"
                >
                  Probar Módulo de Finanzas
                </button>
              </div>
            </div>

            {/* Right UI Visual Mockup */}
            <div className="space-y-4">
              {/* POS Split Mockup */}
              <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-bold text-white">Punto de Venta POS • Split Payment</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Factura #INV-2026-089
                  </span>
                </div>

                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Total Plan Trimestral:</span>
                  <span className="font-mono font-bold text-white text-sm">$45.000 ARS</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-500 block mb-1">Método 1 (Efectivo)</span>
                    <strong className="text-emerald-400 font-mono">$20.000 ARS</strong>
                    <span className="block text-[10px] text-zinc-500 mt-1">Recibido en caja</span>
                  </div>
                  <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-500 block mb-1">Método 2 (QR MP)</span>
                    <strong className="text-blue-400 font-mono">$25.000 ARS</strong>
                    <span className="block text-[10px] text-emerald-400 mt-1">Webhook Verificado ✅</span>
                  </div>
                </div>
              </div>

              {/* Blind Closing Modal Preview */}
              <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-3 bg-zinc-900/90">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Arqueo Ciego de Cierre de Turno</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">Total Teórico Oculto 🔒</span>
                </div>

                <p className="text-xs text-zinc-400">
                  El cajero declara denominaciones físicas:
                </p>

                <div className="flex items-center justify-between text-xs font-mono p-2 bg-zinc-950 rounded-lg border border-zinc-800 text-zinc-300">
                  <span>Declarado Efectivo:</span>
                  <span className="text-white font-bold">$39.500 ARS</span>
                </div>

                <button
                  disabled
                  className="w-full py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-semibold cursor-not-allowed"
                >
                  🔒 Sellar Turno de Caja (Auditoría Ciega)
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calculadora Interactiva de ROI para Dueños de Gimnasio */}
      <section className="py-20 max-w-7xl mx-auto px-6 w-full border-t border-zinc-900">
        <div className="glass-panel p-8 md:p-12 rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-950 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            {/* Columna Izquierda: Sliders */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
                <Calculator className="w-3.5 h-3.5" />
                CALCULADORA DE RETORNO DE INVERSIÓN (ROI)
              </div>

              <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                ¿Cuánto dinero estás perdiendo hoy sin control automático?
              </h3>
              <p className="text-sm text-zinc-400">
                Ajusta los valores de tu gimnasio para calcular la recuperación mensual estimada de cuotas impagas y fugas en recepción.
              </p>

              {/* Slider 1: Cantidad de Socios */}
              <div className="space-y-2 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-medium">Cantidad de Socios Activos:</span>
                  <span className="text-white font-mono font-bold text-sm bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800">
                    {roiMembers} socios
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={25}
                  value={roiMembers}
                  onChange={(e) => setRoiMembers(Number(e.target.value))}
                  className="w-full accent-blue-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>50 socios</span>
                  <span>500 socios</span>
                  <span>1.000 socios</span>
                </div>
              </div>

              {/* Slider 2: Cuota Promedio */}
              <div className="space-y-2 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-medium">Valor Promedio de la Cuota Mensual:</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800">
                    ${roiFee.toLocaleString()} ARS
                  </span>
                </div>
                <input
                  type="range"
                  min={15000}
                  max={50000}
                  step={1000}
                  value={roiFee}
                  onChange={(e) => setRoiFee(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>$15.000 ARS</span>
                  <span>$30.000 ARS</span>
                  <span>$50.000 ARS</span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Tarjeta de Retorno */}
            <div className="lg:col-span-5">
              <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950/90 border-2 border-emerald-500/30 shadow-2xl shadow-emerald-500/10 space-y-6">
                <div>
                  <span className="text-xs uppercase font-mono text-zinc-400 block mb-1">
                    Fuga mensual evitada (6% morosidad promedio)
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
                    +${Math.round(roiMembers * 0.06 * roiFee).toLocaleString()} ARS
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Dinero que recuperas automáticamente con el semáforo y avisos por WhatsApp.
                  </p>
                </div>

                <div className="border-t border-zinc-800 pt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Inversión Plan Pro GymAI:</span>
                    <span className="font-mono text-white">$34.900 ARS / mes</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Ganancia Neta Extra para vos:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      +${Math.max(0, Math.round(roiMembers * 0.06 * roiFee) - 34900).toLocaleString()} ARS / mes
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Tiempo de Amortización:</span>
                    <span className="font-mono text-blue-400 font-bold">
                      Se paga solo en {Math.max(1, Math.min(10, Math.round(34900 / ((roiMembers * 0.06 * roiFee) / 30))))} días ⚡
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsSubscriptionOpen(true)}
                  className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Empezar a Recuperar Dinero</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Planes y Precios Section (Precios en ARS) */}
      <section className="py-24 max-w-7xl mx-auto px-6 w-full border-t border-zinc-900">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-400 mb-3">
            PLANES & SUSCRIPCIÓN MENSUAL (ARS)
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Precios ultra-competitivos. Menos que 1 socio al mes.
          </h2>
          <p className="text-zinc-400 text-base">
            Sin contratos de permanencia. Activa tu licencia por transferencia bancaria directa o Mercado Pago.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Plan 1: Starter */}
          <div className="glass-panel p-8 rounded-3xl border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-all">
            <div>
              <span className="text-xs uppercase font-mono font-bold text-zinc-400 block mb-1">
                Gimnasios de Barrio
              </span>
              <h3 className="text-2xl font-bold text-white mb-2">Starter Barrial</h3>
              <div className="my-4">
                <span className="text-4xl font-black text-white font-mono">$19.900</span>
                <span className="text-xs text-zinc-400 ml-1">ARS / mes</span>
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                Ideal para boxes y gimnasios que inician su digitalización.
              </p>
              <ul className="space-y-3 text-xs text-zinc-300 border-t border-zinc-800/80 pt-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Hasta 150 socios activos</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Semáforo de acceso &lt;2ms (DNI Numpad)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Control de cobranzas en mostrador</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>1 Sucursal / Sede</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setIsSubscriptionOpen(true)}
              className="w-full mt-8 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-bold text-xs transition-all hover:text-white"
            >
              Contratar Plan Starter
            </button>
          </div>

          {/* Plan 2: Pro (Recomendado) */}
          <div className="glass-panel p-8 rounded-3xl border-2 border-blue-500 flex flex-col justify-between relative shadow-2xl shadow-blue-500/10 bg-zinc-900/90">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
              🔥 Más Popular & Recomendado
            </div>
            <div>
              <span className="text-xs uppercase font-mono font-bold text-blue-400 block mb-1">
                Boxes & Gyms Medianos
              </span>
              <h3 className="text-2xl font-bold text-white mb-2">Pro Performance</h3>
              <div className="my-4">
                <span className="text-4xl font-black text-white font-mono">$34.900</span>
                <span className="text-xs text-zinc-400 ml-1">ARS / mes</span>
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                Para centros deportivos que buscan seguridad y control total de caja.
              </p>
              <ul className="space-y-3 text-xs text-zinc-300 border-t border-zinc-800/80 pt-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>Hasta 500 socios activos</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Fichas Médicas Cifradas (AES-256-GCM)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Split Payments (Efectivo + QR MP)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Arqueo Ciego de Caja diaria</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Workout Builder + 1RM Epley con PRs 🏆</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Motor Offline-First (IndexedDB Sync)</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setIsSubscriptionOpen(true)}
              className="w-full mt-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Contratar Plan Pro
            </button>
          </div>

          {/* Plan 3: Enterprise */}
          <div className="glass-panel p-8 rounded-3xl border border-zinc-800 flex flex-col justify-between hover:border-zinc-700 transition-all">
            <div>
              <span className="text-xs uppercase font-mono font-bold text-emerald-400 block mb-1">
                Cadenas & Franquicias
              </span>
              <h3 className="text-2xl font-bold text-white mb-2">Enterprise Cadenas VIP</h3>
              <div className="my-4">
                <span className="text-4xl font-black text-white font-mono">$59.900</span>
                <span className="text-xs text-zinc-400 ml-1">ARS / mes</span>
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                Infraestructura enterprise ilimitada con inteligencia de negocio.
              </p>
              <ul className="space-y-3 text-xs text-zinc-300 border-t border-zinc-800/80 pt-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>Socios Ilimitados · Multi-Sucursal</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Modo Kiosco Táctil con Audio API</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Executive BI con Matriz de Calor 7x24</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Tours Guiados de Onboarding para Staff</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Soporte Prioritario WhatsApp 24/7</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setIsSubscriptionOpen(true)}
              className="w-full mt-8 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-emerald-400 hover:text-white border border-zinc-800 font-bold text-xs transition-all"
            >
              Contratar Plan Enterprise
            </button>
          </div>
        </div>
      </section>

      {/* Subscription Bank Transfer Modal */}
      <SaaSSubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-10 px-6 bg-zinc-950 text-center text-xs text-zinc-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              G
            </div>
            <span className="font-semibold text-zinc-300">GymAI Enterprise SaaS</span>
          </div>
          <p>© 2026 GymAI Platform. Desarrollado por Litoral.dev (Ojeda Nicolas).</p>
          <div className="flex items-center gap-4 text-zinc-400">
            <button onClick={() => setIsSubscriptionOpen(true)} className="hover:text-blue-400">
              Datos de Pago (Alias/CVU)
            </button>
            <span>•</span>
            <button onClick={() => onEnterApp("checkin")} className="hover:text-white">
              Entrar al Dashboard
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

