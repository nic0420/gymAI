import { db } from "../src/db";
import { tenants, branches, users, exercises, routines } from "../src/db/schema";
import { generateUUIDv7 } from "../src/lib/security/uuid";
import { hashPassword } from "../src/lib/security/hash";
import { generateBlindIndex } from "../src/lib/security/encryption";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🚀 Iniciando aprovisionamiento de cuentas Master y Cliente VIP...");
  const now = new Date().toISOString();

  // ==========================================
  // 1. CUENTA MASTER CEO (Litoral.dev - Ojeda Nicolas)
  // ==========================================
  const masterSlug = "litoral-dev";
  const existingMaster = await db.query.tenants.findFirst({
    where: eq(tenants.slug, masterSlug),
  });

  let masterTenantId = existingMaster?.id || generateUUIDv7();
  let masterBranchId = generateUUIDv7();
  let masterUserId = generateUUIDv7();

  if (!existingMaster) {
    await db.insert(tenants).values({
      id: masterTenantId,
      name: "Litoral.dev (Master Global)",
      slug: masterSlug,
      email: "ojedanicolas1b@gmail.com",
      taxId: "20-40000000-9",
      phone: "+54 9 342 555-0100",
      currency: "ARS",
      isActive: true,
      settings: JSON.stringify({
        isMasterOrg: true,
        plan: "MASTER_GLOBAL_CEO",
        features: ["ALL_UNLIMITED", "MULTI_TENANT_MANAGER", "GLOBAL_ANALYTICS"],
      }),
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(branches).values({
      id: masterBranchId,
      tenantId: masterTenantId,
      name: "Sede Matriz",
      address: "Santa Fe, Argentina",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Crear o actualizar usuario Master
  const masterPasswordHash = await hashPassword("Onlythresh420");
  const masterDniIndex = generateBlindIndex("10000001");

  const existingMasterUser = await db.query.users.findFirst({
    where: eq(users.email, "ojedanicolas1b@gmail.com"),
  });

  if (!existingMasterUser) {
    await db.insert(users).values({
      id: masterUserId,
      tenantId: masterTenantId,
      dni: "10000001",
      dniBlindIndex: masterDniIndex,
      email: "ojedanicolas1b@gmail.com",
      passwordHash: masterPasswordHash,
      firstName: "Nicolas",
      lastName: "Ojeda",
      phone: "+54 9 342 555-0100",
      status: "ACTIVE",
      role: "SUPERADMIN",
      onboardingState: JSON.stringify({ completed: true, role: "CEO_GLOBAL" }),
      createdAt: now,
      updatedAt: now,
    });
    console.log("✅ Cuenta Master CEO creada exitosamente (ojedanicolas1b@gmail.com)");
  } else {
    await db.update(users)
      .set({ passwordHash: masterPasswordHash, role: "SUPERADMIN", updatedAt: now })
      .where(eq(users.email, "ojedanicolas1b@gmail.com"));
    console.log("🔄 Cuenta Master CEO actualizada con nueva contraseña (ojedanicolas1b@gmail.com)");
  }

  // ==========================================
  // 2. CUENTA GIMNASIO LIBERTAD (Larroca Nicolas - Plan Enterprise)
  // ==========================================
  const gymSlug = "gimnasio-libertad";
  const existingGym = await db.query.tenants.findFirst({
    where: eq(tenants.slug, gymSlug),
  });

  let gymTenantId = existingGym?.id || generateUUIDv7();
  let gymBranchId = generateUUIDv7();
  let gymUserId = generateUUIDv7();

  if (!existingGym) {
    await db.insert(tenants).values({
      id: gymTenantId,
      name: "Gimnasio Libertad",
      slug: gymSlug,
      email: "nicolaslarrocapf@gmail.com",
      taxId: "30-71000000-4",
      phone: "+54 9 342 444-9988",
      address: "Av. Libertad 1250, Santa Fe",
      currency: "ARS",
      isActive: true,
      settings: JSON.stringify({
        plan: "ENTERPRISE_VIP",
        status: "ACTIVE_TRIAL_VIP",
        monthlyPriceArs: 59900,
        maxMembers: 99999,
        maxBranches: 10,
        features: [
          "OFFLINE_FIRST",
          "TOUCH_KIOSK",
          "SPLIT_PAYMENTS",
          "BLIND_CLOSING",
          "WORKOUT_BUILDER_1RM",
          "HEATMAP_7X24",
          "ONBOARDING_TOURS",
          "ENCRYPTED_MEDICAL_RECORDS"
        ],
      }),
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(branches).values({
      id: gymBranchId,
      tenantId: gymTenantId,
      name: "Sede Central",
      address: "Av. Libertad 1250",
      phone: "+54 9 342 444-9988",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }


  // Crear o actualizar usuario Dueño Gimnasio Libertad
  const gymPasswordHash = await hashPassword("Libertad12345");
  const gymDniIndex = generateBlindIndex("20000002");

  const existingGymUser = await db.query.users.findFirst({
    where: eq(users.email, "nicolaslarrocapf@gmail.com"),
  });

  if (!existingGymUser) {
    await db.insert(users).values({
      id: gymUserId,
      tenantId: gymTenantId,
      dni: "20000002",
      dniBlindIndex: gymDniIndex,
      email: "nicolaslarrocapf@gmail.com",
      passwordHash: gymPasswordHash,
      firstName: "Nicolas",
      lastName: "Larroca",
      phone: "+54 9 342 444-9988",
      status: "ACTIVE",
      role: "SUPERADMIN",
      onboardingState: JSON.stringify({ completed: false, firstLogin: true }),
      createdAt: now,
      updatedAt: now,
    });
    console.log("✅ Cuenta Gimnasio Libertad creada exitosamente (nicolaslarrocapf@gmail.com)");
  } else {
    await db.update(users)
      .set({ passwordHash: gymPasswordHash, role: "SUPERADMIN", updatedAt: now })
      .where(eq(users.email, "nicolaslarrocapf@gmail.com"));
    console.log("🔄 Cuenta Gimnasio Libertad actualizada con nueva contraseña (nicolaslarrocapf@gmail.com)");
  }

  console.log("\n=======================================================");
  console.log("🎉 AMBAS CUENTAS APROVISIONADAS CORRECTAMENTE");
  console.log("=======================================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error durante el aprovisionamiento:", err);
    process.exit(1);
  });
