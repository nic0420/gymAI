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

export function generateWhatsAppLink(params: WhatsAppMessageParams): string {
  const gym = params.gymName || "Gimnasio";
  const alias = params.alias || "nico.adolfo.mp";
  const cvu = params.cvu || "0000003100004965726450";
  const amountStr = params.amount ? `$${params.amount.toLocaleString()}` : "tu cuota";

  let message = "";

  switch (params.type) {
    case "DEBT_REMINDER":
      message =
        `Hola ${params.memberName}! 👋 Te escribimos desde *${gym}*.\n\n` +
        `Te recordamos que tu membresía se encuentra *vencida* (${params.dueDate ? `venció el ${params.dueDate}` : "saldo pendiente de " + amountStr}).\n\n` +
        `💳 Podés abonar por transferencia para ingresar sin demoras en recepción:\n` +
        `• *Alias MP:* \`${alias}\`\n` +
        `• *CVU:* \`${cvu}\`\n\n` +
        `Enviános el comprobante por acá una vez realizado. ¡Te esperamos para entrenar! 💪`;
      break;

    case "DUE_SOON":
      message =
        `Hola ${params.memberName}! 👋 Desde *${gym}* te avisamos que tu cuota ${params.planName ? `(${params.planName})` : ""} *está próxima a vencer* el ${params.dueDate || "estos días"}.\n\n` +
        `Para renovar tu pase sin filas podés transferir a:\n` +
        `• *Alias:* \`${alias}\`\n\n` +
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
  let cleanPhone = (params.phone || "").replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = cleanPhone.substring(1);
  }
  if (cleanPhone.length === 10 && !cleanPhone.startsWith("54")) {
    cleanPhone = `549${cleanPhone}`;
  }

  const encodedText = encodeURIComponent(message);
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
}
