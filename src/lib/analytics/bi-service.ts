import { db } from "@/db";
import { attendances, users, subscriptions, invoices, setLogs, workoutLogs, exercises } from "@/db/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";

export interface PeakHoursMatrix {
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  dayName: string;
  hourlyCounts: number[]; // Array de 24 posiciones (horas 0 a 23)
}

export interface BusinessKPIs {
  totalMembers: number;
  activeMembers: number;
  debtorMembers: number;
  inactiveMembers: number;
  monthlyRecurringRevenue: number;
  monthlyAttendancesCount: number;
  peakHourDescription: string;
  peakHoursHeatmap: PeakHoursMatrix[];
}

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/**
 * Calcula el Mapa de Calor de Horarios Pico (Peak Hours)
 * Analiza la distribución de asistencias en una matriz de 7 días x 24 horas.
 */
export async function generatePeakHoursHeatmap(tenantId: string): Promise<PeakHoursMatrix[]> {
  const allAttendances = await db.query.attendances.findMany({
    where: eq(attendances.tenantId, tenantId),
    columns: { checkInAt: true },
  });

  // Inicializar matriz de 7 días x 24 horas en 0
  const matrix: PeakHoursMatrix[] = Array.from({ length: 7 }, (_, dayIdx) => ({
    dayOfWeek: dayIdx,
    dayName: DAY_NAMES[dayIdx],
    hourlyCounts: new Array(24).fill(0),
  }));

  for (const att of allAttendances) {
    const date = new Date(att.checkInAt);
    const day = date.getDay(); // 0 a 6
    const hour = date.getHours(); // 0 a 23
    if (matrix[day] && matrix[day].hourlyCounts[hour] !== undefined) {
      matrix[day].hourlyCounts[hour]++;
    }
  }

  return matrix;
}

/**
 * Genera el reporte ejecutivo de KPIs del Gimnasio
 */
export async function getExecutiveBusinessDashboard(tenantId: string): Promise<BusinessKPIs> {
  const [allUsers, allSubscriptions, allInvoices, heatmap] = await Promise.all([
    db.query.users.findMany({
      where: and(eq(users.tenantId, tenantId), eq(users.role, "SOCIO")),
    }),
    db.query.subscriptions.findMany({
      where: eq(subscriptions.tenantId, tenantId),
    }),
    db.query.invoices.findMany({
      where: and(eq(invoices.tenantId, tenantId), eq(invoices.status, "PAID")),
    }),
    generatePeakHoursHeatmap(tenantId),
  ]);

  let activeMembers = 0;
  let debtorMembers = 0;
  let inactiveMembers = 0;

  for (const u of allUsers) {
    if (u.status === "ACTIVE") activeMembers++;
    else if (u.status === "DEBTOR") debtorMembers++;
    else inactiveMembers++;
  }

  // MRR: Sumatoria de facturas cobradas en los últimos 30 días
  let monthlyRecurringRevenue = 0;
  for (const inv of allInvoices) {
    monthlyRecurringRevenue += inv.paidAmount;
  }

  // Encontrar hora pico máxima
  let maxCount = -1;
  let peakDay = "Lunes";
  let peakHour = 19;

  heatmap.forEach((d) => {
    d.hourlyCounts.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        peakDay = d.dayName;
        peakHour = hour;
      }
    });
  });

  const peakHourDescription =
    maxCount > 0
      ? `${peakDay} a las ${peakHour}:00 hs (${maxCount} accesos)`
      : "Sin datos suficientes";

  // Total de asistencias del mes
  const totalAttendances = heatmap.reduce(
    (acc, d) => acc + d.hourlyCounts.reduce((hAcc, c) => hAcc + c, 0),
    0
  );

  return {
    totalMembers: allUsers.length,
    activeMembers,
    debtorMembers,
    inactiveMembers,
    monthlyRecurringRevenue,
    monthlyAttendancesCount: totalAttendances,
    peakHourDescription,
    peakHoursHeatmap: heatmap,
  };
}

/**
 * Obtiene la evolución de fuerza (1RM) histórica por ejercicio para un socio
 */
export async function getMemberStrengthProgression(params: {
  userId: string;
  exerciseId: string;
}) {
  const { userId, exerciseId } = params;

  const logs = await db
    .select({
      workoutDate: workoutLogs.startedAt,
      weightKg: setLogs.weightKg,
      repsDone: setLogs.repsDone,
      estimated1RM: setLogs.estimatedOneRepMax,
      isPR: setLogs.isPersonalRecord,
    })
    .from(setLogs)
    .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
    .where(
      and(
        eq(workoutLogs.userId, userId),
        eq(setLogs.exerciseId, exerciseId)
      )
    )
    .orderBy(workoutLogs.startedAt);

  return logs;
}
