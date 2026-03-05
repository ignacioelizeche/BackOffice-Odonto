# 🔌 API SERVICES GUIDE - Backend Connection Ready

This document provides a complete overview of all API services in the frontend application. Each service is fully typed and ready for backend connection.

---

## 📂 Services Directory

All services are located in `/frontend/dental-back-office/services/`

### Files:
- `patients.service.ts` - Patient management (6 endpoints)
- `doctors.service.ts` - Doctor management (3 endpoints)
- `appointments.service.ts` - Appointment management (6 endpoints)
- `clinical-records.service.ts` - Clinical records (2 endpoints)
- `config.service.ts` - Configuration management (15 endpoints)
- `dashboard.service.ts` - Dashboard statistics (1 endpoint)
- `index.ts` - Central export hub

**Total: 33 endpoints ready to connect**

---

## 🔑 Service Overview

### 1️⃣ PATIENTS SERVICE
**File:** `patients.service.ts`

#### Methods:
```typescript
// Get all patients with optional filters
patientsService.getAll(filters?: {
  search?: string
  status?: string
  doctor?: string
  page?: number
  limit?: number
}): Promise<PatientListResponse>

// Get single patient with complete data including teeth
patientsService.getById(id: number): Promise<Patient>

// Create new patient
patientsService.create(data: CreatePatientDTO): Promise<Patient & { message: string }>

// Update patient data
patientsService.update(id: number, data: UpdatePatientDTO): Promise<{ id: number; message: string }>

// Delete patient
patientsService.delete(id: number): Promise<{ message: string }>

// Add dental record with file upload support
patientsService.addDentalRecord(
  patientId: number,
  toothNumber: number,
  data: AddDentalRecordDTO
): Promise<AddDentalRecordResponse>
```

#### Key Types:
```typescript
interface Patient {
  id: number
  name: string
  initials: string
  email: string
  phone: string
  age: number
  gender: "Masculino" | "Femenino"
  lastVisit: string
  nextAppt: string | null
  doctor: string
  status: "activo" | "inactivo" | "nuevo"
  treatments: string[]
  totalVisits: number
  balance: number
  teeth?: Tooth[]
}

interface Tooth {
  number: number
  name: string
  status: "sano" | "tratado" | "en_tratamiento" | "extraccion" | "pendiente"
  records: TreatmentRecord[]
}

interface TreatmentRecord {
  id: number
  date: string
  treatment: string
  doctor: string
  notes: string
  cost: number
  attachments?: Attachment[]
}

interface AddDentalRecordDTO {
  treatment: string
  doctor: string
  notes?: string
  cost: number
  files?: File[]  // File upload support (max 10 MB per file)
}
```

#### Example Usage:
```typescript
import { patientsService } from '@/services'

// Fetch all patients with filters
const response = await patientsService.getAll({
  search: 'Maria',
  status: 'activo',
  page: 1,
  limit: 10
})

// Get patient detail
const patient = await patientsService.getById(1)

// Create new patient
const newPatient = await patientsService.create({
  name: 'Juan Pérez',
  email: 'juan@example.com',
  phone: '+52 55 1234 5678',
  age: 35,
  gender: 'Masculino',
  doctor: 'Dr. Carlos Mendez'
})

// Add dental record with file upload
const record = await patientsService.addDentalRecord(1, 16, {
  treatment: 'Resina compuesta',
  doctor: 'Dr. Carlos Mendez',
  notes: 'Caries clase I',
  cost: 1200,
  files: [radiographyFile]
})
```

---

### 2️⃣ DOCTORS SERVICE
**File:** `doctors.service.ts`

#### Methods:
```typescript
// Get all doctors
doctorsService.getAll(): Promise<DoctorListResponse>

// Get single doctor with schedule and stats
doctorsService.getById(id: number): Promise<Doctor>

// Update doctor work schedule
doctorsService.updateWorkSchedule(
  id: number,
  schedule: WorkDay[]
): Promise<{ id: number; message: string }>
```

