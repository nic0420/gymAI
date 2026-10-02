"use client";

import React, { useState, useEffect } from "react";
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
  CreditCard,
  LogOut,
} from "lucide-react";
import { setAccessToken, refreshSession, onSessionExpired, logout } from "@/lib/api-client";

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
import { LoginModal } from "@/components/auth/LoginModal";
import { SaaSSubscriptionModal } from "@/components/billing/SaaSSubscriptionModal";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";
import { SpotterLogo } from "@/components/brand/SpotterLogo";
import { BRAND } from "@/lib/brand";

export default function HomePage() {
  return (
    <ToastProvider>
      <HomeContent />
    </ToastProvider>
  );
}

function HomeContent() {
  const { info, success } = useToast();
  // FIX: antes la app arrancaba directamente en modo "app" como SUPERADMIN hardcodeado,
  // sin login. Ahora se entra a la app sólo con una sesión válida.
  const [viewMode, setViewMode] = useState<"landing" | "app">("landing");
  const [sessionReady, setSessionReady] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "checkin" | "members" | "finance" | "workouts" | "live_tracker" | "analytics"
  >("checkin");

  // FIX: "demo-tenant-id"/"demo-branch-id" no existían en la BD -> toda operación fallaba por FK.
  // Además la sede no se actualizaba tras el login. Ahora vienen de la sesión.
  const [demoTenantId, setDemoTenantId] = useState("");
  const [demoBranchId, setDemoBranchId] = useState("");
  const [branchOptions, setBranchOptions] = useState<{ id: string; name: string }[]>([]);
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState("receptionist");


  // Usuario y Tenant Activo
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    role: string;
    email: string;
    initials: string;
    tenantName: string;
    plan: string;
  } | null>(null);

  const applySession = (user: any, tenant: any) => {
    setCurrentUser({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      email: user.email,
      initials: `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase(),
      tenantName: tenant.name,
      plan: tenant.settings?.plan || "ENTERPRISE_VIP",
    });
    setDemoTenantId(tenant.id);
    const branches: { id: string; name: string }[] = tenant.branches || [];
    setBranchOptions(branches);
    setDemoBranchId(branches[0]?.id || "");
  };

  const handleLoginSuccess = (user: any, tenant: any, accessToken: string) => {
    setAccessToken(accessToken);
    applySession(user, tenant);
    setViewMode("app");
    success(`¡Bienvenido ${user.firstName}! Has ingresado a ${tenant.name}`);
  };

  const clearSession = () => {
    setAccessToken(null);
    setCurrentUser(null);
    setDemoTenantId("");
    setDemoBranchId("");
    setBranchOptions([]);
    setViewMode("landing");
  };

  const handleLogout = async () => {
    await logout();
    clearSession();
    info("Sesión cerrada");
  };

  // Restaurar sesión al recargar (cookie HttpOnly de refresh) y reaccionar a expiración
  useEffect(() => {
    let cancelled = false;
    refreshSession().then((data) => {
      if (cancelled) return;
      if (data) {
        applySession(data.user, data.tenant);
        setViewMode("app");
      }
      setSessionReady(true);
    });
    const unsubscribe = onSessionExpired(() => {
      clearSession();
      setIsLoginOpen(true);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enterApp = (tab?: string) => {
    if (tab) setActiveTab(tab as any);
    if (!currentUser) {
      setIsLoginOpen(true);
      return;
    }
    setViewMode("app");
  };

  // If in Landing Mode, render the high-conversion B2B showcase
  if (viewMode === "landing" || !currentUser) {
    return (
      <>
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
        <PublicLandingPage
          onEnterApp={enterApp}
          onLaunchKiosk={() => (currentUser ? setIsKioskOpen(true) : setIsLoginOpen(true))}
          onLaunchTour={(tourId) => {
            setSelectedTour(tourId);
            setIsTourOpen(true);
          }}
          onOpenLogin={() => setIsLoginOpen(true)}
          isAuthenticated={Boolean(currentUser)}
        />
        {isKioskOpen && currentUser && (
          <TouchKioskTerminal
            tenantId={demoTenantId}
            branchId={demoBranchId}
            onClose={() => setIsKioskOpen(false)}
          />
        )}
        {!sessionReady && <span className="sr-only">Verificando sesión…</span>}
      </>
    );
  }

  const TABS: { id: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { id: "checkin", label: "Recepción", icon: <QrCode className="w-4 h-4" aria-hidden /> },
    { id: "members", label: "Socios", icon: <Users className="w-4 h-4" aria-hidden /> },
    { id: "finance", label: "Caja y cobros", icon: <DollarSign className="w-4 h-4" aria-hidden /> },
    { id: "workouts", label: "Rutinas", icon: <Dumbbell className="w-4 h-4" aria-hidden /> },
    { id: "live_tracker", label: "Entreno en vivo", icon: <Flame className="w-4 h-4" aria-hidden /> },
    { id: "analytics", label: "Números", icon: <BarChart3 className="w-4 h-4" aria-hidden /> },
  ];

  return (
    <main className="min-h-screen bg-ink text-graphite-100 flex flex-col">
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <SaaSSubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        gymName={currentUser.tenantName}
      />

      {isKioskOpen && (
        <TouchKioskTerminal
          tenantId={demoTenantId}
          branchId={demoBranchId}
          gymName={currentUser.tenantName}
          onClose={() => setIsKioskOpen(false)}
        />
      )}

      <GuidedTourModal isOpen={isTourOpen} tourId={selectedTour} onClose={() => setIsTourOpen(false)} />

      {/* ============================================================ BARRA SUPERIOR */}
      <header className="sticky top-0 z-40 border-b border-graphite-800 bg-ink/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <button onClick={() => setViewMode("landing")} title="Ir al sitio de SpotterApp" className="shrink-0">
              <SpotterLogo size="sm" />
            </button>

            <span className="hidden h-8 w-px bg-graphite-800 md:block" aria-hidden />

            <div className="hidden min-w-0 items-center gap-3 md:flex">
              <div className="min-w-0">
                <p className="label-industrial text-graphite-500">Gimnasio</p>
                <p className="truncate text-sm font-semibold text-graphite-50">{currentUser.tenantName}</p>
              </div>
              <label className="flex items-center gap-2 rounded-md border border-graphite-700 bg-graphite-900 px-2.5 py-1.5">
                <Building2 className="h-3.5 w-3.5 text-volt-400" aria-hidden />
                <span className="sr-only">Sede activa</span>
                <select
                  value={demoBranchId}
                  onChange={(e) => setDemoBranchId(e.target.value)}
                  className="cursor-pointer bg-transparent pr-1 text-xs font-semibold text-graphite-100 focus:outline-none"
                >
                  {branchOptions.length === 0 && (
                    <option value="" className="bg-graphite-900">Sin sedes configuradas</option>
                  )}
                  {branchOptions.map((b) => (
                    <option key={b.id} value={b.id} className="bg-graphite-900">
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="btn-launch-kiosk"
              onClick={() => setIsKioskOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-volt-400 px-3.5 text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:bg-volt-300"
              title="Abrir kiosco de autoservicio"
            >
              <Tv className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Kiosco</span>
            </button>

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
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-graphite-700 text-graphite-300 hover:border-graphite-500 hover:text-graphite-50"
              title="Tour guiado"
              aria-label="Tour guiado"
            >
              <HelpCircle className="h-4 w-4" aria-hidden />
            </button>

            <button
              onClick={() => setIsSubModalOpen(true)}
              className="hidden h-9 items-center gap-2 rounded-md border border-graphite-700 px-3 text-xs font-semibold text-graphite-200 hover:border-graphite-500 lg:inline-flex"
              title="Datos para pagar la licencia"
            >
              <CreditCard className="h-4 w-4" aria-hidden />
              Licencia
            </button>

            <div className="ml-1 flex items-center gap-2.5 border-l border-graphite-800 pl-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-md bg-graphite-800 font-display text-sm font-bold text-graphite-50"
                aria-hidden
              >
                {currentUser.initials}
              </div>
              <div className="hidden text-left leading-tight xl:block">
                <span className="block max-w-[140px] truncate text-xs font-semibold text-graphite-100">{currentUser.name}</span>
                <span className="label-industrial text-[10px] text-graphite-500">{currentUser.role}</span>
              </div>
              <button
                onClick={() => setIsLoginOpen(true)}
                className="hidden h-9 w-9 items-center justify-center rounded-md text-graphite-400 hover:text-graphite-50 md:inline-flex"
                title="Cambiar de cuenta"
                aria-label="Cambiar de cuenta"
              >
                <KeyRound className="h-4 w-4" aria-hidden />
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-graphite-400 hover:text-rose-400"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {/* Pestañas */}
        <nav className="mx-auto max-w-7xl px-4 sm:px-6" aria-label="Secciones del sistema">
          <div className="no-scrollbar -mb-px flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3.5 text-sm font-semibold transition-colors ${
                    active
                      ? "border-volt-400 text-graphite-50"
                      : "border-transparent text-graphite-400 hover:text-graphite-100"
                  }`}
                >
                  <span className={active ? "text-volt-400" : ""}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* ============================================================ CONTENIDO */}
      <section className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {activeTab === "checkin" && (
          <CheckInTerminal tenantId={demoTenantId} branchId={demoBranchId} gymName={currentUser.tenantName} />
        )}

        {activeTab === "members" && <MemberList tenantId={demoTenantId} gymName={currentUser.tenantName} />}

        {activeTab === "finance" && (
          <div className="space-y-10">
            <CashRegisterView tenantId={demoTenantId} branchId={demoBranchId} />
            <div className="border-t border-graphite-800 pt-8">
              <InvoicesTable tenantId={demoTenantId} branchId={demoBranchId} gymName={currentUser.tenantName} />
            </div>
          </div>
        )}

        {activeTab === "workouts" && <WorkoutBuilder tenantId={demoTenantId} />}

        {activeTab === "live_tracker" && <LiveWorkoutTracker tenantId={demoTenantId} userId={currentUser.id} />}

        {activeTab === "analytics" && <BusinessDashboard tenantId={demoTenantId} />}
      </section>

      <footer className="border-t border-graphite-800 px-6 py-5 text-xs text-graphite-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="label-industrial">SpotterApp · {BRAND.tagline}</span>
          <button onClick={() => setViewMode("landing")} className="hover:text-graphite-200">
            Sitio de SpotterApp
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] tracking-wide text-graphite-600">Web hecha por {BRAND.company}</p>
      </footer>
    </main>
  );
}
