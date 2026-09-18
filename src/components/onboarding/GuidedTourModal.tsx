"use client";

import React, { useState, useEffect } from "react";
import { TOURS, TourDefinition } from "@/lib/onboarding/tour-steps";

interface GuidedTourProps {
  isOpen: boolean;
  tourId?: string;
  onClose: () => void;
}

export function GuidedTourModal({ isOpen, tourId = "receptionist", onClose }: GuidedTourProps) {
  const tour: TourDefinition = TOURS[tourId] || TOURS.receptionist;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen, tourId]);

  if (!isOpen) return null;

  const step = tour.steps[currentStepIndex];
  const isLast = currentStepIndex === tour.steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      if (typeof window !== "undefined") {
        localStorage.setItem(`gym_tour_completed_${tour.id}`, "true");
      }
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500" />

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{step.icon || "💡"}</span>
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                {tour.title}
              </p>
              <h3 className="text-lg font-bold text-white">
                Paso {currentStepIndex + 1} de {tour.steps.length}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700"
          >
            ✕ Salir
          </button>
        </div>

        {/* Progress Dots */}
        <div className="flex gap-1.5 mb-6">
          {tour.steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                idx === currentStepIndex
                  ? "bg-emerald-400"
                  : idx < currentStepIndex
                  ? "bg-emerald-600/50"
                  : "bg-slate-800"
              }`}
            />
          ))}
        </div>

        {/* Body Content */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 mb-6">
          <h4 className="text-base font-bold text-slate-100 mb-2">{step.title}</h4>
          <p className="text-sm text-slate-300 leading-relaxed">{step.description}</p>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            ← Anterior
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Omitir
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              {isLast ? "¡Comenzar a Usar!" : "Siguiente →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
