import { db } from "../src/db";
import {
  tenants,
  branches,
  users,
  medicalRecords,
  membershipPlans,
  subscriptions,
  invoices,
  paymentTransactions,
  attendances,
} from "../src/db/schema";
import { generateUUIDv7 } from "../src/lib/security/uuid";
import { hashPassword } from "../src/lib/security/hash";
import {
  encryptToString,
  decryptFromString,
  generateBlindIndex,
} from "../src/lib/security/encryption";
import { eq } from "drizzle-orm";

export async function runDatabaseErdTests() {
  console.log("\n🗄️ [TEST SUITE 3] Modelo Relacional (ERD), Integridad y Consultas");
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

  // 1. Crear tablas frescas en SQLite local para la suite de pruebas
  const sqlite = (db as any).session?.client;
  if (sqlite) {
    sqlite.exec(`
      DROP TABLE IF EXISTS webhook_events;
      DROP TABLE IF EXISTS set_logs;
      DROP TABLE IF EXISTS workout_logs;
      DROP TABLE IF EXISTS routine_exercises;
      DROP TABLE IF EXISTS routine_days;
      DROP TABLE IF EXISTS routines;
      DROP TABLE IF EXISTS exercises;
      DROP TABLE IF EXISTS body_measurements;
      DROP TABLE IF EXISTS attendances;
      DROP TABLE IF EXISTS payment_transactions;
      DROP TABLE IF EXISTS cash_movements;
      DROP TABLE IF EXISTS cash_shifts;
      DROP TABLE IF EXISTS invoices;
      DROP TABLE IF EXISTS subscriptions;
      DROP TABLE IF EXISTS membership_plans;
      DROP TABLE IF EXISTS medical_records;
      DROP TABLE IF EXISTS user_sessions;
      DROP TABLE IF EXISTS role_permissions;
      DROP TABLE IF EXISTS permissions;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS branches;
      DROP TABLE IF EXISTS tenants;
    `);

    // Recrear todas las tablas del sistema
    const { initializeLocalDatabase } = await import("../src/db/init");
    initializeLocalDatabase(sqlite);
  }

  const now = new Date().toISOString();
  const testTenantId = generateUUIDv7();
  const testBranchId = generateUUIDv7();
  const testUserId = generateUUIDv7();

  // 2. Insertar Tenant
  await db.insert(tenants).values({
    id: testTenantId,
    name: "Iron Fitness Club",
    slug: `iron-fit-${Date.now()}`,
    email: "contact@ironfit.com",
    createdAt: now,
    updatedAt: now,
  });

  const insertedTenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, testTenantId),
  });
  assert(insertedTenant?.name === "Iron Fitness Club", "Tenant insertado y recuperado correctamente");

  // 3. Insertar Branch
  await db.insert(branches).values({
    id: testBranchId,
    tenantId: testTenantId,
    name: "Sede Centro",
    address: "Av. Corrientes 1234",
    createdAt: now,
    updatedAt: now,
  });

  // 4. Insertar Usuario con Blind Index y Contraseña hasheada
  const rawDni = "35888999";
  const dniBlindIndex = generateBlindIndex(rawDni);
  const passwordHash = await hashPassword("UserPass2026!");

  await db.insert(users).values({
    id: testUserId,
    tenantId: testTenantId,
    dni: rawDni,
    dniBlindIndex,
    email: "socio.test@ironfit.com",
    passwordHash,
    firstName: "Lucas",
    lastName: "García",
    role: "SOCIO",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  });

  // 5. Búsqueda rápida por Blind Index
  const foundUser = await db.query.users.findFirst({
    where: eq(users.dniBlindIndex, dniBlindIndex),
  });
  assert(foundUser?.id === testUserId, "Búsqueda por Blind Index ubica al socio de forma inmediata");

  // 6. Insertar Ficha Médica Cifrada (AES-256-GCM)
  const medicalId = generateUUIDv7();
  const encryptedConditions = encryptToString("Hernia discal L5-S1 diagnosticada en 2024");
  const encryptedMedications = encryptToString("Diclofenac ocasional");

  await db.insert(medicalRecords).values({
    id: medicalId,
    userId: testUserId,
    tenantId: testTenantId,
    medicalClearanceStatus: "VALID",
    clearanceExpiryDate: "2027-01-01",
    emergencyContactName: "María García",
    emergencyContactPhone: "+5491155554444",
    bloodType: "A+",
    encryptedConditions,
    encryptedMedications,
    createdAt: now,
    updatedAt: now,
  });

  const foundMedical = await db.query.medicalRecords.findFirst({
    where: eq(medicalRecords.userId, testUserId),
  });

  assert(Boolean(foundMedical?.encryptedConditions?.startsWith("enc:v1:")), "Ficha médica almacena datos en formato cifrado");
  const decryptedCondition = decryptFromString(foundMedical!.encryptedConditions!);
  assert(decryptedCondition === "Hernia discal L5-S1 diagnosticada en 2024", "Desencriptación de registro médico en BD es íntegra");

  // 7. Insertar Asistencia (Append-Only)
  const attendanceId = generateUUIDv7();
  await db.insert(attendances).values({
    id: attendanceId,
    tenantId: testTenantId,
    branchId: testBranchId,
    userId: testUserId,
    accessMethod: "DNI_KEYPAD",
    accessStatus: "GRANTED_GREEN",
    checkInAt: now,
  });

  const foundAttendance = await db.query.attendances.findFirst({
    where: eq(attendances.id, attendanceId),
  });
  assert(Boolean(foundAttendance?.accessStatus === "GRANTED_GREEN"), "Registro inmutable de asistencia insertado exitosamente");

  console.log(`\nResumen Suite 3: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
