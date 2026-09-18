import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { tenants } from "./tenants";

/**
 * Ficha Médica y Apto Físico
 * Contiene campos con Envelope Encryption (AES-256-GCM) para salvaguardar datos de salud.
 */
export const medicalRecords = sqliteTable(
  "medical_records",
  {
    id: text("id").primaryKey(), // UUIDv7
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    
    // Control de Apto Físico (Crítico para Check-in)
    medicalClearanceStatus: text("medical_clearance_status", {
      enum: ["VALID", "EXPIRED", "PENDING_REVIEW", "REJECTED"],
    })
      .default("PENDING_REVIEW")
      .notNull(),
    clearanceExpiryDate: text("clearance_expiry_date"), // YYYY-MM-DD
    clearanceDocumentUrl: text("clearance_document_url"), // PDF en Storage seguro
    doctorName: text("doctor_name"),
    doctorLicenseNumber: text("doctor_license_number"),

    // Contacto de Emergencia
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    bloodType: text("blood_type", {
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "UNKNOWN"],
    }).default("UNKNOWN"),

    // Campos Sensibles Cifrados (AES-256-GCM)
    encryptedConditions: text("encrypted_conditions"), // Lesiones, cardiopatías, asma
    encryptedMedications: text("encrypted_medications"), // Medicación habitual
    encryptedAllergies: text("encrypted_allergies"), // Alergias severas

    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    userMedicalIdx: index("idx_medical_user").on(table.userId),
    expiryDateIdx: index("idx_medical_expiry").on(table.tenantId, table.clearanceExpiryDate),
  })
);
