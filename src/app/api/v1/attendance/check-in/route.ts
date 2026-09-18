import { NextRequest, NextResponse } from "next/server";
import { CheckInSchema } from "@/lib/validations/attendance";
import { evaluateAndProcessCheckIn } from "@/lib/attendance/checkin-engine";
import { rateLimiter, RATE_LIMIT_CONFIGS } from "@/lib/security/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const ip = req.ip || req.headers.get("x-forwarded-for") || "127.0.0.1";
    const body = await req.json();

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

    // Ejecutar Motor de Evaluación en Milisegundos
    const result = await evaluateAndProcessCheckIn({
      tenantId,
      branchId,
      dni,
      accessMethod,
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
