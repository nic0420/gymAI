import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { tenants } from "./tenants";

/**
 * Tabla de Eventos de Webhooks para Idempotencia Estricta
 * Almacena los eventos recibidos de Mercado Pago y Stripe para evitar reprocesamientos duplicados.
 */
export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    id: text("id").primaryKey(), // UUIDv7
    tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    gateway: text("gateway", { enum: ["MERCADO_PAGO", "STRIPE"] }).notNull(),
    externalEventId: text("external_event_id").notNull(), // ID original enviado por la pasarela
    eventType: text("event_type").notNull(), // ej. "payment.created", "invoice.payment_succeeded"
    status: text("status", { enum: ["PENDING", "PROCESSING", "PROCESSED", "FAILED"] })
      .default("PENDING")
      .notNull(),
    payload: text("payload").notNull(), // JSON serializado
    errorMessage: text("error_message"),
    receivedAt: text("received_at").notNull(),
    processedAt: text("processed_at"),
  },
  (table) => ({
    gatewayEventIdx: index("idx_webhook_idempotency").on(table.gateway, table.externalEventId),
  })
);
