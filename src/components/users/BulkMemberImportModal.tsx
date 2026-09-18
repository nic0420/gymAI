"use client";

import React, { useState } from "react";
import { X, UploadCloud, FileSpreadsheet, Check, AlertCircle, RefreshCw, Download } from "lucide-react";

interface BulkMemberImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onImportCompleted: () => void;
}

export function BulkMemberImportModal({
  isOpen,
  onClose,
  tenantId,
  onImportCompleted,
}: BulkMemberImportModalProps) {
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  // Parser simple e isomórfico para CSV / TSV / Excel copiado
  const handleParseText = (text: string) => {
    setCsvText(text);
    setResultMessage(null);

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    const firstLine = lines[0];
    const delimiter = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";

    // Revisar si la primera línea es encabezado
    const hasHeader =
      firstLine.toLowerCase().includes("dni") ||
      firstLine.toLowerCase().includes("nombre") ||
      firstLine.toLowerCase().includes("apellido");

    const dataLines = hasHeader ? lines.slice(1) : lines;

    const parsed = dataLines.map((line) => {
      const cols = line.split(delimiter).map((c) => c.replace(/^"|"$/g, "").trim());
      return {
        dni: cols[0] || "",
        firstName: cols[1] || "",
        lastName: cols[2] || "",
        email: cols[3] || "",
        phone: cols[4] || "",
        planName: cols[5] || "Pase Libre",
        status: (cols[6] || "ACTIVE").toUpperCase() as "ACTIVE" | "DEBTOR",
      };
    });

    setParsedRows(parsed.filter((r) => r.dni && r.firstName));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParseText(content);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setLoading(true);
    setResultMessage(null);

    try {
      const res = await fetch("/api/v1/users/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          members: parsedRows,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResultMessage({
          success: true,
          message: `¡Importación exitosa! Se cargaron ${data.data.importedCount} socios y se omitieron ${data.data.skippedCount} duplicados.`,
        });
        setTimeout(() => {
          onImportCompleted();
          onClose();
        }, 1500);
      } else {
        setResultMessage({
          success: false,
          message: data.error || "Error al procesar la importación masiva",
        });
      }
    } catch (err: any) {
      setResultMessage({
        success: false,
        message: err.message || "Error de red al importar socios",
      });
    } finally {
      setLoading(false);
    }
  };

  const sampleCsv = `DNI;Nombre;Apellido;Email;Telefono;Plan;Estado\n40123456;Matias;Suarez;matias@gmail.com;1144556677;Pase Libre;ACTIVE\n38999888;Camila;Gomez;camila@gmail.com;1133221100;Crossfit;ACTIVE\n42111222;Lucas;Fernandez;lucas@gmail.com;1188990011;Musculacion;DEBTOR`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-800 bg-slate-950 p-6 md:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Importador Masivo de Socios</h2>
              <p className="text-xs text-slate-400">Pega los datos o sube tu archivo Excel / CSV</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Zona de Arrastrar o Botón */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-3">
              <UploadCloud className="w-6 h-6 text-emerald-400" />
              <div>
                <p className="text-xs font-semibold text-white">Subir archivo .CSV o .TXT</p>
                <p className="text-[11px] text-slate-500">Separado por comas, punto y coma o tabulaciones</p>
              </div>
            </div>
            <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer transition-colors shrink-0">
              <span>Seleccionar Archivo</span>
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Área de Texto Directo */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-400">
                O pega directamente las filas copiadas de tu Excel:
              </label>
              <button
                type="button"
                onClick={() => handleParseText(sampleCsv)}
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Cargar ejemplo</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => handleParseText(e.target.value)}
              placeholder={`DNI;Nombre;Apellido;Email;Telefono;Plan;Estado\n40123456;Juan;Perez;juan@gmail.com;1144556677;Pase Libre;ACTIVE`}
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-mono text-white placeholder:text-slate-600 outline-none focus:border-emerald-400 resize-none"
            ></textarea>
          </div>

          {/* Vista Previa de Filas Detectadas */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  Vista Previa ({parsedRows.length} socios listos para importar):
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                  Validados
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/40">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">DNI</th>
                      <th className="py-2 px-3">Nombre Completo</th>
                      <th className="py-2 px-3">Email / Tel</th>
                      <th className="py-2 px-3">Plan</th>
                      <th className="py-2 px-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {parsedRows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 font-mono text-white">{r.dni}</td>
                        <td className="py-2 px-3 font-semibold">
                          {r.firstName} {r.lastName}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{r.email || r.phone || "-"}</td>
                        <td className="py-2 px-3 text-slate-400">{r.planName}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              r.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 10 && (
                <p className="text-[11px] text-slate-500 text-center">
                  ... y {parsedRows.length - 10} socios más en la lista.
                </p>
              )}
            </div>
          )}

          {/* Mensajes de Resultado */}
          {resultMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 border ${
                resultMessage.success
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}
            >
              {resultMessage.success ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{resultMessage.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={loading || parsedRows.length === 0}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>Importar {parsedRows.length} Socios</span>
          </button>
        </div>
      </div>
    </div>
  );
}
