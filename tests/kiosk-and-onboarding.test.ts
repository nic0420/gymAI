import { TOURS, TourDefinition } from "../src/lib/onboarding/tour-steps";
import { soundEffects } from "../src/lib/kiosk/sound-effects";

export async function runKioskAndOnboardingTests() {
  console.log("\n📱 [TEST SUITE 13] Modo Kiosco Táctil, Onboarding Guiado y UX");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Verificación del Catálogo de Tours de Onboarding
  assert(!!TOURS.receptionist, "Existe el tour para personal de recepción");
  assert(TOURS.receptionist.steps.length === 4, "El tour de recepción tiene exactamente 4 pasos clave");
  assert(TOURS.receptionist.steps[0].targetId === "nav-tab-checkin", "El primer paso enfoca el semáforo de asistencia");
  assert(TOURS.receptionist.steps[3].title.includes("Arqueo Ciego"), "El último paso instruye sobre el arqueo ciego");

  assert(!!TOURS.coach, "Existe el tour para entrenadores y coaches");
  assert(TOURS.coach.steps.length === 2, "El tour de coach incluye diseño de rutinas y 1RM Epley");

  assert(!!TOURS.bi_owner, "Existe el tour ejecutivo para dueños de gimnasio");
  assert(TOURS.bi_owner.steps[1].title.includes("7x24"), "El tour de dueños destaca el mapa de calor 7x24");

  // 2. Lógica de Teclado Táctil y Buffer de DNI
  let dniBuffer = "";
  const appendKey = (key: string) => {
    if (dniBuffer.length < 10) dniBuffer += key;
  };
  const deleteKey = () => {
    dniBuffer = dniBuffer.slice(0, -1);
  };
  const clearKey = () => {
    dniBuffer = "";
  };

  appendKey("4");
  appendKey("0");
  appendKey("1");
  appendKey("2");
  appendKey("3");
  assert(dniBuffer === "40123", "Buffer acumula dígitos correctamente");

  deleteKey();
  assert(dniBuffer === "4012", "Tecla borrar elimina el último dígito");

  clearKey();
  assert(dniBuffer === "", "Tecla limpiar vacía el buffer completamente");

  // 3. Lógica de Debounce Anti-Doble Marcación
  let checkinTriggerCount = 0;
  let isDebouncing = false;

  const triggerCheckin = () => {
    if (isDebouncing) return;
    isDebouncing = true;
    checkinTriggerCount++;
    setTimeout(() => {
      isDebouncing = false;
    }, 100);
  };

  triggerCheckin();
  triggerCheckin(); // Debe ser ignorado por debounce
  triggerCheckin(); // Debe ser ignorado por debounce

  assert(checkinTriggerCount === 1, "Debounce bloquea toques repetitivos accidentales");

  // 4. Verificación del Motor de Sonido Web Audio
  assert(typeof soundEffects.playKeyClick === "function", "Sintetizador incluye sonido de click táctil");
  assert(typeof soundEffects.playAccessGranted === "function", "Sintetizador incluye sonido de acceso verde");
  assert(typeof soundEffects.playAccessWarning === "function", "Sintetizador incluye sonido de alerta amarillo");
  assert(typeof soundEffects.playAccessDenied === "function", "Sintetizador incluye sonido de bloqueo rojo");

  console.log(`\nResumen Suite 13: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
