import { NextRequest, NextResponse } from "next/server";
import { LoginSchema } from "@/lib/validations/auth";
import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { verifyPassword } from "@/lib/security/hash";
import { rateLimiter, RATE_LIMIT_CONFIGS } from "@/lib/security/rate-limiter";
import { generateAccessToken, createSessionAndRefreshToken } from "@/lib/auth/tokens";
import { eq, and, or } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const ip = req.ip || req.headers.get("x-forwarded-for") || "127.0.0.1";
    const body = await req.json();
    const validated = LoginSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Credenciales con formato inválido",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const { tenantSlug, identifier, password } = validated.data;
    const rateLimitKey = `login:${ip}:${tenantSlug}:${identifier.toLowerCase()}`;

    // 1. Aplicar Sliding Window Rate Limiting (Máx 5 intentos / 15 min)
    const rateLimitStatus = await rateLimiter.check(
      rateLimitKey,
      RATE_LIMIT_CONFIGS.AUTH_LOGIN.limit,
      RATE_LIMIT_CONFIGS.AUTH_LOGIN.windowMs
    );

    if (!rateLimitStatus.allowed) {
      const waitMinutes = Math.ceil(rateLimitStatus.resetMs / 60000);
      return NextResponse.json(
        {
          error: "TOO_MANY_ATTEMPTS",
          message: `Demasiados intentos fallidos. Por seguridad tu cuenta ha sido bloqueada temporalmente. Intenta nuevamente en ${waitMinutes} minutos.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimitStatus.resetMs / 1000).toString(),
          },
        }
      );
    }

    // 2. Buscar el Tenant activo
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, tenantSlug),
    });

    if (!tenant || !tenant.isActive) {
      return NextResponse.json(
        {
          error: "INVALID_CREDENTIALS",
          message: "Gimnasio o credenciales incorrectas",
        },
        { status: 401 }
      );
    }

    // 3. Buscar el Usuario por DNI o Email dentro del Tenant
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.tenantId, tenant.id),
        or(eq(users.email, identifier), eq(users.dni, identifier))
      ),
    });

    if (!user || user.status === "INACTIVE" || user.status === "SUSPENDED") {
      return NextResponse.json(
        {
          error: "INVALID_CREDENTIALS",
          message: "Credenciales incorrectas o usuario inactivo",
        },
        { status: 401 }
      );
    }

    // 4. Verificar Contraseña con Hashing Memory-Hard
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: "INVALID_CREDENTIALS",
          message: `Credenciales incorrectas. Te quedan ${rateLimitStatus.remaining} intentos antes del bloqueo.`,
        },
        { status: 401 }
      );
    }

    // 5. Login Exitoso -> Resetear contador de Rate Limit
    rateLimiter.reset(rateLimitKey);

    // 6. Crear Sesión y Emitir Tokens (Access Token + Refresh Token)
    const userAgent = req.headers.get("user-agent") || undefined;
    const { refreshToken, sessionId } = await createSessionAndRefreshToken({
      userId: user.id,
      tenantId: tenant.id,
      userAgent,
      ipAddress: ip,
    });

    const accessToken = await generateAccessToken({
      sub: user.id,
      tenantId: tenant.id,
      dni: user.dni,
      role: user.role,
      permissions: [],
      sessionId,
    });

    // 7. Configurar Cookie HttpOnly y Devolver Respuesta
    const response = NextResponse.json(
      {
        success: true,
        message: "Autenticación exitosa",
        data: {
          accessToken,
          user: {
            id: user.id,
            dni: user.dni,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
          },
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
          },
        },
      },
      { status: 200 }
    );

    // Cookie segura con duración de 14 días
    response.cookies.set({
      name: "gymai_refresh_token",
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/v1/auth",
      maxAge: 14 * 24 * 60 * 60, // 14 días en segundos
    });

    return response;
  } catch (error: any) {
    console.error("Error en endpoint login:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Error interno al procesar el inicio de sesión",
      },
      { status: 500 }
    );
  }
}
