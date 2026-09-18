"use client";

import React, { useState, useEffect } from "react";
import { Play, Check, Flame, Clock, Award, RotateCcw, ChevronRight } from "lucide-react";
import { calculateOneRepMax } from "@/lib/workouts/epley";

interface LiveWorkoutTrackerProps {
  tenantId: string;
  userId: string;
}

export function LiveWorkoutTracker({ tenantId, userId }: LiveWorkoutTrackerProps) {
  const [activeSession, setActiveSession] = useState(false);
  const [currentExercise, setCurrentExercise] = useState("Press de Banca con Barra");
  const [sets, setSets] = useState<
    { setNumber: number; weightKg: number; repsDone: number; completed: boolean; estimated1RM: number }[]
  >([
    { setNumber: 1, weightKg: 70, repsDone: 10, completed: false, estimated1RM: 93.33 },
    { setNumber: 2, weightKg: 80, repsDone: 8, completed: false, estimated1RM: 101.33 },
    { setNumber: 3, weightKg: 85, repsDone: 6, completed: false, estimated1RM: 102.0 },
    { setNumber: 4, weightKg: 90, repsDone: 4, completed: false, estimated1RM: 102.0 },
  ]);

  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [sessionSummary, setSessionSummary] = useState<any | null>(null);

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
    setSets(updated);

    if (updated[idx].completed) {
      setRestTimer(90); // 90 segundos de descanso
    }
  };

  const handleUpdateSet = (idx: number, field: "weightKg" | "repsDone", value: number) => {
    const updated = [...sets];
    updated[idx][field] = value;
    updated[idx].estimated1RM = calculateOneRepMax(
      field === "weightKg" ? value : updated[idx].weightKg,
      field === "repsDone" ? value : updated[idx].repsDone
    );
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
  };

  return (
    <div className="space-y-6">
      {/* Header del Tracker */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            Live Workout Tracker (App Socio)
          </h3>
          <p className="text-xs text-slate-400">
            Registro serie a serie con sobrecarga progresiva y cálculo de 1RM en tiempo real
          </p>
        </div>

        {!activeSession ? (
          <button
            onClick={() => {
              setActiveSession(true);
              setSessionSummary(null);
            }}
            className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Iniciar Entrenamiento Hoy</span>
          </button>
        ) : (
          <button
            onClick={handleFinishWorkout}
            className="px-5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold active:scale-95 transition-all"
          >
            Finalizar Sesión
          </button>
        )}
      </div>

      {/* Resumen de Sesión Finalizada */}
      {sessionSummary && (
        <div className="p-6 rounded-3xl bg-slate-950 border border-emerald-500/40 shadow-xl space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Award className="w-5 h-5" />
            <span>¡Entrenamiento Completado con Éxito!</span>
          </div>
          <div className="grid grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3 bg-slate-900 rounded-xl">
              <span className="text-slate-500 block">Volumen Total</span>
              <span className="text-lg font-bold text-white">{sessionSummary.totalVolumeKg} kg</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl">
              <span className="text-slate-500 block">1RM Máximo Estimado</span>
              <span className="text-lg font-bold text-amber-400">{sessionSummary.max1RM} kg</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl">
              <span className="text-slate-500 block">Series Completadas</span>
              <span className="text-lg font-bold text-emerald-400">{sessionSummary.completedSets} series</span>
            </div>
          </div>
        </div>
      )}

      {/* Panel Activo del Entrenamiento */}
      {activeSession && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                Ejercicio 1 / 4
              </span>
              <h4 className="text-lg font-black text-white">{currentExercise}</h4>
            </div>

            {/* Temporizador de Descanso Flotante */}
            {restTimer !== null && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-sm font-bold animate-pulse">
                <Clock className="w-4 h-4" />
                <span>Descanso: {restTimer}s</span>
              </div>
            )}
          </div>

          {/* Tabla de Series */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 uppercase px-3">
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
                    ? "bg-emerald-950/20 border-emerald-500/30 text-slate-300"
                    : "bg-slate-950/80 border-slate-800 text-white"
                }`}
              >
                <div className="col-span-2 font-mono font-bold flex items-center gap-1">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs">
                    {set.setNumber}
                  </span>
                </div>

                <div className="col-span-3">
                  <input
                    type="number"
                    value={set.weightKg}
                    onChange={(e) => handleUpdateSet(idx, "weightKg", Number(e.target.value))}
                    className="w-full h-9 px-2 bg-slate-900 border border-slate-800 rounded-xl text-center font-mono font-bold text-xs text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="col-span-3">
                  <input
                    type="number"
                    value={set.repsDone}
                    onChange={(e) => handleUpdateSet(idx, "repsDone", Number(e.target.value))}
                    className="w-full h-9 px-2 bg-slate-900 border border-slate-800 rounded-xl text-center font-mono font-bold text-xs text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="col-span-3 font-mono text-xs font-bold text-amber-400 flex items-center gap-1">
                  <span>{set.estimated1RM} kg</span>
                  {set.estimated1RM >= 100 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      PR 🔥
                    </span>
                  )}
                </div>

                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => handleCompleteSet(idx)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      set.completed
                        ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
                        : "bg-slate-800 text-slate-500 hover:text-white"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
