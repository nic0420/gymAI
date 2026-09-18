"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileText
} from "lucide-react";

interface CashRegisterViewProps {
  tenantId: string;
  branchId: string;
}

export function CashRegisterView({ tenantId, branchId }: CashRegisterViewProps) {
  const [shiftData, setShiftData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);

  // Estados de formularios
  const [initialCash, setInitialCash] = useState(15000);
  const [declaredCash, setDeclaredCash] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("INSUMOS_LIMPIEZA");
  const [expenseDesc, setExpenseDesc] = useState("");

  const [closeSummary, setCloseSummary] = useState<any>(null);

  const fetchCashShift = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/finance/cash-shifts?tenantId=${tenantId}&branchId=${branchId}`);
      const data = await res.json();
      if (data.success) {
        setShiftData(data.data);
      }
    } catch (err) {
      console.error("Error al consultar caja:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashShift();
  }, [tenantId, branchId]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/finance/cash-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          branchId,
          openedByUserId: "USER_RECEPCION",
          initialCash: Number(initialCash),
        }),
      });
      if (res.ok) {
        setOpenModal(false);
        fetchCashShift();
      }
    } catch (err) {
      console.error("Error al abrir caja:", err);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftData?.shift?.id) return;
    try {
      const res = await fetch("/api/v1/finance/cash-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          cashShiftId: shiftData.shift.id,
          type: "EXPENSE",
          category: expenseCategory,
          amount: Number(expenseAmount),
          description: expenseDesc,
          registeredByUserId: "USER_RECEPCION",
        }),
      });
      if (res.ok) {
        setExpenseModal(false);
        setExpenseAmount("");
        setExpenseDesc("");
        fetchCashShift();
      }
    } catch (err) {
      console.error("Error al registrar egreso:", err);
    }
  };

  const handleCloseShiftBlind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftData?.shift?.id) return;
    try {
      const res = await fetch("/api/v1/finance/cash-shifts/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashShiftId: shiftData.shift.id,
          closedByUserId: "USER_RECEPCION",
          declaredCash: Number(declaredCash),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCloseSummary(data.data);
        setCloseModal(false);
        setShiftData(null);
      }
    } catch (err) {
      console.error("Error al cerrar caja:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header de Caja */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            Caja Diaria & Arqueo Ciego
          </h2>
          <p className="text-xs text-slate-400">
            Control de turnos, registro de egresos y cuadre estricto de efectivo
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCashShift}
            disabled={loading}
            className="h-11 px-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          {!shiftData?.shift ? (
            <button
              onClick={() => setOpenModal(true)}
              className="h-11 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Turno de Caja</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpenseModal(true)}
                className="h-11 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-bold flex items-center gap-1.5 border border-rose-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Registrar Gasto</span>
              </button>
              <button
                onClick={() => setCloseModal(true)}
                className="h-11 px-4 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>Cierre Ciego de Turno</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resumen del Cierre Reciente si existe */}
      {closeSummary && (
        <div className="p-6 rounded-3xl bg-slate-950 border border-emerald-500/40 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Auditoría de Cierre de Caja Realizado
            </h3>
            <span className="text-xs font-mono text-slate-500">
              {new Date(closeSummary.closedAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-900 rounded-xl">
              <span className="text-slate-500 block">Fondo Inicial</span>
              <span className="text-base font-bold text-white">${closeSummary.initialCash.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl">
              <span className="text-slate-500 block">Ingresos Efectivo</span>
              <span className="text-base font-bold text-emerald-400">+${closeSummary.totalCashIncomes.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl">
              <span className="text-slate-500 block">Egresos Menores</span>
              <span className="text-base font-bold text-rose-400">-${closeSummary.totalCashExpenses.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl">
              <span className="text-slate-500 block">Esperado Teórico</span>
              <span className="text-base font-bold text-white">${closeSummary.systemExpectedCash.toLocaleString()}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Declarado por el Recepcionista (Ciego):</span>
              <span className="text-lg font-bold text-white font-mono">${closeSummary.declaredCash.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Diferencia de Cuadre:</span>
              <span
                className={`text-lg font-black font-mono ${
                  closeSummary.differenceCash === 0
                    ? "text-emerald-400"
                    : closeSummary.differenceCash < 0
                    ? "text-rose-400"
                    : "text-amber-400"
                }`}
              >
                {closeSummary.differenceCash === 0
                  ? "CUADRE PERFECTO ($0)"
                  : closeSummary.differenceCash < 0
                  ? `FALTANTE -$${Math.abs(closeSummary.differenceCash).toLocaleString()}`
                  : `SOBRANTE +$${closeSummary.differenceCash.toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Métricas de la Caja Activa */}
      {shiftData?.shift ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 font-semibold block">Fondo Inicial</span>
            <p className="text-2xl font-black text-white font-mono mt-1">
              ${shiftData.summary?.initialCash?.toLocaleString()}
            </p>
            <span className="text-[10px] text-slate-500">Declarado al abrir turno</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Ingresos en Efectivo
            </span>
            <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
              +${shiftData.summary?.totalIncomes?.toLocaleString()}
            </p>
            <span className="text-[10px] text-slate-500">Cobros en mostrador</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              Egresos / Gastos
            </span>
            <p className="text-2xl font-black text-rose-400 font-mono mt-1">
              -${shiftData.summary?.totalExpenses?.toLocaleString()}
            </p>
            <span className="text-[10px] text-slate-500">Gastos menores justificados</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-xs text-emerald-400 font-bold block">Efectivo en Cajón (En Vivo)</span>
            <p className="text-2xl font-black text-white font-mono mt-1">
              ${shiftData.summary?.currentCalculatedCash?.toLocaleString()}
            </p>
            <span className="text-[10px] text-emerald-400/80">Saldo calculado en tiempo real</span>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-10 rounded-3xl border border-slate-800 text-center flex flex-col items-center justify-center">
          <Lock className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-white">No hay ninguna caja abierta</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Para comenzar a registrar cobros en efectivo y ventas de mostrador, abre un turno declarando el fondo de cambio.
          </p>
        </div>
      )}

      {/* Historial de Movimientos de la Caja */}
      {shiftData?.movements && shiftData.movements.length > 0 && (
        <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Movimientos del Turno Activo
            </h4>
            <span className="text-xs text-slate-500 font-mono">
              {shiftData.movements.length} registro(s)
            </span>
          </div>
          <div className="divide-y divide-slate-800/60 text-xs">
            {shiftData.movements.map((m: any) => (
              <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      m.type === "INCOME"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {m.type === "INCOME" ? "+" : "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-white block">{m.description}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{m.category}</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span
                    className={`font-bold block ${
                      m.type === "INCOME" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {m.type === "INCOME" ? "+" : "-"}${m.amount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Apertura de Caja */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-400" />
              Apertura de Turno de Caja
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Declara el fondo inicial en billetes para dar cambio al comenzar el turno.
            </p>
            <form onSubmit={handleOpenShift} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Fondo de Cambio Inicial ($) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={initialCash}
                  onChange={(e) => setInitialCash(Number(e.target.value))}
                  className="w-full h-12 px-4 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-lg font-bold outline-none focus:border-emerald-400"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                >
                  Abrir Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Gasto Menor */}
      {expenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-400" />
              Registrar Egreso de Caja
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Registra una salida de dinero en efectivo justificando el motivo y categoría.
            </p>
            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Categoría *</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400 text-xs"
                >
                  <option value="INSUMOS_LIMPIEZA">Artículos de Limpieza</option>
                  <option value="BIDON_AGUA">Bidón de Agua</option>
                  <option value="FLETE">Flete / Encomienda</option>
                  <option value="LIBRERIA">Librería / Impresiones</option>
                  <option value="MANTENIMIENTO">Mantenimiento Rápido</option>
                  <option value="OTROS">Otros Gastos</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 mb-1 block">Monto en Efectivo ($) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="ej. 3500"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm font-bold outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="text-slate-400 mb-1 block">Motivo / Descripción *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Compra de lavandina y trapos"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cierre Ciego de Turno */}
      {closeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-rose-400" />
              Cierre Ciego de Turno (Blind Closing)
            </h3>
            <div className="p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Cuenta físicamente todos los billetes del cajón e ingresa el importe. El sistema calculará el cuadre automáticamente.
              </span>
            </div>
            <form onSubmit={handleCloseShiftBlind} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Efectivo Físico Contado ($) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="Total en cajón..."
                  value={declaredCash}
                  onChange={(e) => setDeclaredCash(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-950 border-2 border-slate-700 focus:border-rose-400 rounded-xl text-white font-mono text-xl font-bold outline-none text-center"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCloseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!declaredCash}
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold disabled:opacity-50"
                >
                  Cerrar & Sellar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
