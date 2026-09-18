"use client";

import React, { useState } from "react";
import { Lock, Mail, Building2, KeyRound, CheckCircle2, ArrowRight, X, ShieldAlert } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any, tenant: any) => void;
}

export function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [tenantSlug, setTenantSlug] = useState("gimnasio-libertad");
  const [identifier, setIdentifier] = useState("nicolaslarrocapf@gmail.com");
  const [password, setPassword] = useState("Libertad12345");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          identifier,
          password,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess(data.data.user, data.data.tenant);
        onClose();
      } else {
        setErrorMsg(data.message || "Credenciales inválidas. Verifica tu slug, email y contraseña.");
      }
    } catch (err) {
      setErrorMsg("Error de conexión con el servidor de autenticación.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (type: "ceo" | "amigo") => {
    if (type === "ceo") {
      setTenantSlug("litoral-dev");
      setIdentifier("ojedanicolas1b@gmail.com");
      setPassword("Onlythresh420");
    } else {
      setTenantSlug("gimnasio-libertad");
      setIdentifier("nicolaslarrocapf@gmail.com");
      setPassword("Libertad12345");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md p-6 bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl shadow-blue-500/10 space-y-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-400 mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>ACCESO SEGURO • GYMAI</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Iniciar Sesión</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Ingresa a tu organización o utiliza los accesos rápidos.
          </p>
        </div>

        {/* Quick Fill Buttons */}
        <div className="p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 space-y-2">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
            Cuentas Aprovisionadas:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill("ceo")}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-blue-600/20 hover:border-blue-500/40 border border-zinc-800 text-left transition-all group"
            >
              <span className="text-xs font-bold text-white block group-hover:text-blue-400">👑 CEO Master</span>
              <span className="text-[10px] text-zinc-500 block">Litoral.dev</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("amigo")}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-emerald-600/20 hover:border-emerald-500/40 border border-zinc-800 text-left transition-all group"
            >
              <span className="text-xs font-bold text-white block group-hover:text-emerald-400">🏋️ Amigo (Plan VIP)</span>
              <span className="text-[10px] text-zinc-500 block">Gimnasio Libertad</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Identificador de Gimnasio (Slug)</label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value.toLowerCase())}
                placeholder="ej: gimnasio-libertad o litoral-dev"
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Email o DNI</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="usuario@dominio.com"
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Contraseña</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Ingresar al Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
