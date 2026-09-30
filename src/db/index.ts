import { drizzle } from "drizzle-orm/libsql";
import type { Client } from "@libsql/client";
import * as schema from "./schema";
import { initializeDatabase } from "./init";
import path from "node:path";
import fs from "node:fs";

/**
 * Conexión a la base de datos (libSQL).
 *
 * - Producción (Vercel): Turso, vía TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
 * - Desarrollo / tests: archivo SQLite local (DATABASE_URL, por defecto ./local.db).
 *
 * La conexión se abre recién en la PRIMERA consulta (no al importar el módulo). Así
 * `next build` puede analizar las rutas aunque las variables de la base no estén
 * disponibles en el entorno de build (por ejemplo, en deploys de Preview de Vercel).
 */
function resolveConnection(): { url: string; authToken?: string } {
  const remoteUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
  if (remoteUrl) {
    return { url: remoteUrl, authToken: process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN };
  }

  if (process.env.VERCEL) {
    throw new Error(
      "[db] En Vercel se necesita una base remota: configurá TURSO_DATABASE_URL y TURSO_AUTH_TOKEN " +
        "(Settings → Environment Variables, para Production y Preview)."
    );
  }

  const raw = (process.env.DATABASE_URL || "./local.db").replace(/^file:/, "");
  if (raw.startsWith("libsql:") || raw.startsWith("http")) return { url: raw };
  const absolute = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  const dir = path.dirname(absolute);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return { url: `file:${absolute}` };
}

let realClient: Client | null = null;
let clientPromise: Promise<Client> | null = null;
let isLocalFile = false;
let readyPromise: Promise<void> | null = null;

/**
 * Para bases remotas (Turso) se usa el cliente "web" de libSQL (HTTP puro, sin binarios
 * nativos): en Vercel el cliente de Node intentaba cargar el módulo nativo de SQLite y la
 * función fallaba con "Error interno". El cliente con soporte de archivos sólo se carga en local.
 */
function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const connection = resolveConnection();
      isLocalFile = connection.url.startsWith("file:");
      const mod = isLocalFile ? await import("@libsql/client") : await import("@libsql/client/web");
      const url = !isLocalFile && connection.url.startsWith("libsql://")
        ? connection.url.replace(/^libsql:\/\//, "https://")
        : connection.url;
      realClient = mod.createClient({ ...connection, url });
      return realClient;
    })().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

/** Crea el esquema (si falta) una sola vez, antes de la primera consulta. */
export function ensureDatabase(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      const c = await getClient();
      if (isLocalFile) {
        await c.execute("PRAGMA journal_mode = WAL");
        await c.execute("PRAGMA busy_timeout = 5000");
      }
      await c.execute("PRAGMA foreign_keys = ON");
      await initializeDatabase(c);
    })().catch((err) => {
      readyPromise = null; // permitir reintento en la próxima petición
      throw err;
    });
  }
  return readyPromise;
}

/**
 * Cliente "perezoso" que Drizzle usa como si fuera el real: cada operación espera
 * la inicialización y delega en el cliente libSQL verdadero.
 */
const lazyClient = {
  async execute(...args: any[]) {
    await ensureDatabase();
    return ((await getClient()).execute as any)(...args);
  },
  async executeMultiple(sql: string) {
    await ensureDatabase();
    return (await getClient()).executeMultiple(sql);
  },
  async batch(...args: any[]) {
    await ensureDatabase();
    return ((await getClient()).batch as any)(...args);
  },
  async migrate(...args: any[]) {
    await ensureDatabase();
    return ((await getClient()).migrate as any)(...args);
  },
  async transaction(...args: any[]) {
    await ensureDatabase();
    const c = await getClient();
    const tx = await (c.transaction as any)(...args);
    // En modo archivo, libSQL entrega la conexión actual a la transacción y abre una NUEVA
    // para las consultas siguientes. Los PRAGMA son por conexión: se re-aplican ya mismo.
    if (isLocalFile) {
      await c.execute("PRAGMA foreign_keys = ON");
      await c.execute("PRAGMA busy_timeout = 5000");
    }
    return tx;
  },
  async sync() {
    return (await getClient()).sync();
  },
  close() {
    realClient?.close();
  },
  get closed() {
    return realClient ? realClient.closed : false;
  },
  get protocol() {
    return realClient ? realClient.protocol : "file";
  },
} as unknown as Client;

export const db = drizzle(lazyClient, { schema });
export const dbClient = lazyClient;
export type DatabaseInstance = typeof db;
