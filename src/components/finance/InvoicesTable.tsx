"use client";

import React, { useState, useEffect } from "react";
import { FileText, DollarSign, Search, RefreshCw, CheckCircle2, Clock, Download, MessageCircle } from "lucide-react";
import { QuickPaymentModal } from "./QuickPaymentModal";
import { exportInvoicesToCsv } from "@/lib/export/csv-exporter";
import { generateWhatsAppLink } from "@/lib/whatsapp/whatsapp-helper";

interface InvoicesTableProps {
  tenantId: string;
  cashShiftId?: string;
}

export function InvoicesTable({ tenantId, cashShiftId }: InvoicesTableProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/finance/invoices?tenantId=${tenantId}`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data || []);
      }
    } catch (err) {
      console.error("Error al cargar facturas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [tenantId]);

  const handleExportCsv = () => {
    if (invoices.length === 0) return;
    exportInvoicesToCsv(invoices, `facturas_gym_${new Date().toISOString().split("T")[0]}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          Facturas & Obligaciones de Cobro
        </h3>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={invoices.length === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 flex items-center gap-1.5 text-xs font-semibold transition-all disabled:opacity-50"
            title="Descargar Excel para el Contador"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Descargar Excel</span>
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-6">Comprobante</th>
                <th className="py-3 px-6">Monto Total</th>
                <th className="py-3 px-6">Cobrado</th>
                <th className="py-3 px-6">Saldo Pendiente</th>
                <th className="py-3 px-6">Estado</th>
                <th className="py-3 px-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Cargando facturas...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No hay facturas emitidas en el sistema.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const remaining = inv.totalAmount - inv.paidAmount;
                  const isPending = inv.status !== "PAID";
                  const waUrl = generateWhatsAppLink({
                    memberName: "Socio",
                    type: "DEBT_REMINDER",
                    amount: remaining,
                    dueDate: inv.dueDate,
                    gymName: "GymAI",
                  });

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-6 font-mono font-bold text-white">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-6 font-mono">${inv.totalAmount.toLocaleString()}</td>
                      <td className="py-3 px-6 font-mono text-emerald-400">
                        ${inv.paidAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-6 font-mono font-bold text-white">
                        ${remaining.toLocaleString()}
                      </td>
                      <td className="py-3 px-6">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === "PAID"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : inv.status === "PARTIALLY_PAID"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {inv.status === "PAID"
                            ? "Cobrada"
                            : inv.status === "PARTIALLY_PAID"
                            ? "Pago Parcial"
                            : "Pendiente"}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right flex items-center justify-end gap-2">
                        {isPending && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-colors"
                            title="Enviar Link de Pago por WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {isPending && (
                          <button
                            onClick={() =>
                              setSelectedInvoice({
                                id: inv.id,
                                invoiceNumber: inv.invoiceNumber,
                                totalAmount: inv.totalAmount,
                                paidAmount: inv.paidAmount,
                                remainingAmount: remaining,
                                memberName: "Socio",
                              })
                            }
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black font-bold text-xs border border-emerald-500/30 transition-all flex items-center gap-1"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Cobrar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInvoice && (
        <QuickPaymentModal
          isOpen={Boolean(selectedInvoice)}
          onClose={() => setSelectedInvoice(null)}
          tenantId={tenantId}
          invoice={selectedInvoice}
          cashShiftId={cashShiftId}
          onPaymentSuccess={fetchInvoices}
        />
      )}
    </div>
  );
}
