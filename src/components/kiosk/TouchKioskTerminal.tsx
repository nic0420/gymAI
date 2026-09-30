"use client";

import React, { useState, useEffect, useRef } from "react";
import { soundEffects } from "@/lib/kiosk/sound-effects";
import { apiFetch } from "@/lib/api-client";
import { ArrowRight, CircleCheck, CircleX, Delete, Loader2, Maximize, TriangleAlert } from "lucide-react";
import { SpotterMark } from "@/components/brand/SpotterLogo";
import type { CheckInResult } from "@/lib/attendance/checkin-engine";

interface CheckInEvaluation {
  status: "GREEN" | "YELLOW" | "RED";
  reason: string;
  member?: {
    id: string;
    fullName: string;
    dni: string;
    planName: string;
    membershipExpiresAt: string;
    medicalExpiresAt: string;
  };
  metrics: {
    evaluationTimeMs: number;
  };
}

interface TouchKioskTerminalProps {
  gymName?: string;
  tenantId: string;
  branchId: string;
  onClose?: () => void;
}

/** Traduce la respuesta real del motor de check-in al formato visual del kiosco. */
function mapCheckInToKiosk(result: CheckInResult): CheckInEvaluation {
  const status = result.accessStatus === "GRANTED_GREEN" ? "GREEN" : result.accessStatus === "WARNING_YELLOW" ? "YELLOW" : "RED";
  return {
    status,
    reason: result.message,
    member: result.user
      ? {
          id: result.user.id,
          fullName: `${result.user.firstName} ${result.user.lastName}`,
          dni: result.user.dni,
          planName: result.subscription ? `Vence ${result.subscription.endDate}` : "Sin plan",
          membershipExpiresAt: result.subscription?.endDate || "",
          medicalExpiresAt: result.medicalClearance?.expiryDate || "",
        }
      : undefined,
    metrics: { evaluationTimeMs: result.executionTimeMs },
  };
}

