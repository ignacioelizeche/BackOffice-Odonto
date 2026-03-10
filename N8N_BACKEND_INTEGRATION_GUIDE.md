# N8N Integration Guide - Backend API Version

## 📋 Resumen

Esta guía explica cómo adaptar los workflows N8N existentes para usar el backend FastAPI como servicio de lógica, manteniendo N8N como orquestador y webhook handler.

**Ventajas de este enfoque:**
- ✅ N8N gestiona flujo y conversación (su uso correcto)
- ✅ Backend gestiona persistencia y lógica (separación de responsabilidades)
- ✅ Redis sigue para estado temporal en N8N
- ✅ BD centralizada en PostgreSQL
- ✅ Más fácil de debuggear y mantener
- ✅ Escalable fácilmente

---

## 🔄 Arquitectura sin código

```
WhatsApp Message (Evolution API)
        ↓
[N8N Webhook: /Reserva-de-turno]
        ↓
[N8N Get State from Redis]
        ↓
[N8N Switch/Route based on State]
        ↓
    ├─ PHASE 1 (NEW FLOW)
    │   └─ Call Backend: POST /api/whatsapp-flow/doctors
    │      ← Response: List of doctors
    │      └─ Send WhatsApp: "Elige un doctor"
    │      └─ Store: redis.SET("caller_id-state", "AGENDAMIENTO_DOCTOR")
    │
    ├─ PHASE 2 (USER SELECTED DOCTOR)
    │   └─ Call Backend: POST /api/whatsapp-flow/available-dates
    │      ← Response: Dates for next 7 days
    │      └─ Send WhatsApp: "¿Qué día?"
    │      └─ Store: redis.SET("caller_id-state", "AGENDAMIENTO_DATE")
    │
    ├─ PHASE 3 (USER SELECTED DATE)
    │   └─ Call Backend: POST /api/whatsapp-flow/available-times
    │      ← Response: Available time slots
    │      └─ Send WhatsApp: "¿Qué hora?"
    │      └─ Store: redis.SET("caller_id-state", "AGENDAMIENTO_TIME")
    │
    └─ PHASE 4 (USER SELECTED TIME)
        └─ Call Backend: POST /api/whatsapp-flow/create-appointment
           ← Response: Appointment created (ID, confirmation)
           └─ Send WhatsApp: "✅ Cita creada!"
           └─ Delete Redis: "caller_id-state"
```

---

## 🆕 Backend Endpoints Disponibles

### Para AGENDAMIENTO:

1. **GET DOCTORS**
   - URL: `POST /api/whatsapp-flow/doctors`
   - Request:
     ```json
     {
       "empresa_id": 1
     }
     ```
   - Response:
     ```json
     {
       "success": true,
       "doctors": [
         {"id": 1, "name": "Dr. Juan", "specialty": "General"},
         {"id": 2, "name": "Dra. María", "specialty": "Ortodoncia"}
       ],
       "message": "Doctores disponibles"
     }
     ```

2. **GET AVAILABLE DATES**
   - URL: `POST /api/whatsapp-flow/available-dates`
   - Request:
     ```json
     {
       "empresa_id": 1,
       "doctor_id": 1
     }
     ```
   - Response:
     ```json
     {
       "success": true,
       "dates": [
         {"date": "2026-03-09", "display": "09/03 (Lunes)"},
         {"date": "2026-03-10", "display": "10/03 (Martes)"}
       ],
       "message": "Fechas disponibles"
     }
     ```

3. **GET AVAILABLE TIMES**
   - URL: `POST /api/whatsapp-flow/available-times`
   - Request:
     ```json
     {
       "empresa_id": 1,
       "doctor_id": 1,
       "date": "2026-03-09"
     }
     ```
   - Response:
     ```json
     {
       "success": true,
       "times": ["10:00", "10:30", "11:00", "11:30"],
       "message": "Horarios disponibles"
     }
     ```

