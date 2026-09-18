import { NextRequest, NextResponse } from "next/server";
import { CreateCashMovementSchema } from "@/lib/validations/finance";
import { recordCashMovement } from "@/lib/finance/cash-register-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: error.message || "Error al registrar movimiento" },
      { status: 500 }
    );
  }
}
