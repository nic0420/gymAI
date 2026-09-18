import { db } from "../src/db";
import { tenants, users, exercises } from "../src/db/schema";
import {
  calculateOneRepMax,
  logWorkoutSession,
  createExercise,
} from "../src/lib/workouts/workout-service";
import { generateUUIDv7 } from "../src/lib/security/uuid";
import { hashPassword } from "../src/lib/security/hash";
import { generateBlindIndex } from "../src/lib/security/encryption";

export async function runOneRepMaxTrackerTests() {
  console.log("\n🔥 [TEST SUITE 11] Cálculo de 1RM (Fórmula Epley), Volumen y Récords Personales (PRs)");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Verificación Matemática de la Fórmula de Epley: 1RM = Weight * (1 + Reps / 30)
  // Caso A: 100 kg x 10 reps -> 100 * (1 + 10/30) = 133.33 kg
  const epley100x10 = calculateOneRepMax(100, 10);
  assert(epley100x10 === 133.33, "Fórmula Epley calcula 133.33 kg para 100kg x 10 reps");

  // Caso B: 80 kg x 8 reps -> 80 * (1 + 8/30) = 101.33 kg
  const epley80x8 = calculateOneRepMax(80, 8);
  assert(epley80x8 === 101.33, "Fórmula Epley calcula 101.33 kg para 80kg x 8 reps");

  // Caso C: 1 repetición máxima real -> Retorna el peso exacto
  const epley140x1 = calculateOneRepMax(140, 1);
  assert(epley140x1 === 140, "1 repetición devuelve el peso exacto sin distorsión");

  // 2. Setup Base para Sesión de Entrenamiento en Base de Datos
  const nowIso = new Date().toISOString();
  const tenantId = generateUUIDv7();
  const userId = generateUUIDv7();

  await db.insert(tenants).values({
    id: tenantId,
    name: "PR Gym",
    slug: `pr-gym-${Date.now()}`,
    email: "pr@gym.com",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const pwdHash = await hashPassword("PRPass123!");
  await db.insert(users).values({
    id: userId,
    tenantId,
    dni: "39444555",
    dniBlindIndex: generateBlindIndex("39444555"),
    email: "lifter@gym.com",
    passwordHash: pwdHash,
    firstName: "Franco",
    lastName: "Pesista",
    role: "SOCIO",
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const exDeadliftId = await createExercise({
    tenantId,
    name: "Peso Muerto Convencional",
    muscleGroup: "BACK",
    equipment: "BARBELL",
  });

  // 3. Primera Sesión: 140kg x 5 reps -> 1RM = 140 * (1 + 5/30) = 163.33 kg (Debe ser PR)
  const session1 = await logWorkoutSession({
    tenantId,
    userId,
    startedAt: nowIso,
    sets: [
      {
        exerciseId: exDeadliftId,
        setNumber: 1,
        weightKg: 140,
        repsDone: 5,
      },
    ],
  });

  assert(session1.personalRecordsCount === 1, "Primera sesión marca récord personal inicial");
  assert(session1.sets[0].isPR, "La serie es identificada como PR");
  assert(session1.totalVolumeKg === 700, "Volumen total de carga es 700 kg (140 * 5)");

  // 4. Segunda Sesión: 130kg x 5 reps -> 1RM = 151.67 kg (< 163.33 kg -> NO es PR)
  const session2 = await logWorkoutSession({
    tenantId,
    userId,
    startedAt: nowIso,
    sets: [
      {
        exerciseId: exDeadliftId,
        setNumber: 1,
        weightKg: 130,
        repsDone: 5,
      },
    ],
  });

  assert(session2.personalRecordsCount === 0, "Carga inferior al récord histórico no marca PR");
  assert(!session2.sets[0].isPR, "La serie no supera el récord histórico");

  // 5. Tercera Sesión: 150kg x 5 reps -> 1RM = 175.00 kg (> 163.33 kg -> ¡NUEVO PR!)
  const session3 = await logWorkoutSession({
    tenantId,
    userId,
    startedAt: nowIso,
    sets: [
      {
        exerciseId: exDeadliftId,
        setNumber: 1,
        weightKg: 150,
        repsDone: 5,
      },
    ],
  });

  assert(session3.personalRecordsCount === 1, "Superación de marca histórica detecta ¡Nuevo PR!");
  assert(session3.sets[0].isPR, "Serie con nuevo máximo histórico marcada como PR");
  assert(session3.sets[0].estimated1RM === 175.0, "Nuevo 1RM estimado es 175.00 kg");

  console.log(`\nResumen Suite 11: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
