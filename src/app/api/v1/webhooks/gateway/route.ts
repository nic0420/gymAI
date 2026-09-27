import { NextRequest, NextResponse } from "next/server";
import { processGatewayWebhook, verifyWebhookSignature } from "@/lib/finance/webhook-service";
import { getWebhookSecret } from "@/lib/config/secrets";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-signature") || req.headers.get("stripe-signature") || "";
    const gatewayHeader = req.headers.get("x-gateway") || "MERCADO_PAGO";
    const gateway = gatewayHeader.toUpperCase() === "STRIPE" ? "STRIPE" : "MERCADO_PAGO";

    const rawBody = await req.text();

    // FIX CRÍTICO: la firma nunca se verificaba (la función se importaba pero no se llamaba).
    // Cualquiera podía enviar {"type":"payment.approved","invoiceId":...,"amount":...} y
    // marcar facturas como pagas / reactivar membresías sin pagar.
    const secret = getWebhookSecret();
    if (!secret) {
      console.error("[webhook] PAYMENT_GATEWAY_WEBHOOK_SECRET no configurado: webhook rechazado");
      return NextResponse.json(
        { error: "WEBHOOK_NOT_CONFIGURED", message: "Webhook no configurado" },
        { status: 503 }
      );
    }
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "INVALID_SIGNATURE", message: "Firma inválida" }, { status: 401 });
    }

    let bodyJson: any = {};
    try {
      bodyJson = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "INVALID_JSON", message: "Cuerpo de solicitud inválido" }, { status: 400 });
    }

    // Extraer ID externo del evento enviado por la pasarela.
    // FIX: antes, si faltaba, se inventaba `evt_${Date.now()}`, lo que anulaba la idempotencia
    // (cada reintento se procesaba como un pago nuevo).
    const externalEventId = bodyJson.id ?? bodyJson.data?.id ?? bodyJson.event_id;
    if (externalEventId === undefined || externalEventId === null || String(externalEventId).trim() === "") {
      return NextResponse.json(
        { error: "MISSING_EVENT_ID", message: "El evento no incluye un identificador" },
        { status: 400 }
      );
    }

    // FIX: antes un evento sin tipo se asumía "payment.approved".
    const eventType = bodyJson.type || bodyJson.action;
    if (!eventType) {
      return NextResponse.json(
        { error: "MISSING_EVENT_TYPE", message: "El evento no incluye su tipo" },
        { status: 400 }
      );
    }

    const tenantId = bodyJson.tenantId || bodyJson.metadata?.tenantId;

    // Procesar evento con IDEMPOTENCIA ESTRICTA
    const result = await processGatewayWebhook({
      tenantId,
      gateway,
      externalEventId: String(externalEventId),
      eventType: String(eventType),
      payload: bodyJson,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error al procesar webhook:", error);
    // No se filtran detalles internos al emisor
    return NextResponse.json(
      { error: "WEBHOOK_PROCESSING_FAILED", message: "Error al procesar webhook" },
      { status: 500 }
    );
  }
}
