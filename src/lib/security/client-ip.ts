import type { NextRequest } from "next/server";

/**
 * IP del cliente. `x-forwarded-for` puede traer una lista "cliente, proxy1, proxy2":
 * antes se usaba el header completo como clave del rate limiter, por lo que
 * variando proxies intermedios se evadía el límite de intentos.
 */
export function getClientIp(req: NextRequest): string {
  const direct = (req as any).ip as string | undefined;
  if (direct) return direct;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}
