import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertSameTenant } from "@/lib/auth/guard";
import { ATOMIC_PERMISSIONS } from "@/lib/auth/rbac";
import { getExecutiveBusinessDashboard } from "@/lib/analytics/bi-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ATOMIC_PERMISSIONS.FINANCIAL_REPORTS_READ);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const { searchParams } = new URL(req.url);
    const mismatch = assertSameTenant(ctx, searchParams.get("tenantId"));
    if (mismatch) return mismatch;
    const tenantId = ctx.tenantId;

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
