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
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Info,
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

  // Generar color de intensidad para el mapa de calor (Vercel/Linear dark theme)
  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-zinc-900/60 border-zinc-800 text-zinc-600";
    if (count <= 2) return "bg-blue-950/40 border-blue-500/20 text-blue-400";
    if (count <= 5) return "bg-blue-900/50 border-blue-500/40 text-blue-300 font-bold";
    if (count <= 10) return "bg-emerald-900/50 border-emerald-500/40 text-emerald-300 font-bold";
    return "bg-rose-900/60 border-rose-500/50 text-rose-300 font-black shadow-lg shadow-rose-500/20";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Executive Business Intelligence & Analíticas
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Métricas clave de negocio, mapa de calor de afluencia horaria 7x24 y retención de membresías.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center gap-2 text-xs font-semibold transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {/* KPI Cards with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: MRR */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              MRR / Facturación
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> +12.4%
            </span>
          </div>
          <div className="my-3">
            <p className="text-2xl font-black text-white font-mono tracking-tight">
              ${data?.monthlyRecurringRevenue?.toLocaleString() || "0"}
            </p>
            {/* Sparkline Graphic */}
            <div className="flex items-end gap-1 h-6 mt-2 pt-1 border-t border-zinc-800/80">
              <div className="w-full bg-emerald-500/20 rounded-t h-[40%]" />
              <div className="w-full bg-emerald-500/30 rounded-t h-[60%]" />
              <div className="w-full bg-emerald-500/40 rounded-t h-[50%]" />
              <div className="w-full bg-emerald-500/50 rounded-t h-[75%]" />
              <div className="w-full bg-emerald-500/70 rounded-t h-[65%]" />
              <div className="w-full bg-emerald-500/90 rounded-t h-[90%]" />
              <div className="w-full bg-emerald-400 rounded-t h-[100%]" />
            </div>
          </div>
          <span className="text-[11px] text-zinc-500">Ingresos consolidados del mes activo</span>
        </div>

        {/* Card 2: Socios Activos */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-400" />
              Socios Activos
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> +4.1%
            </span>
          </div>
          <div className="my-3">
            <p className="text-2xl font-black text-blue-400 font-mono tracking-tight">
              {data?.activeMembers || 0}
            </p>
            {/* Sparkline Graphic */}
            <div className="flex items-end gap-1 h-6 mt-2 pt-1 border-t border-zinc-800/80">
              <div className="w-full bg-blue-500/20 rounded-t h-[50%]" />
              <div className="w-full bg-blue-500/30 rounded-t h-[55%]" />
              <div className="w-full bg-blue-500/40 rounded-t h-[70%]" />
              <div className="w-full bg-blue-500/60 rounded-t h-[65%]" />
              <div className="w-full bg-blue-500/80 rounded-t h-[80%]" />
              <div className="w-full bg-blue-400 rounded-t h-[100%]" />
            </div>
          </div>
          <span className="text-[11px] text-zinc-500">
            Total en padrón histórico: {data?.totalMembers || 0}
          </span>
        </div>

        {/* Card 3: Morosos / Vencidos */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              Morosos / Vencidos
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              Atención
            </span>
          </div>
          <div className="my-3">
            <p className="text-2xl font-black text-rose-400 font-mono tracking-tight">
              {data?.debtorMembers || 0}
            </p>
            {/* Indicator Bar */}
            <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-4 overflow-hidden">
              <div
                className="bg-rose-500 h-1.5 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    ((data?.debtorMembers || 0) / (data?.totalMembers || 1)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
          <span className="text-[11px] text-zinc-500">Requieren regularización de pago</span>
        </div>

        {/* Card 4: Horario Pico */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              Horario Pico Máximo
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Staff Alert
            </span>
          </div>
          <div className="my-3">
            <p className="text-sm font-bold text-amber-300 font-mono mt-1">
              {data?.peakHourDescription || "18:00 - 20:00 hs"}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Mayor afluencia en mostrador</span>
            </div>
          </div>
          <span className="text-[11px] text-zinc-500">Optimizar instructores y recepción</span>
        </div>
      </div>

      {/* Mapa de Calor de Horarios Pico (7 x 24) */}
      <div className="glass-panel p-6 rounded-3xl border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-zinc-800 gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Mapa de Calor de Afluencia Semanal (7x24 Matrix)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Distribución de check-ins de 06:00 a 22:00 hs para dimensionar personal y limpieza.
            </p>
          </div>

          {/* Leyenda de Intensidad */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
            <span>Baja</span>
            <div className="flex gap-1 items-center">
              <span className="w-3 h-3 rounded bg-zinc-900 border border-zinc-800" />
              <span className="w-3 h-3 rounded bg-blue-950/60 border border-blue-500/20" />
              <span className="w-3 h-3 rounded bg-blue-900/60 border border-blue-500/40" />
              <span className="w-3 h-3 rounded bg-emerald-900/60 border border-emerald-500/40" />
              <span className="w-3 h-3 rounded bg-rose-900/60 border border-rose-500/50" />
            </div>
            <span>Pico</span>
          </div>
        </div>

        {/* Matriz del Heatmap */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[700px] space-y-2 text-xs">
            {/* Cabecera de Horas (06hs a 22hs) */}
            <div className="grid grid-cols-18 gap-1.5 text-[10px] font-mono text-zinc-500 text-center">
              <div className="col-span-2 text-left font-bold text-zinc-400">Día</div>
              {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => (
                <div key={h} className="col-span-1">
                  {h}h
                </div>
              ))}
            </div>

            {/* Filas por Día */}
            {data?.peakHoursHeatmap?.map((day: any, dIdx: number) => (
              <div key={dIdx} className="grid grid-cols-18 gap-1.5 items-center">
                <div className="col-span-2 text-xs font-semibold text-zinc-300 truncate">
                  {day.dayName}
                </div>
                {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => {
                  const count = day.hourlyCounts[h] || 0;
                  return (
                    <div
                      key={h}
                      title={`${day.dayName} a las ${h}:00 hs: ${count} accesos registrados`}
                      className={`col-span-1 h-8 rounded-lg border flex items-center justify-center font-mono text-[10px] cursor-pointer transition-all hover:scale-110 ${getHeatmapColor(
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

