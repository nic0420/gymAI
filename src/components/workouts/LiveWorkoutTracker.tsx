"use client";

import React, { useState, useEffect } from "react";
import { Play, Check, Flame, Clock, Award, RotateCcw, ChevronRight, Trophy, Sparkles, Dumbbell } from "lucide-react";
import { calculateOneRepMax } from "@/lib/workouts/epley";

interface LiveWorkoutTrackerProps {
  tenantId: string;
  userId: string;
}

export function LiveWorkoutTracker({ tenantId, userId }: LiveWorkoutTrackerProps) {
  const [activeSession, setActiveSession] = useState(false);
  const [currentExercise, setCurrentExercise] = useState("Press de Banca con Barra");
  const [sets, setSets] = useState<
    { setNumber: number; weightKg: number; repsDone: number; completed: boolean; estimated1RM: number; isPR?: boolean }
  >([
    { setNumber: 1, weightKg: 80, repsDone: 10, completed: false, estimated1RM: 106.67 },
    { setNumber: 2, weightKg: 95, repsDone: 8, completed: false, estimated1RM: 120.33 },
    { setNumber: 3, weightKg: 110, repsDone: 6, completed: false, estimated1RM: 132.0, isPR: true },
    { setNumber: 4, weightKg: 115, repsDone: 4, completed: false, estimated1RM: 130.33 },
  ]);

  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [sessionSummary, setSessionSummary] = useState<any | null>(null);
  const [prAlert, setPrAlert] = useState<{ exercise: string; rm: number } | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (restTimer !== null && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  const handleCompleteSet = (idx: number) => {
    const updated = [...sets];
    updated[idx].completed = !updated[idx].completed;
    const estimated = calculateOneRepMax(updated[idx].weightKg, updated[idx].repsDone);
    updated[idx].estimated1RM = estimated;
    
    // Si supera 130kg lanzamos alerta de PR
    if (updated[idx].completed && estimated >= 130) {
      updated[idx].isPR = true;
      setPrAlert({ exercise: currentExercise, rm: estimated });
    }

    setSets(updated);

    if (updated[idx].completed) {
      setRestTimer(90); // 90 segundos de descanso
    }
  };

  const handleUpdateSet = (idx: number, field: "weightKg" | "repsDone", value: number) => {
    const updated = [...sets];
    updated[idx][field] = value;
    const est = calculateOneRepMax(
      field === "weightKg" ? value : updated[idx].weightKg,
      field === "repsDone" ? value : updated[idx].repsDone
    );
    updated[idx].estimated1RM = est;
    setSets(updated);
  };

  const handleFinishWorkout = () => {
    const totalVol = sets.reduce((acc, s) => acc + (s.completed ? s.weightKg * s.repsDone : 0), 0);
    const max1RM = Math.max(...sets.map((s) => s.estimated1RM));
    setSessionSummary({
      totalVolumeKg: totalVol,
      max1RM,
      completedSets: sets.filter((s) => s.completed).length,
    });
    setActiveSession(false);
    setPrAlert(null);
  };

  return (
    <div className="space-y-6">
      {/* Header del Tracker */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Live Workout Tracker & Estimador 1RM
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Registro serie a serie con sobrecarga progresiva y cálculo de 1RM con la <strong className="text-zinc-200">Fórmula de Epley</strong>.
          </p>
        </div>

        {!activeSession ? (
          <button
            onClick={() => {
              setActiveSession(true);
              setSessionSummary(null);
            }}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 active:scale-95 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Iniciar Entrenamiento Hoy</span>
          </button>
        ) : (
          <button
            onClick={handleFinishWorkout}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold active:scale-95 transition-all shadow-md shadow-rose-600/20"
          >
            Finalizar Sesión
          </button>
        )}
      </div>

      {/* PR Alert Banner */}
      {prAlert && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between shadow-lg shadow-amber-500/10 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Trophy className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                🏆 ¡Nuevo Récord Personal Detectado!
              </h4>
              <p className="text-xs text-zinc-300">
                Has alcanzado un nuevo 1RM estimado de <strong className="text-white font-mono">{prAlert.rm} kg</strong> en {prAlert.exercise}.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-amber-400/80 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 hidden sm:inline">
            Epley: W × (1 + R/30)
          </span>
        </div>
      )}

      {/* Resumen de Sesión Finalizada */}
      {sessionSummary && (
        <div className="p-6 rounded-3xl bg-zinc-900 border border-emerald-500/40 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Award className="w-5 h-5" />
            <span>¡Entrenamiento Completado y Guardado con Éxito!</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Volumen Total Levantado</span>
              <span className="text-xl font-bold text-white">{sessionSummary.totalVolumeKg} kg</span>
            </div>
            <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-zinc-500 block mb-1">1RM Máximo Estimado</span>
              <span className="text-xl font-bold text-amber-400">{sessionSummary.max1RM} kg</span>
            </div>
            <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Series Completadas</span>
              <span className="text-xl font-bold text-emerald-400">{sessionSummary.completedSets} series</span>
            </div>
          </div>
        </div>
      )}

      {/* Panel Activo del Entrenamiento */}
      {activeSession && (
        <div className="glass-panel p-6 rounded-3xl border border-zinc-800 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-zinc-800 gap-3">
            <div>
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-0.5">
                Ejercicio Activo (1 de 4)
              </span>
              <h4 className="text-lg font-black text-white flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-zinc-400" />
                {currentExercise}
              </h4>
            </div>

            {/* Temporizador de Descanso Flotante */}
            {restTimer !== null && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold animate-pulse">
                <Clock className="w-4 h-4" />
                <span>Descanso: {restTimer}s</span>
              </div>
            )}
          </div>

          {/* Tabla de Series */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-zinc-500 uppercase px-3">
              <span className="col-span-2">Serie</span>
              <span className="col-span-3">Peso (kg)</span>
              <span className="col-span-3">Reps</span>
              <span className="col-span-3">1RM Epley</span>
              <span className="col-span-1 text-center">Listo</span>
            </div>

            {sets.map((set, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-12 gap-2 items-center p-3 rounded-2xl border transition-all ${
                  set.completed
                    ? "bg-emerald-950/20 border-emerald-500/30 text-zinc-300"
                    : "bg-zinc-950 border-zinc-800 text-white"
                }`}
              >
                <div className="col-span-2 font-mono font-bold flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs">
                    {set.setNumber}
                  </span>
                </div>

                <div className="col-span-3">
                  <input
                    type="number"
                    value={set.weightKg}
                    onChange={(e) => handleUpdateSet(idx, "weightKg", Number(e.target.value))}
                    className="w-full h-9 px-2 bg-zinc-900 border border-zinc-800 rounded-xl text-center font-mono font-bold text-xs text-white outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="col-span-3">
                  <input
                    type="number"
                    value={set.repsDone}
                    onChange={(e) => handleUpdateSet(idx, "repsDone", Number(e.target.value))}
                    className="w-full h-9 px-2 bg-zinc-900 border border-zinc-800 rounded-xl text-center font-mono font-bold text-xs text-white outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="col-span-3 font-mono text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span>{set.estimated1RM} kg</span>
                  {set.isPR && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      PR 🏆
                    </span>
                  )}
                </div>

                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => handleCompleteSet(idx)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      set.completed
                        ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/30"
                        : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
}

