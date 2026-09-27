/**
 * Debe importarse PRIMERO desde run-all-tests.ts.
 * FIX: los tests escribían en ./local.db (la base de desarrollo real), llenándola de
 * gimnasios, socios y facturas de prueba en cada corrida. Ahora usan una base en memoria.
 */
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || ":memory:";
(process.env as Record<string, string>).NODE_ENV = "test";
export {};
