import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico de despliegue. Informa SOLO si cada variable está configurada (sí/no),
 * nunca sus valores, y si la base de datos responde.
 */
export async function GET() {
  const vars = [
    "TURSO_DATABASE_URL",
    "TURSO_AUTH_TOKEN",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "APP_MASTER_KEY",
    "BLIND_INDEX_SALT",
    "PAYMENT_GATEWAY_WEBHOOK_SECRET",
  ];
  const env = Object.fromEntries(vars.map((v) => [v, Boolean(process.env[v] && process.env[v]!.trim())]));

  const masterKey = process.env.APP_MASTER_KEY || "";
  const checks: Record<string, string> = {
    APP_MASTER_KEY_formato: !masterKey
      ? "falta"
      : /^[0-9a-fA-F]{64}$/.test(masterKey)
      ? "ok"
      : "inválida: deben ser 64 caracteres hexadecimales",
  };

  let database = "ok";
  let tenants: number | null = null;
  try {
    const { db } = await import("@/db");
    const rows = await db.all<{ n: number }>(sql`select count(*) as n from tenants`);
    tenants = Number((rows as any)[0]?.n ?? 0);
  } catch (err: any) {
    database = `error: ${String(err?.message || err).slice(0, 300)}`;
  }

  const ok = database === "ok" && Object.values(env).slice(0, 6).every(Boolean) && checks.APP_MASTER_KEY_formato === "ok";
  return NextResponse.json(
    {
      ok,
      entorno: process.env.VERCEL_ENV || process.env.NODE_ENV,
      variables: env,
      checks,
      baseDeDatos: database,
      gimnasios: tenants,
    },
    { status: ok ? 200 : 503 }
  );
}
