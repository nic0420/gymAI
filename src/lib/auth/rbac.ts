/**
 * Catálogo de Permisos Atómicos para RBAC Dinámico
 */
export const ATOMIC_PERMISSIONS = {
  // Gestión de Usuarios y Socios
  USERS_READ: "users:read",
  USERS_WRITE: "users:write",
  USERS_DELETE: "users:delete",
  
  // Ficha Médica y Salud
  MEDICAL_READ: "medical:read",
  MEDICAL_WRITE: "medical:write",

  // Finanzas y Cobranzas
  PAYMENTS_READ: "payments:read",
  PAYMENTS_WRITE: "payments:write",
  PAYMENTS_VOID: "payments:void", // Anular pagos (Solo SuperAdmin)
  CASH_REGISTER_OPERATE: "cash:operate", // Abrir / Cerrar turno de caja
  FINANCIAL_REPORTS_READ: "reports:financial",

  // Control de Acceso y Asistencias
  ATTENDANCE_READ: "attendance:read",
  ATTENDANCE_WRITE: "attendance:write",

  // Rutinas y Planes de Entrenamiento
  ROUTINES_READ: "routines:read",
  ROUTINES_WRITE: "routines:write",

  // Configuración de la Sucursal / Gimnasio
  TENANT_SETTINGS_WRITE: "tenant:settings",
} as const;

export type AtomicPermission = (typeof ATOMIC_PERMISSIONS)[keyof typeof ATOMIC_PERMISSIONS];

export type UserRole = "SUPERADMIN" | "RECEPCIONISTA" | "ENTRENADOR" | "SOCIO";

/**
 * Matriz de Permisos por Defecto asignados a cada Rol
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, AtomicPermission[]> = {
  SUPERADMIN: Object.values(ATOMIC_PERMISSIONS), // Acceso Total (*)

  RECEPCIONISTA: [
    ATOMIC_PERMISSIONS.USERS_READ,
    ATOMIC_PERMISSIONS.USERS_WRITE,
    ATOMIC_PERMISSIONS.MEDICAL_READ,
    ATOMIC_PERMISSIONS.MEDICAL_WRITE,
    ATOMIC_PERMISSIONS.PAYMENTS_READ,
    ATOMIC_PERMISSIONS.PAYMENTS_WRITE,
    ATOMIC_PERMISSIONS.CASH_REGISTER_OPERATE,
    ATOMIC_PERMISSIONS.ATTENDANCE_READ,
    ATOMIC_PERMISSIONS.ATTENDANCE_WRITE,
    ATOMIC_PERMISSIONS.ROUTINES_READ,
  ],

  ENTRENADOR: [
    ATOMIC_PERMISSIONS.USERS_READ,
    ATOMIC_PERMISSIONS.MEDICAL_READ,
    ATOMIC_PERMISSIONS.ATTENDANCE_READ,
    ATOMIC_PERMISSIONS.ROUTINES_READ,
    ATOMIC_PERMISSIONS.ROUTINES_WRITE,
  ],

  SOCIO: [
    ATOMIC_PERMISSIONS.ROUTINES_READ,
    ATOMIC_PERMISSIONS.ATTENDANCE_READ,
  ],
};

/**
 * Valida si un rol tiene un permiso atómico específico.
 */
export function hasPermission(
  userRole: string,
  permission: AtomicPermission,
  customUserPermissions?: string[]
): boolean {
  // SuperAdmin tiene pase irrestricto
  if (userRole === "SUPERADMIN") {
    return true;
  }

  // 1. Verificar si tiene el permiso asignado individualmente
  if (customUserPermissions && customUserPermissions.includes(permission)) {
    return true;
  }

  // 2. Verificar en la matriz del rol
  const defaultPermissions = ROLE_DEFAULT_PERMISSIONS[userRole as UserRole];
  if (!defaultPermissions) {
    return false;
  }

  return defaultPermissions.includes(permission);
}
