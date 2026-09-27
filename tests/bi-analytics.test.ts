import { db } from "../src/db";
import {
  tenants,
  branches,
  users,
  attendances,
  invoices,
  paymentTransactions,
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
  // Fechas RELATIVAS a hoy (antes eran fijas: 2026-09-14, el test se rompía solo al mes).
  // 19:xx y 08:xx hora Argentina = 22:xx y 11:xx UTC.
  const at = (daysAgo: number, utcHour: number, minute: number) => {
    const d = new Date(Date.now() - daysAgo * 86_400_000);
    d.setUTCHours(utcHour, minute, 0, 0);
    return d.toISOString();
  };
  await db.insert(attendances).values([
    {
      id: generateUUIDv7(),
      tenantId,
      branchId,
      userId,
      accessStatus: "GRANTED_GREEN",
      accessMethod: "DNI_KEYPAD",
      checkInAt: at(3, 22, 15),
    },
    {
      id: generateUUIDv7(),
      tenantId,
      branchId,
      userId,
      accessStatus: "GRANTED_GREEN",
      accessMethod: "DNI_KEYPAD",
      checkInAt: at(3, 22, 30),
    },
    {
      id: generateUUIDv7(),
      tenantId,
      branchId,
      userId,
      accessStatus: "GRANTED_GREEN",
      accessMethod: "BARCODE_SCAN",
      checkInAt: at(3, 22, 45),
    },
    {
      id: generateUUIDv7(),
      tenantId,
      branchId,
      userId,
      accessStatus: "GRANTED_GREEN",
      accessMethod: "DNI_KEYPAD",
      checkInAt: at(2, 11, 10),
    },
    {
      id: generateUUIDv7(),
      tenantId,
      branchId,
      userId,
      accessStatus: "GRANTED_GREEN",
      accessMethod: "DNI_KEYPAD",
      checkInAt: at(2, 11, 50),
    },
    {
      // Rechazo en ROJO: NO debe contar como asistencia ni en el heatmap
      id: generateUUIDv7(),
      tenantId,
      branchId,
      userId,
      accessStatus: "DENIED_RED",
      accessMethod: "DNI_KEYPAD",
      checkInAt: at(1, 22, 5),
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
  assert(totalHeatmapEntries === 5, "El mapa de calor computó los 5 accesos efectivos (excluye rechazos)");
  const count19 = heatmap.reduce((acc, d) => acc + d.hourlyCounts[19], 0);
  assert(count19 === 3, "Heatmap usa hora local del gimnasio (22:xx UTC -> 19 hs Argentina)");

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

  // MRR = cobros aprobados de los últimos 30 días (un cobro de hace 60 días NO cuenta)
  const inv1 = generateUUIDv7();
  await db.insert(invoices).values({
    id: inv1, tenantId, userId, invoiceNumber: "FAC-BI-03", totalAmount: 75000, paidAmount: 75000,
    status: "PAID", dueDate: "2026-01-01", issuedAt: nowIso, createdAt: nowIso, updatedAt: nowIso,
  });
  await db.insert(paymentTransactions).values([
    { id: generateUUIDv7(), tenantId, invoiceId: inv1, amount: 35000, paymentMethod: "CASH", status: "APPROVED", createdAt: nowIso },
    { id: generateUUIDv7(), tenantId, invoiceId: inv1, amount: 40000, paymentMethod: "MERCADO_PAGO_QR", status: "APPROVED", createdAt: nowIso },
    { id: generateUUIDv7(), tenantId, invoiceId: inv1, amount: 99999, paymentMethod: "CASH", status: "APPROVED", createdAt: new Date(Date.now() - 60 * 86_400_000).toISOString() },
  ]);

  // 4. Probar Dashboard Ejecutivo
  const kpis = await getExecutiveBusinessDashboard(tenantId);
  assert(kpis.totalMembers === 1, "Reporta total de 1 socio en el padrón");
  assert(kpis.activeMembers === 1, "Reporta 1 socio activo");
  assert(kpis.monthlyRecurringRevenue === 75000, "MRR computa exactamente $75.000 cobrados en los últimos 30 días");
  assert(kpis.monthlyAttendancesCount === 5, "Total de asistencias del mes coincide (5 accesos)");
  assert(Boolean(kpis.peakHourDescription), "Describe con texto claro el horario pico");

  console.log(`\nResumen Suite 12: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
