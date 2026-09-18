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
  Building2,
  ChevronDown,
  Globe,
  LayoutDashboard,
  Bell,
  Sparkles,
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
import { PublicLandingPage } from "@/components/landing/PublicLandingPage";
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
  const [viewMode, setViewMode] = useState<"landing" | "app">("app");
  const [activeTab, setActiveTab] = useState<
    "checkin" | "members" | "finance" | "workouts" | "live_tracker" | "analytics" | "architecture" | "security"
  >("checkin");

  const [demoTenantId, setDemoTenantId] = useState("demo-tenant-id");
  const [demoBranchId, setDemoBranchId] = useState("demo-branch-id");
  const [selectedBranchName, setSelectedBranchName] = useState("Sede Belgrano (Principal)");
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState("receptionist");

  // If in Landing Mode, render the high-conversion B2B showcase
  if (viewMode === "landing") {
    return (
      <PublicLandingPage
        onEnterApp={(tab) => {
          if (tab) setActiveTab(tab as any);
          setViewMode("app");
        }}
        onLaunchKiosk={() => setIsKioskOpen(true)}
        onLaunchTour={(tourId) => {
          setSelectedTour(tourId);
          setIsTourOpen(true);
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Touch Kiosk Overlay Mode */}
      {isKioskOpen && <TouchKioskTerminal onClose={() => setIsKioskOpen(false)} />}

      {/* Guided Tour Modal */}
      <GuidedTourModal
        isOpen={isTourOpen}
        tourId={selectedTour}
        onClose={() => setIsTourOpen(false)}
      />

      {/* Enterprise App Header / Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand & Tenant Switcher */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewMode("landing")}
              className="flex items-center gap-2.5 group"
              title="Volver a Landing Comercial"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-600/25 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                  GymAI <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">ENTERPRISE</span>
                </span>
                <p className="text-[10px] text-zinc-400">Multi-Tenant Platform</p>
              </div>
            </button>

            {/* Tenant Selector Dropdown */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <select
                aria-label="Seleccionar Sucursal Activa"
                value={selectedBranchName}
                onChange={(e) => setSelectedBranchName(e.target.value)}
                className="bg-transparent text-zinc-200 text-xs font-semibold focus:outline-none cursor-pointer pr-2"
              >
                <option value="Sede Belgrano (Principal)" className="bg-zinc-900 text-zinc-200">Sede Belgrano (Principal)</option>
                <option value="Sede Palermo Soho" className="bg-zinc-900 text-zinc-200">Sede Palermo Soho</option>
                <option value="Sede Recoleta VIP" className="bg-zinc-900 text-zinc-200">Sede Recoleta VIP</option>
              </select>
            </div>
          </div>

          {/* Quick Action Badges & Controls */}
          <div className="flex items-center gap-2.5 text-xs font-medium">
            {/* View Switcher: Landing */}
            <button
              onClick={() => setViewMode("landing")}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 transition-all text-xs font-semibold"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Ver Landing B2B</span>
            </button>

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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all text-xs font-semibold"
              title="Iniciar Tour Guiado Interactivo"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Tour Guiado</span>
            </button>

            {/* Launch Touch Kiosk Mode */}
            <button
              id="btn-launch-kiosk"
              onClick={() => setIsKioskOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-600/20 text-xs"
              title="Abrir Modo Kiosco Táctil"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Kiosco Táctil</span>
            </button>

            {/* User Profile Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs shadow-inner">
                AD
              </div>
              <div className="hidden xl:block text-left text-[11px] leading-tight">
                <span className="font-bold text-zinc-200 block">Admin Gerencial</span>
                <span className="text-zinc-500">SuperAdmin</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Header (Tabs) */}
      <section className="border-b border-zinc-800/80 bg-zinc-950/60 pt-4 pb-3 px-4 sm:px-6 sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveTab("checkin")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "checkin"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Check-in Recepción</span>
            </button>

            <button
              onClick={() => setActiveTab("members")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "members"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Socios & Ficha Médica</span>
            </button>

            <button
              onClick={() => setActiveTab("finance")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "finance"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Finanzas & Arqueo Ciego</span>
            </button>

            <button
              onClick={() => setActiveTab("workouts")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "workouts"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Workout Builder</span>
            </button>

            <button
              onClick={() => setActiveTab("live_tracker")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "live_tracker"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Live Tracker (1RM Epley)</span>
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "analytics"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Business Intelligence & Heatmap</span>
            </button>

            <button
              onClick={() => setActiveTab("architecture")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "architecture"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Arquitectura</span>
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "security"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Seguridad</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Workspace Container */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* TAB 1: Check-in Recepción */}
        {activeTab === "checkin" && <CheckInTerminal tenantId={demoTenantId} branchId={demoBranchId} />}

        {/* TAB 2: Socios & Ficha Médica Cifrada */}
        {activeTab === "members" && <MemberList tenantId={demoTenantId} />}

        {/* TAB 3: Finanzas, Facturas & Arqueo Ciego */}
        {activeTab === "finance" && (
          <div className="space-y-8">
            <CashRegisterView tenantId={demoTenantId} branchId={demoBranchId} />
            <div className="pt-4 border-t border-zinc-800">
              <InvoicesTable tenantId={demoTenantId} />
            </div>
          </div>
        )}

        {/* TAB 4: Workout Builder */}
        {activeTab === "workouts" && <WorkoutBuilder tenantId={demoTenantId} />}

        {/* TAB 5: Live Tracker (1RM Epley) */}
        {activeTab === "live_tracker" && (
          <LiveWorkoutTracker tenantId={demoTenantId} userId="USER_DEMO_SOCIO" />
        )}

        {/* TAB 6: Business Intelligence & Heatmap 7x24 */}
        {activeTab === "analytics" && <BusinessDashboard tenantId={demoTenantId} />}

        {/* TAB 7: Arquitectura */}
        {activeTab === "architecture" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-3xl border border-zinc-800">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                Multi-Tenancy & Blind Indexes
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Aislamiento estricto por <code className="text-blue-400">tenant_id</code> con PKs UUIDv7 ordenables cronológicamente y búsqueda por Blind Index en tiempo constante $O(1)$.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-zinc-800">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Double-Entry Ledger & Splits
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Cobros mixtos (Efectivo + MP QR/Tarjetas) con reactivación automática de membresías y Arqueo Ciego de caja diaria contra desvíos.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-zinc-800">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" />
                Check-in en Milisegundos
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Motor de semáforo (Verde, Amarillo, Rojo) con latencia promedio &lt;2ms y soporte de contingencia Offline-First con IndexedDB.
              </p>
            </div>
          </div>
        )}

        {/* TAB 8: Seguridad */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-3xl border border-zinc-800">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-400" />
                Envelope Encryption (AES-256-GCM)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Protección criptográfica para antecedentes médicos y alergias en la ficha médica de cada socio.
              </p>
              <div className="p-3 bg-zinc-950 rounded-xl font-mono text-[11px] text-zinc-400 border border-zinc-800">
                Formato: <span className="text-emerald-400">enc:v1:&lt;iv&gt;:&lt;authTag&gt;:&lt;cipherText&gt;</span>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-zinc-800">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-400" />
                Refresh Token Rotation (RTR)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Rotación de tokens de 14 días con detección inmediata de reúso y revocación preventiva de sesión.
              </p>
              <div className="p-3 bg-zinc-950 rounded-xl font-mono text-[11px] text-zinc-400 border border-zinc-800">
                Cookie: <span className="text-blue-400">HttpOnly, Secure, SameSite=Strict</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-6 px-6 bg-zinc-950 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <span>GymAI Enterprise SaaS Platform • Multi-Tenant &amp; Offline-First</span>
          <div className="flex items-center gap-4 text-zinc-400">
            <button onClick={() => setViewMode("landing")} className="hover:text-white">
              Landing Pública
            </button>
            <span>•</span>
            <button onClick={() => setIsKioskOpen(true)} className="hover:text-emerald-400">
              Kiosco Auto-Atención
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}

