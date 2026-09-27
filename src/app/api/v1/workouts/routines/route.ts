import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertSameTenant } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS } from "@/lib/auth/rbac";
import { CreateRoutineSchema } from "@/lib/validations/workout";
import { createRoutine, cloneRoutineTemplateForUser } from "@/lib/workouts/workout-service";
import { db } from "@/db";
import { routines, routineDays, routineExercises } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.ROUTINES_READ);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const { searchParams } = new URL(req.url);
    const mismatch = assertSameTenant(ctx, searchParams.get("tenantId"));
    if (mismatch) return mismatch;
    const tenantId = ctx.tenantId;
    // Un socio sólo ve sus rutinas y las plantillas
    const userId = ctx.role === "SOCIO" ? ctx.userId : searchParams.get("userId");
    const templatesOnly = searchParams.get("templatesOnly") === "true";

    let conditions = [eq(routines.tenantId, tenantId)];
    if (templatesOnly) {
      conditions.push(eq(routines.isTemplate, true));
    } else if (userId) {
      conditions.push(eq(routines.userId, userId));
    }

    const routineList = await db.query.routines.findMany({
      where: and(...conditions),
      orderBy: [desc(routines.createdAt)],
    });

    // Enriquecer cada rutina con sus días y ejercicios
    const enriched = [];
    for (const r of routineList) {
      const days = await db.query.routineDays.findMany({
        where: eq(routineDays.routineId, r.id),
      });

      const fullDays = [];
      for (const d of days) {
        const exs = await db.query.routineExercises.findMany({
          where: eq(routineExercises.routineDayId, d.id),
        });
        fullDays.push({ ...d, exercises: exs });
      }
      enriched.push({ ...r, days: fullDays });
    }

    return NextResponse.json({
      success: true,
      data: enriched,
      total: enriched.length,
    });
  } catch (error: any) {
    console.error("Error al listar rutinas:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al consultar rutinas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.ROUTINES_WRITE);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const body = await req.json();
    const mismatch = assertSameTenant(ctx, body?.tenantId);
    if (mismatch) return mismatch;
    body.tenantId = ctx.tenantId;

    // Si viene templateId y userId, es una clonación de plantilla
    if (body.templateId && body.userId) {
      const routineId = await cloneRoutineTemplateForUser({
        tenantId: ctx.tenantId,
        templateId: body.templateId,
        userId: body.userId,
        coachId: body.coachId,
        validFrom: body.validFrom,
        validUntil: body.validUntil,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Plantilla clonada y asignada al socio exitosamente",
          data: { routineId },
        },
        { status: 201 }
      );
    }

    // Creación normal con schema
    const validated = CreateRoutineSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Estructura de rutina inválida",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const routineId = await createRoutine({ ...validated.data, coachId: validated.data.coachId || ctx.userId });

    return NextResponse.json(
      {
        success: true,
        message: "Plan de entrenamiento creado exitosamente",
        data: { routineId },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al crear rutina:", error);
    const known: Record<string, [number, string]> = {
      TEMPLATE_NOT_FOUND: [404, "Plantilla no encontrada"],
      MEMBER_NOT_FOUND: [404, "Socio no encontrado"],
      EXERCISE_NOT_FOUND: [400, "Uno o más ejercicios no existen en tu biblioteca"],
    };
    if (known[error.message]) {
      const [status, message] = known[error.message];
      return NextResponse.json({ error: error.message, message }, { status });
    }
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al crear plan de entrenamiento" },
      { status: 500 }
    );
  }
}
