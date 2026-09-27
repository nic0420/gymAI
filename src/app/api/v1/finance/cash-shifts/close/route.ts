import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertSameTenant } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS } from "@/lib/auth/rbac";
import { CloseCashShiftSchema } from "@/lib/validations/finance";
import { closeCashShiftBlind } from "@/lib/finance/cash-register-service";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.CASH_REGISTER_OPERATE);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const body = await req.json();
    body.closedByUserId = ctx.userId;
    const validated = CloseCashShiftSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Parámetros de cierre de caja inválidos",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const summary = await closeCashShiftBlind({ ...validated.data, tenantId: ctx.tenantId });

    return NextResponse.json({
      success: true,
      message: "Caja cerrada y sellada con éxito",
      data: summary,
    });
  } catch (error: any) {
    console.error("Error al cerrar caja:", error);
    if (error.message === "CASH_SHIFT_ALREADY_CLOSED") {
      return NextResponse.json({ error: "CONFLICT", message: "Esta caja ya fue cerrada" }, { status: 409 });
    }
    if (error.message === "CASH_SHIFT_NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND", message: "Turno de caja no encontrado" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al cerrar caja" },
      { status: 500 }
    );
  }
}
