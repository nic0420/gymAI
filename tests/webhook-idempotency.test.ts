import { db } from "../src/db";
import {
  tenants,
  users,
  invoices,
  webhookEvents,
} from "../src/db/schema";
import {
  processGatewayWebhook,
  verifyWebhookSignature,
} from "../src/lib/finance/webhook-service";
import { generateUUIDv7 } from "../src/lib/security/uuid";
import { hashPassword } from "../src/lib/security/hash";
import { generateBlindIndex } from "../src/lib/security/encryption";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";

export async function runWebhookIdempotencyTests() {
  console.log("\n⚡ [TEST SUITE 9] Pasarelas de Pago, Firmas Criptográficas e Idempotencia");
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

  // 1. Verificación de Firma Criptográfica (HMAC-SHA256)
  const secretKey = "webhook_secret_key_12345";
  const rawPayload = JSON.stringify({ id: "evt_test_123", amount: 50000 });
  const validSignature = crypto
    .createHmac("sha256", secretKey)
    .update(rawPayload)
    .digest("hex");

  assert(
    verifyWebhookSignature(rawPayload, validSignature, secretKey),
    "Firma HMAC-SHA256 válida es verificada exitosamente"
  );
  assert(
    !verifyWebhookSignature(rawPayload, "invalid_signature_hex", secretKey),
    "Firma HMAC-SHA256 inválida es rechazada de inmediato"
  );

  // 2. Setup Base para Prueba de Webhook Idempotente
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.split("T")[0];
  const tenantId = generateUUIDv7();
  const userId = generateUUIDv7();
  const invoiceId = generateUUIDv7();

  await db.insert(tenants).values({
    id: tenantId,
    name: "Webhook Gym",
    slug: `webhook-gym-${Date.now()}`,
    email: "wh@gym.com",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const pwdHash = await hashPassword("Webhook123!");
  await db.insert(users).values({
    id: userId,
    tenantId,
    dni: "39222333",
    dniBlindIndex: generateBlindIndex("39222333"),
    email: "socio.wh@gym.com",
    passwordHash: pwdHash,
    firstName: "Ignacio",
    lastName: "Fernández",
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(invoices).values({
    id: invoiceId,
    tenantId,
    userId,
    invoiceNumber: "FAC-WH-001",
    totalAmount: 45000,
    paidAmount: 0,
    status: "PENDING",
    dueDate: todayStr,
    issuedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const externalEventId = `mp_evt_${Date.now()}`;

  // 3. Primer Envío del Webhook -> Procesado con Éxito
  const result1 = await processGatewayWebhook({
    tenantId,
    gateway: "MERCADO_PAGO",
    externalEventId,
    eventType: "payment.approved",
    payload: {
      invoiceId,
      amount: 45000,
      paymentId: "mp_pay_123456",
    },
  });

  assert(result1.status === "PROCESSED", "Primer webhook se procesa y liquida la factura");
  assert(!result1.alreadyProcessed, "Marca evento como nuevo (alreadyProcessed = false)");

  // Verificar que la factura quedó en PAID
  const paidInvoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  });
  assert(paidInvoice?.status === "PAID", "Factura quedó saldada (PAID) tras el webhook");
  assert(paidInvoice?.paidAmount === 45000, "Monto cobrado es $45.000");

  // 4. Segundo Envío (Reintento de red de la pasarela) -> IDEMPOTENCIA DETECTADA
  const result2 = await processGatewayWebhook({
    tenantId,
    gateway: "MERCADO_PAGO",
    externalEventId,
    eventType: "payment.approved",
    payload: {
      invoiceId,
      amount: 45000,
      paymentId: "mp_pay_123456",
    },
  });

  assert(result2.alreadyProcessed, "Reintento de webhook detecta evento previo (alreadyProcessed = true)");
  assert(result2.status === "PROCESSED", "Responde exitoso sin reprocesar ni duplicar pagos");

  // Verificar que la factura NO fue cobrada dos veces
  const afterInvoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  });
  assert(afterInvoice?.paidAmount === 45000, "Monto cobrado no fue duplicado ($45.000 preservado)");

  console.log(`\nResumen Suite 9: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
