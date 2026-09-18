import { z } from "zod";

/**
 * Esquema para Check-in en Recepción
 */
export const CheckInSchema = z.object({
  tenantId: z.string({ required_error: "tenantId es obligatorio" }),
  branchId: z.string({ required_error: "branchId es obligatorio" }),
  dni: z
    .string({ required_error: "Ingresa el DNI del socio" })
    .min(5, "El DNI debe tener al menos 5 caracteres")
    .max(12, "El DNI no puede exceder 12 caracteres"),
  accessMethod: z
    .enum(["DNI_KEYPAD", "BARCODE_SCAN", "QR_MOBILE", "BIOMETRIC_FINGERPRINT", "FACIAL_RECOGNITION", "MANUAL_RECEPTION"])
    .default("DNI_KEYPAD"),
});

export type CheckInInput = z.infer<typeof CheckInSchema>;

/**
 * Esquema para Sincronización en Batch de Asistencias Offline
 */
export const OfflineSyncItemSchema = z.object({
  clientEventId: z.string({ required_error: "clientEventId es obligatorio para idempotencia" }),
  tenantId: z.string(),
  branchId: z.string(),
  dni: z.string(),
  accessStatus: z.enum(["GRANTED_GREEN", "WARNING_YELLOW", "DENIED_RED"]),
  accessMethod: z.enum(["DNI_KEYPAD", "BARCODE_SCAN", "QR_MOBILE", "BIOMETRIC_FINGERPRINT", "FACIAL_RECOGNITION", "MANUAL_RECEPTION"]),
  warningReason: z.string().optional(),
  denialReason: z.string().optional(),
  checkInAt: z.string(), // ISO timestamp local capturado en el cliente
});

export const OfflineSyncBatchSchema = z.object({
  tenantId: z.string(),
  events: z.array(OfflineSyncItemSchema).min(1, "Debe incluir al menos un evento de asistencia"),
});

export type OfflineSyncBatchInput = z.infer<typeof OfflineSyncBatchSchema>;
