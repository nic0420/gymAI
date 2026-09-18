import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { tenants, branches } from "./tenants";

/**
 * Planes de Membresía
 */
export const membershipPlans = sqliteTable("membership_plans", {
  id: text("id").primaryKey(), // UUIDv7
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // ej. "Pase Libre Full", "Plan Musculación 3 días"
  description: text("description"),
  price: real("price").notNull(),
  durationDays: integer("duration_days").notNull(), // ej. 30, 90, 365
  maxVisitsPerWeek: integer("max_visits_per_week"), // null = ilimitado
  allowedBranches: text("allowed_branches"), // JSON array de branch_ids
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Suscripciones de los Socios
 */
export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(), // UUIDv7
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => membershipPlans.id),
    status: text("status", {
      enum: ["ACTIVE", "PENDING_PAYMENT", "GRACE_PERIOD", "PAST_DUE_SUSPENDED", "CANCELLED", "EXPIRED"],
    })
      .default("PENDING_PAYMENT")
      .notNull(),
    startDate: text("start_date").notNull(), // YYYY-MM-DD
    endDate: text("end_date").notNull(),     // YYYY-MM-DD
    autoRenew: integer("auto_renew", { mode: "boolean" }).default(false).notNull(),
    cancellationReason: text("cancellation_reason"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userSubIdx: index("idx_sub_user_status").on(table.userId, table.status, table.endDate),
    tenantSubIdx: index("idx_sub_tenant_status").on(table.tenantId, table.status),
  })
);

/**
 * Facturas / Obligaciones de Cobro (Invoices)
 */
export const invoices = sqliteTable(
  "invoices",
  {
    id: text("id").primaryKey(), // UUIDv7
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id),
    invoiceNumber: text("invoice_number").notNull(), // ej. "FAC-2026-000123"
    totalAmount: real("total_amount").notNull(),
    paidAmount: real("paid_amount").default(0).notNull(),
    status: text("status", {
      enum: ["DRAFT", "PENDING", "PARTIALLY_PAID", "PAID", "VOIDED"],
    })
      .default("PENDING")
      .notNull(),
    dueDate: text("due_date").notNull(),
    issuedAt: text("issued_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userInvoiceIdx: index("idx_invoices_user").on(table.userId, table.status),
  })
);

/**
 * Sesiones de Caja Diaria (Arqueo y Cierre Ciego)
 */
export const cashShifts = sqliteTable("cash_shifts", {
  id: text("id").primaryKey(), // UUIDv7
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  branchId: text("branch_id")
    .notNull()
    .references(() => branches.id),
  openedByUserId: text("opened_by_user_id")
    .notNull()
    .references(() => users.id),
  closedByUserId: text("closed_by_user_id").references(() => users.id),
  initialCash: real("initial_cash").notNull(), // Fondo inicial
  systemExpectedCash: real("system_expected_cash"), // Calculado por el sistema
  declaredCash: real("declared_cash"), // Declarado a ciegas por recepcionista
  differenceCash: real("difference_cash"), // Sobrante o Faltante
  status: text("status", { enum: ["OPEN", "CLOSED_LOCKED"] })
    .default("OPEN")
    .notNull(),
  openedAt: text("opened_at").notNull(),
  closedAt: text("closed_at"),
  notes: text("notes"),
});

/**
 * Transacciones de Pago (Payment Splits) - Ledger Inmutable
 */
export const paymentTransactions = sqliteTable(
  "payment_transactions",
  {
    id: text("id").primaryKey(), // UUIDv7
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id),
    cashShiftId: text("cash_shift_id").references(() => cashShifts.id),
    amount: real("amount").notNull(),
    paymentMethod: text("payment_method", {
      enum: ["CASH", "CREDIT_CARD", "DEBIT_CARD", "MERCADO_PAGO_QR", "STRIPE", "BANK_TRANSFER"],
    }).notNull(),
    gatewayReference: text("gateway_reference"), // ID de Stripe / Mercado Pago
    status: text("status", {
      enum: ["PENDING", "APPROVED", "REJECTED", "REFUNDED"],
    })
      .default("APPROVED")
      .notNull(),
    processedByUserId: text("processed_by_user_id").references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    invoicePaymentIdx: index("idx_payments_invoice").on(table.invoiceId),
  })
);

/**
 * Movimientos de Caja (Ingresos y Gastos Menores)
 */
export const cashMovements = sqliteTable("cash_movements", {
  id: text("id").primaryKey(), // UUIDv7
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  cashShiftId: text("cash_shift_id")
    .notNull()
    .references(() => cashShifts.id),
  type: text("type", { enum: ["INCOME", "EXPENSE"] }).notNull(),
  category: text("category").notNull(), // "CUOTA", "VENTA_BEBIDA", "INSUMOS_LIMPIEZA", "FLETE"
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  receiptUrl: text("receipt_url"),
  registeredByUserId: text("registered_by_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: text("created_at").notNull(),
});
