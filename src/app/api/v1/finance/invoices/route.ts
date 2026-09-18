import { NextRequest, NextResponse } from "next/server";
import { CreateInvoiceSchema } from "@/lib/validations/finance";
import { db } from "@/db";
import { invoices, users, subscriptions } from "@/db/schema";
import { generateUUIDv7 } from "@/lib/security/uuid";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    if (!tenantId) {
      return NextResponse.json(
        { error: "MISSING_TENANT", message: "tenantId es requerido" },
        { status: 400 }
      );
    }

    let conditions = [eq(invoices.tenantId, tenantId)];
    if (userId) conditions.push(eq(invoices.userId, userId));
    if (status) conditions.push(eq(invoices.status, status as any));

    const invoiceList = await db.query.invoices.findMany({
      where: and(...conditions),
      orderBy: [desc(invoices.createdAt)],
      limit: 100,
    });

    return NextResponse.json({
      success: true,
      data: invoiceList,
      total: invoiceList.length,
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
    const body = await req.json();
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
