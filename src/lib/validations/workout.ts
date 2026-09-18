import { z } from "zod";

/**
 * Esquema para Ejercicio de la Biblioteca
 */
export const CreateExerciseSchema = z.object({
  tenantId: z.string().optional(), // null = ejercicio global
  name: z.string().min(2, "El nombre del ejercicio debe tener al menos 2 caracteres"),
  muscleGroup: z.enum([
    "CHEST",
    "BACK",
    "LEGS",
    "SHOULDERS",
    "ARMS",
    "CORE",
    "CARDIO",
    "FULL_BODY",
  ]),
  secondaryMuscles: z.array(z.string()).optional(),
  equipment: z.enum([
    "BARBELL",
    "DUMBBELL",
    "MACHINE",
    "CABLE",
    "BODYWEIGHT",
    "KETTLEBELL",
    "OTHER",
  ]),
  mediaUrl: z.string().url().optional().or(z.literal("")),
  instructions: z.string().optional(),
});

export type CreateExerciseInput = z.infer<typeof CreateExerciseSchema>;

/**
 * Esquemas para Workout Builder (Rutinas, Días y Ejercicios)
 */
export const RoutineExerciseItemSchema = z.object({
  exerciseId: z.string({ required_error: "exerciseId es obligatorio" }),
  orderIndex: z.number().int().min(1),
  targetSets: z.number().int().min(1, "Debe tener al menos 1 serie"),
  targetReps: z.string({ required_error: "targetReps es obligatorio" }), // ej. "8-12", "Fallo"
  targetRpe: z.number().min(1).max(10).optional(),
  restSeconds: z.number().int().min(10).default(90),
  supersetGroupId: z.string().optional(),
  coachNotes: z.string().optional(),
});

export const RoutineDayItemSchema = z.object({
  dayNumber: z.number().int().min(1),
  name: z.string().min(2, "El nombre del día es obligatorio"), // ej. "Día 1: Empuje (Pecho/Hombro)"
  description: z.string().optional(),
  exercises: z.array(RoutineExerciseItemSchema).min(1, "Cada día debe tener al menos un ejercicio"),
});

export const CreateRoutineSchema = z.object({
  tenantId: z.string({ required_error: "tenantId es obligatorio" }),
  userId: z.string().optional(), // null si isTemplate = true
  coachId: z.string().optional(),
  name: z.string().min(3, "El nombre de la rutina debe tener al menos 3 caracteres"),
  goal: z.enum(["HYPERTROPHY", "STRENGTH", "FAT_LOSS", "ENDURANCE", "REHABILITATION"]),
  isTemplate: z.boolean().default(false),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  days: z.array(RoutineDayItemSchema).min(1, "La rutina debe tener al menos un día de entrenamiento"),
});

export type CreateRoutineInput = z.infer<typeof CreateRoutineSchema>;

/**
 * Esquemas para Live Workout Log (Sesión y Series Efectivas)
 */
export const SetLogItemSchema = z.object({
  exerciseId: z.string({ required_error: "exerciseId es obligatorio" }),
  setNumber: z.number().int().min(1),
  weightKg: z.number().min(0, "El peso no puede ser negativo"),
  repsDone: z.number().int().min(1, "Debe registrar al menos 1 repetición"),
  rpeDone: z.number().min(1).max(10).optional(),
});

export const LogWorkoutSessionSchema = z.object({
  tenantId: z.string({ required_error: "tenantId es obligatorio" }),
  userId: z.string({ required_error: "userId es obligatorio" }),
  routineDayId: z.string().optional(),
  startedAt: z.string({ required_error: "startedAt es obligatorio" }),
  endedAt: z.string().optional(),
  durationMinutes: z.number().int().optional(),
  notes: z.string().optional(),
  sets: z.array(SetLogItemSchema).min(1, "Debe registrar al menos una serie completada"),
});

export type LogWorkoutSessionInput = z.infer<typeof LogWorkoutSessionSchema>;

/**
 * Esquema para Métricas Antropométricas y Medidas Corporales
 */
export const CreateBodyMeasurementSchema = z.object({
  tenantId: z.string({ required_error: "tenantId es obligatorio" }),
  userId: z.string({ required_error: "userId es obligatorio" }),
  measuredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  weightKg: z.number().positive("El peso corporal debe ser mayor a 0"),
  heightCm: z.number().positive("La altura debe ser mayor a 0").optional(),
  bodyFatPercentage: z.number().min(2).max(70).optional(),
  musclePercentage: z.number().min(10).max(90).optional(),
  chestCm: z.number().optional(),
  waistCm: z.number().optional(),
  hipsCm: z.number().optional(),
  armRightCm: z.number().optional(),
  armLeftCm: z.number().optional(),
  thighRightCm: z.number().optional(),
  thighLeftCm: z.number().optional(),
  notes: z.string().optional(),
});

export type CreateBodyMeasurementInput = z.infer<typeof CreateBodyMeasurementSchema>;
