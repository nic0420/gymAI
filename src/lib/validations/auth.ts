import { z } from "zod";

/**
 * Esquema de Validación para Inicio de Sesión
 */
export const LoginSchema = z.object({
  tenantSlug: z
    .string({ required_error: "Debes especificar el identificador del gimnasio" })
    .min(2, "El identificador del gimnasio debe tener al menos 2 caracteres")
    .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones"),

  identifier: z
    .string({ required_error: "Ingresa tu DNI o Correo Electrónico" })
    .min(3, "El identificador debe tener al menos 3 caracteres"),

  password: z
    .string({ required_error: "Ingresa tu contraseña" })
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Esquema de Validación para Alta de Nuevo Gimnasio (Tenant) + SuperAdmin
 */
export const RegisterTenantSchema = z.object({
  tenantName: z
    .string({ required_error: "El nombre del gimnasio es obligatorio" })
    .min(3, "El nombre debe tener al menos 3 caracteres"),
  
  tenantSlug: z
    .string({ required_error: "El identificador web (slug) es obligatorio" })
    .min(3, "El slug debe tener al menos 3 caracteres")
    .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones"),

  adminEmail: z
    .string({ required_error: "El email del administrador es obligatorio" })
    .email("Ingresa un formato de email válido (ej: admin@gimnasio.com)"),

  adminPassword: z
    .string({ required_error: "La contraseña es obligatoria" })
    .min(8, "La contraseña del administrador debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),

  adminFirstName: z.string().min(2, "Ingresa el nombre del administrador"),
  adminLastName: z.string().min(2, "Ingresa el apellido del administrador"),
  adminDni: z
    .string()
    .min(7, "El DNI debe tener entre 7 y 8 dígitos numéricos")
    .max(10, "El DNI no debe superar los 10 dígitos")
    .regex(/^\d+$/, "El DNI solo puede contener números"),
  
  branchName: z.string().default("Sede Central"),
  branchAddress: z.string().min(3, "Ingresa la dirección física de la sede"),
});

export type RegisterTenantInput = z.infer<typeof RegisterTenantSchema>;
