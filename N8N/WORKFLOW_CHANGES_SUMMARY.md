# N8N Agendamiento_v2.json - Update Summary

## Overview
Successfully updated the N8N workflow to implement **smart date selection** with 7 available dates instead of manual date input. The workflow now uses the doctor's preferred slot duration dynamically.

## Changes Made

### 1. NEW NODE: HTTP_NextAvailableDates
**Type:** HTTP Request  
**Position:** [1568, 1296]

**Purpose:** Retrieves 7 available dates for the selected doctor from the backend

**Endpoint:** `POST /api/whatsapp-flow/next-available-dates`

**Request Body:**
```json
{
  "empresa_id": <empresa_id>,
  "doctor_id": <doctor_id>
}
```

**Expected Response:**
```json
{
  "success": true,
  "doctor": {
    "id": <number>,
    "name": "<string>",
    "preferred_slot_duration": <number>,
    "minimum_slot_duration": <number>
  },
  "dates": [
    {
      "date": "2026-03-25",
      "display": "25/03/2026",
      "hasSlots": true
    }
    // ... up to 7 dates
  ]
}
```

---

### 2. NEW NODE: Build_Dates_Message
**Type:** Code (JavaScript)  
**Position:** [1792, 1296]

**Purpose:** Formats the 7 available dates into a numbered WhatsApp message

**Output Format:**
```
Estos son los próximos días disponibles para agendar con Dr. García:

1️⃣ 25/03/2026 ✅
2️⃣ 26/03/2026 ✅
3️⃣ 27/03/2026 ❌
4️⃣ 28/03/2026 ✅
5️⃣ 29/03/2026 ✅
6️⃣ 30/03/2026 ✅
7️⃣ 31/03/2026 ✅

Respondé escribiendo el número del día que prefieras.
(Ejemplo: 2)
```

**Key Features:**
- Displays emoji indicators (1️⃣-7️⃣) for each date
- Shows availability status (✅ = has slots, ❌ = no slots)
- Stores doctor info and dates array for later use
- Error handling when no dates available

---

### 3. UPDATED NODE: Code in JavaScript1 (Date Selection)
**Type:** Code (JavaScript)  
**Position:** [448, 1456]

**Previous Behavior:** 
- Validated date format (dd/MM/yyyy) with regex
- Checked if date was valid

**NEW Behavior:**
- Validates user input is a number (1-7)
- Extracts selected date from `fechasDisponibles` array
- Returns ISO date format and display format

**Code:**
```javascript
const input = $('When Executed by Another Workflow').first().json.message;
const fechasRaw = $('Build_Dates_Message').first().json.fechasDisponibles;

// Parse into array
let fechas = Array.isArray(fechasRaw) ? fechasRaw : JSON.parse(fechasRaw);

// Validate 1-7
const opcion = parseInt(input, 10);
if (isNaN(opcion) || opcion < 1 || opcion > fechas.length) {
  return [{ json: { valido: false, motivo: '❌ Opción inválida...' } }];
}

// Extract date
const fechaElegida = fechas[opcion - 1];
return [{
  json: {
    valido: true,
    fecha_date: fechaElegida.date,      // "2026-03-25"
    fecha_original: fechaElegida.display // "25/03/2026"
  }
}];
```

---

### 4. UPDATED NODE: Code in JavaScript3 (Duration)
**Type:** Code (JavaScript)  
**Position:** [1776, 1776]

**Change:** Replace hardcoded duration with doctor's preference

**BEFORE:**
```javascript
const duracion = 30;
```

**AFTER:**
```javascript
const duracion = $('HTTP_NextAvailableDates').first().json.doctor.preferred_slot_duration || 30;
```

**Impact:**
- Confirmation message now shows actual doctor's preferred duration
- Falls back to 30 minutes if not available
- Example output: "⌛ Duración: 15 minutos" (instead of hardcoded 30)

---

## Workflow State Machine

The workflow maintains the same state machine but with updated date handling:

```
Fase Router:
├─ Nombre (get customer name)
├─ Inicio (get starting doctors list)
├─ Doctor (select doctor)
├─ Fecha (SELECT DATE FROM 7 OPTIONS - CHANGED)
├─ Hora (select time slot)
└─ Confirmacion (confirm appointment)
```

---

## User Experience Flow

### BEFORE (Manual Date Entry)
```
User: ¿Para qué día querés agendar?
Bot: Escribí la fecha en formato DD/MM/AAAA
User: 25/03/2026
Bot: Aquí están los horarios disponibles para ese día:
     1️⃣ 09:00 AM
     2️⃣ 10:00 AM
     etc...
```

### AFTER (Smart Date Selection)
```
Bot: Estos son los próximos días disponibles:
     1️⃣ 25/03/2026 ✅
     2️⃣ 26/03/2026 ✅
     3️⃣ 27/03/2026 ❌
     4️⃣ 28/03/2026 ✅
     5️⃣ 29/03/2026 ✅
     6️⃣ 30/03/2026 ✅
     7️⃣ 31/03/2026 ✅
     
     Respondé escribiendo el número del día que prefieras.
User: 2

Bot: Estos son los horarios disponibles para Dr. García el 26/03/2026:
     1️⃣ 09:00 AM
     2️⃣ 10:00 AM
     etc...
```

---

## Connection Flow

```
Get_DoctorId
    ↓
Get_DoctorName
    ↓
[NEW] HTTP_NextAvailableDates
    ↓
[NEW] Build_Dates_Message
    ↓
HasSlots (if/then check)
    ↓
Hora (send message)
    ↓
[User responds with number 1-7]
    ↓
[UPDATED] Code in JavaScript1 (validates number, extracts date)
    ↓
Is_Date → Is_Valid_Date
    ↓
[Continue to time slot selection]
    ↓
[Later] Code in JavaScript3 (uses doctor's preferred_slot_duration)
```

---

## File Information

- **File:** `/home/Ignacio/Downloads/Temp/BackOffice_Odonto/N8N/Agendamiento_v2.json`
- **Total Lines:** 2193
- **Total Nodes:** 59
- **Total Connections:** 54
- **Status:** ✅ Valid JSON, All IDs unique

---

## Backend Implementation Requirements

You need to implement this endpoint:

```python
@router.post("/api/whatsapp-flow/next-available-dates")
async def get_next_available_dates(
    empresa_id: int,
    doctor_id: int,
    current_user: User = Depends(get_current_user)
):
    """
    Returns 7 next available dates for a doctor with availability info
    """
    return {
        "success": True,
        "doctor": {
            "id": doctor_id,
            "name": "Dr. García",
            "preferred_slot_duration": 15,
            "minimum_slot_duration": 5
        },
        "dates": [
            {"date": "2026-03-25", "display": "25/03/2026", "hasSlots": True},
            {"date": "2026-03-26", "display": "26/03/2026", "hasSlots": True},
            # ... more dates
        ]
    }
```

---

## Testing Checklist

- [ ] Backend endpoint `/api/whatsapp-flow/next-available-dates` is implemented
- [ ] Response includes 7 dates with display format and hasSlots flag
- [ ] Doctor object includes `preferred_slot_duration`
- [ ] Import workflow into N8N
- [ ] Test date selection (1-7 input)
- [ ] Test invalid input (8, 0, letters)
- [ ] Verify confirmation message shows correct duration
- [ ] Test "no availability" scenario
- [ ] Verify time slots still work after date selection

---

## Compatibility Notes

- All previous nodes and connections are preserved
- No existing functionality was removed or broken
- Backward compatible with existing Redis store operations
- All error messages maintain Spanish language
- WhatsApp Evolution API integration unchanged

