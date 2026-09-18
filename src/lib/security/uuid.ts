import crypto from "node:crypto";

/**
 * Generador de UUIDv7 conforme a RFC 9562 (Method 1: Fixed-Length Dedicated Counter).
 * 
 * Estructura del UUIDv7:
 * - 48 bits: Unix timestamp en milisegundos.
 * - 4 bits: Versión del UUID (0111 = 7).
 * - 12 bits: Contador monótono de subsecuencia (garantiza orden estricto dentro del mismo ms).
 * - 2 bits: Variante RFC 4122 (10).
 * - 62 bits: Entropía criptográfica aleatoria.
 */

let lastTimestampMs = 0n;
let sequenceCounter = 0;

export function generateUUIDv7(): string {
  let now = BigInt(Date.now());

  if (now > lastTimestampMs) {
    lastTimestampMs = now;
    // Inicializar contador con algo de aleatoriedad en los bits bajos o desde 0
    sequenceCounter = crypto.randomInt(0, 0x100);
  } else {
    // Mismo milisegundo (o retroceso leve de reloj): incrementar contador monótono
    sequenceCounter++;
    if (sequenceCounter > 0xfff) {
      // Si desborda el contador de 12 bits, avanzar artificialmente 1 milisegundo
      lastTimestampMs++;
      now = lastTimestampMs;
      sequenceCounter = 0;
    } else {
      now = lastTimestampMs;
    }
  }

  const bytes = crypto.randomBytes(16);

  // 1. Timestamp de 48 bits (Bytes 0 a 5)
  bytes[0] = Number((now >> 40n) & 0xffn);
  bytes[1] = Number((now >> 32n) & 0xffn);
  bytes[2] = Number((now >> 24n) & 0xffn);
  bytes[3] = Number((now >> 16n) & 0xffn);
  bytes[4] = Number((now >> 8n) & 0xffn);
  bytes[5] = Number(now & 0xffn);

  // 2. Versión 7 (0111) en los 4 bits más significativos del byte 6 + 4 bits altos del contador
  const counterHigh = (sequenceCounter >> 8) & 0x0f;
  bytes[6] = 0x70 | counterHigh;

  // 3. 8 bits bajos del contador en byte 7
  bytes[7] = sequenceCounter & 0xff;

  // 4. Variante RFC 4122 (10) en los 2 bits más significativos del byte 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // Conversión a formato canónico 8-4-4-4-12
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Valida si un string cumple el formato exacto de un UUIDv7.
 */
export function isValidUUIDv7(uuid: string): boolean {
  const uuidv7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidv7Regex.test(uuid);
}

/**
 * Extrae el timestamp de creación directamente desde el UUIDv7.
 */
export function extractTimestampFromUUIDv7(uuid: string): Date {
  if (!isValidUUIDv7(uuid)) {
    throw new Error(`UUID inválido para extracción de timestamp: ${uuid}`);
  }
  const cleanHex = uuid.replace(/-/g, "").slice(0, 12);
  const timestampMs = Number(BigInt(`0x${cleanHex}`));
  return new Date(timestampMs);
}
