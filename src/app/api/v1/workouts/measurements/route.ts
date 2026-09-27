import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertSameTenant } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS } from "@/lib/auth/rbac";
import { CreateBodyMeasurementSchema } from "@/lib/validations/workout";
import { db } from "@/db";
import { bodyMeasurements } from "@/db/schema";
import { generateUUIDv7 } from "@/lib/security/uuid";
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
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.ROUTINES_READ);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const body = await req.json();
    const mismatch = assertSameTenant(ctx, body?.tenantId);
    if (mismatch) return mismatch;
    body.tenantId = ctx.tenantId;
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
