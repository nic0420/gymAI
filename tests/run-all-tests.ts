import { runSecurityTests } from "./security.test";
import { runAuthRtrTests } from "./auth-rtr.test";
import { runDatabaseErdTests } from "./database-erd.test";
import { runRbacTests } from "./rbac.test";
import { runCheckInTrafficLightTests } from "./checkin-traffic-light.test";
import { runOfflineSyncTests } from "./offline-sync.test";
import { runSplitPaymentsTests } from "./split-payments.test";
import { runCashRegisterBlindClosingTests } from "./cash-register-blind-closing.test";
import { runWebhookIdempotencyTests } from "./webhook-idempotency.test";
import { runWorkoutBuilderTests } from "./workout-builder.test";
import { runOneRepMaxTrackerTests } from "./one-rep-max-tracker.test";
import { runBiAnalyticsTests } from "./bi-analytics.test";
import { runKioskAndOnboardingTests } from "./kiosk-and-onboarding.test";
import { runBoundaryAndStressTests } from "./boundary-and-qa-stress.test";

async function main() {
  console.log("==========================================================================");
  console.log("🚀 EJECUTANDO SUITE COMPLETA DE PRUEBAS AUTOMATIZADAS (ETAPAS 1 A 6)");
  console.log("==========================================================================");

  const startTime = Date.now();

  try {
    const s1 = await runSecurityTests();
    const s2 = await runAuthRtrTests();
    const s3 = await runDatabaseErdTests();
    const s4 = await runRbacTests();
    const s5 = await runCheckInTrafficLightTests();
    const s6 = await runOfflineSyncTests();
    const s7 = await runSplitPaymentsTests();
    const s8 = await runCashRegisterBlindClosingTests();
    const s9 = await runWebhookIdempotencyTests();
    const s10 = await runWorkoutBuilderTests();
    const s11 = await runOneRepMaxTrackerTests();
    const s12 = await runBiAnalyticsTests();
    const s13 = await runKioskAndOnboardingTests();
    const s14 = await runBoundaryAndStressTests();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const allPassed = s1 && s2 && s3 && s4 && s5 && s6 && s7 && s8 && s9 && s10 && s11 && s12 && s13 && s14;

    console.log("\n==========================================================================");
    if (allPassed) {
      console.log(`🎉 TODAS LAS 14 SUITES DE PRUEBAS PASARON EXITOSAMENTE (${elapsed}s)`);
      console.log("Seguridad, ERD, RTR, RBAC, Semáforo, Offline Sync, Split Payments, Caja, Webhooks, Rutinas, 1RM Epley, Heatmaps BI, Modo Kiosco y Pruebas de Límites 100% OPERATIVOS.");
      console.log("==========================================================================");
      process.exit(0);
    } else {
      console.error(`💥 ALGUNAS PRUEBAS FALLARON (${elapsed}s)`);
      console.log("==========================================================================");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error inesperado durante la ejecución de pruebas:", error);
    process.exit(1);
  }
}

main();
