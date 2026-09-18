import { NextRequest, NextResponse } from "next/server";
import { ProcessPaymentSchema } from "@/lib/validations/finance";
import { processPaymentTransaction } from "@/lib/finance/payment-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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
    if (error.message === "INVOICE_NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND", message: "Factura no encontrada" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: error.message || "Error al procesar transacción de pago" },
      { status: 500 }
    );
  }
}
