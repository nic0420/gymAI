import { db } from "@/db";
import { users, subscriptions, medicalRecords, attendances } from "@/db/schema";
import { generateBlindIndex } from "@/lib/security/encryption";
import { generateUUIDv7 } from "@/lib/security/uuid";
import { eq, and, desc } from "drizzle-orm";

export interface CheckInResult {
  accessStatus: "GRANTED_GREEN" | "WARNING_YELLOW" | "DENIED_RED";
  message: string;
  warningReason?: string;
  denialReason?: string;
  user?: {
    id: string;
    dni: string;
    firstName: string;
    lastName: string;
    photoUrl?: string | null;
    status: string;
  };
  subscription?: {
    id: string;
    status: string;
    endDate: string;
  };
  medicalClearance?: {
    status: string;
    expiryDate?: string | null;
  };
  checkInAt: string;
  executionTimeMs: number;
}

/**
 * Motor de Evaluación de Check-in en Milisegundos
 * Ejecuta las reglas de negocio críticas para el control de acceso en recepción.
 */
export async function evaluateAndProcessCheckIn(params: {
  tenantId: string;
  branchId: string;
  dni: string;
  accessMethod?: "DNI_KEYPAD" | "BARCODE_SCAN" | "QR_MOBILE" | "BIOMETRIC_FINGERPRINT" | "FACIAL_RECOGNITION" | "MANUAL_RECEPTION";
  registeredByUserId?: string;
}): Promise<CheckInResult> {
  const startTime = performance.now();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const nowIso = now.toISOString();

  const rawDni = params?.dni ?? "";
  const dniClean = typeof rawDni === "string" ? rawDni.trim() : "";

  if (!dniClean || !params?.tenantId || !params?.branchId) {
    const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      accessStatus: "DENIED_RED",
      message: "Acceso Denegado: Parámetros de check-in inválidos o DNI no proporcionado",
      denialReason: "Parámetros inválidos o DNI vacío",
      checkInAt: nowIso,
      executionTimeMs: elapsed,
    };
  }

  const dniBlindIndex = generateBlindIndex(dniClean);

  // 1. Búsqueda Ultrarrápida por Blind Index
  const user = await db.query.users.findFirst({
    where: and(
      eq(users.tenantId, params.tenantId),
      eq(users.dniBlindIndex, dniBlindIndex)
    ),
  });

  // CASO 1: Socio No Encontrado
  if (!user) {
    const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      accessStatus: "DENIED_RED",
      message: "Acceso Denegado: DNI no registrado en el sistema",
      denialReason: "DNI no encontrado",
      checkInAt: nowIso,
      executionTimeMs: elapsed,
    };
  }

  // CASO 2: Usuario Inactivo o Suspendido
  if (user.status === "INACTIVE" || user.status === "SUSPENDED") {
    const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      accessStatus: "DENIED_RED",
      message: `Acceso Denegado: Socio en estado ${user.status}`,
      denialReason: `Usuario ${user.status.toLowerCase()}`,
      user: {
        id: user.id,
        dni: user.dni,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        status: user.status,
      },
      checkInAt: nowIso,
      executionTimeMs: elapsed,
    };
  }

  // 2. Consulta paralela de Suscripción y Ficha Médica
  const [latestSubscription, medical] = await Promise.all([
    db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.tenantId, params.tenantId),
        eq(subscriptions.userId, user.id)
      ),
      orderBy: [desc(subscriptions.createdAt)],
    }),
    db.query.medicalRecords.findFirst({
      where: and(
        eq(medicalRecords.tenantId, params.tenantId),
        eq(medicalRecords.userId, user.id)
      ),
    }),
  ]);

  let accessStatus: "GRANTED_GREEN" | "WARNING_YELLOW" | "DENIED_RED" = "GRANTED_GREEN";
  let message = `¡Bienvenido/a, ${user.firstName}!`;
  let warningReason: string | undefined;
  let denialReason: string | undefined;

  const todayMidnight = new Date(todayStr).getTime();

  // 3. Reglas de Validación de Suscripción
  if (!latestSubscription) {
    accessStatus = "DENIED_RED";
    message = "Acceso Denegado: Sin plan o membresía activa";
    denialReason = "Sin suscripción registrada";
  } else if (latestSubscription.status === "PAST_DUE_SUSPENDED" || latestSubscription.status === "CANCELLED" || latestSubscription.status === "EXPIRED") {
    accessStatus = "DENIED_RED";
    message = "Acceso Denegado: Cuota vencida / Deudor";
    denialReason = `Suscripción en estado ${latestSubscription.status}`;
  } else if (latestSubscription.endDate < todayStr) {
    accessStatus = "DENIED_RED";
    message = `Acceso Denegado: Cuota vencida el ${latestSubscription.endDate}`;
    denialReason = "Membresía caducada";
  } else if (latestSubscription.status === "GRACE_PERIOD") {
    accessStatus = "WARNING_YELLOW";
    message = `Paso Autorizado con Advertencia: Cuota en período de gracia`;
    warningReason = `Regularizar pago antes del fin de gracia`;
  } else {
    // Verificar si vence en los próximos 3 días (calendario)
    const endMidnight = new Date(latestSubscription.endDate).getTime();
    const diffDays = Math.round((endMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3 && diffDays >= 0) {
      accessStatus = "WARNING_YELLOW";
      message = `Paso Autorizado: Tu membresía vence en ${diffDays} día(s) (${latestSubscription.endDate})`;
      warningReason = `Vence en ${diffDays} día(s)`;
    }
  }

  // 4. Reglas de Validación de Apto Físico (Solo si no fue bloqueado por cuota)
  if (accessStatus !== "DENIED_RED") {
    if (!medical || medical.medicalClearanceStatus !== "VALID") {
      accessStatus = "DENIED_RED";
      message = "Acceso Denegado: Apto médico no presentado o no validado";
      denialReason = "Apto médico pendiente o no presentado";
    } else if (medical.clearanceExpiryDate && medical.clearanceExpiryDate < todayStr) {
      accessStatus = "DENIED_RED";
      message = `Acceso Denegado: Apto médico vencido el ${medical.clearanceExpiryDate}`;
      denialReason = "Apto médico caducado";
    } else if (medical.clearanceExpiryDate) {
      // Verificar si el apto vence en ≤ 7 días
      const medEndMidnight = new Date(medical.clearanceExpiryDate).getTime();
      const medicalDiffDays = Math.round((medEndMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
      if (medicalDiffDays <= 7 && medicalDiffDays >= 0) {
        accessStatus = "WARNING_YELLOW";
        message = `Paso Autorizado: Apto médico vence en ${medicalDiffDays} día(s) (${medical.clearanceExpiryDate})`;
        warningReason = (warningReason ? `${warningReason} | ` : "") + `Apto médico vence pronto (${medical.clearanceExpiryDate})`;
      }
    }
  }

  // 5. Registro Inmutable Append-Only de Asistencia
  const attendanceId = generateUUIDv7();
  await db.insert(attendances).values({
    id: attendanceId,
    tenantId: params.tenantId,
    branchId: params.branchId,
    userId: user.id,
    accessMethod: params.accessMethod || "DNI_KEYPAD",
    accessStatus,
    warningReason,
    denialReason,
    checkInAt: nowIso,
    registeredByUserId: params.registeredByUserId,
  });

  const elapsed = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    accessStatus,
    message,
    warningReason,
    denialReason,
    user: {
      id: user.id,
      dni: user.dni,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      status: user.status,
    },
    subscription: latestSubscription
      ? {
          id: latestSubscription.id,
          status: latestSubscription.status,
          endDate: latestSubscription.endDate,
        }
      : undefined,
    medicalClearance: medical
      ? {
          status: medical.medicalClearanceStatus,
          expiryDate: medical.clearanceExpiryDate,
        }
      : undefined,
    checkInAt: nowIso,
    executionTimeMs: elapsed,
  };
}
