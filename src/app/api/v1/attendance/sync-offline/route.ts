import { NextRequest, NextResponse } from "next/server";
import { OfflineSyncBatchSchema } from "@/lib/validations/attendance";
import { db } from "@/db";
import { attendances, users, branches } from "@/db/schema";
import { generateBlindIndex } from "@/lib/security/encryption";
import { eq, and } from "drizzle-orm";
import { requireAuth, assertSameTenant } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS } from "@/lib/auth/rbac";

const MAX_EVENTS_PER_BATCH = 500;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.ATTENDANCE_WRITE);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;

    const body = await req.json();
    const mismatch = assertSameTenant(ctx, body?.tenantId);
    if (mismatch) return mismatch;
    body.tenantId = ctx.tenantId;

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

    const { events } = validated.data;
    const tenantId = ctx.tenantId;

    if (events.length > MAX_EVENTS_PER_BATCH) {
      return NextResponse.json(
        { error: "BATCH_TOO_LARGE", message: `Máximo ${MAX_EVENTS_PER_BATCH} eventos por lote` },
        { status: 413 }
      );
    }

    // Sedes válidas del tenant (cache por lote)
    const tenantBranches = await db.query.branches.findMany({
      where: eq(branches.tenantId, tenantId),
      columns: { id: true },
    });
    const validBranchIds = new Set(tenantBranches.map((b) => b.id));

    let syncedCount = 0;
    let skippedCount = 0;
    const rejected: { clientEventId: string; reason: string }[] = [];

    for (const event of events) {
      // Cada evento debe pertenecer al tenant de la sesión
      if (event.tenantId !== tenantId) {
        rejected.push({ clientEventId: event.clientEventId, reason: "TENANT_MISMATCH" });
        continue;
      }
      if (!validBranchIds.has(event.branchId)) {
        rejected.push({ clientEventId: event.clientEventId, reason: "INVALID_BRANCH" });
        continue;
      }
      if (Number.isNaN(Date.parse(event.checkInAt))) {
        rejected.push({ clientEventId: event.clientEventId, reason: "INVALID_TIMESTAMP" });
        continue;
      }

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
        where: and(eq(users.tenantId, tenantId), eq(users.dniBlindIndex, dniBlindIndex)),
      });

      // FIX: antes se insertaba userId = "OFFLINE_UNKNOWN_USER", que viola la FK de users
      // (foreign_keys=ON) y hacía fallar TODO el lote con 500, dejando la mitad sincronizada.
      if (!user) {
        rejected.push({ clientEventId: event.clientEventId, reason: "UNKNOWN_DNI" });
        continue;
      }

      // 3. Insertar asistencia
      await db.insert(attendances).values({
        id: event.clientEventId, // Mantiene el UUIDv7 generado por el cliente offline
        tenantId,
        branchId: event.branchId,
        userId: user.id,
        accessMethod: event.accessMethod,
        accessStatus: event.accessStatus,
        warningReason: event.warningReason,
        denialReason: event.denialReason,
        checkInAt: event.checkInAt,
        registeredByUserId: ctx.userId,
      });

      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Sincronización completada. ${syncedCount} asistencias sincronizadas, ${skippedCount} duplicados ignorados, ${rejected.length} rechazadas.`,
      data: {
        syncedCount,
        skippedCount,
        rejectedCount: rejected.length,
        rejected,
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
