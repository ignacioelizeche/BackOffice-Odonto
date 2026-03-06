import { z } from "zod"

/**
 * Esquemas de validación para configuración de clínica, horarios y seguridad
 */

// ============= Validaciones para Clínica =============
export const clinicConfigSchema = z.object({
  name: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  rfc: z
    .string()
    .regex(
      /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/,
      "RFC inválido. Formato: XXX000000XXX"
    )
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(
      /^\+?[\d\s\-()]{10,}$/,
      "Teléfono inválido. Debe tener al menos 10 dígitos"
    ),
  email: z
    .string()
    .email("Email inválido"),
  website: z
    .string()
    .url("Debe ser una URL válida")
    .optional()
    .or(z.literal("")),
  licenseNumber: z
    .string()
    .min(5, "Número de licencia requerido")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .min(10, "Dirección debe tener al menos 10 caracteres"),
  specialties: z
    .array(z.string())
    .min(1, "Selecciona al menos una especialidad"),
})

export type ClinicConfigFormValues = z.infer<typeof clinicConfigSchema>

// ============= Validaciones para Horarios =============
const workDaySchema = z.object({
  day: z.string(),
  active: z.boolean(),
  startTime: z.string(),
  endTime: z.string(),
  breakStart: z.string(),
  breakEnd: z.string(),
})

export const scheduleConfigSchema = z
  .object({
    workDays: z.array(workDaySchema),
    appointmentDuration: z
      .number()
      .min(15, "Mínimo 15 minutos")
      .max(120, "Máximo 120 minutos"),
    timeBetweenAppointments: z
      .number()
      .min(0, "No puede ser negativo")
      .max(30, "Máximo 30 minutos"),
    maxAppointmentsPerDoctorPerDay: z
      .number()
      .min(1, "Mínimo 1")
      .max(24, "Máximo 24"),
    minAdvanceBookingDays: z
      .number()
      .min(1, "Mínimo 1 hora")
      .max(48, "Máximo 48 horas"),
  })
  .superRefine((data, ctx) => {
    // Validar que los horarios sean coherentes
    for (const day of data.workDays) {
      if (day.active) {
        // Validar que apertura < cierre
        if (day.startTime >= day.endTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [day.day, "startTime"],
            message: "La hora de apertura debe ser menor a la de cierre",
          })
        }

        // Validar que descanso está dentro del horario de trabajo
        if (day.breakStart && day.breakEnd) {
          if (day.breakStart < day.startTime || day.breakEnd > day.endTime) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [day.day, "breakStart"],
              message: "El descanso debe estar dentro del horario de trabajo",
            })
          }

          // Validar que descansoInicio < descansoFin
          if (day.breakStart >= day.breakEnd) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [day.day, "breakStart"],
              message: "La hora de inicio del descanso debe ser menor a la de fin",
            })
          }
        }
      }
    }
  })

export type ScheduleConfigFormValues = z.infer<typeof scheduleConfigSchema>

// ============= Validaciones para Cambio de Contraseña =============
export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Contraseña actual requerida"),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[a-z]/, "Debe contener al menos una minúscula")
      .regex(/[0-9]/, "Debe contener al menos un número"),
    confirmPassword: z.string(),
  })
  .refine(
    (data) => data.newPassword === data.confirmPassword,
    {
      message: "Las contraseñas no coinciden",
      path: ["confirmPassword"],
    }
  )

export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>

// ============= Validaciones para Opciones de Seguridad =============
export const securityConfigSchema = z.object({
  twoFactor: z.boolean(),
  autoLogout: z.boolean(),
  activityLog: z.boolean(),
  dataEncryption: z.boolean(),
})

export type SecurityConfigFormValues = z.infer<typeof securityConfigSchema>

// ============= Validaciones para Crear Usuario =============
export const createUserSchema = z
  .object({
    name: z
      .string()
      .min(3, "El nombre debe tener al menos 3 caracteres")
      .max(100, "El nombre no puede exceder 100 caracteres"),
    email: z
      .string()
      .email("Email inválido"),
    role: z
      .enum(["Administrador", "Doctor", "Recepcionista", "Asistente"], {
        errorMap: () => ({ message: "Selecciona un rol válido" }),
      }),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[a-z]/, "Debe contener al menos una minúscula")
      .regex(/[0-9]/, "Debe contener al menos un número"),
    confirmPassword: z.string(),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Las contraseñas no coinciden",
      path: ["confirmPassword"],
    }
  )

export type CreateUserFormValues = z.infer<typeof createUserSchema>

// ============= Validaciones para Notificaciones =============
export const notificationsConfigSchema = z.object({
  notifications: z.array(
    z.object({
      id: z.string(),
      enabled: z.boolean(),
    })
  ),
  emailServer: z.object({
    smtpServer: z.string().min(1, "Servidor SMTP requerido"),
    smtpPort: z.number().min(1, "Puerto requerido").max(65535, "Puerto inválido"),
    senderEmail: z.string().email("Email inválido"),
    senderName: z.string().min(1, "Nombre de remitente requerido"),
    useSSL: z.boolean().optional(),
  }),
})

export type NotificationsConfigFormValues = z.infer<typeof notificationsConfigSchema>
