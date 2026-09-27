import { db } from "@/db";
import { attendances, users, subscriptions, invoices, setLogs, workoutLogs, paymentTransactions } from "@/db/schema";
import { eq, and, gte, ne } from "drizzle-orm";
import { getLocalDayAndHour } from "@/lib/time/dates";

const HEATMAP_WINDOW_DAYS = 90;
const MONTH_WINDOW_DAYS = 30;

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
  // FIX: sólo ingresos efectivos (los rechazos en ROJO no son "gente entrenando")
  // y ventana acotada (antes cargaba TODO el historial en memoria en cada request)
  const since = new Date(Date.now() - HEATMAP_WINDOW_DAYS * 86_400_000).toISOString();
  const allAttendances = await db.query.attendances.findMany({
    where: and(
      eq(attendances.tenantId, tenantId),
      ne(attendances.accessStatus, "DENIED_RED"),
      gte(attendances.checkInAt, since)
    ),
    columns: { checkInAt: true },
  });

  // Inicializar matriz de 7 días x 24 horas en 0
  const matrix: PeakHoursMatrix[] = Array.from({ length: 7 }, (_, dayIdx) => ({
    dayOfWeek: dayIdx,
    dayName: DAY_NAMES[dayIdx],
    hourlyCounts: new Array(24).fill(0),
  }));

  for (const att of allAttendances) {
    // FIX: día/hora en la zona horaria del gimnasio (antes: la del servidor; en Vercel = UTC,
    // el pico de las 19 hs aparecía a las 22 hs)
    const { dayOfWeek: day, hour } = getLocalDayAndHour(new Date(att.checkInAt));
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
  const monthStartIso = new Date(Date.now() - MONTH_WINDOW_DAYS * 86_400_000).toISOString();

  const [allUsers, monthPayments, monthAttendances, heatmap] = await Promise.all([
    db.query.users.findMany({
      where: and(eq(users.tenantId, tenantId), eq(users.role, "SOCIO")),
      columns: { status: true },
    }),
    // Cobros aprobados de los últimos 30 días
    db.query.paymentTransactions.findMany({
      where: and(
        eq(paymentTransactions.tenantId, tenantId),
        eq(paymentTransactions.status, "APPROVED"),
        gte(paymentTransactions.createdAt, monthStartIso)
      ),
      columns: { amount: true },
    }),
    db.query.attendances.findMany({
      where: and(
        eq(attendances.tenantId, tenantId),
        ne(attendances.accessStatus, "DENIED_RED"),
        gte(attendances.checkInAt, monthStartIso)
      ),
      columns: { id: true },
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

  // MRR: Sumatoria de cobros aprobados en los últimos 30 días.
  // FIX: antes sumaba TODAS las facturas pagas de la historia (el "MRR" sólo crecía).
  let monthlyRecurringRevenue = 0;
  for (const p of monthPayments) {
    monthlyRecurringRevenue += p.amount;
  }
  monthlyRecurringRevenue = Math.round(monthlyRecurringRevenue * 100) / 100;

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

  // Total de asistencias de los últimos 30 días (antes: todas las de la historia)
  const totalAttendances = monthAttendances.length;

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
