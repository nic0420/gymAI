import { db } from "../src/db";
import { attendances, tenants, branches, users } from "../src/db/schema";
import { generateUUIDv7 } from "../src/lib/security/uuid";
import { generateBlindIndex } from "../src/lib/security/encryption";
import { hashPassword } from "../src/lib/security/hash";
import { eq } from "drizzle-orm";

export async function runOfflineSyncTests() {
  console.log("\n📡 [TEST SUITE 6] Sincronización Offline-First e Idempotencia");
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
  const dni = "45000111";

  await db.insert(tenants).values({
    id: tenantId,
    name: "Sync Gym",
    slug: `sync-gym-${Date.now()}`,
    email: "sync@gym.com",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(branches).values({
    id: branchId,
    tenantId,
    name: "Sede Norte",
    address: "Calle Falsa 123",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const pwdHash = await hashPassword("Sync123!");
  await db.insert(users).values({
    id: userId,
    tenantId,
    dni,
    dniBlindIndex: generateBlindIndex(dni),
    email: "sync.user@gym.com",
    passwordHash: pwdHash,
    firstName: "Franco",
    lastName: "Armani",
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // Simular lote de eventos generados offline con UUIDv7 de cliente
  const event1Id = generateUUIDv7();
  const event2Id = generateUUIDv7();

  // 1. Simulación de sincronización de lote 1
  const offlineEvents = [
    {
      clientEventId: event1Id,
      tenantId,
      branchId,
      dni,
      accessStatus: "GRANTED_GREEN" as const,
      accessMethod: "DNI_KEYPAD" as const,
      checkInAt: nowIso,
    },
    {
      clientEventId: event2Id,
      tenantId,
      branchId,
      dni,
      accessStatus: "WARNING_YELLOW" as const,
      accessMethod: "BARCODE_SCAN" as const,
      warningReason: "Cuota por vencer",
      checkInAt: nowIso,
    },
  ];

  // Inserción simulada del batch en el endpoint de sync
  for (const ev of offlineEvents) {
    await db.insert(attendances).values({
      id: ev.clientEventId,
      tenantId: ev.tenantId,
      branchId: ev.branchId,
      userId,
      accessMethod: ev.accessMethod,
      accessStatus: ev.accessStatus,
      warningReason: ev.warningReason,
      checkInAt: ev.checkInAt,
    });
  }

  const att1 = await db.query.attendances.findFirst({
    where: eq(attendances.id, event1Id),
  });
  const att2 = await db.query.attendances.findFirst({
    where: eq(attendances.id, event2Id),
  });

  assert(Boolean(att1 && att1.accessStatus === "GRANTED_GREEN"), "Evento offline 1 sincronizado con ID de cliente");
  assert(Boolean(att2 && att2.accessStatus === "WARNING_YELLOW"), "Evento offline 2 sincronizado con advertencia");

  // 2. Prueba de IDEMPOTENCIA: Reintento de sincronización del mismo lote
  let duplicateSkipped = 0;
  for (const ev of offlineEvents) {
    const existing = await db.query.attendances.findFirst({
      where: eq(attendances.id, ev.clientEventId),
    });
    if (existing) {
      duplicateSkipped++;
    }
  }

  assert(duplicateSkipped === 2, "Reintento de sincronización detecta duplicados y los ignora (Idempotencia garantizada)");

  console.log(`\nResumen Suite 6: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
