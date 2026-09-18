import { db } from "../src/db";
import { tenants, users, exercises, routines } from "../src/db/schema";
import {
  createExercise,
  createRoutine,
  cloneRoutineTemplateForUser,
} from "../src/lib/workouts/workout-service";
import { generateUUIDv7 } from "../src/lib/security/uuid";
import { hashPassword } from "../src/lib/security/hash";
import { generateBlindIndex } from "../src/lib/security/encryption";
import { eq } from "drizzle-orm";

export async function runWorkoutBuilderTests() {
  console.log("\n🏋️ [TEST SUITE 10] Workout Builder, Biblioteca de Ejercicios y Plantillas");
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

  const nowIso = new Date().toISOString();
  const tenantId = generateUUIDv7();
  const coachId = generateUUIDv7();
  const memberId = generateUUIDv7();

  await db.insert(tenants).values({
    id: tenantId,
    name: "Workout Gym",
    slug: `workout-gym-${Date.now()}`,
    email: "workout@gym.com",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const pwdHash = await hashPassword("Pass123!");
  await db.insert(users).values({
    id: coachId,
    tenantId,
    dni: "38999111",
    dniBlindIndex: generateBlindIndex("38999111"),
    email: "coach@gym.com",
    passwordHash: pwdHash,
    firstName: "Carlos",
    lastName: "Entrenador",
    role: "ENTRENADOR",
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await db.insert(users).values({
    id: memberId,
    tenantId,
    dni: "38999222",
    dniBlindIndex: generateBlindIndex("38999222"),
    email: "alumno@gym.com",
    passwordHash: pwdHash,
    firstName: "Joaquín",
    lastName: "Socio",
    role: "SOCIO",
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // 1. Crear Ejercicios en la biblioteca
  const exBancaId = await createExercise({
    tenantId,
    name: "Press de Banca Plano",
    muscleGroup: "CHEST",
    equipment: "BARBELL",
    instructions: "Retraer escápulas y bajar la barra controlada al esternón",
  });

  const exSentadillaId = await createExercise({
    tenantId,
    name: "Sentadilla Trasera con Barra",
    muscleGroup: "LEGS",
    equipment: "BARBELL",
  });

  assert(Boolean(exBancaId), "Crea ejercicio de pecho en biblioteca");
  assert(Boolean(exSentadillaId), "Crea ejercicio de piernas en biblioteca");

  // 2. Crear Plantilla Maestra de 2 Días
  const templateId = await createRoutine({
    tenantId,
    coachId,
    name: "Torso / Pierna Intermedio",
    goal: "HYPERTROPHY",
    isTemplate: true,
    days: [
      {
        dayNumber: 1,
        name: "Día 1: Torso (Empuje/Tracción)",
        exercises: [
          {
            exerciseId: exBancaId,
            orderIndex: 1,
            targetSets: 4,
            targetReps: "8-12",
            targetRpe: 8.5,
            restSeconds: 90,
            coachNotes: "Pausa de 1 segundo en el pecho",
          },
        ],
      },
      {
        dayNumber: 2,
        name: "Día 2: Pierna Completa",
        exercises: [
          {
            exerciseId: exSentadillaId,
            orderIndex: 1,
            targetSets: 4,
            targetReps: "6-8",
            restSeconds: 120,
          },
        ],
      },
    ],
  });

  assert(Boolean(templateId), "Crea plantilla de entrenamiento maestra");

  // 3. Clonar la Plantilla Maestra a un Socio específico
  const clonedRoutineId = await cloneRoutineTemplateForUser({
    templateId,
    userId: memberId,
    coachId,
    validFrom: "2026-09-01",
    validUntil: "2026-12-01",
  });

  assert(Boolean(clonedRoutineId), "Clona plantilla maestra para un socio específico");

  // Verificar que la rutina clonada no sea template y pertenezca al socio
  const clonedRoutine = await db.query.routines.findFirst({
    where: eq(routines.id, clonedRoutineId),
  });
  assert(clonedRoutine?.userId === memberId, "Rutina clonada asignada al socio correcto");
  assert(!clonedRoutine?.isTemplate, "Rutina clonada tiene isTemplate = false");
  assert(Boolean(clonedRoutine?.name.includes("Personalizada")), "Rutina clonada incluye sufijo personalizado");

  console.log(`\nResumen Suite 10: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
