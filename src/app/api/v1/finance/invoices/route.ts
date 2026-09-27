import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertSameTenant } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS } from "@/lib/auth/rbac";
import { CreateInvoiceSchema } from "@/lib/validations/finance";
import { db } from "@/db";
import { invoices, users, subscriptions } from "@/db/schema";
import { generateUUIDv7 } from "@/lib/security/uuid";
import { eq, and, desc, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.PAYMENTS_READ);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const { searchParams } = new URL(req.url);
    const mismatch = assertSameTenant(ctx, searchParams.get("tenantId"));
    if (mismatch) return mismatch;
    const tenantId = ctx.tenantId;
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    let conditions = [eq(invoices.tenantId, tenantId)];
    if (userId) conditions.push(eq(invoices.userId, userId));
    if (status) conditions.push(eq(invoices.status, status as any));

    const invoiceList = await db.query.invoices.findMany({
      where: and(...conditions),
      orderBy: [desc(invoices.createdAt)],
      limit: 100,
    });

    // Enriquecer con datos del socio (nombre/teléfono) para cobranza y WhatsApp
    const userIds = Array.from(new Set(invoiceList.map((i) => i.userId)));
    const members = userIds.length
      ? await db.query.users.findMany({
          where: and(eq(users.tenantId, tenantId), inArray(users.id, userIds)),
          columns: { id: true, firstName: true, lastName: true, phone: true },
        })
      : [];
    const byId = new Map(members.map((m) => [m.id, m]));

    const data = invoiceList.map((inv) => {
      const m = byId.get(inv.userId);
      return {
        ...inv,
        memberName: m ? `${m.firstName} ${m.lastName}` : "Socio",
        memberFirstName: m?.firstName || "Socio",
        memberPhone: m?.phone || null,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    });
  } catch (error: any) {
    console.error("Error al obtener facturas:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al consultar facturas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.PAYMENTS_WRITE);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const body = await req.json();
    const mismatch = assertSameTenant(ctx, body?.tenantId);
    if (mismatch) return mismatch;
    body.tenantId = ctx.tenantId;
    const validated = CreateInvoiceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Datos de factura inválidos",
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const { tenantId, userId, subscriptionId, invoiceNumber, totalAmount, dueDate } = validated.data;
    // El socio (y la suscripción, si se indica) deben pertenecer al mismo gimnasio
    const member = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.tenantId, tenantId)),
    });
    if (!member) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Socio no encontrado" }, { status: 404 });
    }
    if (subscriptionId) {
      const sub = await db.query.subscriptions.findFirst({
        where: and(eq(subscriptions.id, subscriptionId), eq(subscriptions.tenantId, tenantId), eq(subscriptions.userId, userId)),
      });
      if (!sub) {
        return NextResponse.json({ error: "NOT_FOUND", message: "Suscripción no encontrada para este socio" }, { status: 404 });
      }
    }

    const invoiceId = generateUUIDv7();
    const nowIso = new Date().toISOString();

    await db.insert(invoices).values({
      id: invoiceId,
      tenantId,
      userId,
      subscriptionId: subscriptionId || null,
      invoiceNumber,
      totalAmount,
      paidAmount: 0,
      status: "PENDING",
      dueDate,
      issuedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Factura emitida con éxito",
        data: {
          invoiceId,
          invoiceNumber,
          totalAmount,
          status: "PENDING",
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al crear factura:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al emitir factura" },
      { status: 500 }
    );
  }
}