4. **CREATE APPOINTMENT**
   - URL: `POST /api/whatsapp-flow/create-appointment`
   - Request:
     ```json
     {
       "empresa_id": 1,
       "caller_id": "5491123456789",
       "doctor_id": 1,
       "date": "2026-03-09",
       "time": "10:00",
       "patient_name": "Juan Pérez"
     }
     ```
   - Response:
     ```json
     {
       "success": true,
       "appointment_id": 123,
       "message": "Cita creada exitosamente (ID: 123)"
     }
     ```

### Para REAGENDAMIENTO:

5. **GET PATIENT APPOINTMENTS**
   - URL: `POST /api/whatsapp-flow/patient-appointments`
   - Request:
     ```json
     {
       "empresa_id": 1,
       "caller_id": "5491123456789",
       "status": "pendiente"
     }
     ```
   - Response:
     ```json
     {
       "success": true,
       "appointments": [
         {
           "id": 123,
           "doctor_id": 1,
           "doctor_name": "Dr. Juan",
           "date": "2026-03-09",
           "time": "10:00",
           "status": "pendiente"
         }
       ],
       "message": "Citas encontradas"
     }
     ```

6. **RESCHEDULE APPOINTMENT**
   - URL: `POST /api/whatsapp-flow/reschedule-appointment`
   - Request:
     ```json
     {
       "empresa_id": 1,
       "appointment_id": 123,
       "new_date": "2026-03-15",
       "new_time": "14:00"
     }
     ```
   - Response:
     ```json
     {
       "success": true,
       "appointment_id": 123,
       "message": "Cita reagendada exitosamente"
     }
     ```

### Para CANCELACIÓN:

7. **CANCEL APPOINTMENT**
   - URL: `POST /api/whatsapp-flow/cancel-appointment`
   - Request:
     ```json
     {
       "empresa_id": 1,
       "appointment_id": 123
     }
     ```
   - Response:
     ```json
     {
       "success": true,
       "appointment_id": 123,
       "message": "Cita cancelada exitosamente"
     }
     ```

---

## 📝 Cómo Adaptar Workflows N8N Existentes

### PASO 1: Abrir Workflow AGENDAMIENTO en N8N

1. Ir a N8N Dashboard
2. Abrir workflow: "Agendamiento"
3. Hacer clic en ⋮ (puntos) → "Duplicate" o "Edit"
4. Nombrar como "Agendamiento_v2_Backend"

### PASO 2: Reemplazar Nodos

#### Remover:
- ❌ N8N DataTable nodes (GetDoctor, GetTurnos, GetHorario)
- ❌ Queries manuales a base de datos
- ❌ Validaciones manuales complejas

#### Agregar:
- ✅ HTTP Request nodes que llamen a Backend
- ✅ Switch node para enrutar por fases
- ✅ HTTP Request nodes hacia Evolution API
- ✅ Redis nodes para mantener estado

### PASO 3: Estructura del Workflow

**Workflow Structure:**
```
┌─ When Executed by Another Workflow
│  (Input: CallerID, Message, Instance, EmpresaID)
│
├─ Get State from Redis
│  (KEY: "{{ $json.CallerID }}-state")
│
├─ Switch Node (Route by State)
│  ├─ Empty → PHASE 1 (List Doctors)
│  ├─ AGENDAMIENTO_DOCTOR → PHASE 2 (List Dates)
│  ├─ AGENDAMIENTO_DATE → PHASE 3 (List Times)
│  └─ AGENDAMIENTO_TIME → PHASE 4 (Create)
│
├─ [PHASE 1] HTTP: GET /api/whatsapp-flow/doctors
├─ [PHASE 2] HTTP: GET /api/whatsapp-flow/available-dates
├─ [PHASE 3] HTTP: GET /api/whatsapp-flow/available-times
├─ [PHASE 4] HTTP: POST /api/whatsapp-flow/create-appointment
│
├─ HTTP: Send to Evolution API
│
└─ Update Redis State
   (KEY: "{{ $json.CallerID }}-state", TTL: 86400)
```

### PASO 4: Configurar HTTP Request Nodes

