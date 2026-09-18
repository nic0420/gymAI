"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Copy,
  Check,
  CheckCircle2,
  Building2,
  X,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight,
  QrCode,
} from "lucide-react";

interface SaaSSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan?: "starter" | "pro" | "enterprise";
  gymName?: string;
}

export function SaaSSubscriptionModal({
  isOpen,
  onClose,
  defaultPlan = "pro",
  gymName = "Tu Gimnasio",
}: SaaSSubscriptionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro" | "enterprise">(defaultPlan);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const plans = {
    starter: {
      name: "Starter Barrial",
      price: "$19.900",
      period: "ARS / mes",
      desc: "Hasta 150 socios · 1 Sede · Semáforo <2ms",
      badge: "Económico",
    },
    pro: {
      name: "Pro Box & Performance",
      price: "$34.900",
      period: "ARS / mes",
      desc: "Hasta 500 socios · Split Payments · Ficha Cifrada · 1RM Epley",
      badge: "Más Elegido",
    },
    enterprise: {
      name: "Enterprise & Cadenas VIP",
      price: "$59.900",
      period: "ARS / mes",
      desc: "Socios Ilimitados · Multi-Sede · Kiosco Táctil · Heatmap 7x24",
      badge: "Acceso Total",
    },
  };

  const current = plans[selectedPlan];

  const BANK_DATA = {
    titular: "Ojeda Nicolas Adolfo (Litoral.dev)",
    banco: "Mercado Pago / CVU",
    alias: "nico.adolfo.mp",
    cvu: "0000003100004965726450",
    cuit: "20-40000000-9",
  };

  const whatsappUrl = `https://wa.me/5493425550100?text=${encodeURIComponent(
    `Hola Nicolás! Te envío el comprobante de transferencia para activar/renovar la licencia de GymAI (Plan ${current.name} - ${current.price} ARS) para ${gymName}.`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Pago de Suscripción & Licencia GymAI
              </h2>
              <p className="text-xs text-zinc-400">
                Transfiere directamente para activar o renovar tu membresía SaaS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Plan Selector */}
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2.5">
              1. Selecciona el Plan a Contratar / Renovar:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["starter", "pro", "enterprise"] as const).map((key) => {
                const p = plans[key];
                const isSelected = selectedPlan === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPlan(key)}
                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? "bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10"
                        : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        {key === "pro" && (
                          <span className="text-[9px] font-mono text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/30">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-black text-white font-mono mt-1">
                        {p.price}{" "}
                        <span className="text-[10px] font-normal text-zinc-400 font-sans">
                          {p.period}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-2 line-clamp-2">{p.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bank Transfer Details Box */}
          <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  2. Datos Bancarios Oficiales para Transferencia
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Acreditación Inmediata
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Alias Field */}
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between group">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                    Alias Mercado Pago
                  </span>
                  <strong className="text-white font-mono text-sm tracking-wide">
                    {BANK_DATA.alias}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(BANK_DATA.alias, "alias")}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-blue-600 text-zinc-300 hover:text-white border border-zinc-700 transition-all flex items-center gap-1.5 font-semibold text-xs"
                >
                  {copiedField === "alias" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>

              {/* CVU Field */}
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between group">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                    CVU (22 dígitos)
                  </span>
                  <strong className="text-white font-mono text-xs tracking-wider">
                    {BANK_DATA.cvu}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(BANK_DATA.cvu, "cvu")}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-blue-600 text-zinc-300 hover:text-white border border-zinc-700 transition-all flex items-center gap-1.5 font-semibold text-xs"
                >
                  {copiedField === "cvu" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Titular info */}
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400 flex flex-col sm:flex-row justify-between gap-1">
              <span>
                Titular: <strong className="text-zinc-200">{BANK_DATA.titular}</strong>
              </span>
              <span>
                Tipo de Cuenta: <strong className="text-zinc-200">Billetera Virtual / CVU</strong>
              </span>
            </div>
          </div>

          {/* Summary and Confirmation */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-zinc-400 block">Total a transferir:</span>
              <strong className="text-white text-base font-mono">
                {current.price} ARS <span className="text-xs font-normal text-zinc-400">/ mes</span>
              </strong>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Enviar Comprobante por WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
