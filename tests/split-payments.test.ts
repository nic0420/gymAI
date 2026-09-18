import { db } from "../src/db";
import {
  tenants,
  branches,
  users,
  membershipPlans,
  subscriptions,
  invoices,
  paymentTransactions,
  cashShifts,
} from "../src/db/schema";
import { processPaymentTransaction } from "../src/lib/finance/payment-service";
import { generateUUIDv7 } from "../src/lib/security/uuid";
import { hashPassword } from "../src/lib/security/hash";
import { generateBlindIndex } from "../src/lib/security/encryption";
import { eq } from "drizzle-orm";

export async function runSplitPaymentsTests() {
  console.log("\n💰 [TEST SUITE 7] Modelo de Facturación y Split Payments (Pagos Mixtos)");
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
  const todayStr = nowIso.split("T")[0];
  const tenantId = generateUUIDv7();
  const branchId = generateUUIDv7();
  const planId = generateUUIDv7();
  const userId = generateUUIDv7();

  // Setup Base
  await db.insert(tenants).values({
    id: tenantId,
    name: "Finance Test Gym",
    slug: `fin-gym-${Date.now()}`,
    email: "finance@gym.com",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(branches).values({
    id: branchId,
    tenantId,
    name: "Sede Finanzas",
    address: "Av. Corrientes 500",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(membershipPlans).values({
    id: planId,
    tenantId,
    name: "Plan Black Trimestral",
    price: 60000,
    durationDays: 90,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const pwdHash = await hashPassword("FinPass123!");
  await db.insert(users).values({
    id: userId,
    tenantId,
    dni: "39000111",
    dniBlindIndex: generateBlindIndex("39000111"),
    email: "socio.finanzas@gym.com",
    passwordHash: pwdHash,
    firstName: "Esteban",
    lastName: "Quito",
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // 1. Crear suscripción en estado PENDING_PAYMENT
  const subscriptionId = generateUUIDv7();
  await db.insert(subscriptions).values({
    id: subscriptionId,
    tenantId,
    userId,
    planId,
    status: "PENDING_PAYMENT",
    startDate: todayStr,
    endDate: todayStr,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // 2. Emitir Factura de $60.000
  const invoiceId = generateUUIDv7();
  await db.insert(invoices).values({
    id: invoiceId,
    tenantId,
    userId,
    subscriptionId,
    invoiceNumber: "FAC-TEST-001",
    totalAmount: 60000,
    paidAmount: 0,
    status: "PENDING",
    dueDate: todayStr,
    issuedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // 3. Abrir caja para cobros en mostrador
  const cashShiftId = generateUUIDv7();
  await db.insert(cashShifts).values({
    id: cashShiftId,
    tenantId,
    branchId,
    openedByUserId: userId,
    initialCash: 10000,
    status: "OPEN",
    openedAt: nowIso,
  });

  // 4. Pago Parcial (Split 1): $20.000 en Efectivo -> Estado PARTIALLY_PAID
  const split1Result = await processPaymentTransaction({
    tenantId,
    invoiceId,
    cashShiftId,
    splits: [
      {
        amount: 20000,
        paymentMethod: "CASH",
      },
    ],
  });

  assert(split1Result.invoiceStatus === "PARTIALLY_PAID", "Pago parcial cambia factura a PARTIALLY_PAID");
  assert(split1Result.paidAmount === 20000, "Monto cobrado refleja exactamente $20.000");
  assert(split1Result.remainingAmount === 40000, "Resta cobrar $40.000");
  assert(!split1Result.subscriptionActivated, "Suscripción permanece inactiva con pago parcial");

  // 5. Pago Final (Split 2): $40.000 con Mercado Pago QR -> Estado PAID y ACTIVACIÓN DE MEMBRESÍA
  const split2Result = await processPaymentTransaction({
    tenantId,
    invoiceId,
    splits: [
      {
        amount: 40000,
        paymentMethod: "MERCADO_PAGO_QR",
        gatewayReference: "mp_pay_998877",
      },
    ],
  });

  assert(split2Result.invoiceStatus === "PAID", "Liquidación total cambia factura a PAID");
  assert(split2Result.remainingAmount === 0, "Saldo restante es $0");
  assert(split2Result.subscriptionActivated, "Membresía se activa automáticamente al completar el pago");

  // 6. Verificar que la suscripción en base de datos quedó en ACTIVE con fecha extendida
  const updatedSub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
  });
  assert(updatedSub?.status === "ACTIVE", "Estado de suscripción en BD es ACTIVE");
  assert(Boolean(updatedSub?.endDate && updatedSub.endDate > todayStr), "Fecha de vencimiento fue extendida 90 días");

  console.log(`\nResumen Suite 7: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
