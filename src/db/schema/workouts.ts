import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { tenants } from "./tenants";

/**
 * Biblioteca de Ejercicios
 */
export const exercises = sqliteTable("exercises", {
  id: text("id").primaryKey(), // UUIDv7
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }), // null = ejercicio global del sistema
  name: text("name").notNull(),
  muscleGroup: text("muscle_group", {
    enum: ["CHEST", "BACK", "LEGS", "SHOULDERS", "ARMS", "CORE", "CARDIO", "FULL_BODY"],
  }).notNull(),
  secondaryMuscles: text("secondary_muscles"), // JSON array
  equipment: text("equipment", {
    enum: ["BARBELL", "DUMBBELL", "MACHINE", "CABLE", "BODYWEIGHT", "KETTLEBELL", "OTHER"],
  }).notNull(),
  mediaUrl: text("media_url"), // GIF o video demostrativo
  instructions: text("instructions"),
  createdAt: text("created_at").notNull(),
});

/**
 * Rutinas / Planes de Entrenamiento
 */
export const routines = sqliteTable("routines", {
  id: text("id").primaryKey(), // UUIDv7
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }), // null si isTemplate = true
  coachId: text("coach_id").references(() => users.id),
  name: text("name").notNull(),
  goal: text("goal", {
    enum: ["HYPERTROPHY", "STRENGTH", "FAT_LOSS", "ENDURANCE", "REHABILITATION"],
  }).notNull(),
  isTemplate: integer("is_template", { mode: "boolean" }).default(false).notNull(),
  validFrom: text("valid_from"),
  validUntil: text("valid_until"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Días de Rutina (Splits: Día A, Día B, etc.)
 */
export const routineDays = sqliteTable("routine_days", {
  id: text("id").primaryKey(), // UUIDv7
  routineId: text("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(), // 1, 2, 3...
  name: text("name").notNull(), // "Día 1: Empuje (Pecho/Hombro)"
  description: text("description"),
});

/**
 * Ejercicios asignados a un Día de Rutina
 */
export const routineExercises = sqliteTable("routine_exercises", {
  id: text("id").primaryKey(), // UUIDv7
  routineDayId: text("routine_day_id")
    .notNull()
    .references(() => routineDays.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id")
    .notNull()
    .references(() => exercises.id),
  orderIndex: integer("order_index").notNull(),
  targetSets: integer("target_sets").notNull(),
  targetReps: text("target_reps").notNull(), // "8-12", "Fallo"
  targetRpe: real("target_rpe"), // ej. 8.5
  restSeconds: integer("rest_seconds").default(90).notNull(),
  supersetGroupId: text("superset_group_id"), // Para biseries/circuitos
  coachNotes: text("coach_notes"),
});

/**
 * Registro de Sesiones Diarias de Entrenamiento (Workout Logs)
 */
export const workoutLogs = sqliteTable(
  "workout_logs",
  {
    id: text("id").primaryKey(), // UUIDv7
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    routineDayId: text("routine_day_id").references(() => routineDays.id),
    startedAt: text("started_at").notNull(),
    endedAt: text("ended_at"),
    durationMinutes: integer("duration_minutes"),
    totalVolumeKg: real("total_volume_kg"), // Sumatoria (peso * reps)
    notes: text("notes"),
  },
  (table) => ({
    userWorkoutIdx: index("idx_workout_user").on(table.userId, table.startedAt),
  })
);

/**
 * Registro Detallado de Series Efectivas (Set Logs)
 */
export const setLogs = sqliteTable("set_logs", {
  id: text("id").primaryKey(), // UUIDv7
  workoutLogId: text("workout_log_id")
    .notNull()
    .references(() => workoutLogs.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id")
    .notNull()
    .references(() => exercises.id),
  setNumber: integer("set_number").notNull(),
  weightKg: real("weight_kg").notNull(),
  repsDone: integer("reps_done").notNull(),
  estimatedOneRepMax: real("estimated_one_rep_max"), // Brzycki / Epley
  rpeDone: real("rpe_done"),
  isPersonalRecord: integer("is_personal_record", { mode: "boolean" }).default(false).notNull(),
  createdAt: text("created_at").notNull(),
});

/**
 * Métricas Antropométricas y Composición Corporal
 */
export const bodyMeasurements = sqliteTable(
  "body_measurements",
  {
    id: text("id").primaryKey(), // UUIDv7
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    measuredAt: text("measured_at").notNull(), // YYYY-MM-DD
    weightKg: real("weight_kg").notNull(),
    heightCm: real("height_cm"),
    bodyFatPercentage: real("body_fat_percentage"),
    musclePercentage: real("muscle_percentage"),
    
    // Perímetros en cm
    chestCm: real("chest_cm"),
    waistCm: real("waist_cm"),
    hipsCm: real("hips_cm"),
    armRightCm: real("arm_right_cm"),
    armLeftCm: real("arm_left_cm"),
    thighRightCm: real("thigh_right_cm"),
    thighLeftCm: real("thigh_left_cm"),
    
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    userMeasurementsIdx: index("idx_measurements_user").on(table.userId, table.measuredAt),
  })
);
