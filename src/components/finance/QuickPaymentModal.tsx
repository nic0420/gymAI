"use client";

import React, { useState } from "react";
import { X, CreditCard, Banknote, QrCode, CheckCircle2, AlertCircle, Plus, Trash2 } from "lucide-react";

interface QuickPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    memberName: string;
  };
  cashShiftId?: string;
  onPaymentSuccess: () => void;
}

export function QuickPaymentModal({
  isOpen,
  onClose,
  tenantId,
  invoice,
  cashShiftId,
  onPaymentSuccess,
}: QuickPaymentModalProps) {
  const [splits, setSplits] = useState<
    { amount: number; paymentMethod: "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "MERCADO_PAGO_QR" | "BANK_TRANSFER" }[]
  >([
    {
      amount: invoice.remainingAmount,
      paymentMethod: "CASH",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalSplits = splits.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const difference = invoice.remainingAmount - totalSplits;

  const handleAddSplit = () => {
    if (difference > 0) {
      setSplits([...splits, { amount: difference, paymentMethod: "MERCADO_PAGO_QR" }]);
    }
  };

  const handleRemoveSplit = (index: number) => {
    if (splits.length > 1) {
      setSplits(splits.filter((_, idx) => idx !== index));
    }
  };

  const handleSplitChange = (index: number, field: string, value: any) => {
    const updated = [...splits];
    updated[index] = {
      ...updated[index],
      [field]: field === "amount" ? Number(value) : value,
    };
    setSplits(updated);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalSplits <= 0) {
      setErrorMsg("El monto a pagar debe ser mayor a 0");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          invoiceId: invoice.id,
          cashShiftId: cashShiftId || undefined,
          splits,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al liquidar pago");
      }

      setSuccessMsg(
        `¡Pago registrado exitosamente! ${
          data.data?.subscriptionActivated ? "🎉 Membresía activada al día." : ""
        }`
      );

      setTimeout(() => {
        onPaymentSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Cobro en Mostrador</h2>
            <p className="text-xs text-slate-400">
              {invoice.invoiceNumber} • Socio: <strong>{invoice.memberName}</strong>
            </p>
          </div>
        </div>

        {/* Resumen de Factura */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 mb-5 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 block">Total a Cobrar</span>
            <span className="text-xl font-black text-white font-mono">
              ${invoice.remainingAmount.toLocaleString()}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block">Estado Actual</span>
            <span className="font-bold text-amber-400 uppercase text-[11px]">
              {invoice.paidAmount > 0 ? "Saldo Parcial" : "Pendiente"}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                Métodos de Pago (Split Payments)
              </label>
              {difference > 0 && (
                <button
                  type="button"
                  onClick={handleAddSplit}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold text-[11px]"
                >
                  <Plus className="w-3 h-3" />
                  Dividir Pago
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {splits.map((split, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5"
                >
                  <select
                    value={split.paymentMethod}
                    onChange={(e) => handleSplitChange(idx, "paymentMethod", e.target.value)}
                    className="h-10 px-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400 text-xs"
                  >
                    <option value="CASH">💵 Efectivo</option>
                    <option value="MERCADO_PAGO_QR">📱 Mercado Pago QR</option>
                    <option value="DEBIT_CARD">💳 Tarjeta Débito</option>
                    <option value="CREDIT_CARD">💳 Tarjeta Crédito</option>
                    <option value="BANK_TRANSFER">🏦 Transferencia</option>
                  </select>

                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                    <input
                      type="number"
                      required
                      min={1}
                      max={invoice.remainingAmount}
                      value={split.amount || ""}
                      onChange={(e) => handleSplitChange(idx, "amount", e.target.value)}
                      placeholder="Monto..."
                      className="w-full h-10 pl-7 pr-3 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono font-bold outline-none focus:border-emerald-400 text-xs"
                    />
                  </div>

                  {splits.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSplit(idx)}
                      className="text-slate-500 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Balance del Pago */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total a liquidar:</span>
            <span
              className={`font-mono font-bold ${
                difference === 0
                  ? "text-emerald-400"
                  : difference > 0
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              ${totalSplits.toLocaleString()} {difference !== 0 && `(Resta: $${difference.toLocaleString()})`}
            </span>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || totalSplits <= 0}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 active:scale-95 transition-all"
            >
              {loading ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Cobro</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
