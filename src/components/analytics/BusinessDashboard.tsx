"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Clock,
  Flame,
  Calendar,
  RefreshCw,
  AlertCircle
} from "lucide-react";

interface BusinessDashboardProps {
  tenantId: string;
}

export function BusinessDashboard({ tenantId }: BusinessDashboardProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/analytics/dashboard?tenantId=${tenantId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Error al cargar analíticas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [tenantId]);

  // Generar color de intensidad para el mapa de calor
  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-slate-900/60 border-slate-800 text-slate-600";
    if (count <= 2) return "bg-emerald-950/40 border-emerald-500/20 text-emerald-400";
    if (count <= 5) return "bg-emerald-900/50 border-emerald-500/40 text-emerald-300 font-bold";
    if (count <= 10) return "bg-amber-900/50 border-amber-500/40 text-amber-300 font-bold";
    return "bg-rose-900/60 border-rose-500/50 text-rose-300 font-black shadow-lg shadow-rose-500/20";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            Executive Business Intelligence & Analíticas
          </h2>
          <p className="text-xs text-slate-400">
            Métricas clave de negocio, mapa de calor de afluencia horaria y retención
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="h-11 px-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            MRR / Facturación
          </span>
          <p className="text-2xl font-black text-white font-mono mt-1">
            ${data?.monthlyRecurringRevenue?.toLocaleString() || "0"}
          </p>
          <span className="text-[10px] text-slate-500">Ingresos consolidados del mes</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Users className="w-4 h-4 text-sky-400" />
            Socios Activos
          </span>
          <p className="text-2xl font-black text-sky-400 font-mono mt-1">
            {data?.activeMembers || 0}
          </p>
          <span className="text-[10px] text-slate-500">
            Total en padrón: {data?.totalMembers || 0}
          </span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            Morosos / Vencidos
          </span>
          <p className="text-2xl font-black text-rose-400 font-mono mt-1">
            {data?.debtorMembers || 0}
          </p>
          <span className="text-[10px] text-slate-500">Requieren regularización de pago</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            Horario Pico Máximo
          </span>
          <p className="text-sm font-bold text-amber-300 font-mono mt-1">
            {data?.peakHourDescription || "Calculando..."}
          </p>
          <span className="text-[10px] text-slate-500">Mayor concentración de accesos</span>
        </div>
      </div>

      {/* Mapa de Calor de Horarios Pico (7 x 24) */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Mapa de Calor de Afluencia Semanal (Horarios Pico)
            </h3>
            <p className="text-xs text-slate-400">
              Distribución de check-ins en tiempo real de 06:00 a 22:00 hs para dimensionar personal
            </p>
          </div>

          {/* Leyenda de Intensidad */}
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span>Baja</span>
            <div className="flex gap-1">
              <span className="w-3 h-3 rounded bg-emerald-950/40 border border-emerald-500/20"></span>
              <span className="w-3 h-3 rounded bg-emerald-900/50 border border-emerald-500/40"></span>
              <span className="w-3 h-3 rounded bg-amber-900/50 border border-amber-500/40"></span>
              <span className="w-3 h-3 rounded bg-rose-900/60 border border-rose-500/50"></span>
            </div>
            <span>Pico</span>
          </div>
        </div>

        {/* Matriz del Heatmap */}
        <div className="overflow-x-auto">
          <div className="min-w-[700px] space-y-2 text-xs">
            {/* Cabecera de Horas (06hs a 22hs) */}
            <div className="grid grid-cols-18 gap-1.5 text-[10px] font-mono text-slate-500 text-center">
              <div className="col-span-2 text-left font-bold text-slate-400">Día</div>
              {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => (
                <div key={h} className="col-span-1">
                  {h}h
                </div>
              ))}
            </div>

            {/* Filas por Día */}
            {data?.peakHoursHeatmap?.map((day: any, dIdx: number) => (
              <div key={dIdx} className="grid grid-cols-18 gap-1.5 items-center">
                <div className="col-span-2 text-xs font-semibold text-slate-300 truncate">
                  {day.dayName}
                </div>
                {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => {
                  const count = day.hourlyCounts[h] || 0;
                  return (
                    <div
                      key={h}
                      title={`${day.dayName} a las ${h}:00 hs: ${count} accesos`}
                      className={`col-span-1 h-8 rounded-lg border flex items-center justify-center font-mono text-[10px] cursor-pointer transition-all hover:scale-105 ${getHeatmapColor(
                        count
                      )}`}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
