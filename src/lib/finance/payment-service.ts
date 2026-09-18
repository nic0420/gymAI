import { db } from "@/db";
import {
  invoices,
  paymentTransactions,
  subscriptions,
  cashMovements,
  membershipPlans,
} from "@/db/schema";
import { generateUUIDv7 } from "@/lib/security/uuid";
import { eq } from "drizzle-orm";
import { ProcessPaymentInput } from "@/lib/validations/finance";

export interface PaymentProcessingResult {
  invoiceId: string;
  invoiceStatus: "DRAFT" | "PENDING" | "PARTIALLY_PAID" | "PAID" | "VOIDED";
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  transactions: {
    id: string;
    amount: number;
    paymentMethod: string;
    status: string;
  }[];
  subscriptionActivated: boolean;
  newSubscriptionEndDate?: string;
}

/**
 * Servicio de Procesamiento de Pagos y Split Payments
 * Garantiza integridad contable y actualiza automáticamente la suscripción del socio.
 */
export async function processPaymentTransaction(
  input: ProcessPaymentInput
): Promise<PaymentProcessingResult> {
  const { tenantId, invoiceId, cashShiftId, processedByUserId, splits } = input;

  // 1. Obtener la factura
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  });

  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND");
  }

  if (invoice.status === "PAID" || invoice.status === "VOIDED") {
    throw new Error(`INVOICE_ALREADY_${invoice.status}`);
  }

  const nowIso = new Date().toISOString();
  let totalSplitsAmount = 0;
  const createdTransactions: any[] = [];

  // 2. Registrar cada transacción de pago (Payment Split) en el ledger inmutable
  for (const split of splits) {
    const transactionId = generateUUIDv7();
    totalSplitsAmount += split.amount;

    await db.insert(paymentTransactions).values({
      id: transactionId,
      tenantId,
      invoiceId,
      cashShiftId: split.paymentMethod === "CASH" ? cashShiftId : null,
      amount: split.amount,
      paymentMethod: split.paymentMethod,
      gatewayReference: split.gatewayReference || null,
      status: "APPROVED",
      processedByUserId: processedByUserId || null,
      createdAt: nowIso,
    });

    // Si el pago es en efectivo y hay una caja abierta, impactar como movimiento de ingreso
    if (split.paymentMethod === "CASH" && cashShiftId) {
      await db.insert(cashMovements).values({
        id: generateUUIDv7(),
        tenantId,
        cashShiftId,
        type: "INCOME",
        category: "COBRO_CUOTA",
        amount: split.amount,
        description: `Cobro en efectivo - Factura ${invoice.invoiceNumber}`,
        registeredByUserId: processedByUserId || invoice.userId,
        createdAt: nowIso,
      });
    }

    createdTransactions.push({
      id: transactionId,
      amount: split.amount,
      paymentMethod: split.paymentMethod,
      status: "APPROVED",
    });
  }

  // 3. Recalcular el estado de la factura
  const updatedPaidAmount = invoice.paidAmount + totalSplitsAmount;
  const remainingAmount = Math.max(0, invoice.totalAmount - updatedPaidAmount);
  const newInvoiceStatus =
    remainingAmount === 0 ? "PAID" : "PARTIALLY_PAID";

  await db
    .update(invoices)
    .set({
      paidAmount: updatedPaidAmount,
      status: newInvoiceStatus,
      updatedAt: nowIso,
    })
    .where(eq(invoices.id, invoiceId));

  let subscriptionActivated = false;
  let newSubscriptionEndDate: string | undefined;

  // 4. Si la factura quedó 100% saldada (PAID) y está ligada a una suscripción -> ACTIVAR
  if (newInvoiceStatus === "PAID" && invoice.subscriptionId) {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, invoice.subscriptionId),
    });

    if (subscription) {
      const plan = await db.query.membershipPlans.findFirst({
        where: eq(membershipPlans.id, subscription.planId),
      });

      const durationDays = plan?.durationDays || 30;

      // Calcular nueva fecha de fin
      const baseDate = new Date();
      const currentEnd = new Date(subscription.endDate);
      const startDateCalculated = currentEnd > baseDate ? currentEnd : baseDate;
      const newEndDateObj = new Date(startDateCalculated.getTime() + durationDays * 24 * 60 * 60 * 1000);
      newSubscriptionEndDate = newEndDateObj.toISOString().split("T")[0];

      await db
        .update(subscriptions)
        .set({
          status: "ACTIVE",
          endDate: newSubscriptionEndDate,
          updatedAt: nowIso,
        })
        .where(eq(subscriptions.id, subscription.id));

      subscriptionActivated = true;
    }
  }

  return {
    invoiceId,
    invoiceStatus: newInvoiceStatus,
    totalAmount: invoice.totalAmount,
    paidAmount: updatedPaidAmount,
    remainingAmount,
    transactions: createdTransactions,
    subscriptionActivated,
    newSubscriptionEndDate,
  };
}