#### Key Types:
```typescript
interface Doctor {
  id: number
  name: string
  initials: string
  email: string
  phone: string
  specialty: string
  licenseNumber: string
  status: "disponible" | "en-consulta" | "no-disponible"
  patientsToday: number
  patientsTotal: number
  rating: number
  reviewCount: number
  yearsExperience: number
  schedule?: ScheduleSlot[]
  workSchedule?: WorkDay[]
  monthlyStats?: {
    completed: number
    cancelled: number
    revenue: number
  }
}

interface WorkDay {
  day: string
  active: boolean
  startTime: string
  endTime: string
  breakStart: string
  breakEnd: string
}
```

#### Example Usage:
```typescript
import { doctorsService } from '@/services'

// Get all doctors
const response = await doctorsService.getAll()
const doctors = response.data

// Get doctor detail with schedule
const doctor = await doctorsService.getById(1)

// Update work schedule
await doctorsService.updateWorkSchedule(1, [
  { day: 'Lunes', active: true, startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
  { day: 'Martes', active: true, startTime: '09:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00' }
])
```

---

### 3️⃣ APPOINTMENTS SERVICE
**File:** `appointments.service.ts`

#### Methods:
```typescript
// Get all appointments with optional filters
appointmentsService.getAll(filters?: {
  date?: string
  status?: string
  doctor?: string
  search?: string
  page?: number
  limit?: number
}): Promise<AppointmentListResponse>

// Get single appointment detail
appointmentsService.getById(id: number): Promise<Appointment>

// Create new appointment
appointmentsService.create(data: CreateAppointmentDTO): Promise<{ id: number; status: string; message: string }>

// Update appointment data
appointmentsService.update(id: number, data: UpdateAppointmentDTO): Promise<{ id: number; message: string }>

// Change only appointment status
appointmentsService.updateStatus(
  id: number,
  status: "pendiente" | "confirmada" | "completada" | "cancelada"
): Promise<{ id: number; status: string; message: string }>

// Delete appointment
appointmentsService.delete(id: number): Promise<{ message: string }>
```

#### Key Types:
```typescript
interface Appointment {
  id: number
  patient: string
  patientInitials: string
  patientAge: number
  patientPhone: string
  doctor: string
  doctorSpecialty: string
  treatment: string
  date: string
  time: string
  duration: string
  status: "pendiente" | "confirmada" | "completada" | "cancelada"
  notes: string
  cost: number
}

interface CreateAppointmentDTO {
  patientId: number
  doctorId: number
  treatment: string
  date: string
  time: string
  duration: string
  cost: number
  notes?: string
}
```

#### Example Usage:
```typescript
import { appointmentsService } from '@/services'

// Get appointments for a specific date
const response = await appointmentsService.getAll({
  date: '2026-02-20',
  status: 'confirmada',
  page: 1,
  limit: 10
})

// Create new appointment
const newAppt = await appointmentsService.create({
  patientId: 1,
  doctorId: 1,
  treatment: 'Limpieza dental',
  date: '2026-02-20',
  time: '10:00',
  duration: '30 min',
  cost: 800,
  notes: 'Limpieza rutinaria'
})

// Change appointment status
await appointmentsService.updateStatus(1, 'completada')
```

---

### 4️⃣ CLINICAL RECORDS SERVICE
**File:** `clinical-records.service.ts`

#### Methods:
```typescript
// Get all clinical records with filters
clinicalRecordsService.getAll(filters?: {
  search?: string
  doctor?: string
  status?: string
  page?: number
  limit?: number
}): Promise<ClinicalRecordsListResponse>

// Get single clinical record detail
clinicalRecordsService.getById(id: number): Promise<ClinicalRecord>
```

#### Key Types:
```typescript
interface ClinicalRecord {
  id: number
  patientId: number
  patient: string
  patientInitials: string
  date: string
  doctor: string
  treatment: string
  diagnosis: string
  tooth: string
  notes: string
  cost: number
  status: "completado" | "pendiente" | "cancelado"
  attachments?: Attachment[]
}
```

