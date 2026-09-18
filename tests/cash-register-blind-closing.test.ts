import { db } from "../src/db";
import { tenants, branches, users, cashShifts } from "../src/db/schema";
import {
  openCashShift,
  recordCashMovement,
  closeCashShiftBlind,
} from "../src/lib/finance/cash-register-service";
import { generateUUIDv7 } from "../src/lib/security/uuid";
import { hashPassword } from "../src/lib/security/hash";
import { generateBlindIndex } from "../src/lib/security/encryption";
import { eq } from "drizzle-orm";

export async function runCashRegisterBlindClosingTests() {
  console.log("\n💵 [TEST SUITE 8] Caja Diaria, Movimientos y Arqueo Ciego (Blind Closing)");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  const nowIso = new Date().toISOString();
  const tenantId = generateUUIDv7();
  const branchId = generateUUIDv7();
  const userId = generateUUIDv7();

  await db.insert(tenants).values({
    id: tenantId,
    name: "Cash Test Gym",
    slug: `cash-gym-${Date.now()}`,
    email: "cash@gym.com",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(branches).values({
    id: branchId,
    tenantId,
    name: "Sede Centro",
    address: "Calle 1 123",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const pwdHash = await hashPassword("CashPass123!");
  await db.insert(users).values({
    id: userId,
    tenantId,
    dni: "38111222",
    dniBlindIndex: generateBlindIndex("38111222"),
    email: "cajero@gym.com",
    passwordHash: pwdHash,
    firstName: "Laura",
    lastName: "Paz",
    role: "RECEPCIONISTA",
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // 1. Apertura de turno con fondo inicial de $15.000
  const shiftId = await openCashShift({
    tenantId,
    branchId,
    openedByUserId: userId,
    initialCash: 15000,
  });

  assert(Boolean(shiftId), "Abre turno de caja con fondo inicial");

  // 2. Intento de abrir una segunda caja en la misma sucursal -> Rechazado
  let conflictDetected = false;
  try {
    await openCashShift({
      tenantId,
      branchId,
      openedByUserId: userId,
      initialCash: 5000,
    });
  } catch (err: any) {
    if (err.message === "ACTIVE_SHIFT_ALREADY_EXISTS") {
      conflictDetected = true;
    }
  }
  assert(conflictDetected, "Impide abrir dos cajas simultáneas en la misma sucursal");

  // 3. Registrar Ingreso de $30.000 (Cobro en mostrador)
  await recordCashMovement({
    tenantId,
    cashShiftId: shiftId,
    type: "INCOME",
    category: "COBRO_CUOTA",
    amount: 30000,
    description: "Cobro cuota en efectivo",
    registeredByUserId: userId,
  });

  // 4. Registrar Egreso de $4.000 (Insumos de limpieza)
  await recordCashMovement({
    tenantId,
    cashShiftId: shiftId,
    type: "EXPENSE",
    category: "INSUMOS_LIMPIEZA",
    amount: 4000,
    description: "Compra lavandina y bolsas de consorcio",
    registeredByUserId: userId,
  });

  // Saldo Teórico Esperado = $15.000 (Inicial) + $30.000 (Ingreso) - $4.000 (Egreso) = $41.000

  // 5. Cierre Ciego con Faltante: El recepcionista cuenta físicamente $39.500 (Faltante de $1.500)
  const summary = await closeCashShiftBlind({
    cashShiftId: shiftId,
    closedByUserId: userId,
    declaredCash: 39500, // Ciego
    notes: "Falta cambio chico en cajón",
  });

  assert(summary.status === "CLOSED_LOCKED", "Turno de caja queda sellado y bloqueado (CLOSED_LOCKED)");
  assert(summary.systemExpectedCash === 41000, "Sistema calculó saldo esperado exacto de $41.000");
  assert(summary.declaredCash === 39500, "Registró el monto declarado a ciegas ($39.500)");
  assert(summary.differenceCash === -1500, "Detectó y auditó con precisión el faltante de -$1.500");

  console.log(`\nResumen Suite 8: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
