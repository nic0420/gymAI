import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getLocalDateString, addDaysToDateString } from "@/lib/time/dates";
import { db } from "@/db";
import { users, subscriptions, medicalRecords, membershipPlans, invoices } from "@/db/schema";
import { generateBlindIndex } from "@/lib/security/encryption";
import { hashPassword } from "@/lib/security/hash";
import { generateUUIDv7 } from "@/lib/security/uuid";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, assertSameTenant } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS } from "@/lib/auth/rbac";

const MAX_ROWS = 2000;

/**
 * FIX: antes no había validación: un CSV con estado "Activo" o "moroso" insertaba valores
 * fuera del enum en la BD, y un DNI con letras/puntos generaba duplicados "invisibles".
 */
const ImportRowSchema = z.object({
  dni: z.coerce.string().transform((v) => v.replace(/[.\s-]/g, "")).pipe(z.string().regex(/^\d{6,12}$/, "DNI inválido")),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().optional(),
  phone: z.coerce.string().trim().optional(),
  planName: z.string().trim().optional(),
  durationDays: z.coerce.number().int().positive().max(3650).optional(),
  price: z.coerce.number().nonnegative().optional(),
  status: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => (v === "" ? "ACTIVE" : v))
    .pipe(z.enum(["ACTIVE", "DEBTOR", "INACTIVE"]))
    .optional(),
  medicalClearanceStatus: z.enum(["VALID", "PENDING_REVIEW", "EXPIRED", "REJECTED"]).optional(),
  clearanceExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

interface ImportMemberItem {
  dni: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  planName?: string;
  durationDays?: number;
  price?: number;
  status?: "ACTIVE" | "DEBTOR" | "INACTIVE";
  medicalClearanceStatus?: "VALID" | "PENDING_REVIEW" | "EXPIRED" | "REJECTED";
  clearanceExpiryDate?: string;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.USERS_WRITE);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;

    const body = await req.json();
    const mismatch = assertSameTenant(ctx, body?.tenantId);
    if (mismatch) return mismatch;
    const tenantId = ctx.tenantId;
    const members = body?.members as ImportMemberItem[];

    if (Array.isArray(members) && members.length > MAX_ROWS) {
      return NextResponse.json(
        { success: false, error: `Máximo ${MAX_ROWS} socios por importación` },
        { status: 413 }
      );
    }

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { success: false, error: "tenantId y array de socios son obligatorios" },
        { status: 400 }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const todayStr = getLocalDateString(now);
    // Contraseña inicial aleatoria por importación (antes: "Socio1234!" fija y conocida para TODOS los socios)
    const defaultPasswordHash = await hashPassword(crypto.randomBytes(18).toString("base64url"));

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    const seenInFile = new Set<string>();

    for (const [index, rawItem] of members.entries()) {
      const parsed = ImportRowSchema.safeParse(rawItem);
      if (!parsed.success) {
        skippedCount++;
        const firstIssue = parsed.error.issues[0];
        errors.push(
          `Fila ${index + 1}: ${firstIssue?.path.join(".") || "dato"} inválido (${firstIssue?.message || "formato"})`
        );
        continue;
      }
      const item = parsed.data;
      const rawDni = item.dni;
      const firstName = item.firstName;
      const lastName = item.lastName;

      // DNI repetido dentro del mismo archivo
      if (seenInFile.has(rawDni)) {
        skippedCount++;
        errors.push(`Fila ${index + 1}: DNI ${rawDni} repetido en el archivo`);
        continue;
      }
      seenInFile.add(rawDni);

      const dniBlindIndex = generateBlindIndex(rawDni);

      // Verificar si ya existe en este tenant
      const existing = await db.query.users.findFirst({
        where: and(
          eq(users.tenantId, tenantId),
          eq(users.dniBlindIndex, dniBlindIndex)
        ),
      });

      if (existing) {
        skippedCount++;
        continue; // Ignorar duplicados de forma idempotente
      }

      const userId = generateUUIDv7();
      const email =
        item.email && item.email.includes("@")
          ? item.email.trim().toLowerCase()
          : `socio.${rawDni}@gym.local`;

      // 1. Insertar Usuario
      await db.insert(users).values({
        id: userId,
        tenantId,
        dni: rawDni,
        dniBlindIndex,
        email,
        phone: item.phone ? item.phone.trim() : null,
        passwordHash: defaultPasswordHash,
        firstName,
        lastName,
        role: "SOCIO",
        status: item.status || "ACTIVE",
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      // 2. Insertar Ficha Médica
      const medStatus = item.medicalClearanceStatus || "VALID";
      const medExpiry =
        item.clearanceExpiryDate ||
        addDaysToDateString(todayStr, 180);

      await db.insert(medicalRecords).values({
        id: generateUUIDv7(),
        tenantId,
        userId,
        medicalClearanceStatus: medStatus,
        clearanceExpiryDate: medExpiry,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      // 3. Crear o asociar Plan de Membresía
      const planName = item.planName || "Pase Libre Mensual";
      const planDuration = item.durationDays || 30;
      const planPrice = item.price ?? 25000;

      let plan = await db.query.membershipPlans.findFirst({
        where: and(
          eq(membershipPlans.tenantId, tenantId),
          eq(membershipPlans.name, planName)
        ),
      });

      if (!plan) {
        const planId = generateUUIDv7();
        await db.insert(membershipPlans).values({
          id: planId,
          tenantId,
          name: planName,
          price: planPrice,
          durationDays: planDuration,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        plan = { id: planId, tenantId, name: planName, price: planPrice, durationDays: planDuration } as any;
      }

      // 4. Crear Suscripción
      const subscriptionId = generateUUIDv7();
      const subEndDate = addDaysToDateString(todayStr, plan?.durationDays || 30);

      await db.insert(subscriptions).values({
        id: subscriptionId,
        tenantId,
        userId,
        planId: plan!.id,
        status: item.status === "DEBTOR" ? "PAST_DUE_SUSPENDED" : "ACTIVE",
        startDate: todayStr,
        endDate: subEndDate,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      // 5. Crear Factura
      const invoiceId = generateUUIDv7();
      const isPaid = item.status !== "DEBTOR";
      await db.insert(invoices).values({
        id: invoiceId,
        tenantId,
        userId,
        subscriptionId,
        invoiceNumber: `FAC-IMP-${subscriptionId.slice(-12).toUpperCase()}`,
        // FIX: se usa el precio real del plan (antes, si el plan ya existía con otro precio,
        // la factura salía con el precio del CSV o el default $25.000)
        totalAmount: plan!.price,
        paidAmount: isPaid ? plan!.price : 0,
        status: isPaid ? "PAID" : "PENDING",
        dueDate: subEndDate,
        issuedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      data: {
        importedCount,
        skippedCount,
        totalProcessed: members.length,
        errors,
      },
    });
  } catch (error: any) {
    console.error("Error en importación masiva de socios:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar la importación masiva" },
      { status: 500 }
    );
  }
}
