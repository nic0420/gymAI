import { NextRequest, NextResponse } from "next/server";
import { getExecutiveBusinessDashboard } from "@/lib/analytics/bi-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { error: "MISSING_TENANT", message: "tenantId es requerido" },
        { status: 400 }
      );
    }

    const dashboard = await getExecutiveBusinessDashboard(tenantId);

    return NextResponse.json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    console.error("Error al generar dashboard analítico:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Error al generar métricas de Business Intelligence" },
      { status: 500 }
    );
  }
}
