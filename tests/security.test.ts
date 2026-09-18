import { generateUUIDv7, isValidUUIDv7, extractTimestampFromUUIDv7 } from "../src/lib/security/uuid";
import { hashPassword, verifyPassword } from "../src/lib/security/hash";
import {
  encryptToString,
  decryptFromString,
  generateBlindIndex,
} from "../src/lib/security/encryption";
import { rateLimiter } from "../src/lib/security/rate-limiter";

export async function runSecurityTests() {
  console.log("\n🔐 [TEST SUITE 1] Seguridad, Criptografía y Envelope Encryption");
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

  // 1. Pruebas de UUIDv7
  const uuid1 = generateUUIDv7();
  const uuid2 = generateUUIDv7();
  assert(isValidUUIDv7(uuid1), "UUIDv7 tiene formato canónico válido");
  assert(uuid1 !== uuid2, "Dos UUIDv7 consecutivos son únicos");
  assert(uuid1 < uuid2 || uuid1.localeCompare(uuid2) <= 0, "UUIDv7 preserva orden cronológico");

  const extractedDate = extractTimestampFromUUIDv7(uuid1);
  const diffMs = Math.abs(Date.now() - extractedDate.getTime());
  assert(diffMs < 5000, "Timestamp extraído de UUIDv7 coincide con la hora actual (< 5s)");

  // 2. Pruebas de Hashing de Contraseñas
  const password = "SuperSecretPassword123!";
  const hash = await hashPassword(password);
  assert(hash.startsWith("$scrypt$"), "Hash de contraseña utiliza scrypt memory-hard");
  assert(await verifyPassword(password, hash), "Verificación de contraseña correcta retorna true");
  assert(!(await verifyPassword("WrongPassword123!", hash)), "Verificación de contraseña incorrecta retorna false");

  // 3. Pruebas de Envelope Encryption (AES-256-GCM)
  const sensitiveMedicalData = JSON.stringify({
    conditions: "Hipertensión controlada, asma leve",
    medications: "Salbutamol si es necesario",
    bloodType: "O+",
  });

  const encryptedString = encryptToString(sensitiveMedicalData);
  assert(encryptedString.startsWith("enc:v1:"), "Cadena cifrada tiene formato de sobre versionado");
  assert(!encryptedString.includes("Hipertensión"), "Datos en texto plano no son visibles en el payload cifrado");

  const decrypted = decryptFromString(encryptedString);
  assert(decrypted === sensitiveMedicalData, "Desencriptación AES-256-GCM recupera el contenido exacto");

  // Prueba de detección de manipulación (Tag inválido)
  let tamperedPayload = encryptedString.slice(0, -3) + "xyz";
  let tamperDetected = false;
  try {
    decryptFromString(tamperedPayload);
  } catch {
    tamperDetected = true;
  }
  assert(tamperDetected, "Criptografía detecta manipulación de datos (Authentication Tag inválido)");

  // 4. Pruebas de Blind Indexing (HMAC-SHA256)
  const dni = "40123456";
  const blindIndex1 = generateBlindIndex(dni);
  const blindIndex2 = generateBlindIndex("40123456 "); // con espacio extra
  assert(blindIndex1.length === 64, "Blind Index genera hash SHA256 de 64 caracteres");
  assert(blindIndex1 === blindIndex2, "Blind Index normaliza datos para búsquedas exactas determinísticas");
  assert(blindIndex1 !== generateBlindIndex("40123457"), "DNI diferente genera Blind Index diferente");

  // 5. Pruebas de Sliding Window Rate Limiter
  const testKey = "test:ip:127.0.0.1";
  rateLimiter.reset(testKey);

  // Permitir 3 intentos en 1 segundo
  const r1 = await rateLimiter.check(testKey, 3, 1000);
  const r2 = await rateLimiter.check(testKey, 3, 1000);
  const r3 = await rateLimiter.check(testKey, 3, 1000);
  const r4 = await rateLimiter.check(testKey, 3, 1000); // Supera el límite

  assert(r1.allowed && r2.allowed && r3.allowed, "Primeras 3 peticiones son permitidas");
  assert(!r4.allowed, "Cuarta petición es bloqueada por Rate Limiting");

  console.log(`\nResumen Suite 1: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
