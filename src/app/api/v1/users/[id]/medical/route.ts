import { NextRequest, NextResponse } from "next/server";
import { UpdateMedicalRecordSchema } from "@/lib/validations/user";
import { db } from "@/db";
import { medicalRecords } from "@/db/schema";
import { encryptToString } from "@/lib/security/encryption";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS } from "@/lib/auth/rbac";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.MEDICAL_WRITE);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const userId = params.id;
    const body = await req.json();

    const validated = UpdateMedicalRecordSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Formato de ficha médica inválido",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      medicalClearanceStatus,
      clearanceExpiryDate,
      clearanceDocumentUrl,
      doctorName,
      doctorLicenseNumber,
      emergencyContactName,
      emergencyContactPhone,
      bloodType,
      conditions,
      medications,
      allergies,
    } = validated.data;

    // Aplicar Envelope Encryption a los datos sensibles
    const encryptedConditions = conditions ? encryptToString(conditions) : null;
    const encryptedMedications = medications ? encryptToString(medications) : null;
    const encryptedAllergies = allergies ? encryptToString(allergies) : null;

    const now = new Date().toISOString();

    const result = await db
      .update(medicalRecords)
      .set({
        medicalClearanceStatus,
        clearanceExpiryDate,
        clearanceDocumentUrl: clearanceDocumentUrl || null,
        doctorName: doctorName || null,
        doctorLicenseNumber: doctorLicenseNumber || null,
        emergencyContactName,
        emergencyContactPhone,
        bloodType,
        encryptedConditions,
        encryptedMedications,
        encryptedAllergies,
        updatedAt: now,
      })
      .where(and(eq(medicalRecords.userId, userId), eq(medicalRecords.tenantId, ctx.tenantId)))
      .returning({ id: medicalRecords.id });

    // FIX: antes respondía "éxito" aunque no existiera la ficha (0 filas actualizadas)
    if (result.length === 0) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "No existe ficha médica para este socio en tu gimnasio" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Ficha médica y apto físico actualizados con éxito",
    });
  } catch (error: any) {
    console.error("Error al actualizar ficha médica:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al actualizar ficha médica" },
      { status: 500 }
    );
  }
}
