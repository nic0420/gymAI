import { db } from "../src/db";
import {
  tenants,
  branches,
  users,
  attendances,
  invoices,
} from "../src/db/schema";
import {
  generatePeakHoursHeatmap,
  getExecutiveBusinessDashboard,
} from "../src/lib/analytics/bi-service";
import { generateUUIDv7 } from "../src/lib/security/uuid";
import { hashPassword } from "../src/lib/security/hash";
import { generateBlindIndex } from "../src/lib/security/encryption";

export async function runBiAnalyticsTests() {
  console.log("\n📊 [TEST SUITE 12] Business Intelligence, Mapa de Calor de Horarios Pico y KPIs");
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
    name: "Analytics Test Gym",
    slug: `bi-gym-${Date.now()}`,
    email: "bi@gym.com",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(branches).values({
    id: branchId,
    tenantId,
    name: "Sede Principal",
    address: "Calle 100",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const pwdHash = await hashPassword("BiPass123!");
  await db.insert(users).values({
    id: userId,
    tenantId,
    dni: "39555666",
    dniBlindIndex: generateBlindIndex("39555666"),
    email: "user.bi@gym.com",
    passwordHash: pwdHash,
    firstName: "Ignacio",
    lastName: "Pérez",
    role: "SOCIO",
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // 1. Simular Asistencias en Horarios Específicos:
  // - 3 accesos el Lunes a las 19:00 hs (2026-09-14T19:30:00Z -> Lunes)
  // - 2 accesos el Martes a las 08:00 hs (2026-09-15T08:15:00Z -> Martes)
  await db.insert(attendances).values([
    {
      id: generateUUIDv7(),
      tenantId,
      branchId,
      userId,
      accessStatus: "GRANTED_GREEN",
      accessMethod: "DNI_KEYPAD",
      checkInAt: "2026-09-14T19:15:00Z",
    },
    {
      id: generateUUIDv7(),
      tenantId,
      branchId,
      userId,
      accessStatus: "GRANTED_GREEN",
      accessMethod: "DNI_KEYPAD",
      checkInAt: "2026-09-14T19:30:00Z",
    },
    {
      id: generateUUIDv7(),
      tenantId,
      branchId,
      userId,
      accessStatus: "GRANTED_GREEN",
      accessMethod: "BARCODE_SCAN",
      checkInAt: "2026-09-14T19:45:00Z",
    },
    {
      id: generateUUIDv7(),
      tenantId,
      branchId,
      userId,
      accessStatus: "GRANTED_GREEN",
      accessMethod: "DNI_KEYPAD",
      checkInAt: "2026-09-15T08:10:00Z",
    },
    {
      id: generateUUIDv7(),
      tenantId,
      branchId,
      userId,
      accessStatus: "GRANTED_GREEN",
      accessMethod: "DNI_KEYPAD",
      checkInAt: "2026-09-15T08:50:00Z",
    },
  ]);

  // 2. Probar Mapa de Calor (Heatmap)
  const heatmap = await generatePeakHoursHeatmap(tenantId);
  assert(heatmap.length === 7, "El mapa de calor contiene los 7 días de la semana");
  assert(heatmap[0].hourlyCounts.length === 24, "Cada día contiene las 24 horas del día (00 a 23)");

  const totalHeatmapEntries = heatmap.reduce(
    (acc, d) => acc + d.hourlyCounts.reduce((hAcc, c) => hAcc + c, 0),
    0
  );
  assert(totalHeatmapEntries === 5, "El mapa de calor computó los 5 accesos registrados");

  // 3. Simular Facturas Cobradas para MRR
  await db.insert(invoices).values([
    {
      id: generateUUIDv7(),
      tenantId,
      userId,
      invoiceNumber: "FAC-BI-01",
      totalAmount: 35000,
      paidAmount: 35000,
      status: "PAID",
      dueDate: "2026-09-10",
      issuedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: generateUUIDv7(),
      tenantId,
      userId,
      invoiceNumber: "FAC-BI-02",
      totalAmount: 40000,
      paidAmount: 40000,
      status: "PAID",
      dueDate: "2026-09-12",
      issuedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ]);

  // 4. Probar Dashboard Ejecutivo
  const kpis = await getExecutiveBusinessDashboard(tenantId);
  assert(kpis.totalMembers === 1, "Reporta total de 1 socio en el padrón");
  assert(kpis.activeMembers === 1, "Reporta 1 socio activo");
  assert(kpis.monthlyRecurringRevenue === 75000, "MRR computa exactamente $75.000 de facturación");
  assert(kpis.monthlyAttendancesCount === 5, "Total de asistencias del mes coincide (5 accesos)");
  assert(Boolean(kpis.peakHourDescription), "Describe con texto claro el horario pico");

  console.log(`\nResumen Suite 12: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
