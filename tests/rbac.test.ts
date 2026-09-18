import { hasPermission, ATOMIC_PERMISSIONS } from "../src/lib/auth/rbac";

export async function runRbacTests() {
  console.log("\n👥 [TEST SUITE 4] Control de Acceso Basado en Roles (RBAC) & Permisos Atómicos");
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

  // 1. SuperAdmin tiene acceso total a todos los permisos
  assert(
    hasPermission("SUPERADMIN", ATOMIC_PERMISSIONS.USERS_DELETE),
    "SuperAdmin puede eliminar usuarios"
  );
  assert(
    hasPermission("SUPERADMIN", ATOMIC_PERMISSIONS.PAYMENTS_VOID),
    "SuperAdmin puede anular pagos"
  );
  assert(
    hasPermission("SUPERADMIN", ATOMIC_PERMISSIONS.FINANCIAL_REPORTS_READ),
    "SuperAdmin puede ver reportes financieros"
  );

  // 2. Recepcionista tiene permisos de mostrador pero no anulación ni reportes mensuales
  assert(
    hasPermission("RECEPCIONISTA", ATOMIC_PERMISSIONS.ATTENDANCE_WRITE),
    "Recepcionista puede registrar asistencias"
  );
  assert(
    hasPermission("RECEPCIONISTA", ATOMIC_PERMISSIONS.PAYMENTS_WRITE),
    "Recepcionista puede registrar cobros en mostrador"
  );
  assert(
    !hasPermission("RECEPCIONISTA", ATOMIC_PERMISSIONS.PAYMENTS_VOID),
    "Recepcionista NO puede anular pagos históricos"
  );
  assert(
    !hasPermission("RECEPCIONISTA", ATOMIC_PERMISSIONS.FINANCIAL_REPORTS_READ),
    "Recepcionista NO puede ver el balance financiero global"
  );

  // 3. Entrenador solo gestiona rutinas y consultas de salud, no pagos
  assert(
    hasPermission("ENTRENADOR", ATOMIC_PERMISSIONS.ROUTINES_WRITE),
    "Entrenador puede crear y editar rutinas"
  );
  assert(
    hasPermission("ENTRENADOR", ATOMIC_PERMISSIONS.MEDICAL_READ),
    "Entrenador puede consultar ficha médica / lesiones"
  );
  assert(
    !hasPermission("ENTRENADOR", ATOMIC_PERMISSIONS.PAYMENTS_WRITE),
    "Entrenador NO puede cobrar ni registrar pagos"
  );

  // 4. Socio solo tiene permisos de lectura de su propio contenido
  assert(
    hasPermission("SOCIO", ATOMIC_PERMISSIONS.ROUTINES_READ),
    "Socio puede ver sus rutinas"
  );
  assert(
    !hasPermission("SOCIO", ATOMIC_PERMISSIONS.USERS_WRITE),
    "Socio NO puede modificar otros usuarios"
  );

  // 5. Permisos personalizados inyectados
  assert(
    hasPermission("ENTRENADOR", ATOMIC_PERMISSIONS.USERS_WRITE, ["users:write"]),
    "Permiso atómico personalizado concedido individualmente funciona"
  );

  console.log(`\nResumen Suite 4: ${passed} pasados, ${failed} fallidos.`);
  return failed === 0;
}