#### Example Usage:
```typescript
import { clinicalRecordsService } from '@/services'

// Get all completed records for a doctor
const response = await clinicalRecordsService.getAll({
  doctor: 'Dr. Carlos Mendez',
  status: 'completado'
})

// Get record detail
const record = await clinicalRecordsService.getById(1)
```

---

### 5️⃣ CONFIGURATION SERVICE
**File:** `config.service.ts` (15 endpoints across 6 modules)

#### Clinic Module:
```typescript
configService.getClinicConfig(): Promise<ClinicConfig>
configService.updateClinicConfig(data: UpdateClinicDTO): Promise<{ message: string }>
```

#### Schedule Module:
```typescript
configService.getScheduleConfig(): Promise<ScheduleConfig>
configService.updateScheduleConfig(data: UpdateScheduleDTO): Promise<{ message: string }>
```

#### Security Module:
```typescript
configService.getSecurityConfig(): Promise<SecurityConfig>
configService.updateSecurityConfig(data: UpdateSecurityDTO): Promise<{ message: string }>
configService.changePassword(data: ChangePasswordDTO): Promise<{ message: string }>
```

#### Billing Module:
```typescript
configService.getBillingConfig(): Promise<BillingConfig>
configService.updateBillingConfig(data: UpdateBillingDTO): Promise<{ message: string }>
```

#### Notifications Module:
```typescript
configService.getNotificationsConfig(): Promise<NotificationsConfig>
configService.updateNotificationsConfig(data: UpdateNotificationsDTO): Promise<{ message: string }>
```

#### Users Module:
```typescript
configService.getUsers(): Promise<User[]>
configService.createUser(data: CreateUserDTO): Promise<User>
configService.updateUser(id: number, data: UpdateUserDTO): Promise<{ message: string }>
configService.deleteUser(id: number): Promise<{ message: string }>
```

#### Example Usage:
```typescript
import { configService } from '@/services'

// Get clinic configuration
const clinicConfig = await configService.getClinicConfig()

// Update clinic info
await configService.updateClinicConfig({
  name: 'DentalCare Nueva Sucursal',
  phone: '+52 55 9999 9999'
})

// Get all users
const users = await configService.getUsers()

// Create new user
const newUser = await configService.createUser({
  name: 'Recepcionista Nuevo',
  email: 'recepcionista@example.com',
  role: 'Recepcionista',
  password: 'secure_password123'
})
```

---

### 6️⃣ DASHBOARD SERVICE
**File:** `dashboard.service.ts`

#### Methods:
```typescript
// Get dashboard statistics
dashboardService.getStats(): Promise<DashboardStats>
```

#### Key Types:
```typescript
interface DashboardStats {
  todayAppointments: number
  activePatients: number
  monthlyRevenue: number
  returnRate: number
  weeklyChart: {
    labels: string[]
    scheduled: number[]
    completed: number[]
  }
  recentActivity: Array<{
    type: "appointment" | "patient" | "treatment" | "system"
    message: string
    time: string
  }>
}
```

