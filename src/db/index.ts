import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "./schema";
import { initializeDatabase } from "./init";
import path from "node:path";
import fs from "node:fs";

/**
 * Conexión a la base de datos (libSQL).
 *
 * - Producción (Vercel): Turso, vía TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
 *   Antes se usaba un archivo SQLite local, que en Vercel es de sólo lectura/efímero:
 *   la función se caía al abrir la base y el login mostraba "Error de conexión".
 * - Desarrollo / tests: archivo SQLite local (DATABASE_URL, por defecto ./local.db).
 */
function resolveConnection(): { url: string; authToken?: string } {
  const remoteUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
  if (remoteUrl) {
    return { url: remoteUrl, authToken: process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN };
  }

  if (process.env.VERCEL && process.env.NODE_ENV === "production") {
    throw new Error(
      "[db] En Vercel se necesita una base remota: configurá TURSO_DATABASE_URL y TURSO_AUTH_TOKEN."
    );
  }

  const raw = (process.env.DATABASE_URL || "./local.db").replace(/^file:/, "");
  if (raw.startsWith("libsql:") || raw.startsWith("http")) return { url: raw };
  const absolute = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  const dir = path.dirname(absolute);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return { url: `file:${absolute}` };
}

const connection = resolveConnection();
const isLocalFile = connection.url.startsWith("file:");
const client: Client = createClient(connection);

/**
 * Inicialización perezosa: el esquema se crea (si falta) antes de la primera consulta.
 * Se envuelven los métodos del cliente para que ninguna consulta corra antes de tiempo.
 */
const rawExecute = client.execute.bind(client);
const rawExecuteMultiple = client.executeMultiple.bind(client);
const rawBatch = client.batch.bind(client);
const rawTransaction = client.transaction.bind(client);

const bootstrapClient = {
  execute: rawExecute,
  executeMultiple: rawExecuteMultiple,
} as unknown as Client;

let readyPromise: Promise<void> | null = null;
export function ensureDatabase(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      if (isLocalFile) {
        await rawExecute("PRAGMA journal_mode = WAL");
        await rawExecute("PRAGMA busy_timeout = 5000");
      }
      await rawExecute("PRAGMA foreign_keys = ON");
      await initializeDatabase(bootstrapClient);
    })().catch((err) => {
      readyPromise = null; // permitir reintento en la próxima petición
      throw err;
    });
  }
  return readyPromise;
}

(client as any).execute = async (...args: any[]) => {
  await ensureDatabase();
  return (rawExecute as any)(...args);
};
(client as any).executeMultiple = async (...args: any[]) => {
  await ensureDatabase();
  return (rawExecuteMultiple as any)(...args);
};
(client as any).batch = async (...args: any[]) => {
  await ensureDatabase();
  return (rawBatch as any)(...args);
};
(client as any).transaction = async (...args: any[]) => {
  await ensureDatabase();
  const tx = await (rawTransaction as any)(...args);
  // En modo archivo, libSQL entrega la conexión actual a la transacción y abre una NUEVA
  // para las consultas siguientes. Los PRAGMA son por conexión: se re-aplican ya mismo.
  if (isLocalFile) {
    await rawExecute("PRAGMA foreign_keys = ON");
    await rawExecute("PRAGMA busy_timeout = 5000");
  }
  return tx;
};

export const db = drizzle(client, { schema });
export const dbClient = client;
export type DatabaseInstance = typeof db;
