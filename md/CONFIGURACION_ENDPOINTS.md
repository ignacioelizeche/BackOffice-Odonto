# 📋 GUÍA DE CONFIGURACIÓN - ENDPOINTS Y SERVICIOS

## 📍 Documentación Completa de APIs
Ubicación: `/backend/Api.txt`

Todos los endpoints están completamente documentados con:
- Request/response examples
- Query parameters
- HTTP status codes
- Data types

---

## 🔧 SERVICIO DE CONFIGURACIÓN FRONTEND

**Ubicación**: `/services/config.service.ts`

El servicio está completamente tipado (TypeScript) y organizado en 5 módulos:

### 1️⃣ MÓDULO CLÍNICA
```typescript
configService.getClinicConfig()      // GET /api/configuracion/clinica
configService.updateClinicConfig(data)  // PUT /api/configuracion/clinica
```

**Request body:**
```json
{
  "name": "DentalCare Pro",
  "rfc": "DCP-210415-AB3",
  "phone": "+52 55 1234 5678",
  "email": "contacto@dentalcarepro.com",
  "address": "Av. Insurgentes Sur 1234...",
  "specialties": ["Odontologia General", "Cirugia Oral"]
}
```

### 2️⃣ MÓDULO HORARIOS
```typescript
configService.getScheduleConfig()      // GET /api/configuracion/horario
configService.updateScheduleConfig(data)  // PUT /api/configuracion/horario
```

**Request body:**
```json
{
  "appointmentDuration": 30,
  "timeBetweenAppointments": 15,
  "maxAppointmentsPerDoctorPerDay": 12,
  "minAdvanceBookingDays": 1,
  "workDays": [
    {
      "day": "Lunes",
      "active": true,
      "startTime": "09:00",
      "endTime": "18:00",
      "breakStart": "13:00",
      "breakEnd": "14:00"
    }
  ]
}
```

### 3️⃣ MÓDULO SEGURIDAD
```typescript
configService.getSecurityConfig()        // GET /api/configuracion/seguridad
configService.updateSecurityConfig(data) // PUT /api/configuracion/seguridad
configService.changePassword(data)       // PUT /api/configuracion/contrasena
```

**Security Request body:**
```json
{
  "twoFactor": false,
  "autoLogout": true,
  "activityLog": true,
  "dataEncryption": true
}
```

**Change Password Request body:**
```json
{
  "currentPassword": "actual_password",
  "newPassword": "nueva_password",
  "confirmPassword": "nueva_password"
}
```

### 4️⃣ MÓDULO FACTURACIÓN
```typescript
configService.getBillingConfig()        // GET /api/configuracion/facturacion
configService.updateBillingConfig(data) // PUT /api/configuracion/facturacion
```

**Request body:**
```json
{
  "currency": "mxn",
  "taxRate": 16,
  "invoicePrefix": "FAC-2026-",
  "nextNumber": 422,
  "autoInvoice": true,
  "paymentReminder": true
}
```

### 5️⃣ MÓDULO NOTIFICACIONES
```typescript
configService.getNotificationsConfig()        // GET /api/configuracion/notificaciones
configService.updateNotificationsConfig(data) // PUT /api/configuracion/notificaciones
```

**Request body:**
```json
{
  "notifications": [
    {
      "id": "appointment_confirmation",
      "enabled": true
    },
    {
      "id": "reminder_24h",
      "enabled": false
    }
  ],
  "emailServer": {
    "smtpServer": "smtp.gmail.com",
    "smtpPort": 587,
    "senderEmail": "notificaciones@dentalcarepro.com",
    "senderName": "DentalCare Pro",
    "useSSL": true
  }
}
```

### 6️⃣ MÓDULO USUARIOS
```typescript
configService.getUsers()                // GET /api/configuracion/usuarios
configService.createUser(data)          // POST /api/configuracion/usuarios
configService.updateUser(id, data)      // PUT /api/configuracion/usuarios/:id
configService.deleteUser(id)            // DELETE /api/configuracion/usuarios/:id
```

**Create User Request body:**
```json
{
  "name": "Nuevo Usuario",
  "email": "nuevo@dentalcare.com",
  "role": "Recepcionista",
  "password": "password123"
}
```

---

## 🚀 CÓMO USAR EN COMPONENTES

### Ejemplo en una componente React:

```typescript
import { configService } from '@/services/config.service'
import { useState, useEffect } from 'react'

export function ClinicaTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cargar datos al montar
    configService.getClinicConfig()
      .then(setData)
      .catch(err => console.error('Error:', err))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (updatedData) => {
    try {
      const result = await configService.updateClinicConfig(updatedData)
      console.log(result.message)
      // Recargar datos o actualizar UI
      const newData = await configService.getClinicConfig()
      setData(newData)
    } catch (error) {
      console.error('Error al guardar:', error)
    }
  }

  if (loading) return <div>Cargando...</div>

  return (
    <div>
      {/* Renderizar formularios aquí */}
    </div>
  )
}
```

---

## 📊 RESUMEN DE ENDPOINTS

| Método | Path | Servicio | Descripción |
|--------|------|----------|-------------|
| GET | `/api/configuracion/clinica` | `getClinicConfig()` | Obtener datos de la clínica |
| PUT | `/api/configuracion/clinica` | `updateClinicConfig(data)` | Actualizar datos de la clínica |
| GET | `/api/configuracion/horario` | `getScheduleConfig()` | Obtener horarios |
| PUT | `/api/configuracion/horario` | `updateScheduleConfig(data)` | Actualizar horarios |
| GET | `/api/configuracion/seguridad` | `getSecurityConfig()` | Obtener seguridad |
| PUT | `/api/configuracion/seguridad` | `updateSecurityConfig(data)` | Actualizar seguridad |
| PUT | `/api/configuracion/contrasena` | `changePassword(data)` | Cambiar contraseña |
| GET | `/api/configuracion/facturacion` | `getBillingConfig()` | Obtener facturación |
| PUT | `/api/configuracion/facturacion` | `updateBillingConfig(data)` | Actualizar facturación |
| GET | `/api/configuracion/notificaciones` | `getNotificationsConfig()` | Obtener notificaciones |
| PUT | `/api/configuracion/notificaciones` | `updateNotificationsConfig(data)` | Actualizar notificaciones |
| GET | `/api/configuracion/usuarios` | `getUsers()` | Listar usuarios |
| POST | `/api/configuracion/usuarios` | `createUser(data)` | Crear usuario |
| PUT | `/api/configuracion/usuarios/:id` | `updateUser(id, data)` | Actualizar usuario |
| DELETE | `/api/configuracion/usuarios/:id` | `deleteUser(id)` | Eliminar usuario |

---

## ⚙️ MANEJO DE ERRORES

Todos los errores siguen este formato:

```json
{
  "error": "Descripción del error",
  "code": "ERROR_CODE"
}
```

**HTTP Status Codes:**
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## 📝 PRÓXIMOS PASOS

1. **Implementar componentes de formularios** para cada pestaña
2. **Conectar servicios** importando `configService` en cada componente
3. **Validar datos** antes de enviar al servidor
4. **Implementar manejo de errores** y feedback al usuario
5. **Agregar loading states** durante las llamadas API