export function TouchKioskTerminal({ gymName = "tu gimnasio", tenantId, branchId, onClose }: TouchKioskTerminalProps) {
  const [inputDni, setInputDni] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInEvaluation | null>(null);
  const [countdown, setCountdown] = useState(8);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-reset timer countdown after showing result
  useEffect(() => {
    if (result) {
      setCountdown(8);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleReset();
            return 8;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [result]);

  const handleKeyPress = (num: string) => {
    if (result) {
      handleReset();
    }
    soundEffects.playKeyClick();
    if (inputDni.length < 10) {
      setInputDni((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    soundEffects.playKeyClick();
    setInputDni((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    soundEffects.playKeyClick();
    setInputDni("");
  };

  const handleReset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResult(null);
    setInputDni("");
    setCountdown(8);
  };

  const handleSubmit = async () => {
    if (!inputDni.trim() || isDebouncing || loading) return;

    setIsDebouncing(true);
    setLoading(true);

    try {
      // FIX CRÍTICO: antes se enviaba sólo el DNI (sin tenantId/branchId -> 400) y se leía
      // `data.evaluation`, un campo que la API nunca devolvió. El kiosco SIEMPRE mostraba
      // "Error de red" en rojo, para cualquier socio.
      const res = await apiFetch("/api/v1/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          branchId,
          dni: inputDni.trim(),
          accessMethod: "DNI_KEYPAD",
        }),
      });

      const data = await res.json();
      const evalResult: CheckInEvaluation = data?.data
        ? mapCheckInToKiosk(data.data as CheckInResult)
        : {
            status: "RED",
            reason: data?.message || "No se pudo validar el acceso. Comuníquese con recepción.",
            metrics: { evaluationTimeMs: 0 },
          };
      setResult(evalResult);

      if (evalResult.status === "GREEN") {
        soundEffects.playAccessGranted();
      } else if (evalResult.status === "YELLOW") {
        soundEffects.playAccessWarning();
      } else {
        soundEffects.playAccessDenied();
      }
    } catch (err) {
      setResult({
        status: "RED",
        reason: "Error de red al consultar terminal. Comuníquese con recepción.",
        metrics: { evaluationTimeMs: 0 },
      });
      soundEffects.playAccessDenied();
    } finally {
      setLoading(false);
      setTimeout(() => setIsDebouncing(false), 2000);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-6 select-none overflow-hidden font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <SpotterMark className="w-11 h-11" />
          <div>
            <h1 className="font-display text-2xl font-extrabold uppercase leading-none text-white">{gymName}</h1>
            <p className="label-industrial mt-1 text-slate-400">Kiosco de ingreso · SpotterApp</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullScreen}
            className="inline-flex items-center gap-2 p-3 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white rounded-2xl text-sm font-semibold transition-all active:scale-95"
            title="Pantalla Completa"
          >
            <Maximize className="w-4 h-4" aria-hidden />
            <span className="hidden sm:inline">Pantalla completa</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white rounded-2xl text-sm font-bold transition-all active:scale-95"
            >
              Salir del Kiosco
            </button>
          )}
        </div>
      </div>

      {/* Main Center Stage */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 py-4 max-w-5xl mx-auto w-full">
        {/* Left Side: Display & Feedback */}
        <div className="flex-1 w-full flex flex-col items-center justify-center">
          {result ? (
            <div
              className={`w-full max-w-md rounded-3xl p-8 border text-center transition-all duration-300 transform scale-100 shadow-2xl animate-in zoom-in-95 ${
                result.status === "GREEN"
                  ? "bg-emerald-950/40 border-emerald-500/50 shadow-emerald-500/20"
                  : result.status === "YELLOW"
                  ? "bg-amber-950/40 border-amber-500/50 shadow-amber-500/20"
                  : "bg-rose-950/40 border-rose-500/50 shadow-rose-500/20"
              }`}
            >
              {/* Traffic Light Icon */}
              <div
                className={`mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full ${
                  result.status === "GREEN"
                    ? "bg-emerald-400 text-ink"
                    : result.status === "YELLOW"
                    ? "bg-amber-400 text-ink"
                    : "bg-rose-500 text-white"
                }`}
                aria-hidden
              >
                {result.status === "GREEN" && <CircleCheck className="h-14 w-14" strokeWidth={2.5} />}
                {result.status === "YELLOW" && <TriangleAlert className="h-12 w-12" strokeWidth={2.5} />}
                {result.status === "RED" && <CircleX className="h-14 w-14" strokeWidth={2.5} />}
              </div>

              <h2
                className={`font-display text-5xl font-extrabold mb-2 uppercase ${
                  result.status === "GREEN"
                    ? "text-emerald-400"
                    : result.status === "YELLOW"
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {result.status === "GREEN"
                  ? "Adelante"
                  : result.status === "YELLOW"
                  ? "Pasá, con aviso"
                  : "No podés pasar"}
              </h2>

              {result.member ? (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 my-4">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Socio Registrado</p>
                  <p className="text-xl font-bold text-white">{result.member.fullName}</p>
                  <p className="text-sm text-slate-300 mt-1">Plan: {result.member.planName}</p>
                </div>
              ) : null}

              <p className="text-sm text-slate-200 mt-2 bg-black/40 py-2 px-4 rounded-xl border border-white/5">
                {result.reason}
              </p>

              <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
                <span>Latencia: {result.metrics?.evaluationTimeMs ?? 0} ms</span>
                <span className="font-semibold text-volt-400">
                  Reiniciando en {countdown}s...
                </span>
              </div>

              <button
                onClick={handleReset}
                className="mt-4 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-all"
              >
                Nueva Consulta
              </button>
            </div>
          ) : (
            <div className="w-full max-w-md text-center">
              <div className="mb-4">
                <span className="label-industrial text-volt-400">Ingreso de socios</span>
              </div>
              <h2 className="font-display text-6xl font-extrabold text-white mb-3">Poné tu DNI</h2>
              <p className="text-slate-400 text-sm mb-6">
                Escribí tu número de documento y tocá “Validar”.
              </p>

              {/* DNI Display Screen */}
              <div className="h-20 bg-slate-900 border-2 border-slate-700 focus-within:border-volt-400 rounded-3xl flex items-center justify-center px-6 shadow-inner">
                <span className="text-4xl font-mono font-bold tracking-widest text-white">
                  {inputDni || <span className="text-slate-600 font-sans text-2xl">_ _ _ _ _ _ _ _</span>}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Large Touch Number Pad */}
        <div className="w-full max-w-xs bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-md">
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                disabled={loading}
                className="h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-2xl font-bold text-white shadow active:scale-95 active:bg-volt-400 active:text-ink transition-all flex items-center justify-center disabled:opacity-50"
              >
                {num}
              </button>
            ))}

            <button
              onClick={handleClear}
              disabled={loading || !inputDni}
              className="h-16 rounded-2xl bg-slate-800/60 hover:bg-rose-950 border border-slate-700 text-sm font-bold text-rose-400 active:scale-95 transition-all flex items-center justify-center disabled:opacity-30"
            >
              C
            </button>

            <button
              onClick={() => handleKeyPress("0")}
              disabled={loading}
              className="h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-2xl font-bold text-white shadow active:scale-95 active:bg-volt-400 active:text-ink transition-all flex items-center justify-center disabled:opacity-50"
            >
              0
            </button>

            <button
              onClick={handleDelete}
              disabled={loading || !inputDni}
              className="h-16 rounded-2xl bg-slate-800/60 hover:bg-slate-700 border border-slate-700 text-lg font-bold text-amber-400 active:scale-95 transition-all flex items-center justify-center disabled:opacity-30"
            >
              <Delete className="w-6 h-6" aria-label="Borrar" />
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !inputDni.trim() || isDebouncing}
            className="w-full mt-4 h-16 rounded-2xl bg-volt-400 hover:bg-volt-300 text-ink text-lg font-black tracking-wide active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" aria-label="Validando" />
            ) : (
              <>
                <span className="font-display text-2xl font-extrabold uppercase">Validar</span>
                <ArrowRight className="w-6 h-6" aria-hidden />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="text-center text-xs text-slate-500 border-t border-slate-800/60 pt-3">
        <span className="label-industrial">SpotterApp · Alguien te tiene que cuidar la barra</span>
      </div>
    </div>
  );
}
