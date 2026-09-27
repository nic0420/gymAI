/**
 * Resolución centralizada de secretos.
 *
 * En producción (NODE_ENV=production) un secreto ausente es un error fatal:
 * antes se usaban valores por defecto públicos (hardcodeados en el repo), lo que
 * permitía a cualquiera firmar JWTs válidos o descifrar fichas médicas.
 * En desarrollo/tests se usa un valor de respaldo y se avisa por consola.
 *
 * La resolución es "lazy" (al momento de uso) para no romper `next build`.
 */

// Mismos valores que el código original para no invalidar bases de desarrollo existentes.
const DEV_FALLBACKS: Record<string, string> = {
  JWT_ACCESS_SECRET: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  JWT_REFRESH_SECRET: "f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2",
  APP_MASTER_KEY: "4f9c2d1b8e7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e",
  BLIND_INDEX_SALT: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
};

const warned = new Set<string>();

export function getSecret(name: keyof typeof DEV_FALLBACKS): string {
  const value = process.env[name];
  if (value && value.trim().length > 0) return value;

  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error(
      `[config] Falta la variable de entorno obligatoria ${name}. ` +
        `Configúrala antes de iniciar la aplicación en producción.`
    );
  }

  if (!warned.has(name)) {
    warned.add(name);
    if (process.env.NODE_ENV !== "test") {
      console.warn(`[config] ${name} no definida: usando valor de desarrollo (NO usar en producción).`);
    }
  }
  return DEV_FALLBACKS[name];
}

/** Secreto del webhook de la pasarela. Sin fallback: si no está, el webhook se rechaza. */
export function getWebhookSecret(): string | null {
  return process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET || null;
}

/** Zona horaria operativa del gimnasio (fechas de vencimiento, heatmap, etc.). */
export function getAppTimezone(): string {
  return process.env.APP_TIMEZONE || "America/Argentina/Buenos_Aires";
}
