import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Tabla de Gimnasios / Franquicias (Tenants)
 * Permite el aislamiento de datos multi-tenant a nivel de aplicación y BD.
 */
export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(), // UUIDv7
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // ej. "crossfit-norte"
  taxId: text("tax_id"), // CUIT / RFC / NIF
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  currency: text("currency").default("ARS").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  settings: text("settings"), // JSON con reglas de grace period, alertas, etc.
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Sucursales / Sedes del Gimnasio
 */
export const branches = sqliteTable("branches", {
  id: text("id").primaryKey(), // UUIDv7
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
