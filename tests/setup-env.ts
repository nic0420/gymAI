/**
 * Debe importarse PRIMERO desde run-all-tests.ts.
 * Los tests usan una base SQLite temporal nueva en cada corrida (nunca ./local.db).
 */
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const tmpDb = path.join(os.tmpdir(), `spotterapp-test-${process.pid}-${Date.now()}.db`);
for (const suffix of ["", "-wal", "-shm"]) {
  try {
    fs.unlinkSync(tmpDb + suffix);
  } catch {
    /* no existe */
  }
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || tmpDb;
delete process.env.TURSO_DATABASE_URL;
(process.env as Record<string, string>).NODE_ENV = "test";

process.on("exit", () => {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(tmpDb + suffix);
    } catch {
      /* ignorar */
    }
  }
});
export {};