#### Example Usage:
```typescript
import { dashboardService } from '@/services'

// Get dashboard statistics
const stats = await dashboardService.getStats()
console.log(`Today's appointments: ${stats.todayAppointments}`)
console.log(`Active patients: ${stats.activePatients}`)
console.log(`Monthly revenue: $${stats.monthlyRevenue}`)
```

---

## 📋 API Endpoint Mapping

| Service | Method | Endpoint | HTTP |
|---------|--------|----------|------|
| Patients | getAll | /api/pacientes | GET |
| Patients | getById | /api/pacientes/:id | GET |
| Patients | create | /api/pacientes | POST |
| Patients | update | /api/pacientes/:id | PUT |
| Patients | delete | /api/pacientes/:id | DELETE |
| Patients | addDentalRecord | /api/pacientes/:id/dientes/:toothNumber/registros | POST |
| Doctors | getAll | /api/doctores | GET |
| Doctors | getById | /api/doctores/:id | GET |
| Doctors | updateWorkSchedule | /api/doctores/:id/horario | PUT |
| Appointments | getAll | /api/citas | GET |
| Appointments | getById | /api/citas/:id | GET |
| Appointments | create | /api/citas | POST |
| Appointments | update | /api/citas/:id | PUT |
| Appointments | updateStatus | /api/citas/:id/estado | PATCH |
| Appointments | delete | /api/citas/:id | DELETE |
| Records | getAll | /api/historiales | GET |
| Records | getById | /api/historiales/:id | GET |
| Config | getClinicConfig | /api/configuracion/clinica | GET |
| Config | updateClinicConfig | /api/configuracion/clinica | PUT |
| Config | getScheduleConfig | /api/configuracion/horario | GET |
| Config | updateScheduleConfig | /api/configuracion/horario | PUT |
| Config | getSecurityConfig | /api/configuracion/seguridad | GET |
| Config | updateSecurityConfig | /api/configuracion/seguridad | PUT |
| Config | changePassword | /api/configuracion/contrasena | PUT |
| Config | getBillingConfig | /api/configuracion/facturacion | GET |
| Config | updateBillingConfig | /api/configuracion/facturacion | PUT |
| Config | getNotificationsConfig | /api/configuracion/notificaciones | GET |
| Config | updateNotificationsConfig | /api/configuracion/notificaciones | PUT |
| Config | getUsers | /api/configuracion/usuarios | GET |
| Config | createUser | /api/configuracion/usuarios | POST |
| Config | updateUser | /api/configuracion/usuarios/:id | PUT |
| Config | deleteUser | /api/configuracion/usuarios/:id | DELETE |
| Dashboard | getStats | /api/dashboard/stats | GET |

---

## 🔐 Authentication

All services use Bearer token authentication. The `apiClient` automatically includes the `Authorization: Bearer <token>` header on all requests.

Ensure the token is stored in localStorage or sessionStorage:

```typescript
// Set token after login
localStorage.setItem('authToken', jwtToken)

// Token is automatically sent with all requests
```

---

## ⚠️ Error Handling

All services throw errors in the standard format:

```typescript
{
  error: "Descripción del error",
  code: "ERROR_CODE"
}
```

Standard HTTP status codes:
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Failed
- `500` - Server Error

Example error handling:

```typescript
try {
  const patient = await patientsService.create(data)
} catch (error: any) {
  if (error.response?.status === 400) {
    console.error('Invalid data:', error.response.data.error)
  } else if (error.response?.status === 409) {
    console.error('Email already exists')
  } else {
    console.error('Unexpected error:', error)
  }
}
```

---

## 📦 Importing Services

### Option 1: Central Import
```typescript
import {
  patientsService,
  doctorsService,
  appointmentsService,
  clinicalRecordsService,
  configService,
  dashboardService
} from '@/services'
```

### Option 2: Individual Import
```typescript
import { patientsService } from '@/services/patients.service'
import { appointmentsService } from '@/services/appointments.service'
```

---

## ✅ API Ready Status

- ✅ All 33 endpoints documented
- ✅ Full TypeScript type coverage
- ✅ Request/response DTOs defined
- ✅ File upload support (multipart/form-data)
- ✅ Query parameter support
- ✅ Error handling standardized
- ✅ Authentication ready
- ✅ Ready for backend implementation

---

## 🚀 Next Steps

1. **Backend Implementation**: Implement the 33 endpoints according to Api.txt specifications
2. **Test Services**: Use these services in components to ensure backend compatibility
3. **Error Handling**: Implement proper error handling in components
4. **Loading States**: Add loading indicators during API calls
5. **Caching**: Consider implementing request caching for performance

For complete endpoint specifications, refer to `/backend/Api.txt`
