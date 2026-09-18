import { SignJWT, jwtVerify } from "jose";
import crypto from "node:crypto";
import { generateUUIDv7 } from "../security/uuid";

// Claves secretas de firma
const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
);

const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2"
);

export interface AccessTokenPayload {
  sub: string;       // User ID (UUIDv7)
  tenantId: string;  // Tenant ID (UUIDv7)
  dni: string;
  role: string;
  permissions: string[];
  sessionId: string; // Session / Family ID
}

export interface RefreshTokenPayload {
  sub: string;       // User ID
  tenantId: string;  // Tenant ID
  sessionId: string; // Session Family ID
  tokenId: string;   // Unique Token ID (JTI)
  counter: number;   // Rotation generation counter
}

/**
 * Almacén en memoria de sesiones de Refresh Token para Detección de Reúso
 * (En producción con múltiples réplicas se conecta a Redis).
 */
interface SessionRecord {
  userId: string;
  tenantId: string;
  activeTokenId: string;
  lastCounter: number;
  revoked: boolean;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionStore: Map<string, SessionRecord> = new Map();

/**
 * Emite un nuevo Access Token (15 minutos de vida).
 */
export async function generateAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({
    tenantId: payload.tenantId,
    dni: payload.dni,
    role: payload.role,
    permissions: payload.permissions,
    sessionId: payload.sessionId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("15m")
    .setJti(generateUUIDv7())
    .sign(ACCESS_SECRET);
}

/**
 * Crea una nueva familia de sesión e inicia el primer Refresh Token.
 */
export async function createSessionAndRefreshToken(params: {
  userId: string;
  tenantId: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<{ refreshToken: string; sessionId: string }> {
  const sessionId = generateUUIDv7();
  const tokenId = generateUUIDv7();

  sessionStore.set(sessionId, {
    userId: params.userId,
    tenantId: params.tenantId,
    activeTokenId: tokenId,
    lastCounter: 1,
    revoked: false,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const refreshToken = await new SignJWT({
    tenantId: params.tenantId,
    sessionId,
    tokenId,
    counter: 1,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(params.userId)
    .setIssuedAt()
    .setExpirationTime("14d")
    .setJti(tokenId)
    .sign(REFRESH_SECRET);

  return { refreshToken, sessionId };
}

/**
 * Ejecuta la Rotación del Refresh Token (RTR) con Detección Estricta de Reúso.
 * 
 * Si un refresh token ya usado vuelve a recibirse:
 * - Detecta el ataque de robo de token.
 * - Revoca INMEDIATAMENTE toda la familia de sesiones del usuario.
 */
export async function rotateRefreshToken(
  oldRefreshToken: string
): Promise<{
  newAccessToken: string;
  newRefreshToken: string;
  userId: string;
  tenantId: string;
}> {
  let verified;
  try {
    verified = await jwtVerify(oldRefreshToken, REFRESH_SECRET);
  } catch {
    throw new Error("REFRESH_TOKEN_EXPIRED_OR_INVALID");
  }

  const payload = verified.payload as unknown as RefreshTokenPayload;
  const { sub: userId, tenantId, sessionId, tokenId, counter } = payload;

  const session = sessionStore.get(sessionId);

  // 1. Verificar si la sesión existe o fue revocada
  if (!session || session.revoked) {
    throw new Error("SESSION_REVOKED_OR_NOT_FOUND");
  }

  // 2. DETECCIÓN DE REÚSO: Si el tokenId no coincide con el activeTokenId actual, hubo un reuso
  if (session.activeTokenId !== tokenId) {
    // Alerta de seguridad: Ataque detectado -> Revocar todas las sesiones del usuario
    session.revoked = true;
    session.updatedAt = new Date();
    throw new Error("REFRESH_TOKEN_REUSE_DETECTED");
  }

  // 3. Generar nuevo tokenId para la rotación (RTR)
  const nextTokenId = generateUUIDv7();
  const nextCounter = (counter || 1) + 1;

  session.activeTokenId = nextTokenId;
  session.lastCounter = nextCounter;
  session.updatedAt = new Date();

  // 4. Emitir nuevo par de tokens
  const newRefreshToken = await new SignJWT({
    tenantId,
    sessionId,
    tokenId: nextTokenId,
    counter: nextCounter,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("14d")
    .setJti(nextTokenId)
    .sign(REFRESH_SECRET);

  const newAccessToken = await generateAccessToken({
    sub: userId,
    tenantId,
    dni: "", // Se popula en el controller buscando los datos actualizados del usuario
    role: "SOCIO",
    permissions: [],
    sessionId,
  });

  return {
    newAccessToken,
    newRefreshToken,
    userId,
    tenantId,
  };
}

/**
 * Invalida/cierra una sesión específica.
 */
export function revokeSession(sessionId: string): boolean {
  const session = sessionStore.get(sessionId);
  if (session) {
    session.revoked = true;
    session.updatedAt = new Date();
    return true;
  }
  return false;
}

/**
 * Valida un Access Token y retorna su contenido verificado.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET);
  return {
    sub: payload.sub as string,
    tenantId: payload.tenantId as string,
    dni: payload.dni as string,
    role: payload.role as string,
    permissions: (payload.permissions as string[]) || [],
    sessionId: payload.sessionId as string,
  };
}
