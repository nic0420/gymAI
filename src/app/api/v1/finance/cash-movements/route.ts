import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertSameTenant } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS } from "@/lib/auth/rbac";
import { CreateCashMovementSchema } from "@/lib/validations/finance";
import { recordCashMovement } from "@/lib/finance/cash-register-service";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.CASH_REGISTER_OPERATE);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const body = await req.json();
    const mismatch = assertSameTenant(ctx, body?.tenantId);
    if (mismatch) return mismatch;
    body.tenantId = ctx.tenantId;
    body.registeredByUserId = ctx.userId; // el usuario real de la sesión, no uno enviado por el cliente
    const validated = CreateCashMovementSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Parámetros de movimiento de caja inválidos",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const movementId = await recordCashMovement(validated.data);

    return NextResponse.json(
      {
        success: true,
        message: "Movimiento de caja registrado exitosamente",
        data: { movementId },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al registrar movimiento de caja:", error);
    if (error.message === "CASH_SHIFT_NOT_FOUND_OR_CLOSED") {
      return NextResponse.json(
        { error: "CONFLICT", message: "La caja no existe o ya fue cerrada" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al registrar movimiento" },
      { status: 500 }
    );
  }
}
