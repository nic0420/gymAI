"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  QrCode,
  Wifi,
  WifiOff,
  User,
  Clock,
  RotateCcw,
  Sparkles,
  Delete,
  Search,
  MessageCircle,
} from "lucide-react";
import type { CheckInResult } from "@/lib/attendance/checkin-engine";
import { generateWhatsAppLink } from "@/lib/whatsapp/whatsapp-helper";

interface CheckInTerminalProps {
  tenantId: string;
  branchId: string;
}

export function CheckInTerminal({ tenantId, branchId }: CheckInTerminalProps) {
  const [dni, setDni] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [recentAttendances, setRecentAttendances] = useState<CheckInResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mantener el foco permanente en el input para lectores de código de barras
  useEffect(() => {
    inputRef.current?.focus();
  }, [lastResult]);

  const handleKeyPress = (num: string) => {
    if (dni.length < 10) {
      setDni((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    setDni((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDni("");
  };

  const processCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dni || dni.length < 5) return;

    setLoading(true);
    try {
      const res = await fetch("/api/v1/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          branchId,
          dni,
          accessMethod: "DNI_KEYPAD",
        }),
      });

      const responseData = await res.json();
      const result: CheckInResult = responseData.data || {
        accessStatus: "DENIED_RED",
        message: responseData.message || "Error al procesar check-in",
        checkInAt: new Date().toISOString(),
        executionTimeMs: 0,
      };

      setLastResult(result);
      setRecentAttendances((prev) => [result, ...prev.slice(0, 9)]);
      setDni("");
    } catch (err) {
      // Fallback de contingencia
      const fallbackResult: CheckInResult = {
        accessStatus: "WARNING_YELLOW",
        message: "Operando en modo de contingencia local",
        warningReason: "Fallo de conexión al servidor central",
        checkInAt: new Date().toISOString(),
        executionTimeMs: 1,
      };
      setLastResult(fallbackResult);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
      {/* Columna Izquierda: Terminal Táctil & Numpad */}
      <div className="lg:col-span-7 space-y-6">
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 relative overflow-hidden">
          {/* Header de la Terminal */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Check-in de Recepción</h2>
                <p className="text-xs text-slate-400">Digita el DNI o escanea el código de barras</p>
              </div>
            </div>

            {/* Selector Online / Offline */}
            <button
              onClick={() => setIsOffline(!isOffline)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                isOffline
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              }`}
            >
              {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
              <span>{isOffline ? "Modo Offline" : "Online (<50ms)"}</span>
            </button>
          </div>

          {/* Formulario / Pantalla de Entrada de DNI */}
          <form onSubmit={processCheckIn} className="space-y-6">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                placeholder="Ingresar DNI..."
                className="w-full h-16 px-6 bg-slate-950/80 border-2 border-slate-700/80 focus:border-emerald-400 rounded-2xl text-2xl md:text-3xl font-mono font-bold text-center tracking-widest text-white outline-none transition-all placeholder:text-slate-600 focus:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                maxLength={10}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm hidden sm:block">
                DNI:
              </span>
            </div>

            {/* Teclado Numérico Táctil (Numpad) */}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleKeyPress(n)}
                  className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-xl font-bold text-white border border-slate-800 active:scale-95 transition-all flex items-center justify-center shadow-md hover:border-slate-700"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-14 rounded-2xl bg-slate-900/60 hover:bg-rose-500/20 text-rose-400 border border-slate-800 hover:border-rose-500/30 text-sm font-semibold active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                Borrar
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress("0")}
                className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-xl font-bold text-white border border-slate-800 active:scale-95 transition-all flex items-center justify-center shadow-md hover:border-slate-700"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800 active:scale-95 transition-all flex items-center justify-center"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Botón Principal de Validación */}
            <button
              type="submit"
              disabled={loading || dni.length < 5}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-base tracking-wide uppercase transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Validar Ingreso</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Columna Derecha: Semáforo Inmersivo & Tarjeta del Socio */}
      <div className="lg:col-span-5 space-y-6">
        {lastResult ? (
          <div
            className={`p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
              lastResult.accessStatus === "GRANTED_GREEN"
                ? "bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                : lastResult.accessStatus === "WARNING_YELLOW"
                ? "bg-amber-950/40 border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.2)]"
                : "bg-rose-950/40 border-rose-500/50 shadow-[0_0_40px_rgba(239,68,68,0.2)]"
            }`}
          >
            {/* Header del Semáforo */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                {lastResult.accessStatus === "GRANTED_GREEN" && (
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 animate-bounce" />
                )}
                {lastResult.accessStatus === "WARNING_YELLOW" && (
                  <AlertTriangle className="w-7 h-7 text-amber-400 animate-pulse" />
                )}
                {lastResult.accessStatus === "DENIED_RED" && (
                  <XCircle className="w-7 h-7 text-rose-400" />
                )}
                <span
                  className={`text-lg font-black tracking-tight ${
                    lastResult.accessStatus === "GRANTED_GREEN"
                      ? "text-emerald-400"
                      : lastResult.accessStatus === "WARNING_YELLOW"
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {lastResult.accessStatus === "GRANTED_GREEN"
                    ? "ACCESO CONCEDIDO"
                    : lastResult.accessStatus === "WARNING_YELLOW"
                    ? "PASO CON AVISO"
                    : "ACCESO DENEGADO"}
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-black/40 px-2.5 py-1 rounded-lg">
                ⚡ {lastResult.executionTimeMs}ms
              </span>
            </div>

            {/* Contenido del Socio */}
            {lastResult.user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-white/10 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                    {lastResult.user.photoUrl ? (
                      <img
                        src={lastResult.user.photoUrl}
                        alt="Foto Socio"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {lastResult.user.firstName} {lastResult.user.lastName}
                    </h3>
                    <p className="text-sm font-mono text-slate-400">DNI: {lastResult.user.dni}</p>
                  </div>
                </div>

                {/* Mensaje de Estado / Motivo */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 text-sm">
                  <p className="text-white font-medium">{lastResult.message}</p>
                  {lastResult.warningReason && (
                    <p className="text-xs text-amber-300 mt-1">⚠️ {lastResult.warningReason}</p>
                  )}
                  {lastResult.denialReason && (
                    <p className="text-xs text-rose-300 mt-1">🚫 {lastResult.denialReason}</p>
                  )}
                </div>

                {/* Badges de Cuota y Apto Médico */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 block">Membresía</span>
                    <span className="font-semibold text-white">
                      {lastResult.subscription
                        ? `Vence: ${lastResult.subscription.endDate}`
                        : "Sin plan"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 block">Apto Físico</span>
                    <span className="font-semibold text-white">
                      {lastResult.medicalClearance
                        ? `${lastResult.medicalClearance.status}`
                        : "Pendiente"}
                    </span>
                  </div>
                </div>

                {/* Botón de WhatsApp Directo para Recepción */}
                {lastResult.accessStatus !== "GRANTED_GREEN" && (
                  <a
                    href={generateWhatsAppLink({
                      memberName: lastResult.user.firstName,
                      type: lastResult.accessStatus === "DENIED_RED" ? "DEBT_REMINDER" : "DUE_SOON",
                      dueDate: lastResult.subscription?.endDate,
                      gymName: "GymAI",
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar Aviso & Alias por WhatsApp</span>
                  </a>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-rose-300 font-semibold">{lastResult.message}</p>
                <p className="text-xs text-slate-400 mt-1">Verifica el DNI e intenta nuevamente.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center flex flex-col items-center justify-center min-h-[260px]">
            <Clock className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-300">Esperando Check-in</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Los resultados de validación y datos del socio aparecerán aquí en tiempo real.
            </p>
          </div>
        )}

        {/* Historial Reciente de la Terminal */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Últimos Accesos Registrados
          </h4>
          {recentAttendances.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-3">No hay check-ins recientes en esta sesión.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
              {recentAttendances.map((att, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        att.accessStatus === "GRANTED_GREEN"
                          ? "bg-emerald-400"
                          : att.accessStatus === "WARNING_YELLOW"
                          ? "bg-amber-400"
                          : "bg-rose-400"
                      }`}
                    ></span>
                    <span className="font-semibold text-white">
                      {att.user ? `${att.user.firstName} ${att.user.lastName}` : `DNI Desconocido`}
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono">
                    {new Date(att.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