#### Nodo: "Get Doctors"
```
Type: N8N HTTP Request

Authentication: None
Method: POST
URL: http://192.168.2.33:8000/api/whatsapp-flow/doctors

Body (JSON):
{
  "empresa_id": "{{ $json.EmpresaID }}"
}

Options:
- Render with: Expression
- Return: Full Response
```

#### Nodo: "Get Available Dates"
```
Type: N8N HTTP Request

Method: POST
URL: http://192.168.2.33:8000/api/whatsapp-flow/available-dates

Body (JSON):
{
  "empresa_id": "{{ $json.EmpresaID }}",
  "doctor_id": "{{ $json.selected_doctor_id }}"
}
```

#### Nodo: "Get Available Times"
```
Type: N8N HTTP Request

Method: POST
URL: http://192.168.2.33:8000/api/whatsapp-flow/available-times

Body (JSON):
{
  "empresa_id": "{{ $json.EmpresaID }}",
  "doctor_id": "{{ $json.selected_doctor_id }}",
  "date": "{{ $json.selected_date }}"
}
```

#### Nodo: "Create Appointment"
```
Type: N8N HTTP Request

Method: POST
URL: http://192.168.2.33:8000/api/whatsapp-flow/create-appointment

Body (JSON):
{
  "empresa_id": "{{ $json.EmpresaID }}",
  "caller_id": "{{ $json.CallerID }}",
  "doctor_id": "{{ $json.selected_doctor_id }}",
  "date": "{{ $json.selected_date }}",
  "time": "{{ $json.selected_time }}",
  "patient_name": "{{ $json.patient_name }}"
}
```

### PASO 5: Configurar Nodo de Respuesta WhatsApp

```
Type: N8N HTTP Request (a Evolution API)

Method: POST
URL: http://192.168.2.33:30110/message/sendText/default

Body (JSON):
{
  "number": "{{ $json.CallerID }}",
  "text": "{{ $json.response_message }}"
}
```

### PASO 6: Actualizar Redis

```
Type: N8N Redis

Operation: Set
Key: "{{ $json.CallerID }}-state"
Value: "{{ $json.new_phase }}"
TTL: 86400 (24 horas)
```

---

## 📊 Estado de la Conversación (Redis Keys)

**Patrón de estado:**
```
caller_id-state → current phase (idle, AGENDAMIENTO_DOCTOR, AGENDAMIENTO_DATE, etc.)
```

**Lifecycle:**
```
1. User says "agendar"
   → Set: "5491234567-state" = "AGENDAMIENTO_DOCTOR"

2. User selects doctor (1)
   → Set: "5491234567-selected_doctor_id" = "1"
   → Set: "5491234567-state" = "AGENDAMIENTO_DATE"

3. User selects date (09/03)
   → Set: "5491234567-selected_date" = "2026-03-09"
   → Set: "5491234567-state" = "AGENDAMIENTO_TIME"

4. User selects time (10:00)
   → Set: "5491234567-selected_time" = "10:00"
   → POST /api/whatsapp-flow/create-appointment
   → Delete: "5491234567-state"
   → Delete: "5491234567-selected_doctor_id"
   → Delete: "5491234567-selected_date"
   → Delete: "5491234567-selected_time"
```

---

## ✅ Paso a Paso: Crear Workflow Agendamiento_v2

### 1. Crear Workflow

```
N8N Dashboard → Create → Workflow
Name: "Agendamiento_v2_Backend"
```

### 2. Agregar Nodos (sin conexiones primero)

```
- Execute Workflow Trigger
  Input 1: CallerID
  Input 2: Message
  Input 3: Instance
  Input 4: EmpresaID

- Redis Node #1: "Get State"
  Operation: Get
  Key: {{ $json.CallerID }}-state

- HTTP Node #1: "Get Doctors"
- HTTP Node #2: "Get Dates"
- HTTP Node #3: "Get Times"
- HTTP Node #4: "Create Appointment"

- HTTP Node #5: "Send WhatsApp"

- Redis Node #2: "Set State"
  Operation: Set
  Key: {{ $json.CallerID }}-state
  Value: (depends on phase)

- Switch Node: "Route by State"
```

