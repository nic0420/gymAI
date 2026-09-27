import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertSameTenant } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS } from "@/lib/auth/rbac";
import { LogWorkoutSessionSchema } from "@/lib/validations/workout";
import { logWorkoutSession } from "@/lib/workouts/workout-service";
import { db } from "@/db";
import { workoutLogs, setLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { users } from "@/db/schema";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.ROUTINES_READ);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || (ctx.role === "SOCIO" ? ctx.userId : null);

    if (!userId) {
      return NextResponse.json({ error: "MISSING_USER", message: "userId es requerido" }, { status: 400 });
    }

    // Un SOCIO sólo puede ver/cargar sus propios datos; el staff, sólo socios de su gimnasio
    if (ctx.role === "SOCIO" && userId !== ctx.userId) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Sólo puedes acceder a tus propios registros" }, { status: 403 });
    }
    const member = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.tenantId, ctx.tenantId)),
      columns: { id: true },
    });
    if (!member) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Socio no encontrado" }, { status: 404 });
    }

    const history = await db.query.workoutLogs.findMany({
      where: eq(workoutLogs.userId, userId),
      orderBy: [desc(workoutLogs.startedAt)],
      limit: 30,
    });

    return NextResponse.json({
      success: true,
      data: history,
      total: history.length,
    });
  } catch (error: any) {
    console.error("Error al obtener historial de entrenamientos:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al consultar historial" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.ROUTINES_READ);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const body = await req.json();
    const mismatch = assertSameTenant(ctx, body?.tenantId);
    if (mismatch) return mismatch;
    body.tenantId = ctx.tenantId;
    const validated = LogWorkoutSessionSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Parámetros de sesión de entrenamiento inválidos",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    // Un SOCIO sólo puede ver/cargar sus propios datos; el staff, sólo socios de su gimnasio
    if (ctx.role === "SOCIO" && validated.data.userId !== ctx.userId) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Sólo puedes acceder a tus propios registros" }, { status: 403 });
    }
    const member = await db.query.users.findFirst({
      where: and(eq(users.id, validated.data.userId), eq(users.tenantId, ctx.tenantId)),
      columns: { id: true },
    });
    if (!member) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Socio no encontrado" }, { status: 404 });
    }

    const result = await logWorkoutSession(validated.data);

    return NextResponse.json(
      {
        success: true,
        message: `¡Sesión registrada con éxito! Volumen: ${result.totalVolumeKg}kg ${
          result.personalRecordsCount > 0 ? `🔥 ¡${result.personalRecordsCount} Nuevo(s) Récord(s) Personal(es)!` : ""
        }`,
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al registrar sesión de entrenamiento:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al guardar sesión de entrenamiento" },
      { status: 500 }
    );
  }
}
