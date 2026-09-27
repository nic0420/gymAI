/**
 * SUITE 15 — Regresión QA
 * Cada caso reproduce un defecto encontrado en la auditoría y verifica su corrección.
 */
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { db } from "../src/db";
import {
  tenants,
  branches,
  users,
  invoices,
  cashShifts,
  membershipPlans,
  subscriptions,
  exercises,
  webhookEvents,
} from "../src/db/schema";
import { generateUUIDv7 } from "../src/lib/security/uuid";
import { hashPassword } from "../src/lib/security/hash";
import { generateBlindIndex } from "../src/lib/security/encryption";
import { generateAccessToken, verifyAccessToken } from "../src/lib/auth/tokens";
import { processPaymentTransaction } from "../src/lib/finance/payment-service";
import { processGatewayWebhook } from "../src/lib/finance/webhook-service";
import { logWorkoutSession } from "../src/lib/workouts/workout-service";
import { getLocalDateString, getLocalDayAndHour, addDaysToDateString } from "../src/lib/time/dates";
import { csvCell } from "../src/lib/export/csv-exporter";
import { generateWhatsAppLink, normalizeArgentinePhone } from "../src/lib/whatsapp/whatsapp-helper";
import { eq } from "drizzle-orm";

import * as usersRoute from "../src/app/api/v1/users/route";
import * as userByIdRoute from "../src/app/api/v1/users/[id]/route";
import * as webhookRoute from "../src/app/api/v1/webhooks/gateway/route";
import * as syncOfflineRoute from "../src/app/api/v1/attendance/sync-offline/route";
import * as importCsvRoute from "../src/app/api/v1/users/import-csv/route";
import * as loginRoute from "../src/app/api/v1/auth/login/route";
import * as refreshRoute from "../src/app/api/v1/auth/refresh/route";
import * as cashShiftsRoute from "../src/app/api/v1/finance/cash-shifts/route";

