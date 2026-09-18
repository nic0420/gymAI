"use client";

import React, { useState, useEffect } from "react";
import { Dumbbell, Plus, Trash2, CheckCircle2, Copy, Sparkles, Clock, Flame } from "lucide-react";

interface WorkoutBuilderProps {
  tenantId: string;
}

export function WorkoutBuilder({ tenantId }: WorkoutBuilderProps) {
  const [exercisesList, setExercisesList] = useState<any[]>([]);
  const [routinesList, setRoutinesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<"list" | "create">("list");

  // Formulario de Nueva Rutina
  const [routineName, setRoutineName] = useState("");
  const [routineGoal, setRoutineGoal] = useState<"HYPERTROPHY" | "STRENGTH" | "FAT_LOSS" | "ENDURANCE">("HYPERTROPHY");
  const [isTemplate, setIsTemplate] = useState(true);
  const [days, setDays] = useState<any[]>([
    {
      dayNumber: 1,
      name: "Día 1: Empuje (Pecho / Hombro / Tríceps)",
      exercises: [],
    },
  ]);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchExercisesAndRoutines = async () => {
    setLoading(true);
    try {
      const [exRes, rRes] = await Promise.all([
        fetch(`/api/v1/workouts/exercises?tenantId=${tenantId}`),
        fetch(`/api/v1/workouts/routines?tenantId=${tenantId}&templatesOnly=true`),
      ]);
      const exData = await exRes.json();
      const rData = await rRes.json();
      if (exData.success) setExercisesList(exData.data || []);
      if (rData.success) setRoutinesList(rData.data || []);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercisesAndRoutines();
  }, [tenantId]);

  const handleAddDay = () => {
    const nextNum = days.length + 1;
    setDays([
      ...days,
      {
        dayNumber: nextNum,
        name: `Día ${nextNum}: Nuevo Split`,
        exercises: [],
      },
    ]);
  };

  const handleAddExerciseToDay = (dayIdx: number, exerciseId: string) => {
    if (!exerciseId) return;
    const updated = [...days];
    const exObj = exercisesList.find((e) => e.id === exerciseId);
    updated[dayIdx].exercises.push({
      exerciseId,
      name: exObj?.name || "Ejercicio",
      orderIndex: updated[dayIdx].exercises.length + 1,
      targetSets: 4,
      targetReps: "8-12",
      targetRpe: 8,
      restSeconds: 90,
      coachNotes: "",
    });
    setDays(updated);
  };

  const handleRemoveExercise = (dayIdx: number, exIdx: number) => {
    const updated = [...days];
    updated[dayIdx].exercises.splice(exIdx, 1);
    setDays(updated);
  };

  const handleSaveRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/workouts/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          name: routineName,
          goal: routineGoal,
          isTemplate,
          days,
        }),
      });
      if (res.ok) {
        setSuccessMsg("¡Plan de entrenamiento creado con éxito!");
        setTimeout(() => {
          setSuccessMsg(null);
          setActiveView("list");
          fetchExercisesAndRoutines();
        }, 1500);
      }
    } catch (err) {
      console.error("Error al guardar rutina:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-emerald-400" />
            Creador de Planes de Entrenamiento (Workout Builder)
          </h2>
          <p className="text-xs text-slate-400">
            Diseño modular de rutinas, plantillas maestras y splits personalizados
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeView === "list" ? (
            <button
              onClick={() => setActiveView("create")}
              className="h-11 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Plan</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveView("list")}
              className="h-11 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Volver al Catálogo
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* VISTA 1: Catálogo de Rutinas / Plantillas */}
      {activeView === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {routinesList.map((r) => (
            <div
              key={r.id}
              className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {r.goal}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {r.days?.length || 0} Días / Splits
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{r.name}</h3>
                <p className="text-xs text-slate-400 mb-4">{r.notes || "Sin notas adicionales"}</p>

                {/* Resumen de Días */}
                <div className="space-y-2 mb-4">
                  {r.days?.map((d: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs"
                    >
                      <span className="font-semibold text-slate-200 block">{d.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {d.exercises?.length || 0} ejercicios asignados
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">Plantilla Maestra</span>
                <button className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
                  <Copy className="w-3.5 h-3.5" />
                  <span>Asignar a Socio</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISTA 2: Creador de Rutina */}
      {activeView === "create" && (
        <form onSubmit={handleSaveRoutine} className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              1. Configuración General del Plan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Nombre del Plan *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Hipertrofia 4 Días - Nivel Intermedio"
                  value={routineName}
                  onChange={(e) => setRoutineName(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Objetivo Principal *</label>
                <select
                  value={routineGoal}
                  onChange={(e) => setRoutineGoal(e.target.value as any)}
                  className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400 text-xs"
                >
                  <option value="HYPERTROPHY">💪 Hipertrofia / Masa Muscular</option>
                  <option value="STRENGTH">🏋️ Fuerza Máxima</option>
                  <option value="FAT_LOSS">🔥 Pérdida de Grasa / Definición</option>
                  <option value="ENDURANCE">⚡ Resistencia</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isTemplate"
                  checked={isTemplate}
                  onChange={(e) => setIsTemplate(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <label htmlFor="isTemplate" className="text-slate-300 font-semibold cursor-pointer">
                  Guardar como Plantilla Reutilizable
                </label>
              </div>
            </div>
          </div>

          {/* Días y Ejercicios */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                2. Días de Entrenamiento (Splits)
              </h3>
              <button
                type="button"
                onClick={handleAddDay}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 hover:text-emerald-300 font-semibold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Día</span>
              </button>
            </div>

            {days.map((day, dIdx) => (
              <div key={dIdx} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <input
                    type="text"
                    value={day.name}
                    onChange={(e) => {
                      const upd = [...days];
                      upd[dIdx].name = e.target.value;
                      setDays(upd);
                    }}
                    className="bg-transparent text-sm font-bold text-white border-b border-dashed border-slate-700 focus:border-emerald-400 outline-none pb-0.5 w-72"
                  />

                  {/* Selector de Ejercicio */}
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        handleAddExerciseToDay(dIdx, e.target.value);
                        e.target.value = "";
                      }}
                      defaultValue=""
                      className="h-9 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs outline-none focus:border-emerald-400"
                    >
                      <option value="" disabled>
                        + Agregar Ejercicio...
                      </option>
                      {exercisesList.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name} ({ex.muscleGroup})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Lista de Ejercicios del Día */}
                {day.exercises.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    Selecciona ejercicios de la biblioteca para agregarlos a este día.
                  </p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {day.exercises.map((ex: any, exIdx: number) => (
                      <div
                        key={exIdx}
                        className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 font-mono font-bold flex items-center justify-center text-[11px]">
                            {exIdx + 1}
                          </span>
                          <span className="font-bold text-white">{ex.name}</span>
                        </div>

                        <div className="flex items-center gap-3 font-mono">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">Series:</span>
                            <input
                              type="number"
                              min={1}
                              value={ex.targetSets}
                              onChange={(e) => {
                                const upd = [...days];
                                upd[dIdx].exercises[exIdx].targetSets = Number(e.target.value);
                                setDays(upd);
                              }}
                              className="w-12 h-7 bg-slate-900 border border-slate-800 rounded-lg text-center text-white font-bold"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">Reps:</span>
                            <input
                              type="text"
                              value={ex.targetReps}
                              onChange={(e) => {
                                const upd = [...days];
                                upd[dIdx].exercises[exIdx].targetReps = e.target.value;
                                setDays(upd);
                              }}
                              className="w-16 h-7 bg-slate-900 border border-slate-800 rounded-lg text-center text-white font-bold"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <input
                              type="number"
                              min={10}
                              step={15}
                              value={ex.restSeconds}
                              onChange={(e) => {
                                const upd = [...days];
                                upd[dIdx].exercises[exIdx].restSeconds = Number(e.target.value);
                                setDays(upd);
                              }}
                              className="w-14 h-7 bg-slate-900 border border-slate-800 rounded-lg text-center text-white font-bold"
                            />
                            <span className="text-slate-500">s</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(dIdx, exIdx)}
                            className="p-1.5 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setActiveView("list")}
              className="px-5 py-2.5 rounded-2xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              Guardar Rutina
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
