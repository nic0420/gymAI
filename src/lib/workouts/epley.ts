/**
 * Calcula el 1RM Estimado utilizando la Fórmula de Epley
 * 1RM = Weight * (1 + Reps / 30)
 * Pura matemática isomórfica (segura para Frontend y Backend)
 */
export function calculateOneRepMax(weightKg: number, repsDone: number): number {
  if (typeof weightKg !== "number" || typeof repsDone !== "number") return 0;
  if (!Number.isFinite(weightKg) || !Number.isFinite(repsDone)) return 0;
  if (repsDone <= 0 || weightKg <= 0) return 0;
  if (repsDone === 1) return Math.round(weightKg * 100) / 100;
  const oneRepMax = weightKg * (1 + repsDone / 30);
  return Math.round(oneRepMax * 100) / 100;
}

