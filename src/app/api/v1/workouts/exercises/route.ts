import { NextRequest, NextResponse } from "next/server";
import { CreateExerciseSchema } from "@/lib/validations/workout";
import { createExercise } from "@/lib/workouts/workout-service";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { eq, or, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const muscleGroup = searchParams.get("muscleGroup");

    let whereClause = undefined;
    if (tenantId) {
      whereClause = or(eq(exercises.tenantId, tenantId), isNull(exercises.tenantId));
    }

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
    const body = await req.json();
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
