import { NextRequest, NextResponse } from "next/server";
import { CreateUserSchema } from "@/lib/validations/user";
import { db } from "@/db";
import { users, medicalRecords } from "@/db/schema";
import { generateUUIDv7 } from "@/lib/security/uuid";
import { hashPassword } from "@/lib/security/hash";
import { generateBlindIndex, encryptToString } from "@/lib/security/encryption";
import { eq, and, like, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const query = searchParams.get("q"); // DNI, nombre o email
    const role = searchParams.get("role");

    if (!tenantId) {
      return NextResponse.json(
        { error: "MISSING_TENANT", message: "tenantId es requerido" },
        { status: 400 }
      );
    }

    let conditions = [eq(users.tenantId, tenantId)];

    if (role) {
      conditions.push(eq(users.role, role as any));
    }

    if (query) {
      conditions.push(
        or(
          like(users.dni, `%${query}%`),
          like(users.firstName, `%${query}%`),
          like(users.lastName, `%${query}%`),
          like(users.email, `%${query}%`)
        )!
      );
    }

    const memberList = await db.query.users.findMany({
      where: and(...conditions),
      columns: {
        id: true,
        tenantId: true,
        dni: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        photoUrl: true,
        createdAt: true,
      },
      limit: 100,
    });

    return NextResponse.json({
      success: true,
      data: memberList,
      total: memberList.length,
    });
  } catch (error: any) {
    console.error("Error al listar usuarios:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al consultar socios" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateUserSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Los datos del formulario contienen inconsistencias",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      tenantId,
      dni,
      firstName,
      lastName,
      email,
      phone,
      birthDate,
      photoUrl,
      role,
      medicalClearanceStatus,
      clearanceExpiryDate,
      emergencyContactName,
      emergencyContactPhone,
      bloodType,
      conditions,
      medications,
      allergies,
    } = validated.data;

    const dniBlindIndex = generateBlindIndex(dni);

    // 1. Validar que no exista un usuario con ese DNI en este Tenant
    const existingUser = await db.query.users.findFirst({
      where: and(
        eq(users.tenantId, tenantId),
        eq(users.dniBlindIndex, dniBlindIndex)
      ),
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "DUPLICATE_DNI",
          message: `Ya existe un socio registrado con el DNI ${dni}.`,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const userId = generateUUIDv7();
    const medicalId = generateUUIDv7();

    // Contraseña inicial provisoria: los últimos 4 dígitos del DNI o número aleatorio
    const initialPassword = `Gym${dni.slice(-4)}!`;
    const passwordHash = await hashPassword(initialPassword);

    // 2. Insertar Usuario
    await db.insert(users).values({
      id: userId,
      tenantId,
      dni,
      dniBlindIndex,
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      birthDate,
      photoUrl: photoUrl || null,
      role: role || "SOCIO",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    // 3. Insertar Ficha Médica Inicial (con cifrado si hay datos de salud)
    const encryptedConditions = conditions ? encryptToString(conditions) : null;
    const encryptedMedications = medications ? encryptToString(medications) : null;
    const encryptedAllergies = allergies ? encryptToString(allergies) : null;

    await db.insert(medicalRecords).values({
      id: medicalId,
      userId,
      tenantId,
      medicalClearanceStatus: medicalClearanceStatus || "PENDING_REVIEW",
      clearanceExpiryDate: clearanceExpiryDate || null,
      emergencyContactName: emergencyContactName || null,
      emergencyContactPhone: emergencyContactPhone || null,
      bloodType: bloodType || "UNKNOWN",
      encryptedConditions,
      encryptedMedications,
      encryptedAllergies,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Socio registrado exitosamente",
        data: {
          id: userId,
          dni,
          firstName,
          lastName,
          email,
          role,
          initialPasswordHint: `Tu contraseña temporal es: ${initialPassword}`,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error interno al registrar socio" },
      { status: 500 }
    );
  }
}
