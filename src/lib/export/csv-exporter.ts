/**
 * Utilidad para Exportación de Datos a CSV / Excel
 * Compatible con Microsoft Excel, Google Sheets y LibreOffice (con UTF-8 BOM).
 */

/**
 * Escapa una celda CSV.
 * FIX: antes se envolvía en comillas sin escapar las comillas internas (un apellido como
 * O"Brien rompía todas las columnas) y no se neutralizaba la "inyección de fórmulas":
 * un socio registrado como =HYPERLINK(...) o =cmd|... se ejecutaba al abrir el Excel.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : '""';
  let str = String(value);
  const isPlainPhoneOrNumber = /^[+-]?[\d\s().-]+$/.test(str);
  if (/^[=+\-@\t\r]/.test(str) && !isPlainPhoneOrNumber) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
}

function downloadCsvFile(csvContent: string, filename: string) {
  // UTF-8 BOM para que Excel abra acentos y caracteres especiales sin distorsión
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Liberar memoria del Blob (antes nunca se revocaba la URL)
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exporta el padrón completo de socios a CSV
 */
export function exportMembersToCsv(members: any[], filename = "padron_socios_gymai.csv") {
  const headers = ["DNI", "Nombre", "Apellido", "Email", "Teléfono", "Rol", "Estado", "Fecha Alta"];
  const rows = members.map((m) => [
    csvCell(m.dni || ""),
    csvCell(m.firstName || ""),
    csvCell(m.lastName || ""),
    csvCell(m.email || ""),
    csvCell(m.phone || ""),
    csvCell(m.role || "SOCIO"),
    csvCell(m.status || "ACTIVE"),
    csvCell(m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""),
  ]);

  const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
  downloadCsvFile(csv, filename);
}

/**
 * Exporta las facturas y obligaciones de cobro a CSV
 */
export function exportInvoicesToCsv(invoices: any[], filename = "facturacion_cobros_gymai.csv") {
  const headers = ["Comprobante", "Monto Total", "Monto Cobrado", "Saldo Pendiente", "Estado", "Vencimiento", "Fecha Emisión"];
  const rows = invoices.map((inv) => {
    const remaining = (inv.totalAmount || 0) - (inv.paidAmount || 0);
    return [
      csvCell(inv.invoiceNumber || ""),
      inv.totalAmount || 0,
      inv.paidAmount || 0,
      remaining,
      csvCell(inv.status || "PENDING"),
      csvCell(inv.dueDate || ""),
      csvCell(inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString() : ""),
    ];
  });

  const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
  downloadCsvFile(csv, filename);
}

/**
 * Exporta movimientos y arqueo de caja a CSV
 */
export function exportCashMovementsToCsv(movements: any[], summary?: any, filename = "caja_movimientos_gymai.csv") {
  const headers = ["Fecha / Hora", "Tipo", "Categoría", "Monto", "Descripción", "Usuario"];
  const rows = movements.map((m) => [
    csvCell(m.createdAt ? new Date(m.createdAt).toLocaleString() : ""),
    csvCell(m.type === "INCOME" ? "INGRESO" : "EGRESO"),
    csvCell(m.category || ""),
    m.amount || 0,
    csvCell(m.description || ""),
    csvCell(m.registeredByUserId || "Recepción"),
  ]);

  if (summary) {
    rows.push([]);
    rows.push([csvCell("--- RESUMEN DE ARQUEO ---")]);
    rows.push([`"Fondo Inicial"`, summary.initialCash || 0]);
    rows.push([`"Total Ingresos Efectivo"`, summary.totalCashIncomes || 0]);
    rows.push([`"Total Egresos Efectivo"`, summary.totalCashExpenses || 0]);
    rows.push([`"Saldo Teórico Sistema"`, summary.systemExpectedCash || 0]);
    rows.push([`"Efectivo Declarado a Ciegas"`, summary.declaredCash || 0]);
    rows.push([`"Diferencia Arqueo"`, summary.differenceCash || 0]);
  }

  const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
  downloadCsvFile(csv, filename);
}
