import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertSameTenant } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS } from "@/lib/auth/rbac";
import { CreateExerciseSchema } from "@/lib/validations/workout";
import { createExercise } from "@/lib/workouts/workout-service";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { eq, or, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.ROUTINES_READ);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const { searchParams } = new URL(req.url);
    const mismatch = assertSameTenant(ctx, searchParams.get("tenantId"));
    if (mismatch) return mismatch;
    const muscleGroup = searchParams.get("muscleGroup");

    // FIX: sin tenantId antes se devolvía la biblioteca privada de TODOS los gimnasios
    const whereClause = or(eq(exercises.tenantId, ctx.tenantId), isNull(exercises.tenantId));

    const list = await db.query.exercises.findMany({
      where: whereClause,
      orderBy: (ex, { asc }) => [asc(ex.name)],
    });

    const filtered = muscleGroup
      ? list.filter((e) => e.muscleGroup === muscleGroup)
      : list;

    return NextResponse.json({
      success: true,
      data: filtered,
      total: filtered.length,
    });
  } catch (error: any) {
    console.error("Error al listar ejercicios:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al consultar biblioteca de ejercicios" },
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
    // Los ejercicios globales (tenantId null) sólo se crean vía seed/migración, no desde la API
    body.tenantId = ctx.tenantId;
    const validated = CreateExerciseSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Parámetros de ejercicio inválidos",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const exerciseId = await createExercise(validated.data);

    return NextResponse.json(
      {
        success: true,
        message: "Ejercicio creado exitosamente en la biblioteca",
        data: { exerciseId },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al crear ejercicio:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al crear ejercicio" },
      { status: 500 }
    );
  }
}
