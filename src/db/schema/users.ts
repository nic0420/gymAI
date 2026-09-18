import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { tenants } from "./tenants";

/**
 * Tabla de Usuarios (Socios, Entrenadores, Recepcionistas, SuperAdmin)
 */
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(), // UUIDv7
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    dni: text("dni").notNull(), // DNI / Cédula / Identificación
    dniBlindIndex: text("dni_blind_index").notNull(), // HMAC-SHA256 para búsquedas rápidas
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(), // scrypt / argon2id
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone"),
    birthDate: text("birth_date"),
    photoUrl: text("photo_url"),
    status: text("status", { enum: ["ACTIVE", "INACTIVE", "SUSPENDED", "DEBTOR"] })
      .default("ACTIVE")
      .notNull(),
    role: text("role", { enum: ["SUPERADMIN", "RECEPCIONISTA", "ENTRENADOR", "SOCIO"] })
      .default("SOCIO")
      .notNull(),
    onboardingState: text("onboarding_state"), // JSON con pasos completados
    lastLoginAt: text("last_login_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    tenantDniIdx: uniqueIndex("idx_users_tenant_dni").on(table.tenantId, table.dni),
    tenantEmailIdx: uniqueIndex("idx_users_tenant_email").on(table.tenantId, table.email),
    tenantStatusIdx: index("idx_users_tenant_status").on(table.tenantId, table.status),
    dniBlindIdx: index("idx_users_dni_blind").on(table.tenantId, table.dniBlindIndex),
  })
);

/**
 * Permisos Atómicos para RBAC Dinámico
 */
export const permissions = sqliteTable("permissions", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // ej. "users:read", "payments:write"
  description: text("description").notNull(),
});

/**
 * Mapeo de Roles a Permisos
 */
export const rolePermissions = sqliteTable("role_permissions", {
  id: text("id").primaryKey(),
  role: text("role").notNull(),
  permissionId: text("permission_id")
    .notNull()
    .references(() => permissions.id, { onDelete: "cascade" }),
});

/**
 * Almacén de Sesiones y Refresh Token Rotation (RTR)
 */
export const userSessions = sqliteTable(
  "user_sessions",
  {
    id: text("id").primaryKey(), // Session ID (UUIDv7)
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    activeTokenId: text("active_token_id").notNull(), // JTI del token actual
    rotationCounter: integer("rotation_counter").default(1).notNull(),
    isRevoked: integer("is_revoked", { mode: "boolean" }).default(false).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userSessionIdx: index("idx_sessions_user").on(table.userId, table.isRevoked),
  })
);
