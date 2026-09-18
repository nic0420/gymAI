import { NextRequest, NextResponse } from "next/server";
import { OpenCashShiftSchema } from "@/lib/validations/finance";
import { openCashShift } from "@/lib/finance/cash-register-service";
import { db } from "@/db";
import { cashShifts, cashMovements } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const branchId = searchParams.get("branchId");

    if (!tenantId || !branchId) {
      return NextResponse.json(
        { error: "MISSING_PARAMS", message: "tenantId y branchId son requeridos" },
        { status: 400 }
      );
    }

    // Buscar si hay una sesión de caja abierta
    const activeShift = await db.query.cashShifts.findFirst({
      where: and(
        eq(cashShifts.tenantId, tenantId),
        eq(cashShifts.branchId, branchId),
        eq(cashShifts.status, "OPEN")
      ),
    });

    if (!activeShift) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No hay ninguna caja abierta en esta sucursal",
      });
    }

    // Obtener movimientos de la caja activa
    const movements = await db.query.cashMovements.findMany({
      where: eq(cashMovements.cashShiftId, activeShift.id),
    });

    let currentCashIncomes = 0;
    let currentCashExpenses = 0;

    for (const m of movements) {
      if (m.type === "INCOME") currentCashIncomes += m.amount;
      if (m.type === "EXPENSE") currentCashExpenses += m.amount;
    }

    const currentCalculatedCash = activeShift.initialCash + currentCashIncomes - currentCashExpenses;

    return NextResponse.json({
      success: true,
      data: {
        shift: activeShift,
        movements,
        summary: {
          initialCash: activeShift.initialCash,
          totalIncomes: currentCashIncomes,
          totalExpenses: currentCashExpenses,
          currentCalculatedCash,
        },
      },
    });
  } catch (error: any) {
    console.error("Error al consultar caja:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al consultar estado de caja" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = OpenCashShiftSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Parámetros de apertura inválidos",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const shiftId = await openCashShift(validated.data);

    return NextResponse.json(
      {
        success: true,
        message: "Turno de caja abierto exitosamente",
        data: { shiftId },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al abrir caja:", error);
    if (error.message === "ACTIVE_SHIFT_ALREADY_EXISTS") {
      return NextResponse.json(
        { error: "CONFLICT", message: "Ya existe un turno de caja abierto en esta sucursal" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al abrir turno de caja" },
      { status: 500 }
    );
  }
}
