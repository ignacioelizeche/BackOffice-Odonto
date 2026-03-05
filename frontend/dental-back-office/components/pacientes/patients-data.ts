export interface ToothRecord {
  id: number
  date: string
  treatment: string
  doctor: string
  notes: string
  cost: number | string
  files?: File[]
}

export interface ToothData {
  number: number
  name: string
  status: "sano" | "tratado" | "en_tratamiento" | "extraccion" | "pendiente"
  records: ToothRecord[]
}

export interface Patient {
  id: number
  name: string
  initials: string
  email: string
  phone: string
  age: number
  gender: string
  lastVisit: string
  nextAppt: string | null
  doctor: string
  status: "activo" | "inactivo" | "nuevo"
  treatments: string[]
  totalVisits: number
  balance: number
  teeth?: ToothData[]
}

function generateTeeth(overrides: Record<number, Partial<ToothData>>): ToothData[] {
  const teethNames: Record<number, string> = {
    11: "Incisivo central sup. der.",
    12: "Incisivo lateral sup. der.",
    13: "Canino sup. der.",
    14: "Primer premolar sup. der.",
    15: "Segundo premolar sup. der.",
    16: "Primer molar sup. der.",
    17: "Segundo molar sup. der.",
    18: "Tercer molar sup. der.",
    21: "Incisivo central sup. izq.",
    22: "Incisivo lateral sup. izq.",
    23: "Canino sup. izq.",
    24: "Primer premolar sup. izq.",
    25: "Segundo premolar sup. izq.",
    26: "Primer molar sup. izq.",
    27: "Segundo molar sup. izq.",
    28: "Tercer molar sup. izq.",
    31: "Incisivo central inf. izq.",
    32: "Incisivo lateral inf. izq.",
    33: "Canino inf. izq.",
    34: "Primer premolar inf. izq.",
    35: "Segundo premolar inf. izq.",
    36: "Primer molar inf. izq.",
    37: "Segundo molar inf. izq.",
    38: "Tercer molar inf. izq.",
    41: "Incisivo central inf. der.",
    42: "Incisivo lateral inf. der.",
    43: "Canino inf. der.",
    44: "Primer premolar inf. der.",
    45: "Segundo premolar inf. der.",
    46: "Primer molar inf. der.",
    47: "Segundo molar inf. der.",
    48: "Tercer molar inf. der.",
  }

  const allNumbers = [
    18, 17, 16, 15, 14, 13, 12, 11,
    21, 22, 23, 24, 25, 26, 27, 28,
    48, 47, 46, 45, 44, 43, 42, 41,
    31, 32, 33, 34, 35, 36, 37, 38,
  ]

  return allNumbers.map((num) => {
    const override = overrides[num]
    return {
      number: num,
      name: teethNames[num] || `Diente ${num}`,
      status: override?.status || "sano",
      records: override?.records || [],
    }
  })
}

