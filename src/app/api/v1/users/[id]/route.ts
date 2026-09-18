import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, medicalRecords, subscriptions } from "@/db/schema";
import { decryptFromString } from "@/lib/security/encryption";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
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
    if (medical) {
      decryptedMedical = {
        ...medical,
        conditions: medical.encryptedConditions
          ? decryptFromString(medical.encryptedConditions)
          : null,
        medications: medical.encryptedMedications
          ? decryptFromString(medical.encryptedMedications)
          : null,
        allergies: medical.encryptedAllergies
          ? decryptFromString(medical.encryptedAllergies)
          : null,
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
    const userId = params.id;
    const body = await req.json();

    const now = new Date().toISOString();
    await db
      .update(users)
      .set({
        ...body,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

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