### 3. Conectar Flujo

```
1. Execute → Get State Redis
2. Get State Redis → Switch Node
3. Switch Node 4 outputs:
   - Output 1 (empty/new) → Get Doctors
   - Output 2 (DOCTOR phase) → Get Dates
   - Output 3 (DATE phase) → Get Times
   - Output 4 (TIME phase) → Create Appointment
4. All HTTP nodes → Send WhatsApp
5. Send WhatsApp → Set State Redis
```

### 4. Configurar Cada Nodo (como en PASO 4)

### 5. Guardar y Testear

```
- Guardar workflow
- Cambiar status a Active
- Enviar mensaje de prueba desde WhatsApp: "agendar"
- Verificar en N8N: Executions debe mostrar resultado
```

---

## 🔄 Para REAGENDAMIENTO y CANCELACIÓN

El proceso es similar, solo cambias los endpoints:

### Reagendamiento Workflow:
```
1. Get State → Switch by State
2. REAGENDAMIENTO_SELECT:
   → POST /api/whatsapp-flow/patient-appointments
   → Send list of appointments
3. REAGENDAMIENTO_DATE/TIME:
   → Same as agendamiento (GET /available-dates, etc.)
4. REAGENDAMIENTO_CONFIRM:
   → POST /api/whatsapp-flow/reschedule-appointment
```

### Cancelación Workflow:
```
1. Get State → Switch by State
2. CANCELACION_SELECT:
   → POST /api/whatsapp-flow/patient-appointments
   → Show which appointment to cancel
3. CANCELACION_CONFIRM:
   → Ask for confirmation
4. CANCELACION_FINAL:
   → POST /api/whatsapp-flow/cancel-appointment
```

---

## 🐛 Debugging

### Ver ejecuciones:
```
N8N Dashboard → Executions
Click en ejecución para ver:
- Input data
- Output de cada nodo
- Errores
```

### Ver Redis state:
```
redis-cli
KEYS "5491234567*"
GET "5491234567-state"
```

### Ver citas en backend:
```
curl http://192.168.2.33:8000/api/citas \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔒 Configuración de Producción

### Backend URL actualizar:
```
De: http://192.168.2.33:8000
A: https://tu-dominio.com/api
```

### Redis:
```
Mantener configuración actual
```

### Evolution API:
```
Mantener configuración actual
```

### N8N Credentials:
```
- Redis: Mismo que existe
- HTTP: Agregar credenciales si backend requiere auth
```

---

## ✨ Ventajas de esta Arquitectura

1. **Separación de responsabilidades:**
   - N8N = Orquestación + Webhook
   - Backend = Lógica + Persistencia

2. **Más fácil de mantener:**
   - Lógica en código Python (backend)
   - Flujo visual en N8N

3. **Más escalable:**
   - Backend puede crecer independientemente
   - N8N solo maneja flows

4. **Mejor debugging:**
   - Backend logs centralizados
   - N8N execution history

5. **Reutilizable:**
   - Backend API puede usarse desde otros clientes
   - N8N es solo un cliente

---

## 📞 Endpoints para Otros Clientes

Si quieres usar estos endpoints desde otros clientes (mobile app, web, etc.):

```
POST /api/whatsapp-flow/doctors
POST /api/whatsapp-flow/available-dates
POST /api/whatsapp-flow/available-times
POST /api/whatsapp-flow/create-appointment
POST /api/whatsapp-flow/patient-appointments
POST /api/whatsapp-flow/reschedule-appointment
POST /api/whatsapp-flow/cancel-appointment
```

---

## 🚀 Resumen

1. ✅ Backend creado con 7 endpoints
2. ✅ N8N maneja flujo y WhatsApp
3. ✅ Backend maneja lógica y BD
4. ✅ Redis para estado temporal
5. ✅ PostgreSQL para persistencia
6. ✅ Fácil de debuggear
7. ✅ Escalable y mantenible

**¡Listo para usar!**
