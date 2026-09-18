import { NextRequest, NextResponse } from "next/server";
import { rotateRefreshToken } from "@/lib/auth/tokens";
import { rateLimiter, RATE_LIMIT_CONFIGS } from "@/lib/security/rate-limiter";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const ip = req.ip || req.headers.get("x-forwarded-for") || "127.0.0.1";
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
      const { newAccessToken, newRefreshToken, userId } = await rotateRefreshToken(refreshToken);

      // Obtener datos frescos del usuario
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user || user.status === "INACTIVE" || user.status === "SUSPENDED") {
        return NextResponse.json(
          {
            error: "USER_SUSPENDED",
            message: "El usuario se encuentra inactivo",
          },
          { status: 403 }
        );
      }

      const response = NextResponse.json(
        {
          success: true,
          data: {
            accessToken: newAccessToken,
          },
        },
        { status: 200 }
      );

      // Actualizar Cookie con el nuevo Refresh Token
      response.cookies.set({
        name: "gymai_refresh_token",
        value: newRefreshToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/v1/auth",
        maxAge: 14 * 24 * 60 * 60,
      });

      return response;
    } catch (err: any) {
      if (err.message === "REFRESH_TOKEN_REUSE_DETECTED") {
        // Alerta Crítica: Se intentó reutilizar un token antiguo -> Posible robo de sesión
        const errorResponse = NextResponse.json(
          {
            error: "TOKEN_THEFT_DETECTED",
            message: "Se detectó una actividad sospechosa. Tu sesión ha sido revocada preventivamente por seguridad.",
          },
          { status: 401 }
        );
        // Borrar cookie
        errorResponse.cookies.delete("gymai_refresh_token");
        return errorResponse;
      }

      const errorResponse = NextResponse.json(
        {
          error: "INVALID_SESSION",
          message: "La sesión ha expirado o es inválida",
        },
        { status: 401 }
      );
      errorResponse.cookies.delete("gymai_refresh_token");
      return errorResponse;
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
