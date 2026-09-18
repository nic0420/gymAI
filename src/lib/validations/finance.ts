import { z } from "zod";

/**
 * Esquema para Creación de Factura / Obligación de Cobro
 */
export const CreateInvoiceSchema = z.object({
  tenantId: z.string({ required_error: "tenantId es obligatorio" }),
  userId: z.string({ required_error: "userId es obligatorio" }),
  subscriptionId: z.string().optional(),
  invoiceNumber: z.string({ required_error: "invoiceNumber es obligatorio" }),
  totalAmount: z.number().positive("El monto total debe ser mayor a 0"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

/**
 * Esquema para Transacción de Pago Individual o Split
 */
export const PaymentSplitItemSchema = z.object({
  amount: z.number().positive("El importe del pago debe ser mayor a 0"),
  paymentMethod: z.enum([
    "CASH",
    "CREDIT_CARD",
    "DEBIT_CARD",
    "MERCADO_PAGO_QR",
    "STRIPE",
    "BANK_TRANSFER",
  ]),
  gatewayReference: z.string().optional(),
});

export const ProcessPaymentSchema = z.object({
  tenantId: z.string({ required_error: "tenantId es obligatorio" }),
  invoiceId: z.string({ required_error: "invoiceId es obligatorio" }),
  cashShiftId: z.string().optional(), // Obligatorio si alguno de los pagos es en CASH
  processedByUserId: z.string().optional(),
  splits: z.array(PaymentSplitItemSchema).min(1, "Debe incluir al menos un método de pago"),
});

export type ProcessPaymentInput = z.infer<typeof ProcessPaymentSchema>;

/**
 * Esquemas para Apertura y Cierre Ciego de Caja Diaria
 */
export const OpenCashShiftSchema = z.object({
  tenantId: z.string({ required_error: "tenantId es obligatorio" }),
  branchId: z.string({ required_error: "branchId es obligatorio" }),
  openedByUserId: z.string({ required_error: "openedByUserId es obligatorio" }),
  initialCash: z.number().min(0, "El fondo inicial no puede ser negativo"),
  notes: z.string().optional(),
});

export type OpenCashShiftInput = z.infer<typeof OpenCashShiftSchema>;

export const CloseCashShiftSchema = z.object({
  cashShiftId: z.string({ required_error: "cashShiftId es obligatorio" }),
  closedByUserId: z.string({ required_error: "closedByUserId es obligatorio" }),
  declaredCash: z.number().min(0, "El efectivo declarado no puede ser negativo"), // Cierre ciego
  notes: z.string().optional(),
});

export type CloseCashShiftInput = z.infer<typeof CloseCashShiftSchema>;

/**
 * Esquema para Registro de Movimiento de Caja (Ingreso / Egreso Menor)
 */
export const CreateCashMovementSchema = z.object({
  tenantId: z.string({ required_error: "tenantId es obligatorio" }),
  cashShiftId: z.string({ required_error: "cashShiftId es obligatorio" }),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string({ required_error: "La categoría es obligatoria" }), // "INSUMOS_LIMPIEZA", "FLETE", "BEBIDA", etc.
  amount: z.number().positive("El monto debe ser mayor a 0"),
  description: z.string().min(3, "La descripción debe tener al menos 3 caracteres"),
  receiptUrl: z.string().url().optional().or(z.literal("")),
  registeredByUserId: z.string({ required_error: "registeredByUserId es obligatorio" }),
});

export type CreateCashMovementInput = z.infer<typeof CreateCashMovementSchema>;
