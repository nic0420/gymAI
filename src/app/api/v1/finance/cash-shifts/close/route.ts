import { NextRequest, NextResponse } from "next/server";
import { CloseCashShiftSchema } from "@/lib/validations/finance";
import { closeCashShiftBlind } from "@/lib/finance/cash-register-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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

    const summary = await closeCashShiftBlind(validated.data);

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
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: error.message || "Error al cerrar caja" },
      { status: 500 }
    );
  }
}
