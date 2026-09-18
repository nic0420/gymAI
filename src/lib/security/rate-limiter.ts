/**
 * Rate Limiter de Ventana Deslizante (Sliding Window Log).
 * Protege endpoints críticos contra ataques de Fuerza Bruta y Denial of Service.
 */

interface RateLimitEntry {
  timestamps: number[];
}

class InMemorySlidingWindowRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Limpieza periódica cada 5 minutos para liberar memoria
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        entry.timestamps = entry.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
        if (entry.timestamps.length === 0) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Evalúa si una clave ha superado el límite de peticiones en la ventana de tiempo dada.
   * 
   * @param key Identificador único (ej. `login:ip:192.168.1.1` o `login:dni:12345678`)
   * @param limit Cantidad máxima de peticiones permitidas en la ventana
   * @param windowMs Duración de la ventana en milisegundos
   */
  public async check(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetMs: number;
  }> {
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Filtrar timestamps fuera de la ventana
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= limit) {
      const oldestInWindow = entry.timestamps[0];
      const resetMs = oldestInWindow + windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, resetMs),
      };
    }

    // Registrar nueva petición
    entry.timestamps.push(now);
    return {
      allowed: true,
      remaining: limit - entry.timestamps.length,
      resetMs: windowMs,
    };
  }

  /**
   * Resetea el contador para una clave específica (ej. tras login exitoso).
   */
  public reset(key: string): void {
    this.store.delete(key);
  }
}

export const rateLimiter = new InMemorySlidingWindowRateLimiter();

/**
 * Reglas predefinidas para diferentes endpoints
 */
export const RATE_LIMIT_CONFIGS = {
  // Login: Máximo 5 intentos fallidos cada 15 minutos por IP / DNI
  AUTH_LOGIN: { limit: 5, windowMs: 15 * 60 * 1000 },
  // Refresh Token: Máximo 30 peticiones por minuto
  AUTH_REFRESH: { limit: 30, windowMs: 60 * 1000 },
  // Check-in Recepción: Hasta 120 escaneos por minuto por terminal
  ATTENDANCE_CHECKIN: { limit: 120, windowMs: 60 * 1000 },
};
