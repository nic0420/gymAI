import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { tenants, branches } from "./tenants";

/**
 * Registro de Asistencias (Check-ins) - Append-Only e Inmutable
 */
export const attendances = sqliteTable(
  "attendances",
  {
    id: text("id").primaryKey(), // UUIDv7
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Método de acceso
    accessMethod: text("access_method", {
      enum: ["DNI_KEYPAD", "BARCODE_SCAN", "QR_MOBILE", "BIOMETRIC_FINGERPRINT", "FACIAL_RECOGNITION", "MANUAL_RECEPTION"],
    })
      .default("DNI_KEYPAD")
      .notNull(),
    
    // Estado resultante del Semáforo
    accessStatus: text("access_status", {
      enum: ["GRANTED_GREEN", "WARNING_YELLOW", "DENIED_RED"],
    }).notNull(),
    
    warningReason: text("warning_reason"), // ej. "Apto vence en 3 días"
    denialReason: text("denial_reason"),   // ej. "Cuota vencida"

    checkInAt: text("check_in_at").notNull(), // ISO Timestamp
    registeredByUserId: text("registered_by_user_id").references(() => users.id),
  },
  (table) => ({
    tenantUserDateIdx: index("idx_attendance_search").on(table.tenantId, table.userId, table.checkInAt),
    tenantDateIdx: index("idx_attendance_stats").on(table.tenantId, table.checkInAt),
  })
);
