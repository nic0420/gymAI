import { NextRequest, NextResponse } from "next/server";
import { UpdateMedicalRecordSchema } from "@/lib/validations/user";
import { db } from "@/db";
import { medicalRecords } from "@/db/schema";
import { encryptToString } from "@/lib/security/encryption";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    await db
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
      .where(eq(medicalRecords.userId, userId));

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
