/**
 * Generador de Enlaces de WhatsApp para Notificaciones y Cobros de Gimnasio
 * Diseñado para Argentina y LATAM con soporte de Alias/CVU y plantillas amigables.
 */

export interface WhatsAppMessageParams {
  phone?: string | null;
  memberName: string;
  gymName?: string;
  type: "DEBT_REMINDER" | "DUE_SOON" | "PAYMENT_RECEIPT" | "MEDICAL_PENDING";
  amount?: number;
  dueDate?: string;
  alias?: string;
  cvu?: string;
  planName?: string;
  receiptNumber?: string;
}

/**
 * Normaliza teléfonos argentinos al formato internacional de WhatsApp (549 + área + número).
 * FIX: no se contemplaba el prefijo "15" de celulares (ej. "011 15 4455-6677") ni números
 * que ya venían con "54" pero sin el "9" de móvil, generando links a números inexistentes.
 */
export function normalizeArgentinePhone(phone?: string | null): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("54")) {
    digits = digits.slice(2);
    if (digits.startsWith("9")) digits = digits.slice(1);
  }
  if (digits.startsWith("0")) digits = digits.slice(1);
  // Quitar el "15" de celular que va después del código de área (2 a 4 dígitos)
  if (digits.length === 12) {
    for (const areaLen of [2, 3, 4]) {
      if (digits.substring(areaLen, areaLen + 2) === "15") {
        digits = digits.substring(0, areaLen) + digits.substring(areaLen + 2);
        break;
      }
    }
  }
  return digits.length === 10 ? `549${digits}` : digits;
}

export function generateWhatsAppLink(params: WhatsAppMessageParams): string {
  const gym = params.gymName || "Gimnasio";
  // FIX: antes, si el gimnasio no configuraba alias/CVU, se usaban por defecto los datos
  // bancarios PERSONALES del desarrollador: los socios de cualquier gimnasio cliente
  // recibían instrucciones para transferirle a esa cuenta. Ahora, sin datos configurados,
  // el mensaje pide coordinar el pago en recepción.
  const alias = params.alias || process.env.NEXT_PUBLIC_GYM_PAYMENT_ALIAS || "";
  const cvu = params.cvu || process.env.NEXT_PUBLIC_GYM_PAYMENT_CVU || "";
  const paymentLines =
    alias || cvu
      ? (alias ? `• *Alias:* \`${alias}\`\n` : "") + (cvu ? `• *CVU:* \`${cvu}\`\n` : "")
      : "• Consultá los medios de pago en recepción\n";
  const amountStr = params.amount ? `$${params.amount.toLocaleString("es-AR")}` : "tu cuota";

  let message = "";

  switch (params.type) {
    case "DEBT_REMINDER":
      message =
        `Hola ${params.memberName}! 👋 Te escribimos desde *${gym}*.\n\n` +
        `Te recordamos que tu membresía se encuentra *vencida* (${params.dueDate ? `venció el ${params.dueDate}` : "saldo pendiente de " + amountStr}).\n\n` +
        `💳 Podés abonar por transferencia para ingresar sin demoras en recepción:\n` +
        paymentLines +
        `\n` +
        `Enviános el comprobante por acá una vez realizado. ¡Te esperamos para entrenar! 💪`;
      break;

    case "DUE_SOON":
      message =
        `Hola ${params.memberName}! 👋 Desde *${gym}* te avisamos que tu cuota ${params.planName ? `(${params.planName})` : ""} *está próxima a vencer* el ${params.dueDate || "estos días"}.\n\n` +
        `Para renovar tu pase sin filas podés transferir a:\n` +
        paymentLines +
        `\n` +
        `¡Muchas gracias por entrenar con nosotros! 🏋️`;
      break;

    case "PAYMENT_RECEIPT":
      message =
        `Hola ${params.memberName}! ✅ Confirmamos la recepción de tu pago de *${amountStr}* en *${gym}*.\n\n` +
        `📄 *Comprobante:* ${params.receiptNumber || "Digital"}\n` +
        `📅 *Vigencia hasta:* ${params.dueDate || "próximo mes"}\n\n` +
        `¡Tu pase está 100% activo en el molinete y recepción! Buen entrenamiento 🔥`;
      break;

    case "MEDICAL_PENDING":
      message =
        `Hola ${params.memberName}! 🩺 Te recordamos desde *${gym}* que tenés pendiente la entrega o renovación de tu *Apto Físico / Certificado Médico*.\n\n` +
        `Por favor acercalo a recepción en tu próxima visita para mantener tu acceso habilitado. ¡Cuidamos tu salud! 🛡️`;
      break;
  }

  // Sanitizar teléfono (remover espacios, guiones, paréntesis)
  const cleanPhone = normalizeArgentinePhone(params.phone);

  const encodedText = encodeURIComponent(message);
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
}
