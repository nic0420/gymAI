import { db } from "@/db";
import {
  exercises,
  routines,
  routineDays,
  routineExercises,
  workoutLogs,
  setLogs,
} from "@/db/schema";
import { generateUUIDv7 } from "@/lib/security/uuid";
import {
  CreateExerciseInput,
  CreateRoutineInput,
  LogWorkoutSessionInput,
} from "@/lib/validations/workout";
import { eq, and, sql, inArray, or, isNull } from "drizzle-orm";
import { users } from "@/db/schema";

import { calculateOneRepMax } from "./epley";
export { calculateOneRepMax };

/**
 * Crea un nuevo ejercicio en el catálogo
 */
export async function createExercise(input: CreateExerciseInput): Promise<string> {
  const exerciseId = generateUUIDv7();
  const nowIso = new Date().toISOString();

  await db.insert(exercises).values({
    id: exerciseId,
    tenantId: input.tenantId || null,
    name: input.name,
    muscleGroup: input.muscleGroup,
    secondaryMuscles: input.secondaryMuscles ? JSON.stringify(input.secondaryMuscles) : null,
    equipment: input.equipment,
    mediaUrl: input.mediaUrl || null,
    instructions: input.instructions || null,
    createdAt: nowIso,
  });

  return exerciseId;
}

/**
 * Crea una rutina completa con sus días y ejercicios
 */
