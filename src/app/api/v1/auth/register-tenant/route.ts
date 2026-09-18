import { NextRequest, NextResponse } from "next/server";
import { RegisterTenantSchema } from "@/lib/validations/auth";
import { db } from "@/db";
import { tenants, branches, users } from "@/db/schema";
import { generateUUIDv7 } from "@/lib/security/uuid";
import { hashPassword } from "@/lib/security/hash";
import { generateBlindIndex } from "@/lib/security/encryption";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RegisterTenantSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Los datos enviados contienen errores",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      tenantName,
      tenantSlug,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,
      adminDni,
      branchName,
      branchAddress,
    } = validated.data;

    // 1. Verificar si el slug del gimnasio ya existe
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, tenantSlug),
    });

    if (existingTenant) {
      return NextResponse.json(
        {
          error: "TENANT_SLUG_TAKEN",
          message: `El identificador '${tenantSlug}' ya está en uso. Por favor elige otro.`,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const tenantId = generateUUIDv7();
    const branchId = generateUUIDv7();
    const adminId = generateUUIDv7();

    // 2. Hashear contraseña y generar Blind Index para DNI
    const passwordHash = await hashPassword(adminPassword);
    const dniBlindIndex = generateBlindIndex(adminDni);

    // 3. Insertar Tenant, Sucursal y SuperAdmin
    await db.insert(tenants).values({
      id: tenantId,
      name: tenantName,
      slug: tenantSlug,
      email: adminEmail,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(branches).values({
      id: branchId,
      tenantId: tenantId,
      name: branchName || "Sede Central",
      address: branchAddress,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(users).values({
      id: adminId,
      tenantId: tenantId,
      dni: adminDni,
      dniBlindIndex,
      email: adminEmail,
      passwordHash,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: "SUPERADMIN",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Gimnasio y SuperAdmin creados exitosamente",
        data: {
          tenantId,
          tenantName,
          tenantSlug,
          adminId,
          adminEmail,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en register-tenant:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error al procesar el registro del gimnasio",
      },
      { status: 500 }
    );
  }
}
