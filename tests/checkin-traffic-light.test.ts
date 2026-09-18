import { db } from "../src/db";
import {
  tenants,
  branches,
  users,
  medicalRecords,
  membershipPlans,
  subscriptions,
} from "../src/db/schema";
import { evaluateAndProcessCheckIn } from "../src/lib/attendance/checkin-engine";
import { generateUUIDv7 } from "../src/lib/security/uuid";
import { hashPassword } from "../src/lib/security/hash";
import { generateBlindIndex } from "../src/lib/security/encryption";

export async function runCheckInTrafficLightTests() {
  console.log("\n🚦 [TEST SUITE 5] Motor de Check-in en Milisegundos y Semáforo Inteligente");
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

  const now = new Date();
  const nowIso = now.toISOString();
  const todayStr = nowIso.split("T")[0];

  // Fechas relativas
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // +30 días
  const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];   // -10 días
  const expiringSoonDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // +2 días

  const tenantId = generateUUIDv7();
  const branchId = generateUUIDv7();
  const planId = generateUUIDv7();

  // Setup Base
  await db.insert(tenants).values({
    id: tenantId,
    name: "Olympic Sport Club",
    slug: `olympic-${Date.now()}`,
    email: "olympic@gym.com",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(branches).values({
    id: branchId,
    tenantId,
    name: "Sede Central",
    address: "Av. Libertador 4500",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(membershipPlans).values({
    id: planId,
    tenantId,
    name: "Pase Libre",
    price: 35000,
    durationDays: 30,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const pwdHash = await hashPassword("Secret123!");

  // --- CASO 1: Socio 100% al Día (Cuota Activa + Apto Vigente) -> VERDE ---
  const userGreenId = generateUUIDv7();
  const dniGreen = "10000001";
  await db.insert(users).values({
    id: userGreenId,
    tenantId,
    dni: dniGreen,
    dniBlindIndex: generateBlindIndex(dniGreen),
    email: "green@gym.com",
    passwordHash: pwdHash,
    firstName: "Mateo",
    lastName: "Rossi",
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(subscriptions).values({
    id: generateUUIDv7(),
    tenantId,
    userId: userGreenId,
    planId,
    status: "ACTIVE",
    startDate: todayStr,
    endDate: futureDate,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(medicalRecords).values({
    id: generateUUIDv7(),
    tenantId,
    userId: userGreenId,
    medicalClearanceStatus: "VALID",
    clearanceExpiryDate: futureDate,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const resultGreen = await evaluateAndProcessCheckIn({
    tenantId,
    branchId,
    dni: dniGreen,
  });

  assert(resultGreen.accessStatus === "GRANTED_GREEN", "Socio con todo al día recibe 🟢 VERDE");
  assert(resultGreen.executionTimeMs < 100, `Validación ultra veloz completada en ${resultGreen.executionTimeMs}ms (< 100ms)`);

  // --- CASO 2: Socio con Cuota por Vencer en 2 días -> AMARILLO ---
  const userYellowId = generateUUIDv7();
  const dniYellow = "10000002";
  await db.insert(users).values({
    id: userYellowId,
    tenantId,
    dni: dniYellow,
    dniBlindIndex: generateBlindIndex(dniYellow),
    email: "yellow@gym.com",
    passwordHash: pwdHash,
    firstName: "Camila",
    lastName: "Pérez",
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(subscriptions).values({
    id: generateUUIDv7(),
    tenantId,
    userId: userYellowId,
    planId,
    status: "ACTIVE",
    startDate: pastDate,
    endDate: expiringSoonDate,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(medicalRecords).values({
    id: generateUUIDv7(),
    tenantId,
    userId: userYellowId,
    medicalClearanceStatus: "VALID",
    clearanceExpiryDate: futureDate,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const resultYellow = await evaluateAndProcessCheckIn({
    tenantId,
    branchId,
    dni: dniYellow,
  });

  assert(resultYellow.accessStatus === "WARNING_YELLOW", "Socio con cuota próxima a vencer recibe 🟡 AMARILLO");
  assert(Boolean(resultYellow.warningReason?.includes("Vence en")), "Emite aviso de vencimiento próximo");

  // --- CASO 3: Socio Moroso (Cuota Vencida) -> ROJO ---
  const userRedDebtorId = generateUUIDv7();
  const dniRedDebtor = "10000003";
  await db.insert(users).values({
    id: userRedDebtorId,
    tenantId,
    dni: dniRedDebtor,
    dniBlindIndex: generateBlindIndex(dniRedDebtor),
    email: "debtor@gym.com",
    passwordHash: pwdHash,
    firstName: "Rodrigo",
    lastName: "Silva",
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(subscriptions).values({
    id: generateUUIDv7(),
    tenantId,
    userId: userRedDebtorId,
    planId,
    status: "PAST_DUE_SUSPENDED",
    startDate: pastDate,
    endDate: pastDate,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(medicalRecords).values({
    id: generateUUIDv7(),
    tenantId,
    userId: userRedDebtorId,
    medicalClearanceStatus: "VALID",
    clearanceExpiryDate: futureDate,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const resultRedDebtor = await evaluateAndProcessCheckIn({
    tenantId,
    branchId,
    dni: dniRedDebtor,
  });

  assert(resultRedDebtor.accessStatus === "DENIED_RED", "Socio moroso con cuota vencida recibe 🔴 ROJO");

  // --- CASO 4: Socio sin Apto Médico Válido -> ROJO ---
  const userNoMedicalId = generateUUIDv7();
  const dniNoMedical = "10000004";
  await db.insert(users).values({
    id: userNoMedicalId,
    tenantId,
    dni: dniNoMedical,
    dniBlindIndex: generateBlindIndex(dniNoMedical),
    email: "nomedical@gym.com",
    passwordHash: pwdHash,
    firstName: "Sofía",
    lastName: "López",
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(subscriptions).values({
    id: generateUUIDv7(),
    tenantId,
    userId: userNoMedicalId,
    planId,
    status: "ACTIVE",
    startDate: todayStr,
    endDate: futureDate,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(medicalRecords).values({
    id: generateUUIDv7(),
    tenantId,
    userId: userNoMedicalId,
    medicalClearanceStatus: "EXPIRED",
    clearanceExpiryDate: pastDate,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const resultNoMedical = await evaluateAndProcessCheckIn({
    tenantId,
    branchId,
    dni: dniNoMedical,
  });

  assert(resultNoMedical.accessStatus === "DENIED_RED", "Socio con apto vencido recibe 🔴 ROJO");
  assert(Boolean(resultNoMedical.denialReason?.includes("Apto")), "Indica bloqueo por falta de apto médico");

  // --- CASO 5: DNI Inexistente -> ROJO ---
  const resultNotFound = await evaluateAndProcessCheckIn({
    tenantId,
    branchId,
    dni: "99999999",
  });

  assert(resultNotFound.accessStatus === "DENIED_RED", "DNI no registrado recibe 🔴 ROJO");

  console.log(`\nResumen Suite 5: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
