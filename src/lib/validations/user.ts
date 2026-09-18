import { z } from "zod";

/**
 * Validación para Registro Rápido de Socio / Usuario
 */
export const CreateUserSchema = z.object({
  tenantId: z.string({ required_error: "tenantId es obligatorio" }),
  dni: z
    .string({ required_error: "El DNI es obligatorio" })
    .min(7, "El DNI debe tener al menos 7 dígitos numéricos")
    .max(12, "El DNI no puede exceder 12 dígitos")
    .regex(/^\d+$/, "El DNI solo puede contener números"),

  firstName: z
    .string({ required_error: "El nombre es obligatorio" })
    .min(2, "El nombre debe tener al menos 2 caracteres"),

  lastName: z
    .string({ required_error: "El apellido es obligatorio" })
    .min(2, "El apellido debe tener al menos 2 caracteres"),

  email: z
    .string({ required_error: "El correo electrónico es obligatorio" })
    .email("Ingresa un correo electrónico válido"),

  phone: z.string().optional(),
  birthDate: z.string().optional(), // YYYY-MM-DD
  photoUrl: z.string().url("URL de foto inválida").optional().or(z.literal("")),
  role: z.enum(["SUPERADMIN", "RECEPCIONISTA", "ENTRENADOR", "SOCIO"]).default("SOCIO"),

  // Ficha Médica Inicial Opcional
  medicalClearanceStatus: z
    .enum(["VALID", "EXPIRED", "PENDING_REVIEW", "REJECTED"])
    .default("PENDING_REVIEW"),
  clearanceExpiryDate: z.string().optional(), // YYYY-MM-DD
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  bloodType: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "UNKNOWN"])
    .default("UNKNOWN"),
  conditions: z.string().optional(), // Texto plano que se cifrará con AES-256
  medications: z.string().optional(),
  allergies: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

/**
 * Validación para Actualización de Ficha Médica
 */
export const UpdateMedicalRecordSchema = z.object({
  medicalClearanceStatus: z.enum(["VALID", "EXPIRED", "PENDING_REVIEW", "REJECTED"]),
  clearanceExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  clearanceDocumentUrl: z.string().url("URL de documento inválida").optional().or(z.literal("")),
  doctorName: z.string().optional(),
  doctorLicenseNumber: z.string().optional(),
  emergencyContactName: z.string().min(2, "Ingresa el nombre del contacto de emergencia"),
  emergencyContactPhone: z.string().min(6, "Ingresa el teléfono del contacto de emergencia"),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "UNKNOWN"]).default("UNKNOWN"),
  conditions: z.string().optional(),
  medications: z.string().optional(),
  allergies: z.string().optional(),
});

export type UpdateMedicalRecordInput = z.infer<typeof UpdateMedicalRecordSchema>;
