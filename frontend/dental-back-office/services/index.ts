/**
 * Central export for all API services
 *
 * Usage:
 * import { patientsService, appointmentsService, doctorsService, configService, dashboardService } from '@/services'
 */

export { patientsService, type Patient, type CreatePatientDTO, type UpdatePatientDTO, type AddDentalRecordDTO, type TreatmentRecord, type Tooth, type Attachment } from './patients.service'

export { doctorsService, type Doctor, type WorkDay, type ScheduleSlot } from './doctors.service'

export { appointmentsService, type Appointment, type CreateAppointmentDTO, type UpdateAppointmentDTO } from './appointments.service'

export { configService, type ClinicConfig, type ScheduleConfig, type SecurityConfig, type BillingConfig, type NotificationsConfig, type User } from './config.service'

export { dashboardService, type DashboardStats } from './dashboard.service'
