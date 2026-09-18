import crypto from "node:crypto";
import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { generateUUIDv7 } from "@/lib/security/uuid";
import { processPaymentTransaction } from "./payment-service";
import { eq, and } from "drizzle-orm";

/**
 * Valida la firma criptográfica enviada por el Webhook (Mercado Pago / Stripe)
 */
export function verifyWebhookSignature(
  payloadRaw: string,
  signatureHeader: string,
  secretKey: string
): boolean {
  if (!signatureHeader || !secretKey) return false;

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(payloadRaw)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

export interface WebhookProcessingResult {
  alreadyProcessed: boolean;
  eventId: string;
  status: "PROCESSED" | "FAILED" | "IGNORED";
  message: string;
}

/**
 * Procesa un evento de Webhook con IDEMPOTENCIA ESTRICTA
 */
export async function processGatewayWebhook(params: {
  tenantId?: string;
  gateway: "MERCADO_PAGO" | "STRIPE";
  externalEventId: string;
  eventType: string;
  payload: any;
}): Promise<WebhookProcessingResult> {
  const { tenantId, gateway, externalEventId, eventType, payload } = params;
  const nowIso = new Date().toISOString();

  // 1. Verificar IDEMPOTENCIA: Si el externalEventId ya existe para esta pasarela
  const existingEvent = await db.query.webhookEvents.findFirst({
    where: and(
      eq(webhookEvents.gateway, gateway),
      eq(webhookEvents.externalEventId, externalEventId)
    ),
  });

  if (existingEvent) {
    return {
      alreadyProcessed: true,
      eventId: existingEvent.id,
      status: existingEvent.status === "PROCESSED" ? "PROCESSED" : "IGNORED",
      message: "Evento recibido previamente. Ignorando para garantizar idempotencia.",
    };
  }

  // 2. Registrar evento con estado PENDING
  const eventId = generateUUIDv7();
  await db.insert(webhookEvents).values({
    id: eventId,
    tenantId: tenantId || null,
    gateway,
    externalEventId,
    eventType,
    status: "PROCESSING",
    payload: JSON.stringify(payload),
    receivedAt: nowIso,
  });

  try {
    // 3. Procesar lógica de negocio según el tipo de evento
    if (eventType === "payment.approved" || eventType === "invoice.payment_succeeded") {
      const invoiceId = payload.invoiceId || payload.metadata?.invoiceId;
      const amount = payload.amount || payload.transaction_amount;
      const gatewayRef = payload.paymentId || payload.id;

      if (invoiceId && amount && tenantId) {
        await processPaymentTransaction({
          tenantId,
          invoiceId,
          splits: [
            {
              amount: Number(amount),
              paymentMethod: gateway === "MERCADO_PAGO" ? "MERCADO_PAGO_QR" : "STRIPE",
              gatewayReference: String(gatewayRef),
            },
          ],
        });
      }
    }

    // 4. Marcar evento como PROCESSED
    await db
      .update(webhookEvents)
      .set({
        status: "PROCESSED",
        processedAt: new Date().toISOString(),
      })
      .where(eq(webhookEvents.id, eventId));

    return {
      alreadyProcessed: false,
      eventId,
      status: "PROCESSED",
      message: "Evento procesado y liquidado con éxito",
    };
  } catch (error: any) {
    // Si falla, registrar error
    await db
      .update(webhookEvents)
      .set({
        status: "FAILED",
        errorMessage: error.message || "Error desconocido en webhook",
        processedAt: new Date().toISOString(),
      })
      .where(eq(webhookEvents.id, eventId));

    throw error;
  }
}
