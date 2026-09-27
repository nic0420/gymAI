import crypto from "node:crypto";
import { db } from "@/db";
import { webhookEvents, invoices } from "@/db/schema";
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

    // Acepta "abc123..." o "sha256=abc123..."
    const provided = signatureHeader.trim().replace(/^sha256=/i, "").toLowerCase();
    const a = Buffer.from(provided);
    const b = Buffer.from(expectedSignature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
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

  // FIX: un evento que falló (p.ej. error transitorio de BD) debe poder reintentarse.
  // Antes quedaba "FAILED" para siempre y todos los reintentos de la pasarela se ignoraban,
  // perdiendo el pago.
  let eventId: string;
  if (existingEvent && existingEvent.status === "FAILED") {
    eventId = existingEvent.id;
    await db
      .update(webhookEvents)
      .set({ status: "PROCESSING", errorMessage: null })
      .where(eq(webhookEvents.id, eventId));
  } else if (existingEvent) {
    return {
      alreadyProcessed: true,
      eventId: existingEvent.id,
      status: existingEvent.status === "PROCESSED" ? "PROCESSED" : "IGNORED",
      message: "Evento recibido previamente. Ignorando para garantizar idempotencia.",
    };
  } else {
    // 2. Registrar evento con estado PROCESSING. El índice UNIQUE(gateway, external_event_id)
    // protege contra dos entregas simultáneas del mismo evento.
    eventId = generateUUIDv7();
    try {
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
    } catch (err: any) {
      if (String(err?.message || "").includes("UNIQUE")) {
        return {
          alreadyProcessed: true,
          eventId: "",
          status: "IGNORED",
          message: "Evento duplicado recibido en paralelo. Ignorado por idempotencia.",
        };
      }
      throw err;
    }
  }

  try {
    // 3. Procesar lógica de negocio según el tipo de evento
    if (eventType === "payment.approved" || eventType === "invoice.payment_succeeded") {
      const invoiceId = payload.invoiceId || payload.metadata?.invoiceId;
      const amount = payload.amount || payload.transaction_amount;
      const gatewayRef = payload.paymentId || payload.id;

      if (invoiceId && amount) {
        // El tenant se deriva de la factura en la BD (no del payload, que controla el emisor)
        const invoice = await db.query.invoices.findFirst({ where: eq(invoices.id, String(invoiceId)) });
        if (!invoice) throw new Error("INVOICE_NOT_FOUND");
        if (tenantId && tenantId !== invoice.tenantId) throw new Error("TENANT_MISMATCH");
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error("INVALID_AMOUNT");

        await processPaymentTransaction({
          tenantId: invoice.tenantId,
          invoiceId,
          splits: [
            {
              amount: numericAmount,
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
