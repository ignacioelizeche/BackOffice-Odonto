export interface WorkDay {
  day: string
  active: boolean
  startTime: string
  endTime: string
  breakStart: string
  breakEnd: string
}

export interface Doctor {
  id: number
  name: string
  initials: string
  email: string
  phone: string
  specialty: string
  licenseNumber: string
  status: "disponible" | "en-consulta" | "no-disponible"
  color?: string
  patientsToday: number
  patientsTotal: number
  rating: number
  reviewCount: number
  yearsExperience: number
  schedule: ScheduleSlot[]
  nextAppointments?: Appointment[]
  workSchedule: WorkDay[]
  monthlyStats: {
    completed: number
    cancelled: number
    revenue: string
  }
}

export interface ScheduleSlot {
  time: string
  patient: string | null
  treatment: string | null
  status: "ocupado" | "libre" | "descanso"
}

export interface Appointment {
  time: string
  patient: string
  treatment: string
}

export const doctors: Doctor[] = [
  {
    id: 1,
    name: "Dr. Carlos Mendez",
    initials: "CM",
    email: "carlos.mendez@dentalcare.com",
    phone: "+52 55 1111 2222",
    specialty: "Odontologia General",
    licenseNumber: "CDO-2015-4821",
    status: "disponible",
    color: "bg-primary",
    patientsToday: 8,
    patientsTotal: 342,
    rating: 4.9,
    reviewCount: 128,
    yearsExperience: 11,
    schedule: [
      { time: "09:00", patient: "Maria Garcia", treatment: "Limpieza dental", status: "ocupado" },
      { time: "09:30", patient: null, treatment: null, status: "libre" },
      { time: "10:00", patient: "Laura Fernandez", treatment: "Endodoncia", status: "ocupado" },
      { time: "10:30", patient: null, treatment: null, status: "libre" },
      { time: "11:00", patient: "Isabel Gomez", treatment: "Implante dental", status: "ocupado" },
      { time: "11:30", patient: null, treatment: null, status: "libre" },
      { time: "12:00", patient: null, treatment: null, status: "descanso" },
      { time: "12:30", patient: null, treatment: null, status: "descanso" },
      { time: "13:00", patient: "Ana Vargas", treatment: "Limpieza dental", status: "ocupado" },
    ],
    nextAppointments: [
      { time: "09:00", patient: "Maria Garcia", treatment: "Limpieza dental" },
      { time: "10:00", patient: "Laura Fernandez", treatment: "Endodoncia" },
      { time: "11:00", patient: "Isabel Gomez", treatment: "Implante dental" },
    ],
    workSchedule: [
      { day: "Lunes", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
      { day: "Martes", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
      { day: "Miercoles", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
      { day: "Jueves", active: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
      { day: "Viernes", active: true, startTime: "09:00", endTime: "16:00", breakStart: "13:00", breakEnd: "14:00" },
      { day: "Sabado", active: true, startTime: "09:00", endTime: "13:00", breakStart: "", breakEnd: "" },
      { day: "Domingo", active: false, startTime: "", endTime: "", breakStart: "", breakEnd: "" },
    ],
    monthlyStats: { completed: 96, cancelled: 4, revenue: "$14,200" },
  },
  {
    id: 2,
    name: "Dra. Ana Torres",
    initials: "AT",
    email: "ana.torres@dentalcare.com",
    phone: "+52 55 3333 4444",
    specialty: "Cirugia Oral",
    licenseNumber: "CDO-2012-3156",
    status: "en-consulta",
    color: "bg-accent",
    patientsToday: 6,
    patientsTotal: 287,
    rating: 4.8,
    reviewCount: 95,
    yearsExperience: 14,
    schedule: [
      { time: "09:00", patient: "Juan Rodriguez", treatment: "Extraccion molar", status: "ocupado" },
      { time: "09:30", patient: "Roberto Alvarez", treatment: "Implante dental", status: "ocupado" },
      { time: "10:00", patient: null, treatment: null, status: "libre" },
      { time: "10:30", patient: "Fernando Castillo", treatment: "Consulta", status: "ocupado" },
      { time: "11:00", patient: null, treatment: null, status: "libre" },
      { time: "11:30", patient: null, treatment: null, status: "descanso" },
      { time: "12:00", patient: null, treatment: null, status: "descanso" },
      { time: "12:30", patient: "Diana Morales", treatment: "Cirugia menor", status: "ocupado" },
    ],
    nextAppointments: [
      { time: "09:00", patient: "Juan Rodriguez", treatment: "Extraccion molar" },
      { time: "09:30", patient: "Roberto Alvarez", treatment: "Implante dental" },
      { time: "10:30", patient: "Fernando Castillo", treatment: "Consulta" },
    ],
    workSchedule: [
      { day: "Lunes", active: true, startTime: "08:00", endTime: "17:00", breakStart: "12:00", breakEnd: "13:00" },
      { day: "Martes", active: true, startTime: "08:00", endTime: "17:00", breakStart: "12:00", breakEnd: "13:00" },
      { day: "Miercoles", active: false, startTime: "", endTime: "", breakStart: "", breakEnd: "" },
      { day: "Jueves", active: true, startTime: "08:00", endTime: "17:00", breakStart: "12:00", breakEnd: "13:00" },
      { day: "Viernes", active: true, startTime: "08:00", endTime: "17:00", breakStart: "12:00", breakEnd: "13:00" },
      { day: "Sabado", active: true, startTime: "09:00", endTime: "14:00", breakStart: "", breakEnd: "" },
      { day: "Domingo", active: false, startTime: "", endTime: "", breakStart: "", breakEnd: "" },
    ],
    monthlyStats: { completed: 72, cancelled: 6, revenue: "$18,600" },
  },
  {
    id: 3,
    name: "Dr. Luis Herrera",
    initials: "LH",
    email: "luis.herrera@dentalcare.com",
    phone: "+52 55 5555 6666",
    specialty: "Ortodoncia",
    licenseNumber: "CDO-2018-7293",
    status: "disponible",
    color: "bg-[hsl(215,25%,20%)]",
    patientsToday: 5,
    patientsTotal: 198,
    rating: 4.7,
    reviewCount: 76,
    yearsExperience: 8,
    schedule: [
      { time: "09:00", patient: "Sofia Martinez", treatment: "Ortodoncia - Ajuste", status: "ocupado" },
      { time: "09:30", patient: null, treatment: null, status: "libre" },
      { time: "10:00", patient: "Carmen Ruiz", treatment: "Ortodoncia - Revision", status: "ocupado" },
      { time: "10:30", patient: null, treatment: null, status: "libre" },
      { time: "11:00", patient: null, treatment: null, status: "libre" },
      { time: "11:30", patient: "Miguel Santos", treatment: "Ortodoncia - Colocacion", status: "ocupado" },
      { time: "12:00", patient: null, treatment: null, status: "descanso" },
    ],
    nextAppointments: [
      { time: "09:00", patient: "Sofia Martinez", treatment: "Ortodoncia - Ajuste" },
      { time: "10:00", patient: "Carmen Ruiz", treatment: "Ortodoncia - Revision" },
      { time: "11:30", patient: "Miguel Santos", treatment: "Ortodoncia - Colocacion" },
    ],
    workSchedule: [
      { day: "Lunes", active: true, startTime: "10:00", endTime: "19:00", breakStart: "14:00", breakEnd: "15:00" },
      { day: "Martes", active: true, startTime: "10:00", endTime: "19:00", breakStart: "14:00", breakEnd: "15:00" },
      { day: "Miercoles", active: true, startTime: "10:00", endTime: "19:00", breakStart: "14:00", breakEnd: "15:00" },
      { day: "Jueves", active: false, startTime: "", endTime: "", breakStart: "", breakEnd: "" },
      { day: "Viernes", active: true, startTime: "10:00", endTime: "19:00", breakStart: "14:00", breakEnd: "15:00" },
      { day: "Sabado", active: false, startTime: "", endTime: "", breakStart: "", breakEnd: "" },
      { day: "Domingo", active: false, startTime: "", endTime: "", breakStart: "", breakEnd: "" },
    ],
    monthlyStats: { completed: 64, cancelled: 2, revenue: "$12,800" },
  },
  {
    id: 4,
    name: "Dra. Elena Rios",
    initials: "ER",
    email: "elena.rios@dentalcare.com",
    phone: "+52 55 7777 8888",
    specialty: "Endodoncia",
    licenseNumber: "CDO-2016-5487",
    status: "en-consulta",
    color: "bg-primary",
    patientsToday: 7,
    patientsTotal: 256,
    rating: 4.9,
    reviewCount: 112,
    yearsExperience: 10,
    schedule: [
      { time: "09:00", patient: "Pedro Sanchez", treatment: "Endodoncia", status: "ocupado" },
      { time: "09:30", patient: "Lucia Reyes", treatment: "Endodoncia", status: "ocupado" },
      { time: "10:00", patient: null, treatment: null, status: "libre" },
      { time: "10:30", patient: "Pablo Navarro", treatment: "Corona", status: "ocupado" },
      { time: "11:00", patient: "Teresa Lozano", treatment: "Endodoncia", status: "ocupado" },
      { time: "11:30", patient: null, treatment: null, status: "libre" },
      { time: "12:00", patient: null, treatment: null, status: "descanso" },
      { time: "12:30", patient: "Diego Torres", treatment: "Consulta", status: "ocupado" },
    ],
    nextAppointments: [
      { time: "09:00", patient: "Pedro Sanchez", treatment: "Endodoncia" },
      { time: "09:30", patient: "Lucia Reyes", treatment: "Endodoncia" },
      { time: "10:30", patient: "Pablo Navarro", treatment: "Corona" },
    ],
    workSchedule: [
      { day: "Lunes", active: true, startTime: "08:30", endTime: "17:30", breakStart: "12:30", breakEnd: "13:30" },
      { day: "Martes", active: true, startTime: "08:30", endTime: "17:30", breakStart: "12:30", breakEnd: "13:30" },
      { day: "Miercoles", active: true, startTime: "08:30", endTime: "17:30", breakStart: "12:30", breakEnd: "13:30" },
      { day: "Jueves", active: true, startTime: "08:30", endTime: "17:30", breakStart: "12:30", breakEnd: "13:30" },
      { day: "Viernes", active: true, startTime: "08:30", endTime: "15:00", breakStart: "12:30", breakEnd: "13:30" },
      { day: "Sabado", active: false, startTime: "", endTime: "", breakStart: "", breakEnd: "" },
      { day: "Domingo", active: false, startTime: "", endTime: "", breakStart: "", breakEnd: "" },
    ],
    monthlyStats: { completed: 88, cancelled: 3, revenue: "$16,400" },
  },
]
