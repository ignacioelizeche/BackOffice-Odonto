# N8N Agendamiento v2 Workflow - Doctor Selection Flow Fix

## Problem Statement
After selecting a doctor, the WhatsApp flow was showing the old message:
```
"¿Para qué día querés agendar la consulta?
📅 Escribí la fecha en formato DD/MM/AAAA."
```

Users were expected to manually type dates in DD/MM/YYYY format instead of seeing numbered date options.

## Solution Implemented

### Changes Made

#### 1. **Modified Code Node Message** (Code in JavaScript2)
**Before:**
```javascript
mensaje: `Perfecto 👍\nElegiste a ${doctorElegido.name}.\n\n¿Para qué día querés agendar la consulta?\n\n📅 Escribí la fecha en formato DD/MM/AAAA.`
```

**After:**
```javascript
mensaje: `Consultando fechas disponibles con ${doctorElegido.name}... ⏳`
```

#### 2. **Updated Workflow Connections**

**Connection 1: Is_selection_valid (true branch)**
```
Before: Is_selection_valid → Fecha → Set_fecha → Set_DoctorId
After:  Is_selection_valid → Fecha → Set_DoctorId
```

**Connection 2: Fecha Message Node**
```
Before: Fecha → Set_fecha
After:  Fecha → Set_DoctorId
```

**Connection 3: Set_DoctorName to Get_DoctorId**
```
Before: Set_DoctorName → (disconnected - empty connection)
After:  Set_DoctorName → Get_DoctorId
```

### Complete New Flow Path

```
┌─ Doctor Selection ──────────────────────────────────────┐
│ User selects doctor number (1-N)                         │
└────────────────────┬──────────────────────────────────────┘
                     ↓
         str->arr (Parse doctors array)
                     ↓
    Code in JavaScript2 (Validate selection)
                     ↓
         Is_selection_valid (Check validity)
                  ✓ Valid ✗ Invalid
                     |         |
                     ↓         ↓
                  Fecha   NumeroInvalido
                     ↓     (Send error msg)
        [SEND: "Consultando fechas disponibles con {doctor}... ⏳"]
                     ↓
            Set_DoctorId (Store doctor ID in Redis)
                     ↓
           Set_DoctorName (Store doctor name in Redis)
                     ↓
             Get_DoctorId (Retrieve from Redis)
                     ↓
            Get_DoctorName (Retrieve from Redis)
                     ↓
      HTTP_NextAvailableDates (Call backend API)
                     ↓
         Build_Dates_Message (Format 7 date options)
                     ↓
    ┌───── HasSlots (Check if dates available) ─────┐
    │                                                │
✓ Available                          ✗ No Availability
    │                                                │
    ↓                                                ↓
  Hora                                           NoSlots
[SEND dates with 1️⃣-7️⃣ emojis]    [SEND error msg]
    │
    ↓
User responds with number (1-7)
    │
    ↓
Continue booking flow...
```

## API Endpoint Called

**POST /api/whatsapp-flow/next-available-dates**
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
    "id": <doctor_id>,
    "name": "Dr. Nombre",
    "preferred_slot_duration": 30
  },
  "dates": [
    {"date": "2024-03-25", "display": "25/03", "hasSlots": true},
    {"date": "2024-03-26", "display": "26/03", "hasSlots": true},
    ...
  ]
}
```

## User Experience Improvements

### Before
1. User: Selects doctor (e.g., "1")
2. Bot: "Escribí la fecha en formato DD/MM/AAAA"
3. User: Types date manually (error-prone, e.g., "25/03/2024")
4. Bot: Validates date
5. Bot: Shows time slots numbered 1-7
6. User: Selects time by number

### After
1. User: Selects doctor (e.g., "1")
2. Bot: "Consultando fechas disponibles con Dr. García... ⏳"
3. Bot: (Automatically calls backend to get dates)
4. Bot: "Estos son los próximos días disponibles:
          1️⃣ 25/03 ✅
          2️⃣ 26/03 ✅
          ...
          7️⃣ 31/03 ✅"
5. User: Selects date by number (e.g., "1")
6. Bot: Shows time slots for selected date
7. User: Selects time by number

## Key Benefits

✅ **Faster Booking**: No manual date typing needed
✅ **Better UX**: Numbered emoji options are clear and easy
✅ **Fewer Errors**: Backend validates dates, not user input
✅ **Automatic**: Dates loaded as soon as doctor selected
✅ **Consistent**: Follows same pattern as time selection (number-based)

## Files Modified

- `/home/Ignacio/Downloads/Temp/BackOffice_Odonto/N8N/Agendamiento_v2.json`

## Testing Checklist

- [ ] Doctor selection shows "Consultando fechas..." message
- [ ] Wait ~2-3 seconds for date loading
- [ ] Verify 7 numbered date options appear with emojis
- [ ] Select a date by number (1-7)
- [ ] Verify time slots appear for selected date
- [ ] Select time by number
- [ ] Complete booking successfully
- [ ] Check that appointment is visible in system

## Rollback Instructions

If issues occur, revert with:
```bash
git checkout N8N/Agendamiento_v2.json
```

Then reload the workflow in N8N.

## Related Documentation

- API: `/backend/app/routers/whatsapp_flow_api.py` - `next_available_dates` endpoint
- Frontend: Doctor scheduling component
- Database: Doctor availability configurations
