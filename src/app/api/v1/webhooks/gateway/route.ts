import { NextRequest, NextResponse } from "next/server";
import { processGatewayWebhook, verifyWebhookSignature } from "@/lib/finance/webhook-service";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-signature") || req.headers.get("stripe-signature") || "";
    const gatewayHeader = req.headers.get("x-gateway") || "MERCADO_PAGO";
    const gateway = gatewayHeader.toUpperCase() === "STRIPE" ? "STRIPE" : "MERCADO_PAGO";

    const rawBody = await req.text();
    let bodyJson: any = {};

    try {
      bodyJson = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "INVALID_JSON", message: "Cuerpo de solicitud inválido" }, { status: 400 });
    }

    // Extraer ID externo del evento enviado por la pasarela
    const externalEventId =
      bodyJson.id ||
      bodyJson.data?.id ||
      bodyJson.event_id ||
      `evt_${Date.now()}`;

    const eventType =
      bodyJson.type ||
      bodyJson.action ||
      "payment.approved";

    const tenantId = bodyJson.tenantId || bodyJson.metadata?.tenantId;

    // Procesar evento con IDEMPOTENCIA ESTRICTA
    const result = await processGatewayWebhook({
      tenantId,
      gateway,
      externalEventId: String(externalEventId),
      eventType,
      payload: bodyJson,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error al procesar webhook:", error);
    return NextResponse.json(
      { error: "WEBHOOK_PROCESSING_FAILED", message: error.message || "Error al procesar webhook" },
      { status: 500 }
    );
  }
}
