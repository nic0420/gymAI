import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertSameTenant } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS, hasPermission } from "@/lib/auth/rbac";
import { OpenCashShiftSchema } from "@/lib/validations/finance";
import { openCashShift } from "@/lib/finance/cash-register-service";
import { db } from "@/db";
import { cashShifts, cashMovements } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.CASH_REGISTER_OPERATE);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const { searchParams } = new URL(req.url);
    const mismatch = assertSameTenant(ctx, searchParams.get("tenantId"));
    if (mismatch) return mismatch;
    const tenantId = ctx.tenantId;
    const branchId = searchParams.get("branchId");

    if (!branchId) {
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

    // ARQUEO CIEGO: el saldo teórico y los totales sólo se exponen a quien tiene permiso de
    // reportes financieros (dueño/SuperAdmin). Antes se mostraban al recepcionista, que así
    // conocía de antemano cuánto "debía" declarar, anulando el control.
    const canSeeTotals = hasPermission(ctx.role, ATOMIC_PERMISSIONS.FINANCIAL_REPORTS_READ, ctx.permissions);

    return NextResponse.json({
      success: true,
      data: {
        shift: canSeeTotals
          ? activeShift
          : { id: activeShift.id, branchId: activeShift.branchId, status: activeShift.status, openedAt: activeShift.openedAt },
        movements: canSeeTotals ? movements : movements.filter((m) => m.type === "EXPENSE"),
        movementsCount: movements.length,
        summary: canSeeTotals
          ? {
              initialCash: activeShift.initialCash,
              totalIncomes: currentCashIncomes,
              totalExpenses: currentCashExpenses,
              currentCalculatedCash,
            }
          : null,
        blind: !canSeeTotals,
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
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.CASH_REGISTER_OPERATE);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const body = await req.json();
    const mismatch = assertSameTenant(ctx, body?.tenantId);
    if (mismatch) return mismatch;
    body.tenantId = ctx.tenantId;
    body.openedByUserId = ctx.userId;
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
    if (error.message === "BRANCH_NOT_FOUND") {
      return NextResponse.json(
        { error: "INVALID_BRANCH", message: "La sede no pertenece a tu gimnasio" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al abrir turno de caja" },
      { status: 500 }
    );
  }
}