export async function runQaRegressionTests() {
  console.log("\n🧯 [TEST SUITE 15] Regresión QA (defectos corregidos en la auditoría)");
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
  const today = getLocalDateString();
  const pwd = await hashPassword("ClaveSegura123");

  async function createTenant(slugPrefix: string) {
    const tenantId = generateUUIDv7();
    const branchId = generateUUIDv7();
    const adminId = generateUUIDv7();
    const receptionId = generateUUIDv7();
    const memberId = generateUUIDv7();
    const slug = `${slugPrefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    await db.insert(tenants).values({ id: tenantId, name: slugPrefix, slug, email: "a@a.com", createdAt: nowIso, updatedAt: nowIso });
    await db.insert(branches).values({ id: branchId, tenantId, name: "Sede", address: "Calle 1", createdAt: nowIso, updatedAt: nowIso });
    const mk = (id: string, dni: string, role: any, email: string) =>
      db.insert(users).values({
        id, tenantId, dni, dniBlindIndex: generateBlindIndex(dni), email, passwordHash: pwd,
        firstName: "Test", lastName: role, role, status: "ACTIVE", createdAt: nowIso, updatedAt: nowIso,
      });
    await mk(adminId, "30111222", "SUPERADMIN", "Admin@Gym.com");
    await mk(receptionId, "30111333", "RECEPCIONISTA", "recepcion@gym.com");
    await mk(memberId, "30111444", "SOCIO", "socio@gym.com");
    const token = (userId: string, role: string) =>
      generateAccessToken({ sub: userId, tenantId, dni: "", role, permissions: [], sessionId: "s" });
    return {
      tenantId, branchId, adminId, receptionId, memberId, slug,
      adminToken: await token(adminId, "SUPERADMIN"),
      receptionToken: await token(receptionId, "RECEPCIONISTA"),
      memberToken: await token(memberId, "SOCIO"),
    };
  }

  const A = await createTenant("gym-a");
  const B = await createTenant("gym-b");

  const req = (url: string, init: { method?: string; token?: string; body?: any; headers?: Record<string, string> } = {}) =>
    new NextRequest(`http://localhost${url}`, {
      method: init.method || "GET",
      headers: {
        "content-type": "application/json",
        ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
        ...(init.headers || {}),
      },
      body: init.body !== undefined ? (typeof init.body === "string" ? init.body : JSON.stringify(init.body)) : undefined,
    });

  // ---------------------------------------------------------------- 1. Autenticación / multi-tenant
  let res = await usersRoute.GET(req(`/api/v1/users?tenantId=${A.tenantId}`));
  assert(res.status === 401, "[SEC-01] Listar socios sin token -> 401 (antes: 200 con datos)");

  res = await usersRoute.GET(req(`/api/v1/users?tenantId=${B.tenantId}`, { token: A.adminToken }));
  assert(res.status === 403, "[SEC-02] Admin del gimnasio A no puede listar socios del gimnasio B");

  res = await usersRoute.GET(req(`/api/v1/users`, { token: A.receptionToken }));
  const listA = await res.json();
  assert(res.status === 200 && listA.data.every((u: any) => u.tenantId === A.tenantId), "[SEC-02] El tenant se toma del token, no del query");

  res = await usersRoute.GET(req(`/api/v1/users?q=%25`, { token: A.adminToken }));
  const likeRes = await res.json();
  assert(res.status === 200 && likeRes.data.length === 0, "[BUG] Buscar '%' ya no devuelve todo el padrón (LIKE escapado)");

  res = await usersRoute.POST(
    req(`/api/v1/users`, {
      method: "POST", token: A.memberToken,
      body: { dni: "40999888", firstName: "Hack", lastName: "Er", email: "h@h.com", role: "SUPERADMIN" },
    })
  );
  assert(res.status === 403, "[SEC-03] Un SOCIO no puede crear usuarios (antes: cualquiera creaba SUPERADMIN)");

  res = await usersRoute.POST(
    req(`/api/v1/users`, {
      method: "POST", token: A.receptionToken,
      body: { dni: "40999887", firstName: "Nuevo", lastName: "Staff", email: "s@s.com", role: "SUPERADMIN" },
    })
  );
  assert(res.status === 403, "[SEC-03] Recepción no puede crear un SUPERADMIN (escalada de privilegios)");

  res = await usersRoute.POST(
    req(`/api/v1/users`, {
      method: "POST", token: A.receptionToken,
      body: { dni: "40999886", firstName: "Nuevo", lastName: "Socio", email: "nuevo@s.com" },
    })
  );
  const created = await res.json();
  assert(
    res.status === 201 && !String(created.data?.initialPasswordHint || "").includes("9886!"),
    "[SEC-07] La contraseña temporal ya no se deriva del DNI"
  );

  res = await userByIdRoute.PATCH(
    req(`/api/v1/users/${A.memberId}`, { method: "PATCH", token: A.adminToken, body: { passwordHash: "x", tenantId: B.tenantId } }),
    { params: { id: A.memberId } }
  );
  assert(res.status === 400, "[SEC-04] PATCH rechaza campos no editables (mass assignment de passwordHash/tenantId)");

  res = await userByIdRoute.PATCH(
    req(`/api/v1/users/${A.memberId}`, { method: "PATCH", token: A.receptionToken, body: { role: "SUPERADMIN" } }),
    { params: { id: A.memberId } }
  );
  assert(res.status === 403, "[SEC-04] Recepción no puede cambiar roles");

  res = await userByIdRoute.GET(req(`/api/v1/users/${B.memberId}`, { token: A.adminToken }), { params: { id: B.memberId } });
  assert(res.status === 404, "[SEC-02] No se puede leer la ficha (médica) de un socio de otro gimnasio");

  // ---------------------------------------------------------------- 2. Refresh conserva el rol
  res = await loginRoute.POST(
    req(`/api/v1/auth/login`, { method: "POST", body: { tenantSlug: A.slug, identifier: "admin@gym.com", password: "ClaveSegura123" } })
  );
  const loginJson = await res.json();
  assert(res.status === 200, "[BUG] Login acepta el email sin distinguir mayúsculas");
  assert(Array.isArray(loginJson.data?.tenant?.branches) && loginJson.data.tenant.branches.length === 1, "[BUG] Login devuelve las sedes reales del gimnasio");
  const setCookie = res.headers.get("set-cookie") || "";
  const refreshCookie = /gymai_refresh_token=([^;]+)/.exec(setCookie)?.[1] || "";
  res = await refreshRoute.POST(req(`/api/v1/auth/refresh`, { method: "POST", headers: { cookie: `gymai_refresh_token=${refreshCookie}` } }));
  const refreshed = await res.json();
  const refreshedPayload = refreshed.data?.accessToken ? await verifyAccessToken(refreshed.data.accessToken) : null;
  assert(refreshedPayload?.role === "SUPERADMIN", "[BUG-01] Tras el refresh el admin sigue siendo SUPERADMIN (antes quedaba como SOCIO)");

  // ---------------------------------------------------------------- 3. Arqueo ciego
  const shiftId = generateUUIDv7();
  await db.insert(cashShifts).values({
    id: shiftId, tenantId: A.tenantId, branchId: A.branchId, openedByUserId: A.receptionId,
    initialCash: 1000, status: "OPEN", openedAt: nowIso,
  });
  res = await cashShiftsRoute.GET(req(`/api/v1/finance/cash-shifts?branchId=${A.branchId}`, { token: A.receptionToken }));
  const blindJson = await res.json();
  assert(blindJson.data?.summary === null && blindJson.data?.blind === true, "[BUG-06] Recepción no ve el saldo teórico durante el turno (arqueo realmente ciego)");
  res = await cashShiftsRoute.GET(req(`/api/v1/finance/cash-shifts?branchId=${A.branchId}`, { token: A.adminToken }));
  const adminCash = await res.json();
  assert(adminCash.data?.summary?.currentCalculatedCash === 1000, "El dueño sí ve el saldo teórico");

  // ---------------------------------------------------------------- 4. Pagos
  const planId = generateUUIDv7();
  const subId = generateUUIDv7();
  const invId = generateUUIDv7();
  await db.insert(membershipPlans).values({ id: planId, tenantId: A.tenantId, name: "Plan", price: 10000, durationDays: 30, createdAt: nowIso, updatedAt: nowIso });
  await db.insert(subscriptions).values({ id: subId, tenantId: A.tenantId, userId: A.memberId, planId, status: "PAST_DUE_SUSPENDED", startDate: today, endDate: addDaysToDateString(today, -1), createdAt: nowIso, updatedAt: nowIso });
  await db.insert(invoices).values({ id: invId, tenantId: A.tenantId, userId: A.memberId, subscriptionId: subId, invoiceNumber: `QA-${Date.now()}`, totalAmount: 10000, paidAmount: 0, status: "PENDING", dueDate: today, issuedAt: nowIso, createdAt: nowIso, updatedAt: nowIso });

  const expectError = async (fn: () => Promise<any>, code: string) => {
    try {
      await fn();
      return false;
    } catch (e: any) {
      return e.message === code;
    }
  };

  assert(
    await expectError(() => processPaymentTransaction({ tenantId: B.tenantId, invoiceId: invId, splits: [{ amount: 100, paymentMethod: "BANK_TRANSFER" }] }), "INVOICE_NOT_FOUND"),
    "[BUG-02] El gimnasio B no puede cobrar/alterar facturas del gimnasio A"
  );
  assert(
    await expectError(() => processPaymentTransaction({ tenantId: A.tenantId, invoiceId: invId, splits: [{ amount: 15000, paymentMethod: "BANK_TRANSFER" }] }), "PAYMENT_EXCEEDS_BALANCE"),
    "[BUG-03] Se rechaza el sobrepago (antes paidAmount > totalAmount)"
  );
  assert(
    await expectError(() => processPaymentTransaction({ tenantId: A.tenantId, invoiceId: invId, splits: [{ amount: 1000, paymentMethod: "CASH" }] }), "CASH_SHIFT_REQUIRED"),
    "[BUG-04] Cobro en efectivo exige caja abierta (antes el efectivo no entraba al arqueo)"
  );
  const closedShift = generateUUIDv7();
  await db.insert(cashShifts).values({ id: closedShift, tenantId: A.tenantId, branchId: A.branchId, openedByUserId: A.receptionId, initialCash: 0, status: "CLOSED_LOCKED", openedAt: nowIso });
  assert(
    await expectError(() => processPaymentTransaction({ tenantId: A.tenantId, invoiceId: invId, cashShiftId: closedShift, splits: [{ amount: 1000, paymentMethod: "CASH" }] }), "CASH_SHIFT_NOT_FOUND_OR_CLOSED"),
    "[BUG-04] No se puede inyectar efectivo en una caja ya CERRADA"
  );
  const afterErrors = await db.query.invoices.findFirst({ where: eq(invoices.id, invId) });
  assert(afterErrors?.paidAmount === 0, "[BUG-05] Los intentos fallidos no dejaron escrituras parciales (transacción atómica)");

  const payOk = await processPaymentTransaction({
    tenantId: A.tenantId, invoiceId: invId, cashShiftId: shiftId,
    splits: [{ amount: 0.1, paymentMethod: "CASH" }, { amount: 9999.9, paymentMethod: "DEBIT_CARD" }],
  });
  assert(payOk.invoiceStatus === "PAID" && payOk.remainingAmount === 0, "[BUG] Montos decimales (0.1 + 9999.9) saldan la factura sin error de coma flotante");
  assert(payOk.newSubscriptionEndDate === addDaysToDateString(today, 30), "Membresía vencida se renueva 30 días desde HOY (fecha local)");

  // ---------------------------------------------------------------- 5. Webhook
  process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET = "qa_webhook_secret";
  const inv2 = generateUUIDv7();
  await db.insert(invoices).values({ id: inv2, tenantId: A.tenantId, userId: A.memberId, invoiceNumber: `QA2-${Date.now()}`, totalAmount: 5000, paidAmount: 0, status: "PENDING", dueDate: today, issuedAt: nowIso, createdAt: nowIso, updatedAt: nowIso });
  const forged = JSON.stringify({ id: `evt_${Date.now()}`, type: "payment.approved", invoiceId: inv2, amount: 5000 });
  res = await webhookRoute.POST(req(`/api/v1/webhooks/gateway`, { method: "POST", body: forged }));
  assert(res.status === 401, "[SEC-05] Webhook sin firma es rechazado (antes: pago falso aceptado)");
  const inv2After = await db.query.invoices.findFirst({ where: eq(invoices.id, inv2) });
  assert(inv2After?.status === "PENDING", "[SEC-05] La factura no se marcó como paga por un webhook falsificado");

  const noId = JSON.stringify({ type: "payment.approved", invoiceId: inv2, amount: 5000 });
  const sig = (b: string) => crypto.createHmac("sha256", "qa_webhook_secret").update(b).digest("hex");
  res = await webhookRoute.POST(req(`/api/v1/webhooks/gateway`, { method: "POST", body: noId, headers: { "x-signature": sig(noId) } }));
  assert(res.status === 400, "[BUG-07] Webhook sin id de evento se rechaza (antes se inventaba uno y se perdía la idempotencia)");

  res = await webhookRoute.POST(req(`/api/v1/webhooks/gateway`, { method: "POST", body: forged, headers: { "x-signature": sig(forged) } }));
  const inv2Paid = await db.query.invoices.findFirst({ where: eq(invoices.id, inv2) });
  assert(res.status === 200 && inv2Paid?.status === "PAID", "Webhook firmado correctamente liquida la factura");

  // Reintento de un evento FAILED
  const inv3 = generateUUIDv7();
  const evtId = `evt_retry_${Date.now()}`;
  const failFirst = await processGatewayWebhook({ gateway: "STRIPE", externalEventId: evtId, eventType: "payment.approved", payload: { invoiceId: inv3, amount: 100 } }).then(
    () => "ok",
    (e) => e.message
  );
  await db.insert(invoices).values({ id: inv3, tenantId: A.tenantId, userId: A.memberId, invoiceNumber: `QA3-${Date.now()}`, totalAmount: 100, paidAmount: 0, status: "PENDING", dueDate: today, issuedAt: nowIso, createdAt: nowIso, updatedAt: nowIso });
  const retry = await processGatewayWebhook({ gateway: "STRIPE", externalEventId: evtId, eventType: "payment.approved", payload: { invoiceId: inv3, amount: 100 } });
  assert(failFirst === "INVOICE_NOT_FOUND" && retry.status === "PROCESSED", "[BUG-08] Un webhook FAILED puede reintentarse (antes se ignoraba para siempre)");
  const evtRows = await db.query.webhookEvents.findMany({ where: eq(webhookEvents.externalEventId, evtId) });
  assert(evtRows.length === 1, "Idempotencia: un único registro por evento");

  // ---------------------------------------------------------------- 6. Sync offline
  res = await syncOfflineRoute.POST(
    req(`/api/v1/attendance/sync-offline`, {
      method: "POST", token: A.receptionToken,
      body: {
        tenantId: A.tenantId,
        events: [
          { clientEventId: generateUUIDv7(), tenantId: A.tenantId, branchId: A.branchId, dni: "99999999", accessStatus: "GRANTED_GREEN", accessMethod: "DNI_KEYPAD", checkInAt: nowIso },
          { clientEventId: generateUUIDv7(), tenantId: A.tenantId, branchId: A.branchId, dni: "30111444", accessStatus: "GRANTED_GREEN", accessMethod: "DNI_KEYPAD", checkInAt: nowIso },
        ],
      },
    })
  );
  const syncJson = await res.json();
  assert(res.status === 200 && syncJson.data.syncedCount === 1 && syncJson.data.rejectedCount === 1, "[BUG-09] DNI desconocido en lote offline se reporta, no rompe el lote (antes: 500 por FK)");

  // ---------------------------------------------------------------- 7. Importación CSV
  res = await importCsvRoute.POST(
    req(`/api/v1/users/import-csv`, {
      method: "POST", token: A.adminToken,
      body: { members: [
        { dni: "41.222.333", firstName: "Ana", lastName: "Lopez", status: "activo" },
        { dni: "41222334", firstName: "Beto", lastName: "Diaz", status: "debtor" },
        { dni: "41222334", firstName: "Beto", lastName: "Dup" },
      ] },
    })
  );
  const imp = await res.json();
  assert(imp.data?.importedCount === 1 && imp.data?.skippedCount === 2, "[BUG-10] Import valida estado y detecta DNI repetido en el archivo");
  const ana = await db.query.users.findFirst({ where: eq(users.dniBlindIndex, generateBlindIndex("41222333")) });
  assert(!ana, "Estado inválido ('activo') no llega a la BD");

  // ---------------------------------------------------------------- 8. Unicidad real en BD
  let dupBlocked = false;
  try {
    await db.insert(users).values({ id: generateUUIDv7(), tenantId: A.tenantId, dni: "30111444", dniBlindIndex: generateBlindIndex("30111444"), email: "otro@gym.com", passwordHash: pwd, firstName: "Dup", lastName: "Dup", createdAt: nowIso, updatedAt: nowIso });
  } catch {
    dupBlocked = true;
  }
  assert(dupBlocked, "[BUG-11] La BD impide DNIs duplicados en el mismo gimnasio (índice UNIQUE creado)");

  // ---------------------------------------------------------------- 9. Zona horaria
  assert(getLocalDateString(new Date("2026-09-28T01:30:00Z"), "America/Argentina/Buenos_Aires") === "2026-09-27", "[BUG-12] 22:30 hs de Argentina sigue siendo 'hoy' (antes UTC ya era mañana)");
  const dh = getLocalDayAndHour(new Date("2026-09-14T22:15:00Z"), "America/Argentina/Buenos_Aires");
  assert(dh.hour === 19 && dh.dayOfWeek === 1, "[BUG-12] Heatmap: 22:15 UTC = lunes 19 hs en Argentina");

  // ---------------------------------------------------------------- 10. PRs por sesión
  const exId = generateUUIDv7();
  await db.insert(exercises).values({ id: exId, tenantId: A.tenantId, name: "Press QA", muscleGroup: "CHEST", equipment: "BARBELL", createdAt: nowIso });
  const log = await logWorkoutSession({
    tenantId: A.tenantId, userId: A.memberId, startedAt: nowIso,
    sets: [
      { exerciseId: exId, setNumber: 1, weightKg: 100, repsDone: 5 },
      { exerciseId: exId, setNumber: 2, weightKg: 105, repsDone: 5 },
      { exerciseId: exId, setNumber: 3, weightKg: 110, repsDone: 5 },
    ],
  });
  assert(log.personalRecordsCount === 1, "[BUG-13] 3 series crecientes del mismo ejercicio = 1 récord (antes contaba 3)");

  // ---------------------------------------------------------------- 11. Utilidades
  assert(csvCell('=HYPERLINK("http://x")') === `"'=HYPERLINK(""http://x"")"`, "[SEC-08] CSV neutraliza fórmulas y escapa comillas");
  assert(csvCell("+54 9 342 555-0100") === `"+54 9 342 555-0100"`, "CSV no altera teléfonos");
  const wa = decodeURIComponent(generateWhatsAppLink({ memberName: "Ana", type: "DEBT_REMINDER" }));
  assert(!wa.includes("nico.adolfo.mp") && !wa.includes("0000003100004965726450"), "[SEC-09] WhatsApp ya no usa por defecto la cuenta bancaria personal del desarrollador");
  assert(normalizeArgentinePhone("011 15 4455-6677") === "5491144556677", "[BUG] WhatsApp normaliza celulares con prefijo 15");
  assert(normalizeArgentinePhone("+54 9 342 555-0100") === "5493425550100", "WhatsApp respeta números ya internacionales");

  console.log(`\nResumen Suite 15: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
