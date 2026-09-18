import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);

/**
 * Parámetros de seguridad para hashing de contraseñas
 * Utiliza scrypt con parámetros memory-hard recomendados por OWASP
 * (N=32768, r=8, p=1) + Salt de 32 bytes.
 */
const SCRYPT_OPTIONS = {
  N: 32768, // Costo de memoria CPU/Memory
  r: 8,     // Tamaño de bloque
  p: 1,     // Paralelización
  maxmem: 64 * 1024 * 1024, // 64 MB
};

const KEY_LENGTH = 64; // Longitud del hash resultante en bytes
const SALT_LENGTH = 32; // Sal criptográfica de 256 bits

/**
 * Wrapper de crypto.scrypt con Promise tipada
 */
function scryptPromise(
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: crypto.ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey);
    });
  });
}

/**
 * Hashea una contraseña con sal aleatoria y parámetros memory-hard.
 * Retorna formato: `$scrypt$N=32768,r=8,p=1$<salt_hex>$<hash_hex>`
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== "string") {
    throw new Error("La contraseña debe ser una cadena no vacía");
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = await scryptPromise(
    password,
    salt,
    KEY_LENGTH,
    SCRYPT_OPTIONS
  );

  const saltHex = salt.toString("hex");
  const hashHex = derivedKey.toString("hex");

  return `$scrypt$N=${SCRYPT_OPTIONS.N},r=${SCRYPT_OPTIONS.r},p=${SCRYPT_OPTIONS.p}$${saltHex}$${hashHex}`;
}

/**
 * Verifica una contraseña en tiempo constante contra el hash almacenado
 * para prevenir ataques de temporización (Timing Attacks).
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!password || !storedHash) {
    return false;
  }

  try {
    const parts = storedHash.split("$");
    // Formato esperado: ["", "scrypt", "N=32768,r=8,p=1", "<salt_hex>", "<hash_hex>"]
    if (parts.length !== 5 || parts[1] !== "scrypt") {
      return false;
    }

    const salt = Buffer.from(parts[3], "hex");
    const originalHash = Buffer.from(parts[4], "hex");

    // Extraer parámetros
    const params = parts[2].split(",").reduce((acc, curr) => {
      const [k, v] = curr.split("=");
      acc[k] = parseInt(v, 10);
      return acc;
    }, {} as Record<string, number>);

    const options: crypto.ScryptOptions = {
      N: params.N || SCRYPT_OPTIONS.N,
      r: params.r || SCRYPT_OPTIONS.r,
      p: params.p || SCRYPT_OPTIONS.p,
      maxmem: 64 * 1024 * 1024,
    };

    const derivedKey = await scryptPromise(
      password,
      salt,
      originalHash.length,
      options
    );

    // Comparación segura en tiempo constante
    return crypto.timingSafeEqual(originalHash, derivedKey);
  } catch {
    return false;
  }
}