export const patients: Patient[] = [
  {
    id: 1,
    name: "Maria Garcia Lopez",
    initials: "MG",
    email: "maria.garcia@email.com",
    phone: "+52 55 1234 5678",
    age: 34,
    gender: "Femenino",
    lastVisit: "10 Feb 2026",
    nextAppt: "15 Feb 2026",
    doctor: "Dr. Carlos Mendez",
    status: "activo",
    treatments: ["Limpieza dental", "Blanqueamiento"],
    totalVisits: 12,
    balance: 0,
    teeth: generateTeeth({
      16: {
        status: "tratado",
        records: [
          { id: 1, date: "15 Ene 2026", treatment: "Resina compuesta", doctor: "Dr. Carlos Mendez", notes: "Caries oclusal clase I. Se realizo restauracion con resina compuesta A2.", cost: "$1,200" },
          { id: 2, date: "20 Mar 2025", treatment: "Limpieza profunda", doctor: "Dra. Ana Torres", notes: "Acumulacion de sarro moderada. Se realizo profilaxis completa.", cost: "$600" },
        ],
      },
      24: {
        status: "en_tratamiento",
        records: [
          { id: 3, date: "10 Feb 2026", treatment: "Endodoncia - Fase 1", doctor: "Dr. Carlos Mendez", notes: "Pulpitis irreversible. Se inicio tratamiento de conductos. Se coloco medicamento intraconducto.", cost: "$3,500" },
        ],
      },
      36: {
        status: "tratado",
        records: [
          { id: 4, date: "5 Sep 2025", treatment: "Corona de porcelana", doctor: "Dr. Carlos Mendez", notes: "Fractura cuspidea mesial. Se preparo y se coloco corona de porcelana.", cost: "$5,800" },
          { id: 5, date: "12 Ago 2025", treatment: "Endodoncia completa", doctor: "Dra. Ana Torres", notes: "Tratamiento de conductos completado exitosamente. 3 conductos.", cost: "$4,200" },
        ],
      },
      46: {
        status: "pendiente",
        records: [
          { id: 6, date: "10 Feb 2026", treatment: "Evaluacion", doctor: "Dr. Carlos Mendez", notes: "Se detecta caries interproximal. Se programa restauracion.", cost: "$0" },
        ],
      },
      18: {
        status: "extraccion",
        records: [
          { id: 7, date: "3 Jun 2024", treatment: "Extraccion simple", doctor: "Dra. Elena Rios", notes: "Tercer molar impactado. Extraccion sin complicaciones.", cost: "$1,800" },
        ],
      },
      28: {
        status: "extraccion",
        records: [
          { id: 8, date: "3 Jun 2024", treatment: "Extraccion simple", doctor: "Dra. Elena Rios", notes: "Tercer molar semi-impactado. Extraccion sin complicaciones.", cost: "$1,800" },
        ],
      },
    }),
  },
  {
    id: 2,
    name: "Juan Rodriguez Perez",
    initials: "JR",
    email: "juan.rodriguez@email.com",
    phone: "+52 55 2345 6789",
    age: 45,
    gender: "Masculino",
    lastVisit: "8 Feb 2026",
    nextAppt: "20 Feb 2026",
    doctor: "Dra. Ana Torres",
    status: "activo",
    treatments: ["Extraccion molar", "Radiografia"],
    totalVisits: 8,
    balance: 1200,
    teeth: generateTeeth({
      14: {
        status: "tratado",
        records: [
          { id: 9, date: "8 Feb 2026", treatment: "Amalgama", doctor: "Dra. Ana Torres", notes: "Caries profunda. Restauracion con amalgama clase II.", cost: "$900" },
        ],
      },
      26: {
        status: "en_tratamiento",
        records: [
          { id: 10, date: "8 Feb 2026", treatment: "Implante - Fase quirurgica", doctor: "Dra. Ana Torres", notes: "Colocacion de implante oseointegrado. Periodo de espera 3 meses.", cost: "$12,000" },
        ],
      },
      37: {
        status: "tratado",
        records: [
          { id: 11, date: "15 Nov 2025", treatment: "Resina compuesta", doctor: "Dr. Luis Herrera", notes: "Caries cervical. Restauracion con resina fluida.", cost: "$800" },
        ],
      },
      48: {
        status: "extraccion",
        records: [
          { id: 12, date: "20 Oct 2025", treatment: "Extraccion quirurgica", doctor: "Dra. Elena Rios", notes: "Molar impactado horizontalmente. Cirugia con sutura.", cost: "$2,500" },
        ],
      },
      45: {
        status: "pendiente",
        records: [
          { id: 13, date: "8 Feb 2026", treatment: "Diagnostico", doctor: "Dra. Ana Torres", notes: "Sensibilidad al frio. Se requiere valorar posible caries.", cost: "$0" },
        ],
      },
    }),
  },
  {
    id: 3,
    name: "Sofia Martinez Ruiz",
    initials: "SM",
    email: "sofia.martinez@email.com",
    phone: "+52 55 3456 7890",
    age: 28,
    gender: "Femenino",
    lastVisit: "12 Feb 2026",
    nextAppt: "18 Feb 2026",
    doctor: "Dr. Luis Herrera",
    status: "activo",
    treatments: ["Ortodoncia - Ajuste", "Limpieza"],
    totalVisits: 24,
    balance: 0,
    teeth: generateTeeth({
      11: {
        status: "en_tratamiento",
        records: [
          { id: 14, date: "12 Feb 2026", treatment: "Ortodoncia - Ajuste bracket", doctor: "Dr. Luis Herrera", notes: "Ajuste de arco NiTi .016. Progreso favorable en alineacion.", cost: "$500" },
          { id: 15, date: "15 Ene 2026", treatment: "Ortodoncia - Ajuste bracket", doctor: "Dr. Luis Herrera", notes: "Cambio de ligaduras elasticas. Revision de avance.", cost: "$500" },
        ],
      },
      21: {
        status: "en_tratamiento",
        records: [
          { id: 16, date: "12 Feb 2026", treatment: "Ortodoncia - Ajuste bracket", doctor: "Dr. Luis Herrera", notes: "Diastema central reduciendose. Continuamos con elasticos.", cost: "$0" },
        ],
      },
      33: {
        status: "tratado",
        records: [
          { id: 17, date: "10 Ago 2025", treatment: "Resina estetica", doctor: "Dr. Carlos Mendez", notes: "Restauracion estetica por fractura de borde incisal.", cost: "$1,500" },
        ],
      },
    }),
  },
  {
    id: 4,
    name: "Pedro Sanchez Diaz",
    initials: "PS",
    email: "pedro.sanchez@email.com",
    phone: "+52 55 4567 8901",
    age: 52,
    gender: "Masculino",
    lastVisit: "5 Feb 2026",
    nextAppt: null,
    doctor: "Dra. Elena Rios",
    status: "inactivo",
    treatments: ["Endodoncia", "Corona"],
    totalVisits: 6,
    balance: 3500,
    teeth: generateTeeth({
      15: {
        status: "tratado",
        records: [
          { id: 18, date: "5 Feb 2026", treatment: "Corona metalica", doctor: "Dra. Elena Rios", notes: "Corona metalica cementada. Buen ajuste marginal.", cost: "$4,500" },
          { id: 19, date: "20 Ene 2026", treatment: "Endodoncia", doctor: "Dra. Elena Rios", notes: "Tratamiento de conductos completo. 2 conductos obturados.", cost: "$3,800" },
        ],
      },
      36: {
        status: "extraccion",
        records: [
          { id: 20, date: "10 Dic 2025", treatment: "Extraccion", doctor: "Dra. Elena Rios", notes: "Pieza no restaurable. Extraccion sin complicaciones.", cost: "$1,500" },
        ],
      },
      46: {
        status: "pendiente",
        records: [
          { id: 21, date: "5 Feb 2026", treatment: "Valoracion", doctor: "Dra. Elena Rios", notes: "Caries extensa. Se recomienda endodoncia + corona.", cost: "$0" },
        ],
      },
    }),
  },
  {
    id: 5,
    name: "Laura Fernandez Gil",
    initials: "LF",
    email: "laura.fernandez@email.com",
    phone: "+52 55 5678 9012",
    age: 31,
    gender: "Femenino",
    lastVisit: "11 Feb 2026",
    nextAppt: "16 Feb 2026",
    doctor: "Dr. Carlos Mendez",
    status: "activo",
    treatments: ["Limpieza dental"],
    totalVisits: 3,
    balance: 0,
    teeth: generateTeeth({
      27: {
        status: "tratado",
        records: [
          { id: 22, date: "11 Feb 2026", treatment: "Sellante de fisuras", doctor: "Dr. Carlos Mendez", notes: "Aplicacion preventiva de sellante en fosas y fisuras.", cost: "$400" },
        ],
      },
    }),
  },
  {
    id: 6,
    name: "Roberto Alvarez Mora",
    initials: "RA",
    email: "roberto.alvarez@email.com",
    phone: "+52 55 6789 0123",
    age: 39,
    gender: "Masculino",
    lastVisit: "12 Feb 2026",
    nextAppt: "25 Feb 2026",
    doctor: "Dra. Ana Torres",
    status: "nuevo",
    treatments: ["Consulta inicial", "Radiografia panoramica"],
    totalVisits: 1,
    balance: 800,
    teeth: generateTeeth({
      17: {
        status: "pendiente",
        records: [
          { id: 23, date: "12 Feb 2026", treatment: "Diagnostico radiografico", doctor: "Dra. Ana Torres", notes: "Caries oclusal detectada en radiografia. Programar restauracion.", cost: "$0" },
        ],
      },
      38: {
        status: "pendiente",
        records: [
          { id: 24, date: "12 Feb 2026", treatment: "Diagnostico", doctor: "Dra. Ana Torres", notes: "Tercer molar semi-erupcionado. Valorar extraccion.", cost: "$0" },
        ],
      },
    }),
  },
  {
    id: 7,
    name: "Carmen Ruiz Hernandez",
    initials: "CR",
    email: "carmen.ruiz@email.com",
    phone: "+52 55 7890 1234",
    age: 41,
    gender: "Femenino",
    lastVisit: "9 Feb 2026",
    nextAppt: "22 Feb 2026",
    doctor: "Dr. Luis Herrera",
    status: "activo",
    treatments: ["Ortodoncia", "Limpieza"],
    totalVisits: 18,
    balance: 0,
    teeth: generateTeeth({
      22: {
        status: "en_tratamiento",
        records: [
          { id: 25, date: "9 Feb 2026", treatment: "Ortodoncia - Ajuste", doctor: "Dr. Luis Herrera", notes: "Rotacion corrigiendose. Progreso satisfactorio.", cost: "$500" },
        ],
      },
      34: {
        status: "tratado",
        records: [
          { id: 26, date: "15 Jul 2025", treatment: "Resina compuesta", doctor: "Dr. Carlos Mendez", notes: "Caries mesial. Restauracion con resina A3.", cost: "$1,100" },
        ],
      },
    }),
  },
  {
    id: 8,
    name: "Diego Torres Vega",
    initials: "DT",
    email: "diego.torres@email.com",
    phone: "+52 55 8901 2345",
    age: 26,
    gender: "Masculino",
    lastVisit: "7 Feb 2026",
    nextAppt: null,
    doctor: "Dra. Elena Rios",
    status: "inactivo",
    treatments: ["Blanqueamiento"],
    totalVisits: 2,
    balance: 0,
    teeth: generateTeeth({}),
  },
  {
    id: 9,
    name: "Isabel Gomez Luna",
    initials: "IG",
    email: "isabel.gomez@email.com",
    phone: "+52 55 9012 3456",
    age: 55,
    gender: "Femenino",
    lastVisit: "11 Feb 2026",
    nextAppt: "14 Feb 2026",
    doctor: "Dr. Carlos Mendez",
    status: "activo",
    treatments: ["Implante dental", "Corona", "Limpieza"],
    totalVisits: 15,
    balance: 5200,
    teeth: generateTeeth({
      14: {
        status: "tratado",
        records: [
          { id: 27, date: "11 Feb 2026", treatment: "Corona de zirconia", doctor: "Dr. Carlos Mendez", notes: "Corona definitiva cementada sobre implante. Oclusion ajustada.", cost: "$7,500" },
          { id: 28, date: "10 Nov 2025", treatment: "Implante - Pilar", doctor: "Dr. Carlos Mendez", notes: "Colocacion de pilar protesico. Impresion para corona.", cost: "$3,000" },
          { id: 29, date: "5 Ago 2025", treatment: "Implante - Fase quirurgica", doctor: "Dra. Elena Rios", notes: "Colocacion de implante. Osointegracion en 4 meses.", cost: "$12,000" },
        ],
      },
      25: {
        status: "en_tratamiento",
        records: [
          { id: 30, date: "11 Feb 2026", treatment: "Implante - Fase quirurgica", doctor: "Dr. Carlos Mendez", notes: "Segundo implante colocado. Esperar osointegracion.", cost: "$12,000" },
        ],
      },
      36: {
        status: "extraccion",
        records: [
          { id: 31, date: "1 Jul 2025", treatment: "Extraccion", doctor: "Dra. Elena Rios", notes: "Pieza fracturada verticalmente. Extraccion con separacion de raices.", cost: "$2,200" },
        ],
      },
      47: {
        status: "tratado",
        records: [
          { id: 32, date: "20 Abr 2025", treatment: "Incrustacion de porcelana", doctor: "Dr. Carlos Mendez", notes: "Incrustacion onlay cementada. Excelente adaptacion.", cost: "$4,800" },
        ],
      },
    }),
  },
  {
    id: 10,
    name: "Fernando Castillo Rey",
    initials: "FC",
    email: "fernando.castillo@email.com",
    phone: "+52 55 0123 4567",
    age: 37,
    gender: "Masculino",
    lastVisit: "12 Feb 2026",
    nextAppt: "19 Feb 2026",
    doctor: "Dra. Ana Torres",
    status: "nuevo",
    treatments: ["Consulta inicial"],
    totalVisits: 1,
    balance: 0,
    teeth: generateTeeth({
      16: {
        status: "pendiente",
        records: [
          { id: 33, date: "12 Feb 2026", treatment: "Evaluacion inicial", doctor: "Dra. Ana Torres", notes: "Caries oclusal moderada detectada. Se requiere restauracion.", cost: "$0" },
        ],
      },
      35: {
        status: "pendiente",
        records: [
          { id: 34, date: "12 Feb 2026", treatment: "Evaluacion inicial", doctor: "Dra. Ana Torres", notes: "Posible caries interproximal. Se solicita radiografia periapical.", cost: "$0" },
        ],
      },
    }),
  },
]
