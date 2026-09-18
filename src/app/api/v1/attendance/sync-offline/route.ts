import { NextRequest, NextResponse } from "next/server";
import { OfflineSyncBatchSchema } from "@/lib/validations/attendance";
import { db } from "@/db";
import { attendances, users } from "@/db/schema";
import { generateBlindIndex } from "@/lib/security/encryption";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = OfflineSyncBatchSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Formato de paquete offline inválido",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const { tenantId, events } = validated.data;
    let syncedCount = 0;
    let skippedCount = 0;

    for (const event of events) {
      // 1. Verificar idempotencia: Si el ID de evento local ya existe en la base, ignorar duplicado
      const existingAttendance = await db.query.attendances.findFirst({
        where: eq(attendances.id, event.clientEventId),
      });

      if (existingAttendance) {
        skippedCount++;
        continue;
      }

      // 2. Buscar user_id por DNI
      const dniBlindIndex = generateBlindIndex(event.dni);
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.tenantId, tenantId),
          eq(users.dniBlindIndex, dniBlindIndex)
        ),
      });

      // 3. Insertar asistencia
      await db.insert(attendances).values({
        id: event.clientEventId, // Mantiene el UUIDv7 generado por el cliente offline
        tenantId,
        branchId: event.branchId,
        userId: user ? user.id : "OFFLINE_UNKNOWN_USER",
        accessMethod: event.accessMethod,
        accessStatus: event.accessStatus,
        warningReason: event.warningReason,
        denialReason: event.denialReason,
        checkInAt: event.checkInAt,
      });

      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Sincronización completada. ${syncedCount} asistencias sincronizadas, ${skippedCount} duplicados ignorados.`,
      data: {
        syncedCount,
        skippedCount,
        totalReceived: events.length,
      },
    });
  } catch (error: any) {
    console.error("Error en sync offline:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Error al sincronizar paquete de asistencias offline",
      },
      { status: 500 }
    );
  }
}
