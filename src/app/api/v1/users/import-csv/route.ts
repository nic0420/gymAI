import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, subscriptions, medicalRecords, membershipPlans, invoices } from "@/db/schema";
import { generateBlindIndex } from "@/lib/security/encryption";
import { hashPassword } from "@/lib/security/hash";
import { generateUUIDv7 } from "@/lib/security/uuid";
import { eq, and } from "drizzle-orm";

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
    const body = await req.json();
    const { tenantId, branchId, members } = body as {
      tenantId: string;
      branchId?: string;
      members: ImportMemberItem[];
    };

    if (!tenantId || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { success: false, error: "tenantId y array de socios son obligatorios" },
        { status: 400 }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const todayStr = nowIso.split("T")[0];
    const defaultPasswordHash = await hashPassword("Socio1234!");

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const item of members) {
      const rawDni = (item.dni || "").toString().trim();
      const firstName = (item.firstName || "").trim();
      const lastName = (item.lastName || "").trim();

      if (!rawDni || !firstName || !lastName) {
        skippedCount++;
        errors.push(`Fila con datos incompletos (DNI: ${rawDni || "vacio"}, Nombre: ${firstName || "vacio"})`);
        continue;
      }

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
        new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

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
      const planPrice = item.price || 25000;

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
      const subEndDate = new Date(now.getTime() + (plan?.durationDays || 30) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

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
        invoiceNumber: `FAC-IMP-${Date.now().toString().slice(-6)}-${importedCount + 1}`,
        totalAmount: planPrice,
        paidAmount: isPaid ? planPrice : 0,
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
