"use client";

import React, { useState } from "react";
import { X, UserPlus, ShieldAlert, HeartPulse, Check, UserCheck } from "lucide-react";

interface MemberRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onMemberCreated: () => void;
}

export function MemberRegistrationModal({
  isOpen,
  onClose,
  tenantId,
  onMemberCreated,
}: MemberRegistrationModalProps) {
  const [formData, setFormData] = useState({
    dni: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: "",
    role: "SOCIO",
    medicalClearanceStatus: "PENDING_REVIEW",
    clearanceExpiryDate: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    bloodType: "UNKNOWN",
    conditions: "",
    medications: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tenantId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al registrar socio");
      }

      setSuccessMsg(`¡Socio registrado con éxito! ${data.data?.initialPasswordHint || ""}`);
      setTimeout(() => {
        onMemberCreated();
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Alta de Nuevo Socio</h2>
            <p className="text-xs text-slate-400">Completa los datos personales y la ficha médica inicial</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Sección 1: Datos Personales */}
          <div>
            <h3 className="font-bold text-slate-300 mb-3 uppercase tracking-wider text-[11px]">
              1. Datos Personales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 mb-1 block">DNI / Identificación *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. 38444555"
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="socio@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder="Lucas"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Apellido *</label>
                <input
                  type="text"
                  required
                  placeholder="García"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  placeholder="+54 9 11 1234-5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Ficha Médica y Apto Físico */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="font-bold text-slate-300 mb-3 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
              2. Ficha Médica & Emergencias
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 mb-1 block">Estado del Apto Médico</label>
                <select
                  value={formData.medicalClearanceStatus}
                  onChange={(e) => setFormData({ ...formData, medicalClearanceStatus: e.target.value as any })}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400"
                >
                  <option value="VALID">Válido / Presentado</option>
                  <option value="PENDING_REVIEW">Pendiente de Entrega</option>
                  <option value="EXPIRED">Vencido</option>
                  <option value="REJECTED">Rechazado</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Fecha Vencimiento Apto</label>
                <input
                  type="date"
                  value={formData.clearanceExpiryDate}
                  onChange={(e) => setFormData({ ...formData, clearanceExpiryDate: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Contacto de Emergencia</label>
                <input
                  type="text"
                  placeholder="Nombre y relación (ej. Mamá)"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Teléfono de Emergencia</label>
                <input
                  type="text"
                  placeholder="+54 9 11 9999-8888"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-400 mb-1 block">
                  Lesiones previas / Condiciones de Salud (Cifrado AES-256)
                </label>
                <input
                  type="text"
                  placeholder="ej. Cirugía de rodilla, asma leve"
                  value={formData.conditions}
                  onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Registrar Socio</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
