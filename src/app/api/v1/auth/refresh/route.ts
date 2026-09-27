import { NextRequest, NextResponse } from "next/server";
import { rotateRefreshToken, generateAccessToken, revokeSession } from "@/lib/auth/tokens";
import { rateLimiter, RATE_LIMIT_CONFIGS } from "@/lib/security/rate-limiter";
import { db } from "@/db";
import { users, tenants, branches } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getClientIp } from "@/lib/security/client-ip";

const COOKIE_BASE = {
  name: "gymai_refresh_token",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/v1/auth",
};

function clearCookie(res: NextResponse) {
  res.cookies.set({ ...COOKIE_BASE, value: "", maxAge: 0 });
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const refreshToken = req.cookies.get("gymai_refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          error: "MISSING_REFRESH_TOKEN",
          message: "No se encontró el token de actualización",
        },
        { status: 401 }
      );
    }

    // Rate limiting para endpoint de refresh
    const rateStatus = await rateLimiter.check(
      `refresh:${ip}`,
      RATE_LIMIT_CONFIGS.AUTH_REFRESH.limit,
      RATE_LIMIT_CONFIGS.AUTH_REFRESH.windowMs
    );

    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: "RATE_LIMIT_EXCEEDED",
          message: "Demasiadas solicitudes de renovación de token",
        },
        { status: 429 }
      );
    }

    // Ejecutar Rotación de Refresh Token (RTR)
    try {
      const { newRefreshToken, userId, tenantId, sessionId } = await rotateRefreshToken(refreshToken);

      // Obtener datos frescos del usuario (acotado al tenant de la sesión)
      const user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.tenantId, tenantId)),
      });
      const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });

      if (!user || !tenant || !tenant.isActive || user.status === "INACTIVE" || user.status === "SUSPENDED") {
        revokeSession(sessionId);
        return clearCookie(
          NextResponse.json(
            {
              error: "USER_SUSPENDED",
              message: "El usuario o el gimnasio se encuentran inactivos",
            },
            { status: 403 }
          )
        );
      }

      // FIX: el access token se emite con el rol y DNI reales (antes: role "SOCIO", dni "")
      const accessToken = await generateAccessToken({
        sub: user.id,
        tenantId,
        dni: user.dni,
        role: user.role,
        permissions: [],
        sessionId,
      });

      const tenantBranches = await db.query.branches.findMany({
        where: eq(branches.tenantId, tenantId),
        columns: { id: true, name: true },
      });

      const response = NextResponse.json(
        {
          success: true,
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
              branches: tenantBranches,
            },
          },
        },
        { status: 200 }
      );

      // Actualizar Cookie con el nuevo Refresh Token
      response.cookies.set({ ...COOKIE_BASE, value: newRefreshToken, maxAge: 14 * 24 * 60 * 60 });

      return response;
    } catch (err: any) {
      if (err.message === "REFRESH_TOKEN_REUSE_DETECTED") {
        // Alerta Crítica: Se intentó reutilizar un token antiguo -> Posible robo de sesión
        return clearCookie(
          NextResponse.json(
            {
              error: "TOKEN_THEFT_DETECTED",
              message: "Se detectó una actividad sospechosa. Tu sesión ha sido revocada preventivamente por seguridad.",
            },
            { status: 401 }
          )
        );
      }

      return clearCookie(
        NextResponse.json(
          {
            error: "INVALID_SESSION",
            message: "La sesión ha expirado o es inválida",
          },
          { status: 401 }
        )
      );
    }
  } catch (error: any) {
    console.error("Error en refresh endpoint:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Error al renovar sesión",
      },
      { status: 500 }
    );
  }
}
