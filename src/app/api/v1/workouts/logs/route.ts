import { NextRequest, NextResponse } from "next/server";
import { LogWorkoutSessionSchema } from "@/lib/validations/workout";
import { logWorkoutSession } from "@/lib/workouts/workout-service";
import { db } from "@/db";
import { workoutLogs, setLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "MISSING_USER", message: "userId es requerido" }, { status: 400 });
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
    const body = await req.json();
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
