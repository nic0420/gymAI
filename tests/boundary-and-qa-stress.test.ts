import { db } from "../src/db";
import {
  tenants,
  branches,
  users,
  subscriptions,
  medicalRecords,
  membershipPlans,
  invoices,
  cashShifts,
} from "../src/db/schema";
import { generateUUIDv7 } from "../src/lib/security/uuid";
import {
  encryptToString,
  decryptFromString,
  decryptData,
  generateBlindIndex,
  encryptData,
} from "../src/lib/security/encryption";
import { hashPassword } from "../src/lib/security/hash";
import { calculateOneRepMax } from "../src/lib/workouts/epley";
import { evaluateAndProcessCheckIn } from "../src/lib/attendance/checkin-engine";
import { processPaymentTransaction } from "../src/lib/finance/payment-service";
import {
  openCashShift,
  recordCashMovement,
  closeCashShiftBlind,
} from "../src/lib/finance/cash-register-service";
import { rateLimiter } from "../src/lib/security/rate-limiter";
import { getExecutiveBusinessDashboard } from "../src/lib/analytics/bi-service";
import { eq } from "drizzle-orm";

export async function runBoundaryAndStressTests(): Promise<boolean> {
  console.log("\n🧪 [TEST SUITE 14] Pruebas de Límites (Boundary Value Analysis), QA Fuzzing y Resiliencia Extrema");
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

  // =========================================================================
  // SECCIÓN 1: LÍMITES MATEMÁTICOS Y FÓRMULA DE EPLEY (1RM)
  // =========================================================================
  console.log("\n  📐 [BVA 1.1] Límites Matemáticos en Epley 1RM Tracker:");

  assert(calculateOneRepMax(0, 10) === 0, "Peso 0 kg devuelve 1RM = 0");
  assert(calculateOneRepMax(100, 0) === 0, "Repeticiones 0 devuelve 1RM = 0");
  assert(calculateOneRepMax(-50, 10) === 0, "Peso negativo (-50kg) devuelve 1RM = 0");
  assert(calculateOneRepMax(100, -5) === 0, "Reps negativas (-5) devuelve 1RM = 0");
  assert(calculateOneRepMax(NaN, 10) === 0, "Valor NaN en peso devuelve 1RM = 0 sin lanzar excepción");
  assert(calculateOneRepMax(100, Infinity) === 0, "Valor Infinity en reps devuelve 1RM = 0");
  assert(calculateOneRepMax("100" as any, 10 as any) === 0, "Tipo de dato no numérico (string) devuelve 1RM = 0");
  assert(calculateOneRepMax(142.5, 1) === 142.5, "Exactamente 1 repetición preserva decimales (142.5 kg) sin distorsión");
  assert(calculateOneRepMax(82.5, 7) === 101.75, "Cálculo preciso con decimales (82.5kg x 7 reps = 101.75 kg)");
  assert(calculateOneRepMax(500, 30) === 1000, "Valor límite extremo (500kg x 30 reps = 1000 kg)");

  // =========================================================================
  // SECCIÓN 2: FUZZING Y LÍMITES DE ENTRADA EN MOTOR DE CHECK-IN
  // =========================================================================
  console.log("\n  🛡️ [BVA 1.2] Fuzzing, Sanitización y Fechas Límite en Semáforo Check-in:");

  const now = new Date();
  const nowIso = now.toISOString();
  const todayStr = nowIso.split("T")[0];

  const helperAddDays = (days: number): string => {
    const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  };

  const bvaTenantA = generateUUIDv7();
  const bvaTenantB = generateUUIDv7();
  const bvaBranchA = generateUUIDv7();

  await db.insert(tenants).values([
    {
      id: bvaTenantA,
      name: "BVA Gym Principal",
      slug: `bva-gym-a-${Date.now()}`,
      email: "bva-a@gym.com",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: bvaTenantB,
      name: "BVA Gym Competencia",
      slug: `bva-gym-b-${Date.now()}`,
      email: "bva-b@gym.com",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]);

  await db.insert(branches).values({
    id: bvaBranchA,
    tenantId: bvaTenantA,
    name: "Sede Central BVA",
    address: "Av. Corrientes 1000",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // Fuzzing 1: DNI nulo, vacío o puros espacios
  const nullDniRes = await evaluateAndProcessCheckIn({
    tenantId: bvaTenantA,
    branchId: bvaBranchA,
    dni: null as any,
  });
  assert(nullDniRes.accessStatus === "DENIED_RED", "DNI null es rechazado inmediatamente con ROJO");

  const emptyDniRes = await evaluateAndProcessCheckIn({
    tenantId: bvaTenantA,
    branchId: bvaBranchA,
    dni: "    ",
  });
  assert(emptyDniRes.accessStatus === "DENIED_RED", "DNI de puros espacios en blanco es rechazado con ROJO");

  // Fuzzing 2: Inyección SQL en DNI
  const sqlInjectionDniRes = await evaluateAndProcessCheckIn({
    tenantId: bvaTenantA,
    branchId: bvaBranchA,
    dni: "40111222' OR '1'='1",
  });
  assert(sqlInjectionDniRes.accessStatus === "DENIED_RED", "Payload de inyección SQL en DNI es manejado de forma segura y rechazado");

  // Crear usuarios de prueba para fechas límites
  const createBvaUser = async (dni: string, firstName: string) => {
    const uId = generateUUIDv7();
    const pwdHash = await hashPassword("Test1234!");
    await db.insert(users).values({
      id: uId,
      tenantId: bvaTenantA,
      dni,
      dniBlindIndex: generateBlindIndex(dni),
      email: `${firstName.toLowerCase()}.${dni}@test.com`,
      passwordHash: pwdHash,
      firstName,
      lastName: "Tester",
      status: "ACTIVE",
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    return uId;
  };

  // Plan común
  const bvaPlanId = generateUUIDv7();
  await db.insert(membershipPlans).values({
    id: bvaPlanId,
    tenantId: bvaTenantA,
    name: "Plan Mensual BVA",
    price: 30000,
    durationDays: 30,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // CASO 1: Vence HOY (diffDays = 0) -> WARNING_YELLOW
  const uIdToday = await createBvaUser("90000001", "VenceHoy");
  await db.insert(subscriptions).values({
    id: generateUUIDv7(),
    tenantId: bvaTenantA,
    userId: uIdToday,
    planId: bvaPlanId,
    status: "ACTIVE",
    startDate: helperAddDays(-30),
    endDate: todayStr,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
  await db.insert(medicalRecords).values({
    id: generateUUIDv7(),
    tenantId: bvaTenantA,
    userId: uIdToday,
    medicalClearanceStatus: "VALID",
    clearanceExpiryDate: helperAddDays(60),
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const resToday = await evaluateAndProcessCheckIn({
    tenantId: bvaTenantA,
    branchId: bvaBranchA,
    dni: "90000001",
  });
  assert(resToday.accessStatus === "WARNING_YELLOW", "Cuota con vencimiento HOY otorga AMARILLO (aviso)");

  // CASO 2: Vence en 3 días (Límite superior de advertencia) -> WARNING_YELLOW
  const uIdIn3Days = await createBvaUser("90000002", "VenceTresDias");
  await db.insert(subscriptions).values({
    id: generateUUIDv7(),
    tenantId: bvaTenantA,
    userId: uIdIn3Days,
    planId: bvaPlanId,
    status: "ACTIVE",
    startDate: helperAddDays(-27),
    endDate: helperAddDays(3),
    createdAt: nowIso,
    updatedAt: nowIso,
  });
  await db.insert(medicalRecords).values({
    id: generateUUIDv7(),
    tenantId: bvaTenantA,
    userId: uIdIn3Days,
    medicalClearanceStatus: "VALID",
    clearanceExpiryDate: helperAddDays(60),
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const resIn3Days = await evaluateAndProcessCheckIn({
    tenantId: bvaTenantA,
    branchId: bvaBranchA,
    dni: "90000002",
  });
  assert(resIn3Days.accessStatus === "WARNING_YELLOW", "Cuota que vence en exactamente 3 días emite AMARILLO");

  // CASO 3: Vence en 4 días (Fuera del rango de advertencia) -> GRANTED_GREEN
  const uIdIn4Days = await createBvaUser("90000003", "VenceCuatroDias");
  await db.insert(subscriptions).values({
    id: generateUUIDv7(),
    tenantId: bvaTenantA,
    userId: uIdIn4Days,
    planId: bvaPlanId,
    status: "ACTIVE",
    startDate: helperAddDays(-26),
    endDate: helperAddDays(4),
    createdAt: nowIso,
    updatedAt: nowIso,
  });
  await db.insert(medicalRecords).values({
    id: generateUUIDv7(),
    tenantId: bvaTenantA,
    userId: uIdIn4Days,
    medicalClearanceStatus: "VALID",
    clearanceExpiryDate: helperAddDays(60),
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const resIn4Days = await evaluateAndProcessCheckIn({
    tenantId: bvaTenantA,
    branchId: bvaBranchA,
    dni: "90000003",
  });
  assert(resIn4Days.accessStatus === "GRANTED_GREEN", "Cuota que vence en 4 días recibe VERDE directo");

  // CASO 4: Venció AYER (diffDays = -1) -> DENIED_RED
  const uIdExpiredYesterday = await createBvaUser("90000004", "VencioAyer");
  await db.insert(subscriptions).values({
    id: generateUUIDv7(),
    tenantId: bvaTenantA,
    userId: uIdExpiredYesterday,
    planId: bvaPlanId,
    status: "ACTIVE",
    startDate: helperAddDays(-31),
    endDate: helperAddDays(-1),
    createdAt: nowIso,
    updatedAt: nowIso,
  });
  await db.insert(medicalRecords).values({
    id: generateUUIDv7(),
    tenantId: bvaTenantA,
    userId: uIdExpiredYesterday,
    medicalClearanceStatus: "VALID",
    clearanceExpiryDate: helperAddDays(60),
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const resExpiredYesterday = await evaluateAndProcessCheckIn({
    tenantId: bvaTenantA,
    branchId: bvaBranchA,
    dni: "90000004",
  });
  assert(resExpiredYesterday.accessStatus === "DENIED_RED", "Cuota vencida ayer recibe ROJO inmediato");

  // CASO 5: Aislamiento Multi-Tenant (Mismo DNI consultado desde Tenant B no registrado allí)
  const crossTenantRes = await evaluateAndProcessCheckIn({
    tenantId: bvaTenantB,
    branchId: bvaBranchA,
    dni: "90000003",
  });
  assert(crossTenantRes.accessStatus === "DENIED_RED", "Aislamiento estricto: Socio del Tenant A es invisible en Tenant B (ROJO)");

  // =========================================================================
  // SECCIÓN 3: CAJA DIARIA, TRANSICIONES DE ESTADO Y SPLIT PAYMENTS
  // =========================================================================
  console.log("\n  💰 [BVA 1.3] Límites en Transacciones Financieras y Cierre de Caja:");

  // Abrir caja
  const bvaShiftId = await openCashShift({
    tenantId: bvaTenantA,
    branchId: bvaBranchA,
    openedByUserId: uIdToday,
    initialCash: 10000,
  });

  // Movimiento de ingreso y egreso
  await recordCashMovement({
    tenantId: bvaTenantA,
    cashShiftId: bvaShiftId,
    type: "INCOME",
    category: "BEBIDAS",
    amount: 5000,
    description: "Venta de 2 Gatorades",
    registeredByUserId: uIdToday,
  });

  await recordCashMovement({
    tenantId: bvaTenantA,
    cashShiftId: bvaShiftId,
    type: "EXPENSE",
    category: "INSUMOS",
    amount: 2500,
    description: "Compra lavandina",
    registeredByUserId: uIdToday,
  });

  // Cierre Ciego con sobrante de $500 (Saldo esperado: 10000 + 5000 - 2500 = 12500. Declarado: 13000)
  const closeSummary = await closeCashShiftBlind({
    cashShiftId: bvaShiftId,
    closedByUserId: uIdToday,
    declaredCash: 13000,
  });

  assert(closeSummary.systemExpectedCash === 12500, "Caja calcula saldo esperado exacto de $12.500");
  assert(closeSummary.differenceCash === 500, "Arqueo ciego registra sobrante exacto de +$500");
  assert(closeSummary.status === "CLOSED_LOCKED", "Turno de caja pasa a CLOSED_LOCKED");

  // Intentar registrar movimiento en caja ya cerrada -> debe rechazar
  let movementOnClosedFailed = false;
  try {
    await recordCashMovement({
      tenantId: bvaTenantA,
      cashShiftId: bvaShiftId,
      type: "INCOME",
      category: "VENTA",
      amount: 1000,
      description: "Intento en caja cerrada",
      registeredByUserId: uIdToday,
    });
  } catch (err: any) {
    movementOnClosedFailed = err.message === "CASH_SHIFT_NOT_FOUND_OR_CLOSED";
  }
  assert(movementOnClosedFailed, "Bloqueo estricto: Impide registrar movimientos en caja ya cerrada");

  // Intentar cerrar nuevamente una caja ya cerrada -> debe rechazar
  let doubleCloseFailed = false;
  try {
    await closeCashShiftBlind({
      cashShiftId: bvaShiftId,
      closedByUserId: uIdToday,
      declaredCash: 13000,
    });
  } catch (err: any) {
    doubleCloseFailed = err.message === "CASH_SHIFT_ALREADY_CLOSED";
  }
  assert(doubleCloseFailed, "Idempotencia de caja: Impide cerrar dos veces el mismo turno");

  // Split Payment con múltiples métodos (CASH + QR)
  const bvaInvoiceId = generateUUIDv7();
  await db.insert(invoices).values({
    id: bvaInvoiceId,
    tenantId: bvaTenantA,
    userId: uIdToday,
    invoiceNumber: `INV-BVA-${Date.now()}`,
    totalAmount: 40000,
    paidAmount: 0,
    status: "PENDING",
    dueDate: todayStr,
    issuedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const paymentRes = await processPaymentTransaction({
    tenantId: bvaTenantA,
    invoiceId: bvaInvoiceId,
    splits: [
      { amount: 15000, paymentMethod: "MERCADO_PAGO_QR", gatewayReference: "MP-TX-999" },
      { amount: 25000, paymentMethod: "BANK_TRANSFER", gatewayReference: "TR-999" },
    ],
  });

  assert(paymentRes.paidAmount === 40000, "Split Payment suma exactamente los pagos mixtos ($40.000)");
  assert(paymentRes.remainingAmount === 0, "Saldo restante de la factura queda en $0");
  assert(paymentRes.invoiceStatus === "PAID", "Factura cambia automáticamente a PAID");

  // =========================================================================
  // SECCIÓN 4: CRIPTOGRAFÍA, INTEGRIDAD Y DETECCIÓN DE ADULTERACIÓN
  // =========================================================================
  console.log("\n  🔐 [BVA 1.4] Integridad Criptográfica AES-256-GCM y Blind Index:");

  const sensitiveMedical = "Paciente con arritmia cardíaca leve y asma";
  const encryptedPacked = encryptToString(sensitiveMedical);

  // 1. Descifrado íntegro
  const decryptedCorrectly = decryptFromString(encryptedPacked);
  assert(decryptedCorrectly === sensitiveMedical, "Descifrado legítimo reproduce el texto plano original");

  // 2. Tampering: Alteración de un caracter en el Ciphertext
  const parts = encryptedPacked.split(":");
  const corruptedCipher = parts[4].substring(0, parts[4].length - 4) + "AAAA";
  const tamperedPacked = `enc:v1:${parts[2]}:${parts[3]}:${corruptedCipher}`;

  let tamperDetected = false;
  try {
    decryptFromString(tamperedPacked);
  } catch (err: any) {
    tamperDetected = err.message.includes("INTEGRITY_CHECK_FAILED");
  }
  assert(tamperDetected, "Detección de Tampering: Ciphertext adulterado es rechazado por falla de integridad");

  // 3. Tampering: Alteración del AuthTag GCM
  const corruptedTag = Buffer.from("0123456789abcdef0123456789abcdef", "hex").toString("base64");
  const tamperedTagPacked = `enc:v1:${parts[2]}:${corruptedTag}:${parts[4]}`;

  let tagTamperDetected = false;
  try {
    decryptFromString(tamperedTagPacked);
  } catch (err: any) {
    tagTamperDetected = err.message.includes("INTEGRITY_CHECK_FAILED");
  }
  assert(tagTamperDetected, "Detección de Tampering: AuthTag alterado es bloqueado por el protocolo criptográfico");

  // 4. Blind Index determinista y normalizado
  const blind1 = generateBlindIndex("  38.999.111 ");
  const blind2 = generateBlindIndex("38999111");
  assert(blind1.length === 64, "Blind Index genera hash HMAC-SHA256 de longitud fija de 64 caracteres");

  // =========================================================================
  // SECCIÓN 5: RESILIENCIA DEL RATE LIMITER BAJO RÁFAGA CONCURRENTE
  // =========================================================================
  console.log("\n  ⚡ [BVA 1.5] Estrés y Límite de Ráfaga en Rate Limiter:");

  const burstKey = `qa-burst-ip-${Date.now()}`;
  const allowedRequests: boolean[] = [];

  // Enviar 10 solicitudes con límite configurado en 5
  for (let i = 0; i < 10; i++) {
    const res = await rateLimiter.check(burstKey, 5, 10000);
    allowedRequests.push(res.allowed);
  }

  const passedCount = allowedRequests.filter((a) => a === true).length;
  const blockedCount = allowedRequests.filter((a) => a === false).length;

  assert(passedCount === 5, "Rate limiter permite exactamente las primeras 5 peticiones");
  assert(blockedCount === 5, "Rate limiter bloquea de forma determinista las 5 peticiones excedentes");

  // =========================================================================
  // SECCIÓN 6: LÍMITES EN BUSINESS INTELLIGENCE (TENANT VACÍO)
  // =========================================================================
  console.log("\n  📊 [BVA 1.6] Estabilidad de BI y Métricas en Tenant sin Datos:");

  const emptyDashboard = await getExecutiveBusinessDashboard(bvaTenantB);
  assert(emptyDashboard.totalMembers === 0, "Dashboard maneja 0 socios sin división por cero ni errores");
  assert(emptyDashboard.monthlyRecurringRevenue === 0, "MRR en tenant vacío es $0");
  assert(emptyDashboard.peakHourDescription === "Sin datos suficientes", "Horario pico reporta 'Sin datos suficientes' en ausencia de asistencias");
  assert(emptyDashboard.peakHoursHeatmap.length === 7, "Matriz de calor 7x24 generada íntegramente con ceros");

  console.log(`\nResumen Suite 14: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
