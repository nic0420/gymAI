/**
 * Crea (o actualiza) el gimnasio de pruebas "gym-pruebas" con el plan más alto (Cadenas).
 *
 * Local (usa ./local.db):
 *   npx tsx scripts/crear-gimnasio-pruebas.ts
 * En Turso (la base de producción de Vercel):
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... BLIND_INDEX_SALT=... npx tsx scripts/crear-gimnasio-pruebas.ts
 *
 * IMPORTANTE: BLIND_INDEX_SALT debe ser el MISMO valor que tiene Vercel; si no, el check-in
 * por DNI no va a encontrar al usuario.
 */
import { db } from "../src/db";
import { tenants, branches, users } from "../src/db/schema";
import { generateUUIDv7 } from "../src/lib/security/uuid";
import { hashPassword } from "../src/lib/security/hash";
import { generateBlindIndex } from "../src/lib/security/encryption";
import { and, eq } from "drizzle-orm";

const SLUG = process.env.TEST_GYM_SLUG || "gym-pruebas";
const EMAIL = (process.env.TEST_GYM_EMAIL || "pruebas@spotter.test").toLowerCase();
const PASSWORD = process.env.TEST_GYM_PASSWORD || "Pruebas2026";
const DNI = "30111222";

const SETTINGS = {
  plan: "ENTERPRISE_VIP",
  planName: "Cadenas",
  status: "ACTIVE",
  monthlyPriceArs: 59900,
  maxMembers: 99999,
  maxBranches: 10,
  features: [
    "MULTI_BRANCH",
    "TOUCH_KIOSK",
    "SPLIT_PAYMENTS",
    "BLIND_CLOSING",
    "ENCRYPTED_MEDICAL_RECORDS",
    "WORKOUT_BUILDER_1RM",
    "HEATMAP_7X24",
    "ONBOARDING_TOURS",
    "PRIORITY_SUPPORT",
  ],
};

async function main() {
  const now = new Date().toISOString();
  let tenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, SLUG) });

  if (!tenant) {
    const id = generateUUIDv7();
    await db.insert(tenants).values({
      id,
      name: "Gym Pruebas",
      slug: SLUG,
      email: EMAIL,
      currency: "ARS",
      isActive: true,
      settings: JSON.stringify(SETTINGS),
      createdAt: now,
      updatedAt: now,
    });
    tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, id) });
    console.log(`Gimnasio creado: ${SLUG}`);
  } else {
    await db
      .update(tenants)
      .set({ settings: JSON.stringify(SETTINGS), isActive: true, updatedAt: now })
      .where(eq(tenants.id, tenant.id));
    console.log(`Gimnasio existente actualizado al plan Cadenas: ${SLUG}`);
  }

  const tenantId = tenant!.id;
  const existingBranches = await db.query.branches.findMany({ where: eq(branches.tenantId, tenantId) });
  for (const [name, address] of [
    ["Sede Central", "Calle 123"],
    ["Sede Norte", "Av. Norte 456"],
  ]) {
    if (!existingBranches.some((b) => b.name === name)) {
      await db.insert(branches).values({
        id: generateUUIDv7(),
        tenantId,
        name,
        address,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const passwordHash = await hashPassword(PASSWORD);
  const user = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenantId), eq(users.email, EMAIL)),
  });
  if (!user) {
    await db.insert(users).values({
      id: generateUUIDv7(),
      tenantId,
      dni: DNI,
      dniBlindIndex: generateBlindIndex(DNI),
      email: EMAIL,
      passwordHash,
      firstName: "Test",
      lastName: "Admin",
      role: "SUPERADMIN",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db
      .update(users)
      .set({ passwordHash, role: "SUPERADMIN", status: "ACTIVE", updatedAt: now })
      .where(eq(users.id, user.id));
  }

  console.log("\nListo. Ingresá con:");
  console.log(`  Gimnasio: ${SLUG}`);
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Clave:    ${PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err?.message || err);
    process.exit(1);
  });
