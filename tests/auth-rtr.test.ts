import {
  generateAccessToken,
  createSessionAndRefreshToken,
  rotateRefreshToken,
  verifyAccessToken,
  revokeSession,
} from "../src/lib/auth/tokens";
import { generateUUIDv7 } from "../src/lib/security/uuid";

export async function runAuthRtrTests() {
  console.log("\n🛡️ [TEST SUITE 2] Autenticación JWT y Refresh Token Rotation (RTR)");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  const userId = generateUUIDv7();
  const tenantId = generateUUIDv7();

  // 1. Crear sesión inicial
  const { refreshToken: initialRefreshToken, sessionId } =
    await createSessionAndRefreshToken({
      userId,
      tenantId,
      ipAddress: "192.168.1.50",
      userAgent: "Mozilla/5.0 GymReceptionTerminal",
    });

  assert(Boolean(initialRefreshToken), "Emite Refresh Token inicial con éxito");
  assert(Boolean(sessionId), "Genera Session ID único");

  // 2. Generar y verificar Access Token
  const accessToken = await generateAccessToken({
    sub: userId,
    tenantId,
    dni: "38999888",
    role: "RECEPCIONISTA",
    permissions: ["users:read", "attendance:write"],
    sessionId,
  });

  const verified = await verifyAccessToken(accessToken);
  assert(verified.sub === userId, "Access Token contiene User ID correcto");
  assert(verified.role === "RECEPCIONISTA", "Access Token contiene Rol de negocio correcto");
  assert(verified.permissions.includes("attendance:write"), "Access Token contiene permisos atómicos");

  // 3. Rotación Exitosa (RTR 1er Ciclo)
  const rotation1 = await rotateRefreshToken(initialRefreshToken);
  assert(Boolean(rotation1.newAccessToken), "RTR emite nuevo Access Token");
  assert(Boolean(rotation1.newRefreshToken), "RTR emite nuevo Refresh Token");
  assert(
    rotation1.newRefreshToken !== initialRefreshToken,
    "Nuevo Refresh Token es distinto al anterior"
  );

  // 4. Rotación Exitosa (RTR 2do Ciclo)
  const rotation2 = await rotateRefreshToken(rotation1.newRefreshToken);
  assert(Boolean(rotation2.newAccessToken), "RTR encadenado funciona correctamente");

  // 5. DETECCIÓN DE ATAQUE POR REUSO
  // Un atacante intenta usar el initialRefreshToken que ya fue consumido
  let reuseDetected = false;
  try {
    await rotateRefreshToken(initialRefreshToken);
  } catch (err: any) {
    if (err.message === "REFRESH_TOKEN_REUSE_DETECTED") {
      reuseDetected = true;
    }
  }
  assert(reuseDetected, "Detección de Reúso detecta token antiguo e invalida la sesión");

  // 6. Verificar que la sesión quedó completamente revocada tras el intento de ataque
  let sessionRevoked = false;
  try {
    await rotateRefreshToken(rotation2.newRefreshToken);
  } catch (err: any) {
    if (err.message === "SESSION_REVOKED_OR_NOT_FOUND") {
      sessionRevoked = true;
    }
  }
  assert(sessionRevoked, "Toda la familia de sesión queda revocada tras detectar un ataque");

  console.log(`\nResumen Suite 2: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
