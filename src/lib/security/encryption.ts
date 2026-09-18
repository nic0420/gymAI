import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recomendado para GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Obtiene la clave maestra (Master Key) de 32 bytes desde las variables de entorno.
 */
function getMasterKey(): Buffer {
  const hexKey = process.env.APP_MASTER_KEY || "4f9c2d1b8e7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e";
  const key = Buffer.from(hexKey, "hex");
  if (key.length !== 32) {
    throw new Error("APP_MASTER_KEY debe ser una cadena hexadecimal de 64 caracteres (32 bytes)");
  }
  return key;
}

/**
 * Obtiene la sal para índices ciegos (Blind Index Salt)
 */
function getBlindIndexSalt(): string {
  return process.env.BLIND_INDEX_SALT || "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b";
}

export interface EncryptedPayload {
  cipherText: string; // Base64
  iv: string;         // Base64
  authTag: string;    // Base64
}

/**
 * Cifra datos sensibles utilizando AES-256-GCM con Vector de Inicialización único
 * y autenticación de integridad mediante Tag.
 */
export function encryptData(plainText: string): EncryptedPayload {
  if (typeof plainText !== "string") {
    throw new Error("El texto a cifrar debe ser un string");
  }

  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return {
    cipherText: encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

/**
 * Empaqueta el objeto cifrado en un string compacto: `enc:v1:<iv_b64>:<authTag_b64>:<cipherText_b64>`
 */
export function encryptToString(plainText: string): string {
  const { cipherText, iv, authTag } = encryptData(plainText);
  return `enc:v1:${iv}:${authTag}:${cipherText}`;
}

/**
 * Descifra datos empaquetados en formato string compacto o payload individual.
 * Valida la autenticidad del Tag para prevenir modificaciones maliciosas.
 */
export function decryptFromString(packedCipher: string): string {
  if (!packedCipher || typeof packedCipher !== "string") {
    return "";
  }

  const parts = packedCipher.split(":");
  if (parts.length !== 5 || parts[0] !== "enc" || parts[1] !== "v1") {
    throw new Error("Formato de cadena cifrada inválido o versión no soportada");
  }

  const iv = Buffer.from(parts[2], "base64");
  const authTag = Buffer.from(parts[3], "base64");
  const cipherText = parts[4];

  return decryptData({ cipherText, iv: parts[2], authTag: parts[3] });
}

/**
 * Descifra un payload cifrado AES-256-GCM validando su Tag.
 */
export function decryptData(payload: EncryptedPayload): string {
  const masterKey = getMasterKey();
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(payload.cipherText, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Genera un Blind Index (Índice Ciego) no reversible mediante HMAC-SHA256.
 * Permite realizar búsquedas exactas por igualdad en la base de datos (ej. DNI, teléfono)
 * sin exponer el valor original ni descifrar todas las filas.
 */
export function generateBlindIndex(value: string): string {
  if (!value) return "";
  const salt = getBlindIndexSalt();
  const normalized = value.trim().toLowerCase();
  
  return crypto
    .createHmac("sha256", salt)
    .update(normalized)
    .digest("hex");
}
