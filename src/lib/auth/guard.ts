import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "./tokens";
import { hasPermission, AtomicPermission } from "./rbac";

/**
 * Contexto autenticado derivado del Access Token (nunca del body/query del cliente).
 */
export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  sessionId: string;
}

export type AuthResult =
  | { ok: true; ctx: AuthContext }
  | { ok: false; response: NextResponse };

function extractBearer(req: NextRequest): string | null {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Autentica la petición y (opcionalmente) exige uno de los permisos indicados.
 *
 * FIX CRÍTICO: antes ninguna ruta de negocio validaba identidad. Cualquier persona
 * podía listar socios, leer fichas médicas descifradas, crear SUPERADMINs, abrir/cerrar
 * cajas o registrar pagos de cualquier gimnasio con solo conocer su tenantId.
 */
export async function requireAuth(
  req: NextRequest,
  ...requiredPermissions: AtomicPermission[]
): Promise<AuthResult> {
  const token = extractBearer(req);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "UNAUTHORIZED", message: "Debes iniciar sesión para realizar esta operación" },
        { status: 401 }
      ),
    };
  }

  let ctx: AuthContext;
  try {
    const payload = await verifyAccessToken(token);
    if (!payload.sub || !payload.tenantId) throw new Error("INVALID_PAYLOAD");
    ctx = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      permissions: payload.permissions || [],
      sessionId: payload.sessionId,
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "TOKEN_INVALID_OR_EXPIRED", message: "La sesión expiró o es inválida" },
        { status: 401 }
      ),
    };
  }

  if (
    requiredPermissions.length > 0 &&
    !requiredPermissions.some((p) => hasPermission(ctx.role, p, ctx.permissions))
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "FORBIDDEN", message: "Tu rol no tiene permisos para esta operación" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, ctx };
}

/**
 * Verifica que un tenantId enviado por el cliente (si lo hay) coincida con el de la sesión.
 * Devuelve una respuesta 403 si no coincide, o null si todo está bien.
 */
export function assertSameTenant(ctx: AuthContext, clientTenantId?: string | null): NextResponse | null {
  if (clientTenantId && clientTenantId !== ctx.tenantId) {
    return NextResponse.json(
      { error: "FORBIDDEN_TENANT", message: "No tienes acceso a los datos de otro gimnasio" },
      { status: 403 }
    );
  }
  return null;
}
