import { db } from "@/db";
import {
  invoices,
  paymentTransactions,
  subscriptions,
  cashMovements,
  cashShifts,
  membershipPlans,
} from "@/db/schema";
import { generateUUIDv7 } from "@/lib/security/uuid";
import { and, eq } from "drizzle-orm";
import { ProcessPaymentInput } from "@/lib/validations/finance";
import { addDaysToDateString, getLocalDateString } from "@/lib/time/dates";

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

/** Errores de negocio conocidos -> status HTTP y mensaje para el usuario. */
export const PAYMENT_ERROR_MESSAGES: Record<string, { status: number; message: string }> = {
  INVOICE_NOT_FOUND: { status: 404, message: "Factura no encontrada" },
  INVOICE_ALREADY_PAID: { status: 409, message: "La factura ya está totalmente cobrada" },
  INVOICE_ALREADY_VOIDED: { status: 409, message: "La factura está anulada" },
  PAYMENT_EXCEEDS_BALANCE: { status: 400, message: "El monto cobrado supera el saldo pendiente de la factura" },
  CASH_SHIFT_REQUIRED: { status: 409, message: "Para cobrar en efectivo primero debes abrir la caja del día" },
  CASH_SHIFT_NOT_FOUND_OR_CLOSED: { status: 409, message: "La caja indicada no existe o ya fue cerrada" },
};

/** Redondeo a centavos para evitar errores de coma flotante (0.1 + 0.2 !== 0.3). */
const toCents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;

/**
 * Servicio de Procesamiento de Pagos y Split Payments
 * Garantiza integridad contable y actualiza automáticamente la suscripción del socio.
 *
 * FIXES:
 * - Todo el cobro se ejecuta en UNA transacción (antes, un fallo a mitad dejaba
 *   transacciones registradas sin actualizar la factura, o viceversa).
 * - La factura debe pertenecer al tenant que cobra (antes se podía cobrar/alterar
 *   facturas de otro gimnasio).
 * - Se rechaza el sobrepago (antes paidAmount podía superar totalAmount).
 * - Un cobro en efectivo exige una caja ABIERTA del mismo tenant (antes el efectivo
 *   no impactaba en la caja si faltaba cashShiftId, o impactaba en una caja CERRADA,
 *   rompiendo el arqueo ciego).
 */
export async function processPaymentTransaction(
  input: ProcessPaymentInput
): Promise<PaymentProcessingResult> {
  const { tenantId, invoiceId, cashShiftId, processedByUserId, splits } = input;

  return db.transaction(async (tx) => {
    // 1. Obtener la factura (acotada al tenant)
    const invoice = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
      .get();

    if (!invoice) {
      throw new Error("INVOICE_NOT_FOUND");
    }

    if (invoice.status === "PAID" || invoice.status === "VOIDED") {
      throw new Error(`INVOICE_ALREADY_${invoice.status}`);
    }

    const remainingBeforeCents = toCents(invoice.totalAmount) - toCents(invoice.paidAmount);
    const totalSplitsCents = splits.reduce((acc, s) => acc + toCents(s.amount), 0);

    if (totalSplitsCents > remainingBeforeCents) {
      throw new Error("PAYMENT_EXCEEDS_BALANCE");
    }

    const hasCash = splits.some((s) => s.paymentMethod === "CASH");
    if (hasCash) {
      if (!cashShiftId) throw new Error("CASH_SHIFT_REQUIRED");
      const shift = await tx
        .select()
        .from(cashShifts)
        .where(
          and(eq(cashShifts.id, cashShiftId), eq(cashShifts.tenantId, tenantId), eq(cashShifts.status, "OPEN"))
        )
        .get();
      if (!shift) throw new Error("CASH_SHIFT_NOT_FOUND_OR_CLOSED");
    }

    const nowIso = new Date().toISOString();
    const createdTransactions: PaymentProcessingResult["transactions"] = [];

    // 2. Registrar cada transacción de pago (Payment Split) en el ledger inmutable
    for (const split of splits) {
      const transactionId = generateUUIDv7();

      await tx.insert(paymentTransactions)
        .values({
          id: transactionId,
          tenantId,
          invoiceId,
          cashShiftId: split.paymentMethod === "CASH" ? cashShiftId! : null,
          amount: split.amount,
          paymentMethod: split.paymentMethod,
          gatewayReference: split.gatewayReference || null,
          status: "APPROVED",
          processedByUserId: processedByUserId || null,
          createdAt: nowIso,
        })
        .run();

      // Si el pago es en efectivo, impactar como movimiento de ingreso en la caja abierta
      if (split.paymentMethod === "CASH") {
        await tx.insert(cashMovements)
          .values({
            id: generateUUIDv7(),
            tenantId,
            cashShiftId: cashShiftId!,
            type: "INCOME",
            category: "COBRO_CUOTA",
            amount: split.amount,
            description: `Cobro en efectivo - Factura ${invoice.invoiceNumber}`,
            registeredByUserId: processedByUserId || invoice.userId,
            createdAt: nowIso,
          })
          .run();
      }

      createdTransactions.push({
        id: transactionId,
        amount: split.amount,
        paymentMethod: split.paymentMethod,
        status: "APPROVED",
      });
    }

    // 3. Recalcular el estado de la factura
    const updatedPaidAmount = fromCents(toCents(invoice.paidAmount) + totalSplitsCents);
    const remainingAmount = fromCents(Math.max(0, remainingBeforeCents - totalSplitsCents));
    const newInvoiceStatus = remainingAmount === 0 ? "PAID" : "PARTIALLY_PAID";

    await tx.update(invoices)
      .set({
        paidAmount: updatedPaidAmount,
        status: newInvoiceStatus,
        updatedAt: nowIso,
      })
      .where(eq(invoices.id, invoiceId))
      .run();

    let subscriptionActivated = false;
    let newSubscriptionEndDate: string | undefined;

    // 4. Si la factura quedó 100% saldada (PAID) y está ligada a una suscripción -> ACTIVAR
    if (newInvoiceStatus === "PAID" && invoice.subscriptionId) {
      const subscription = await tx
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.id, invoice.subscriptionId), eq(subscriptions.tenantId, tenantId)))
        .get();

      if (subscription) {
        const plan = await tx
          .select()
          .from(membershipPlans)
          .where(eq(membershipPlans.id, subscription.planId))
          .get();

        const durationDays = plan?.durationDays || 30;

        // Extiende desde el vencimiento actual si aún está vigente, o desde hoy (fecha local)
        const today = getLocalDateString();
        const base = subscription.endDate > today ? subscription.endDate : today;
        newSubscriptionEndDate = addDaysToDateString(base, durationDays);

        await tx.update(subscriptions)
          .set({
            status: "ACTIVE",
            endDate: newSubscriptionEndDate,
            updatedAt: nowIso,
          })
          .where(eq(subscriptions.id, subscription.id))
          .run();

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
    } as PaymentProcessingResult;
  });
}
