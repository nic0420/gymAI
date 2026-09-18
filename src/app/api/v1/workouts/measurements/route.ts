import { NextRequest, NextResponse } from "next/server";
import { CreateBodyMeasurementSchema } from "@/lib/validations/workout";
import { db } from "@/db";
import { bodyMeasurements } from "@/db/schema";
import { generateUUIDv7 } from "@/lib/security/uuid";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "MISSING_USER", message: "userId es requerido" }, { status: 400 });
    }

    const measurements = await db.query.bodyMeasurements.findMany({
      where: eq(bodyMeasurements.userId, userId),
      orderBy: [desc(bodyMeasurements.measuredAt)],
      limit: 50,
    });

    return NextResponse.json({
      success: true,
      data: measurements,
      total: measurements.length,
    });
  } catch (error: any) {
    console.error("Error al obtener mediciones corporales:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al consultar medidas antropométricas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateBodyMeasurementSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Parámetros de medición corporal inválidos",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const measurementId = generateUUIDv7();
    const nowIso = new Date().toISOString();

    await db.insert(bodyMeasurements).values({
      id: measurementId,
      ...validated.data,
      createdAt: nowIso,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Medición corporal guardada con éxito",
        data: { measurementId },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al registrar medición corporal:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al guardar medición física" },
      { status: 500 }
    );
  }
}
