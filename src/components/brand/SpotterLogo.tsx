import React from "react";

/**
 * Marca SpotterApp: barra olímpica sostenida por un chevron ascendente
 * (el "spotter" que te cuida la barra y te ayuda a subirla).
 */
export function SpotterMark({ className = "w-9 h-9", title = "SpotterApp" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label={title}>
      <rect width="32" height="32" rx="6" fill="#E8FF3A" />
      {/* Barra */}
      <rect x="4" y="11" width="24" height="2.2" rx="1.1" fill="#0E0E0C" />
      {/* Discos */}
      <rect x="6.5" y="6.5" width="3.2" height="11.2" rx="1" fill="#0E0E0C" />
      <rect x="22.3" y="6.5" width="3.2" height="11.2" rx="1" fill="#0E0E0C" />
      <rect x="10.4" y="8.6" width="1.8" height="7" rx="0.6" fill="#0E0E0C" />
      <rect x="19.8" y="8.6" width="1.8" height="7" rx="0.6" fill="#0E0E0C" />
      {/* Spotter: chevron que empuja hacia arriba */}
      <path d="M10 26 L16 20 L22 26" fill="none" stroke="#0E0E0C" strokeWidth="2.8" strokeLinecap="square" />
    </svg>
  );
}

export function SpotterLogo({
  className = "",
  size = "md",
  showTag = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  showTag?: boolean;
}) {
  const mark = size === "lg" ? "w-12 h-12" : size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <SpotterMark className={mark} />
      <span className={`font-display font-extrabold uppercase leading-none tracking-tight text-graphite-50 ${text}`}>
        Spotter
        {showTag && (
          <span className="ml-1 align-top font-mono text-[0.45em] font-semibold tracking-[0.18em] text-volt-400">
            APP
          </span>
        )}
      </span>
    </span>
  );
}
