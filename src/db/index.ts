import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { initializeLocalDatabase } from "./init";
import path from "node:path";
import fs from "node:fs";

// En entorno de desarrollo / tests usamos better-sqlite3 local
const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./local.db";
const absoluteDbPath = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(process.cwd(), dbPath);

// Asegurar directorio
const dbDir = path.dirname(absoluteDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(absoluteDbPath);
// Habilitar WAL (Write-Ahead Logging) y Foreign Keys en SQLite para máxima concurrencia local
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Inicializar esquema relacional completo
initializeLocalDatabase(sqlite);

export const db = drizzle(sqlite, { schema });
export type DatabaseInstance = typeof db;
