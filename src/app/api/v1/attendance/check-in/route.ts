import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertSameTenant } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS } from "@/lib/auth/rbac";
import { CheckInSchema } from "@/lib/validations/attendance";
import { evaluateAndProcessCheckIn } from "@/lib/attendance/checkin-engine";
import { rateLimiter, RATE_LIMIT_CONFIGS } from "@/lib/security/rate-limiter";
import { getClientIp } from "@/lib/security/client-ip";
import { db } from "@/db";
import { branches } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.ATTENDANCE_WRITE);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const ip = getClientIp(req);
    const body = await req.json();
    const mismatch = assertSameTenant(ctx, body?.tenantId);
    if (mismatch) return mismatch;
    body.tenantId = ctx.tenantId;

    const validated = CheckInSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Parámetros de check-in incorrectos",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    // Rate Limiter por terminal de recepción (120 req/min)
    const rateStatus = await rateLimiter.check(
      `checkin:${ip}:${validated.data.tenantId}`,
      RATE_LIMIT_CONFIGS.ATTENDANCE_CHECKIN.limit,
      RATE_LIMIT_CONFIGS.ATTENDANCE_CHECKIN.windowMs
    );

    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: "RATE_LIMIT_EXCEEDED",
          message: "Terminal saturada. Aguarda unos segundos.",
        },
        { status: 429 }
      );
    }

    const { tenantId, branchId, dni, accessMethod } = validated.data;

    // La sede debe pertenecer al gimnasio de la sesión (antes: FK error -> 500 o sede ajena)
    const branch = await db.query.branches.findFirst({
      where: and(eq(branches.id, branchId), eq(branches.tenantId, tenantId)),
    });
    if (!branch) {
      return NextResponse.json(
        { error: "INVALID_BRANCH", message: "La sede seleccionada no pertenece a tu gimnasio" },
        { status: 400 }
      );
    }

    // Ejecutar Motor de Evaluación en Milisegundos
    const result = await evaluateAndProcessCheckIn({
      tenantId,
      branchId,
      dni,
      accessMethod,
      registeredByUserId: ctx.userId,
    });

    return NextResponse.json(
      {
        success: result.accessStatus !== "DENIED_RED",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error en endpoint de check-in:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Error al procesar control de acceso",
      },
      { status: 500 }
    );
  }
}
