import { getAppTimezone } from "@/lib/config/secrets";

/**
 * Utilidades de fecha con zona horaria del gimnasio.
 *
 * FIX: el sistema usaba `new Date().toISOString().split("T")[0]` (fecha UTC). En Argentina
 * (UTC-3), a partir de las 21:00 hs la fecha UTC ya es "mañana": un socio cuya cuota vence
 * HOY era rechazado en el molinete en el horario pico nocturno, y el heatmap aparecía
 * corrido 3 horas en servidores UTC (Vercel).
 */

/** Fecha local YYYY-MM-DD en la zona horaria indicada (por defecto la del gimnasio). */
export function getLocalDateString(date: Date = new Date(), timeZone: string = getAppTimezone()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Día de la semana (0=Domingo) y hora (0-23) locales de un instante. */
export function getLocalDayAndHour(
  date: Date,
  timeZone: string = getAppTimezone()
): { dayOfWeek: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value || "Sun";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10) % 24;
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dayOfWeek: map[weekday] ?? 0, hour };
}

/** Suma días calendario a una fecha YYYY-MM-DD (aritmética en UTC, sin efectos de DST). */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split("T")[0];
}

/** Diferencia en días calendario entre dos fechas YYYY-MM-DD (b - a). */
export function diffInCalendarDays(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}
