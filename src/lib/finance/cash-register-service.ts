import { db } from "@/db";
import { cashShifts, cashMovements } from "@/db/schema";
import { generateUUIDv7 } from "@/lib/security/uuid";
import { eq, and } from "drizzle-orm";
import {
  OpenCashShiftInput,
  CloseCashShiftInput,
  CreateCashMovementInput,
} from "@/lib/validations/finance";

export interface CashShiftSummary {
  id: string;
  tenantId: string;
  branchId: string;
  status: "OPEN" | "CLOSED_LOCKED";
  initialCash: number;
  totalCashIncomes: number;
  totalCashExpenses: number;
  systemExpectedCash: number;
  declaredCash?: number | null;
  differenceCash?: number | null;
  openedAt: string;
  closedAt?: string | null;
  openedByUserId: string;
  closedByUserId?: string | null;
}

/**
 * Servicio de Gestión de Caja Diaria y Arqueo Ciego
 */
export async function openCashShift(input: OpenCashShiftInput): Promise<string> {
  const { tenantId, branchId, openedByUserId, initialCash, notes } = input;

  // Verificar si ya existe una caja abierta en esta sucursal
  const activeShift = await db.query.cashShifts.findFirst({
    where: and(
      eq(cashShifts.tenantId, tenantId),
      eq(cashShifts.branchId, branchId),
      eq(cashShifts.status, "OPEN")
    ),
  });

  if (activeShift) {
    throw new Error("ACTIVE_SHIFT_ALREADY_EXISTS");
  }

  const shiftId = generateUUIDv7();
  const nowIso = new Date().toISOString();

  await db.insert(cashShifts).values({
    id: shiftId,
    tenantId,
    branchId,
    openedByUserId,
    initialCash,
    status: "OPEN",
    openedAt: nowIso,
    notes: notes || null,
  });

  return shiftId;
}

/**
 * Registra un movimiento manual de ingreso o egreso en la caja activa
 */
export async function recordCashMovement(input: CreateCashMovementInput): Promise<string> {
  const { tenantId, cashShiftId, type, category, amount, description, receiptUrl, registeredByUserId } = input;

  const shift = await db.query.cashShifts.findFirst({
    where: and(
      eq(cashShifts.id, cashShiftId),
      eq(cashShifts.status, "OPEN")
    ),
  });

  if (!shift) {
    throw new Error("CASH_SHIFT_NOT_FOUND_OR_CLOSED");
  }

  const movementId = generateUUIDv7();
  const nowIso = new Date().toISOString();

  await db.insert(cashMovements).values({
    id: movementId,
    tenantId,
    cashShiftId,
    type,
    category,
    amount,
    description,
    receiptUrl: receiptUrl || null,
    registeredByUserId,
    createdAt: nowIso,
  });

  return movementId;
}

/**
 * Cierre Ciego de Caja Diaria (Blind Closing)
 * El recepcionista declara el efectivo físico sin ver el cálculo del sistema.
 */
export async function closeCashShiftBlind(input: CloseCashShiftInput): Promise<CashShiftSummary> {
  const { cashShiftId, closedByUserId, declaredCash, notes } = input;

  const shift = await db.query.cashShifts.findFirst({
    where: eq(cashShifts.id, cashShiftId),
  });

  if (!shift) {
    throw new Error("CASH_SHIFT_NOT_FOUND");
  }

  if (shift.status === "CLOSED_LOCKED") {
    throw new Error("CASH_SHIFT_ALREADY_CLOSED");
  }

  // Obtener todos los movimientos asociados a esta caja
  const movements = await db.query.cashMovements.findMany({
    where: eq(cashMovements.cashShiftId, cashShiftId),
  });

  let totalCashIncomes = 0;
  let totalCashExpenses = 0;

  for (const m of movements) {
    if (m.type === "INCOME") {
      totalCashIncomes += m.amount;
    } else if (m.type === "EXPENSE") {
      totalCashExpenses += m.amount;
    }
  }

  // Cálculo matemático del saldo teórico
  const systemExpectedCash = shift.initialCash + totalCashIncomes - totalCashExpenses;
  const differenceCash = declaredCash - systemExpectedCash;
  const nowIso = new Date().toISOString();

  // Actualizar y bloquear el turno
  await db
    .update(cashShifts)
    .set({
      systemExpectedCash,
      declaredCash,
      differenceCash,
      status: "CLOSED_LOCKED",
      closedAt: nowIso,
      closedByUserId,
      notes: notes ? (shift.notes ? `${shift.notes} | ${notes}` : notes) : shift.notes,
    })
    .where(eq(cashShifts.id, cashShiftId));

  return {
    id: shift.id,
    tenantId: shift.tenantId,
    branchId: shift.branchId,
    status: "CLOSED_LOCKED",
    initialCash: shift.initialCash,
    totalCashIncomes,
    totalCashExpenses,
    systemExpectedCash,
    declaredCash,
    differenceCash,
    openedAt: shift.openedAt,
    closedAt: nowIso,
    openedByUserId: shift.openedByUserId,
    closedByUserId,
  };
}
