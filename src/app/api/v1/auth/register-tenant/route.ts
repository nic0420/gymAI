import { NextRequest, NextResponse } from "next/server";
import { RegisterTenantSchema } from "@/lib/validations/auth";
import { db } from "@/db";
import { tenants, branches, users } from "@/db/schema";
import { generateUUIDv7 } from "@/lib/security/uuid";
import { hashPassword } from "@/lib/security/hash";
import { generateBlindIndex } from "@/lib/security/encryption";
import { eq } from "drizzle-orm";
import { rateLimiter } from "@/lib/security/rate-limiter";
import { getClientIp } from "@/lib/security/client-ip";

export async function POST(req: NextRequest) {
  try {
    // Anti-spam: máximo 5 altas de gimnasio por IP por hora
    const rate = await rateLimiter.check(`register-tenant:${getClientIp(req)}`, 5, 60 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "RATE_LIMIT_EXCEEDED", message: "Demasiados registros desde esta red. Intenta más tarde." },
        { status: 429 }
      );
    }

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

    // 3. Insertar Tenant, Sucursal y SuperAdmin en UNA transacción atómica
    // (FIX: antes eran 3 inserts sueltos; un fallo intermedio dejaba un gimnasio sin admin
    // y con el slug "ocupado" para siempre)
    db.transaction((tx) => {
      tx.insert(tenants).values({
        id: tenantId,
        name: tenantName,
        slug: tenantSlug,
        email: adminEmail,
        createdAt: now,
        updatedAt: now,
      }).run();

      tx.insert(branches).values({
        id: branchId,
        tenantId: tenantId,
        name: branchName || "Sede Central",
        address: branchAddress,
        createdAt: now,
        updatedAt: now,
      }).run();

      tx.insert(users).values({
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
      }).run();
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
