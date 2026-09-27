import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertSameTenant } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS } from "@/lib/auth/rbac";
import { ProcessPaymentSchema } from "@/lib/validations/finance";
import { processPaymentTransaction, PAYMENT_ERROR_MESSAGES } from "@/lib/finance/payment-service";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.PAYMENTS_WRITE);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const body = await req.json();
    const mismatch = assertSameTenant(ctx, body?.tenantId);
    if (mismatch) return mismatch;
    body.tenantId = ctx.tenantId;
    body.processedByUserId = ctx.userId;
    const validated = ProcessPaymentSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Parámetros de pago inválidos",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const result = await processPaymentTransaction(validated.data);

    return NextResponse.json({
      success: true,
      message: "Pago procesado y liquidado con éxito",
      data: result,
    });
  } catch (error: any) {
    console.error("Error al procesar pago:", error);
    const known = PAYMENT_ERROR_MESSAGES[error.message as string];
    if (known) {
      return NextResponse.json({ error: error.message, message: known.message }, { status: known.status });
    }
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al procesar transacción de pago" },
      { status: 500 }
    );
  }
}