export async function createRoutine(input: CreateRoutineInput): Promise<string> {
  const routineId = generateUUIDv7();
  const nowIso = new Date().toISOString();

  // Validaciones de integridad multi-tenant (antes se podía asignar una rutina a un socio
  // de otro gimnasio o usar ejercicios privados ajenos)
  if (input.userId) {
    const member = await db.query.users.findFirst({
      where: and(eq(users.id, input.userId), eq(users.tenantId, input.tenantId)),
      columns: { id: true },
    });
    if (!member) throw new Error("MEMBER_NOT_FOUND");
  }
  const exerciseIds = Array.from(new Set(input.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))));
  if (exerciseIds.length > 0) {
    const found = await db.query.exercises.findMany({
      where: and(
        inArray(exercises.id, exerciseIds),
        or(eq(exercises.tenantId, input.tenantId), isNull(exercises.tenantId))
      ),
      columns: { id: true },
    });
    if (found.length !== exerciseIds.length) throw new Error("EXERCISE_NOT_FOUND");
  }

  await db.insert(routines).values({
    id: routineId,
    tenantId: input.tenantId,
    userId: input.userId || null,
    coachId: input.coachId || null,
    name: input.name,
    goal: input.goal,
    isTemplate: input.isTemplate,
    validFrom: input.validFrom || null,
    validUntil: input.validUntil || null,
    notes: input.notes || null,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  for (const day of input.days) {
    const dayId = generateUUIDv7();
    await db.insert(routineDays).values({
      id: dayId,
      routineId,
      dayNumber: day.dayNumber,
      name: day.name,
      description: day.description || null,
    });

    for (const ex of day.exercises) {
      await db.insert(routineExercises).values({
        id: generateUUIDv7(),
        routineDayId: dayId,
        exerciseId: ex.exerciseId,
        orderIndex: ex.orderIndex,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        targetRpe: ex.targetRpe || null,
        restSeconds: ex.restSeconds,
        supersetGroupId: ex.supersetGroupId || null,
        coachNotes: ex.coachNotes || null,
      });
    }
  }

  return routineId;
}

/**
 * Clona una Plantilla Maestra a un Socio específico
 */
export async function cloneRoutineTemplateForUser(params: {
  tenantId?: string;
  templateId: string;
  userId: string;
  coachId?: string;
  validFrom?: string;
  validUntil?: string;
}): Promise<string> {
  const { templateId, userId, coachId, validFrom, validUntil, tenantId } = params;

  const template = await db.query.routines.findFirst({
    where: tenantId
      ? and(eq(routines.id, templateId), eq(routines.tenantId, tenantId))
      : eq(routines.id, templateId),
  });

  if (!template) {
    throw new Error("TEMPLATE_NOT_FOUND");
  }

  const days = await db.query.routineDays.findMany({
    where: eq(routineDays.routineId, templateId),
  });

  const fullDays: any[] = [];
  for (const day of days) {
    const exs = await db.query.routineExercises.findMany({
      where: eq(routineExercises.routineDayId, day.id),
    });
    fullDays.push({
      dayNumber: day.dayNumber,
      name: day.name,
      description: day.description,
      exercises: exs.map((e) => ({
        exerciseId: e.exerciseId,
        orderIndex: e.orderIndex,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        targetRpe: e.targetRpe,
        restSeconds: e.restSeconds,
        supersetGroupId: e.supersetGroupId,
        coachNotes: e.coachNotes,
      })),
    });
  }

  return createRoutine({
    tenantId: template.tenantId,
    userId,
    coachId,
    name: `${template.name} (Personalizada)`,
    goal: template.goal as any,
    isTemplate: false,
    validFrom,
    validUntil,
    notes: template.notes || undefined,
    days: fullDays,
  });
}

export interface WorkoutLogResult {
  workoutLogId: string;
  totalVolumeKg: number;
  personalRecordsCount: number;
  sets: {
    exerciseId: string;
    setNumber: number;
    weightKg: number;
    repsDone: number;
    estimated1RM: number;
    isPR: boolean;
  }[];
}

/**
 * Procesa y Registra una Sesión de Entrenamiento (Live Workout)
 * Calcula 1RM automático por Epley, volumen de carga total y detección de PRs históricos.
 */
export async function logWorkoutSession(
  input: LogWorkoutSessionInput
): Promise<WorkoutLogResult> {
  const { tenantId, userId, routineDayId, startedAt, endedAt, durationMinutes, notes, sets } = input;
  const workoutLogId = generateUUIDv7();
  const nowIso = new Date().toISOString();

  let totalVolumeKg = 0;
  let personalRecordsCount = 0;
  const processedSets: any[] = [];

  // 1. Insertar primero la cabecera del Workout Log para satisfacer la Foreign Key
  // Calculamos el volumen total y procesamos las series
  const preparedSets: any[] = [];
  // Mejor 1RM por ejercicio: histórico + lo ya levantado en ESTA sesión.
  // FIX: antes cada serie se comparaba sólo contra el histórico, así que 4 series que
  // superaban la marca anterior contaban como 4 "récords personales" distintos.
  const bestSoFar = new Map<string, number>();
  const prExercises = new Set<string>(); // un récord se cuenta una vez por ejercicio
  for (const s of sets) {
    const estimated1RM = calculateOneRepMax(s.weightKg, s.repsDone);
    const volume = s.weightKg * s.repsDone;
    totalVolumeKg += volume;

    // Consultar el mejor 1RM histórico del socio para este ejercicio
    const historicalLogs = await db
      .select({
        max1RM: sql<number>`MAX(${setLogs.estimatedOneRepMax})`,
      })
      .from(setLogs)
      .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
      .where(
        and(
          eq(workoutLogs.userId, userId),
          eq(setLogs.exerciseId, s.exerciseId)
        )
      );

    const historicalBest = historicalLogs[0]?.max1RM || 0;
    const previousBest1RM = Math.max(historicalBest, bestSoFar.get(s.exerciseId) ?? 0);
    const isPersonalRecord = estimated1RM > previousBest1RM && estimated1RM > 0;
    bestSoFar.set(s.exerciseId, Math.max(previousBest1RM, estimated1RM));

    if (isPersonalRecord) {
      prExercises.add(s.exerciseId);
    }

    preparedSets.push({
      id: generateUUIDv7(),
      workoutLogId,
      exerciseId: s.exerciseId,
      setNumber: s.setNumber,
      weightKg: s.weightKg,
      repsDone: s.repsDone,
      estimatedOneRepMax: estimated1RM,
      rpeDone: s.rpeDone || null,
      isPersonalRecord,
      createdAt: nowIso,
    });

    processedSets.push({
      exerciseId: s.exerciseId,
      setNumber: s.setNumber,
      weightKg: s.weightKg,
      repsDone: s.repsDone,
      estimated1RM,
      isPR: isPersonalRecord,
    });
  }

  personalRecordsCount = prExercises.size;

  // Insertar cabecera del Workout Log con volumen total
  await db.insert(workoutLogs).values({
    id: workoutLogId,
    tenantId,
    userId,
    routineDayId: routineDayId || null,
    startedAt,
    endedAt: endedAt || nowIso,
    durationMinutes: durationMinutes || null,
    totalVolumeKg: Math.round(totalVolumeKg * 100) / 100,
    notes: notes || null,
  });

  // Insertar series una vez creada la cabecera
  for (const setItem of preparedSets) {
    await db.insert(setLogs).values(setItem);
  }

  return {
    workoutLogId,
    totalVolumeKg: Math.round(totalVolumeKg * 100) / 100,
    personalRecordsCount,
    sets: processedSets,
  };
}
