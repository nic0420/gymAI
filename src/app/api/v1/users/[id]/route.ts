import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, medicalRecords, subscriptions } from "@/db/schema";
import { decryptFromString } from "@/lib/security/encryption";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS, hasPermission } from "@/lib/auth/rbac";

/**
 * Campos editables de un socio. FIX: antes el PATCH hacía `.set({ ...body })`
 * (mass assignment): se podía cambiar role, passwordHash, tenantId o dni sin validar.
 */
const UpdateUserSchema = z
  .object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(30).nullable().optional(),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    photoUrl: z.string().url().nullable().optional().or(z.literal("")),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "DEBTOR"]).optional(),
    role: z.enum(["SUPERADMIN", "RECEPCIONISTA", "ENTRENADOR", "SOCIO"]).optional(),
  })
  .strict();

function safeDecrypt(value: string | null): string | null {
  if (!value) return null;
  try {
    return decryptFromString(value);
  } catch {
    // Un dato corrupto no debe tumbar toda la ficha (antes devolvía 500)
    return "[dato ilegible: verificar clave de cifrado]";
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.USERS_READ);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const userId = params.id;

    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.tenantId, ctx.tenantId)),
    });

    if (!user) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Socio no encontrado" },
        { status: 404 }
      );
    }

    // Consultar Ficha Médica y Suscripción
    const [medical, subscription] = await Promise.all([
      db.query.medicalRecords.findFirst({
        where: eq(medicalRecords.userId, userId),
      }),
      db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
        orderBy: [desc(subscriptions.createdAt)],
      }),
    ]);

    // Desencriptar datos médicos sensibles de forma segura
    let decryptedMedical = null;
    const canReadMedical = hasPermission(ctx.role, ATOMIC_PERMISSIONS.MEDICAL_READ, ctx.permissions);
    if (medical && canReadMedical) {
      decryptedMedical = {
        ...medical,
        conditions: safeDecrypt(medical.encryptedConditions),
        medications: safeDecrypt(medical.encryptedMedications),
        allergies: safeDecrypt(medical.encryptedAllergies),
      };
      // Eliminar campos brutos cifrados de la respuesta
      delete (decryptedMedical as any).encryptedConditions;
      delete (decryptedMedical as any).encryptedMedications;
      delete (decryptedMedical as any).encryptedAllergies;
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          dni: user.dni,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          birthDate: user.birthDate,
          photoUrl: user.photoUrl,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
        },
        medical: decryptedMedical,
        subscription: subscription || null,
      },
    });
  } catch (error: any) {
    console.error("Error al obtener detalle del socio:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al obtener ficha del socio" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.USERS_WRITE);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const userId = params.id;
    const body = await req.json();

    const validated = UpdateUserSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Campos inválidos o no editables", details: validated.error.format() },
        { status: 400 }
      );
    }

    if (validated.data.role && ctx.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Sólo un administrador puede cambiar roles" },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const result = await db
      .update(users)
      .set({
        ...validated.data,
        updatedAt: now,
      })
      .where(and(eq(users.id, userId), eq(users.tenantId, ctx.tenantId)))
      .returning({ id: users.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Socio no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Socio actualizado correctamente",
    });
  } catch (error: any) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al actualizar socio" },
      { status: 500 }
    );
  }
}
