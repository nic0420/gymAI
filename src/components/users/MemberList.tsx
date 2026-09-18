"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Search,
  UserPlus,
  Shield,
  Activity,
  RefreshCw,
  FileSpreadsheet,
  Download,
  MessageCircle,
} from "lucide-react";
import { MemberRegistrationModal } from "./MemberRegistrationModal";
import { BulkMemberImportModal } from "./BulkMemberImportModal";
import { exportMembersToCsv } from "@/lib/export/csv-exporter";
import { generateWhatsAppLink } from "@/lib/whatsapp/whatsapp-helper";

interface MemberListProps {
  tenantId: string;
}

export function MemberList({ tenantId }: MemberListProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const url = `/api/v1/users?tenantId=${tenantId}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMembers(data.data || []);
      }
    } catch (err) {
      console.error("Error al cargar socios:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [tenantId, search]);

  const handleExportCsv = () => {
    if (members.length === 0) return;
    exportMembersToCsv(members, `padron_socios_${new Date().toISOString().split("T")[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Acciones */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por DNI, Nombre o Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-emerald-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={fetchMembers}
            disabled={loading}
            className="h-11 px-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={members.length === 0}
            className="h-11 px-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 flex items-center gap-1.5 text-xs font-semibold transition-all disabled:opacity-50"
            title="Exportar a Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="h-11 px-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Importar CSV</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="h-11 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Socio</span>
          </button>
        </div>
      </div>

      {/* Tabla de Socios */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Socio</th>
                <th className="py-3.5 px-6">DNI</th>
                <th className="py-3.5 px-6">Rol</th>
                <th className="py-3.5 px-6">Estado</th>
                <th className="py-3.5 px-6">Fecha Alta</th>
                <th className="py-3.5 px-6 text-right">Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading && members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Cargando listado de socios...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No se encontraron socios registrados.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const isDebtor = member.status === "DEBTOR" || member.status === "SUSPENDED";
                  const waUrl = generateWhatsAppLink({
                    phone: member.phone,
                    memberName: member.firstName,
                    type: isDebtor ? "DEBT_REMINDER" : "DUE_SOON",
                    gymName: "GymAI",
                  });

                  return (
                    <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs border border-slate-700">
                          {member.firstName.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-white block">
                            {member.firstName} {member.lastName}
                          </span>
                          <span className="text-[11px] text-slate-500">{member.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-300">{member.dni}</td>
                      <td className="py-3.5 px-6">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {member.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            member.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              member.status === "ACTIVE" ? "bg-emerald-400" : "bg-rose-400"
                            }`}
                          ></span>
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px]">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold transition-colors"
                          title="Enviar WhatsApp al socio"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Registro Individual */}
      <MemberRegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tenantId={tenantId}
        onMemberCreated={fetchMembers}
      />

      {/* Modal de Importación Masiva Excel/CSV */}
      <BulkMemberImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        tenantId={tenantId}
        onImportCompleted={fetchMembers}
      />
    </div>
  );
}
