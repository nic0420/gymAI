import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tenants,
  branches,
  users,
  membershipPlans,
  subscriptions,
  medicalRecords,
  invoices,
  paymentTransactions,
  attendances,
  exercises,
  workoutLogs,
  setLogs,
} from "@/db/schema";
import { generateBlindIndex } from "@/lib/security/encryption";
import { hashPassword } from "@/lib/security/hash";
import { generateUUIDv7 } from "@/lib/security/uuid";
import { calculateOneRepMax } from "@/lib/workouts/epley";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guard";
import { getLocalDateString, addDaysToDateString } from "@/lib/time/dates";

export async function POST(req: NextRequest) {
  try {
    // FIX: antes era público. Cualquiera podía inyectar 12 socios falsos, facturas y
    // asistencias en el gimnasio de cualquier cliente. Ahora exige SUPERADMIN y en
    // producción debe habilitarse explícitamente con ALLOW_DEMO_SEED=true.
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
      return NextResponse.json(
        { success: false, error: "La carga de datos demo está deshabilitada en producción" },
        { status: 403 }
      );
    }
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;
    if (auth.ctx.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, error: "Sólo un administrador puede cargar datos demo" },
        { status: 403 }
      );
    }
    const tenantId = auth.ctx.tenantId;
    const body = await req.json().catch(() => ({}));
    const requestedBranchId = (body as { branchId?: string })?.branchId;

    const now = new Date();
    const nowIso = now.toISOString();
    const todayStr = getLocalDateString(now);
    const defaultPasswordHash = await hashPassword("Demo1234!");

    // Helper para fechas (calendario local del gimnasio)
    const helperAddDays = (days: number): string => addDaysToDateString(todayStr, days);

    // 1. Crear Planes de Membresía
    const plansData = [
      { name: "Pase Libre Full", price: 34900, durationDays: 30 },
      { name: "Musculación & Cardio", price: 24900, durationDays: 30 },
      { name: "Crossfit & Funcional", price: 29900, durationDays: 30 },
      { name: "Trimestral All-Inclusive", price: 89900, durationDays: 90 },
    ];

    const createdPlanIds: string[] = [];
    for (const p of plansData) {
      // FIX: la búsqueda no filtraba por tenant -> reutilizaba planes de OTRO gimnasio
      const existingPlan = await db.query.membershipPlans.findFirst({
        where: and(eq(membershipPlans.tenantId, tenantId), eq(membershipPlans.name, p.name)),
      });
      if (existingPlan) {
        createdPlanIds.push(existingPlan.id);
      } else {
        const pId = generateUUIDv7();
        await db.insert(membershipPlans).values({
          id: pId,
          tenantId,
          name: p.name,
          price: p.price,
          durationDays: p.durationDays,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        createdPlanIds.push(pId);
      }
    }

    // 2. Crear Ejercicios en la Biblioteca
    const exercisesData: {
      name: string;
      muscleGroup: "CHEST" | "BACK" | "LEGS" | "SHOULDERS" | "ARMS" | "CORE" | "CARDIO" | "FULL_BODY";
      equipment: "BARBELL" | "DUMBBELL" | "MACHINE" | "CABLE" | "BODYWEIGHT" | "KETTLEBELL" | "OTHER";
    }[] = [
      { name: "Press de Banca Plano", muscleGroup: "CHEST", equipment: "BARBELL" },
      { name: "Sentadilla Libre Trasera", muscleGroup: "LEGS", equipment: "BARBELL" },
      { name: "Peso Muerto Convencional", muscleGroup: "BACK", equipment: "BARBELL" },
      { name: "Press Militar de Hombros", muscleGroup: "SHOULDERS", equipment: "BARBELL" },
      { name: "Dominadas con Lastre", muscleGroup: "BACK", equipment: "BODYWEIGHT" },
    ];

    const createdExerciseIds: string[] = [];
    for (const ex of exercisesData) {
      const existingEx = await db.query.exercises.findFirst({
        where: and(eq(exercises.tenantId, tenantId), eq(exercises.name, ex.name)),
      });
      if (existingEx) {
        createdExerciseIds.push(existingEx.id);
      } else {
        const exId = generateUUIDv7();
        await db.insert(exercises).values({
          id: exId,
          tenantId,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          equipment: ex.equipment,
          createdAt: nowIso,
        });
        createdExerciseIds.push(exId);
      }
    }

    // 3. Crear 15 Socios Realistas con distintos estados (Activos, Próximos a Vencer, Deudores)
    const demoMembers = [
      { first: "Franco", last: "Armani", dni: "38111222", phone: "1144556677", status: "ACTIVE" as const, daysEnd: 25, med: "VALID" as const },
      { first: "Enzo", last: "Perez", dni: "36222333", phone: "1133221100", status: "ACTIVE" as const, daysEnd: 2, med: "VALID" as const }, // Warning
      { first: "Julian", last: "Alvarez", dni: "42333444", phone: "1188990011", status: "ACTIVE" as const, daysEnd: 20, med: "VALID" as const },
      { first: "Lionel", last: "Messi", dni: "33444555", phone: "1199887766", status: "ACTIVE" as const, daysEnd: 28, med: "VALID" as const },
      { first: "Rodrigo", last: "De Paul", dni: "39555666", phone: "1177665544", status: "ACTIVE" as const, daysEnd: 15, med: "PENDING_REVIEW" as const },
      { first: "Lautaro", last: "Martinez", dni: "41666777", phone: "1166554433", status: "DEBTOR" as const, daysEnd: -5, med: "VALID" as const }, // Debtor
      { first: "Angel", last: "Di Maria", dni: "34777888", phone: "1155443322", status: "ACTIVE" as const, daysEnd: 18, med: "VALID" as const },
      { first: "Alexis", last: "Mac Allister", dni: "43888999", phone: "1144332211", status: "ACTIVE" as const, daysEnd: 1, med: "VALID" as const }, // Warning
      { first: "Emiliano", last: "Martinez", dni: "37999000", phone: "1133221199", status: "ACTIVE" as const, daysEnd: 24, med: "VALID" as const },
      { first: "Cristian", last: "Romero", dni: "40000111", phone: "1122110088", status: "DEBTOR" as const, daysEnd: -12, med: "EXPIRED" as const },
      { first: "Nahuel", last: "Molina", dni: "41111222", phone: "1111009977", status: "ACTIVE" as const, daysEnd: 14, med: "VALID" as const },
      { first: "Nicolas", last: "Otamendi", dni: "35222333", phone: "1100998866", status: "ACTIVE" as const, daysEnd: 9, med: "VALID" as const },
    ];

    let createdCount = 0;
    // FIX: antes, sin branchId se inventaba un UUID inexistente y las asistencias
    // fallaban por FK. Ahora se usa una sede real del tenant (o se crea una).
    let effectiveBranchId: string | undefined;
    if (requestedBranchId) {
      const b = await db.query.branches.findFirst({
        where: and(eq(branches.id, requestedBranchId), eq(branches.tenantId, tenantId)),
      });
      effectiveBranchId = b?.id;
    }
    if (!effectiveBranchId) {
      const firstBranch = await db.query.branches.findFirst({ where: eq(branches.tenantId, tenantId) });
      effectiveBranchId = firstBranch?.id;
    }
    if (!effectiveBranchId) {
      effectiveBranchId = generateUUIDv7();
      await db.insert(branches).values({
        id: effectiveBranchId,
        tenantId,
        name: "Sede Central",
        address: "Sin dirección",
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    for (let i = 0; i < demoMembers.length; i++) {
      const dm = demoMembers[i];
      const dniBlindIndex = generateBlindIndex(dm.dni);

      const existingUser = await db.query.users.findFirst({
        where: and(eq(users.tenantId, tenantId), eq(users.dniBlindIndex, dniBlindIndex)),
      });

      let userId = existingUser?.id;

      if (!existingUser) {
        userId = generateUUIDv7();
        await db.insert(users).values({
          id: userId,
          tenantId,
          dni: dm.dni,
          dniBlindIndex,
          email: `${dm.first.toLowerCase()}.${dm.last.toLowerCase()}@demo.com`,
          phone: dm.phone,
          passwordHash: defaultPasswordHash,
          firstName: dm.first,
          lastName: dm.last,
          role: "SOCIO",
          status: dm.status,
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        // Ficha Médica
        await db.insert(medicalRecords).values({
          id: generateUUIDv7(),
          tenantId,
          userId,
          medicalClearanceStatus: dm.med,
          clearanceExpiryDate: dm.med === "VALID" ? helperAddDays(120) : helperAddDays(-10),
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        // Suscripción
        const planId = createdPlanIds[i % createdPlanIds.length];
        const subId = generateUUIDv7();
        const subEndDate = helperAddDays(dm.daysEnd);

        await db.insert(subscriptions).values({
          id: subId,
          tenantId,
          userId,
          planId,
          status: dm.status === "DEBTOR" ? "PAST_DUE_SUSPENDED" : dm.daysEnd <= 3 ? "ACTIVE" : "ACTIVE",
          startDate: helperAddDays(-20),
          endDate: subEndDate,
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        // Factura
        const invoiceId = generateUUIDv7();
        const planPrice = plansData[i % plansData.length].price;
        const isPaid = dm.status !== "DEBTOR";

        await db.insert(invoices).values({
          id: invoiceId,
          tenantId,
          userId,
          subscriptionId: subId,
          invoiceNumber: `FAC-DEMO-${(1000 + i).toString()}`,
          totalAmount: planPrice,
          paidAmount: isPaid ? planPrice : 0,
          status: isPaid ? "PAID" : "PENDING",
          dueDate: subEndDate,
          issuedAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        // Registrar el cobro real para que los reportes (cobrado en 30 días) reflejen la demo
        if (isPaid) {
          await db.insert(paymentTransactions).values({
            id: generateUUIDv7(),
            tenantId,
            invoiceId,
            amount: planPrice,
            paymentMethod: i % 2 === 0 ? "CASH" : "MERCADO_PAGO_QR",
            status: "APPROVED",
            createdAt: new Date(now.getTime() - (i % 20) * 86_400_000).toISOString(),
          });
        }

        createdCount++;
      }

      // 4. Generar Asistencias distribuidas en los últimos 7 días (para nutrir el Heatmap BI)
      if (userId) {
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const peakHour = 18 + (i % 4); // Entre las 18 y 21 hs (pico realista)
          // Hora pico en horario de Argentina (UTC-3) expresada en UTC
          const checkInDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
          checkInDate.setUTCHours(peakHour + 3, Math.floor(Math.random() * 59), 0, 0);

          await db.insert(attendances).values({
            id: generateUUIDv7(),
            tenantId,
            branchId: effectiveBranchId,
            userId,
            accessMethod: "DNI_KEYPAD",
            accessStatus: dm.status === "DEBTOR" ? "DENIED_RED" : dm.daysEnd <= 3 ? "WARNING_YELLOW" : "GRANTED_GREEN",
            checkInAt: checkInDate.toISOString(),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `¡Gimnasio de demostración inicializado con éxito! Se cargaron ${createdCount} socios, planes, facturas y asistencias para el mapa de calor.`,
    });
  } catch (error: any) {
    console.error("Error en seed-demo:", error);
    return NextResponse.json(
      { success: false, error: "Error al inicializar datos demo" },
      { status: 500 }
    );
  }
}
