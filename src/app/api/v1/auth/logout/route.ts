import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { revokeSession, refreshSecret } from "@/lib/auth/tokens";

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("gymai_refresh_token")?.value;

    if (refreshToken) {
      try {
        const { payload } = await jwtVerify(refreshToken, refreshSecret());
        const sessionId = payload.sessionId as string;
        if (sessionId) {
          revokeSession(sessionId);
        }
      } catch {
        // Token ya era inválido, procedemos a limpiar la cookie
      }
    }

    const response = NextResponse.json(
      {
        success: true,
        message: "Sesión cerrada correctamente",
      },
      { status: 200 }
    );

    // Eliminar cookie del cliente
    response.cookies.set({
      name: "gymai_refresh_token",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/v1/auth",
      maxAge: 0,
    });

    return response;
  } catch (error: any) {
    console.error("Error en logout:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Error al cerrar sesión",
      },
      { status: 500 }
    );
  }
}
