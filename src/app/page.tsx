"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Database,
  Cpu,
  KeyRound,
  CheckCircle2,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  Server,
  Zap,
  Users,
  QrCode,
  DollarSign,
  Dumbbell,
  Flame,
  BarChart3,
  Tv,
  HelpCircle,
} from "lucide-react";
import { CheckInTerminal } from "@/components/reception/CheckInTerminal";
import { MemberList } from "@/components/users/MemberList";
import { CashRegisterView } from "@/components/finance/CashRegisterView";
import { InvoicesTable } from "@/components/finance/InvoicesTable";
import { WorkoutBuilder } from "@/components/workouts/WorkoutBuilder";
import { LiveWorkoutTracker } from "@/components/workouts/LiveWorkoutTracker";
import { BusinessDashboard } from "@/components/analytics/BusinessDashboard";
import { TouchKioskTerminal } from "@/components/kiosk/TouchKioskTerminal";
import { GuidedTourModal } from "@/components/onboarding/GuidedTourModal";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";

export default function HomePage() {
  return (
    <ToastProvider>
      <HomeContent />
    </ToastProvider>
  );
}

function HomeContent() {
  const { info, success } = useToast();
  const [activeTab, setActiveTab] = useState<
    "checkin" | "members" | "finance" | "workouts" | "live_tracker" | "analytics" | "architecture" | "security"
  >("checkin");
  const [demoTenantId, setDemoTenantId] = useState("demo-tenant-id");
  const [demoBranchId, setDemoBranchId] = useState("demo-branch-id");
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState("receptionist");

  return (
    <main className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col">
      {/* Touch Kiosk Overlay Mode */}
      {isKioskOpen && <TouchKioskTerminal onClose={() => setIsKioskOpen(false)} />}

      {/* Guided Tour Modal */}
      <GuidedTourModal
        isOpen={isTourOpen}
        tourId={selectedTour}
        onClose={() => setIsTourOpen(false)}
      />

      {/* Header / Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-6 h-6 text-black" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                GymAI Platform
              </span>
              <span className="ml-2 text-xs uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                SaaS Enterprise v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm font-medium">
            {/* Launch Guided Tour */}
            <button
              id="btn-help-tour"
              onClick={() => {
                setSelectedTour(
                  activeTab === "finance" || activeTab === "checkin" || activeTab === "members"
                    ? "receptionist"
                    : activeTab === "workouts" || activeTab === "live_tracker"
                    ? "coach"
                    : "bi_owner"
                );
                setIsTourOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-xs font-semibold"
              title="Iniciar Tour Guiado"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Tour Guiado</span>
            </button>

            {/* Launch Touch Kiosk Mode */}
            <button
              id="btn-launch-kiosk"
              onClick={() => setIsKioskOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:brightness-110 transition-all shadow-md shadow-emerald-500/20 text-xs"
              title="Abrir Modo Kiosco Táctil"
            >
              <Tv className="w-4 h-4" />
              <span>Modo Kiosco Táctil</span>
            </button>

            <div className="hidden md:flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold">ETAPAS 1-5 OPERATIVAS</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <section className="border-b border-slate-800/60 bg-gradient-to-b from-slate-950 via-slate-900 to-[#070b12] pt-6 pb-4 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-2 pb-2">
            <button
              onClick={() => setActiveTab("checkin")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === "checkin"
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Check-in Recepción
            </button>

            <button
              onClick={() => setActiveTab("members")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === "members"
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Socios & Ficha
            </button>

            <button
              onClick={() => setActiveTab("finance")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === "finance"
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Finanzas & Caja
            </button>

            <button
              onClick={() => setActiveTab("workouts")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === "workouts"
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              Workout Builder
            </button>

            <button
              onClick={() => setActiveTab("live_tracker")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === "live_tracker"
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Live Workout (1RM)
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === "analytics"
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Business Intelligence & Picos
            </button>

            <button
              onClick={() => setActiveTab("architecture")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === "architecture"
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Arquitectura
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === "security"
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Seguridad
            </button>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <section className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        {/* TAB 1: Check-in */}
        {activeTab === "checkin" && <CheckInTerminal tenantId={demoTenantId} branchId={demoBranchId} />}

        {/* TAB 2: Socios */}
        {activeTab === "members" && <MemberList tenantId={demoTenantId} />}

        {/* TAB 3: Finanzas */}
        {activeTab === "finance" && (
          <div className="space-y-8">
            <CashRegisterView tenantId={demoTenantId} branchId={demoBranchId} />
            <div className="pt-4 border-t border-slate-800">
              <InvoicesTable tenantId={demoTenantId} />
            </div>
          </div>
        )}

        {/* TAB 4: Workout Builder */}
        {activeTab === "workouts" && <WorkoutBuilder tenantId={demoTenantId} />}

        {/* TAB 5: Live Tracker */}
        {activeTab === "live_tracker" && (
          <LiveWorkoutTracker tenantId={demoTenantId} userId="USER_DEMO_SOCIO" />
        )}

        {/* TAB 6: Business Intelligence */}
        {activeTab === "analytics" && <BusinessDashboard tenantId={demoTenantId} />}

        {/* TAB 7: Arquitectura */}
        {activeTab === "architecture" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-3xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                Multi-Tenancy & Índices
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aislamiento estricto por <code className="text-emerald-400">tenant_id</code> con PKs UUIDv7 ordenables y búsqueda por Blind Index en tiempo constante.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Double-Entry Ledger & Splits
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cobros mixtos (Efectivo + MP QR/Tarjetas) con reactivación automática de membresías y Arqueo Ciego de caja diaria.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Check-in en Milisegundos
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Motor de semáforo (Verde, Amarillo, Rojo) con latencia menor a 2ms y soporte de contingencia Offline-First (IndexedDB).
              </p>
            </div>
          </div>
        )}

        {/* TAB 8: Seguridad */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-3xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-400" />
                Envelope Encryption (AES-256-GCM)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Protección criptográfica para antecedentes médicos y alergias en la ficha médica.
              </p>
              <div className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-slate-400 border border-slate-800">
                Formato: <span className="text-emerald-400">enc:v1:&lt;iv&gt;:&lt;authTag&gt;:&lt;cipherText&gt;</span>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-400" />
                Refresh Token Rotation (RTR)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Rotación de tokens de 14 días con detección inmediata de reúso y revocación preventiva de sesión.
              </p>
              <div className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-slate-400 border border-slate-800">
                Cookie: <span className="text-purple-400">HttpOnly, Secure, SameSite=Strict</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 px-6 bg-slate-950/40 text-center text-xs text-slate-500">
        GymAI SaaS Platform • ETAPAS 1, 2, 3 & 4 Implementadas y Validadas
      </footer>
    </main>
  );
}
