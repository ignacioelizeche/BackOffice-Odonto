# Crear Flujos N8N - Paso a Paso

## 1. CreateDoctorCalendar (Nuevo Workflow)

### Paso 1: Crear Webhook
1. En N8N, crea nuevo workflow: "CreateDoctorCalendar"
2. Agrega nodo: **Webhook** (n8n-nodes-base.webhook)
3. Configuración:
   - **HTTP Method**: POST
   - **Path**: `/webhook/create-doctor-calendar`
   - Copia la URL completa del webhook (la necesitarás para backend)
   - Guarda: `https://your-n8n.com/webhook/create-doctor-calendar`

### Paso 2: Agregar nodo HTTP GET para obtener datos del doctor
1. Agrega nodo: **HTTP Request**
2. Conecta desde el webhook
3. Configuración:
   - **Method**: GET
   - **URL**: `=http://localhost:8000/api/doctores/{{ $json.doctor_id }}`
   - **Simplify Output**: true
   - **Response Format**: JSON

### Paso 3: Crear Google Calendar
1. Agrega nodo: **Google Calendar**
2. Conecta desde el HTTP node anterior
3. Configuración:
   - **Credentials**: Tu cuenta de Google (service account)
   - **Resource**: Calendar
   - **Operation**: Create
   - **Summary**: `=Calendar - {{ $json.doctor_name }}`
   - **Description**: `=Appointments for {{ $json.doctor_name }}`
   - **Timezone**: America/Argentina/Buenos_Aires

### Paso 4: Callback de éxito al backend
1. Agrega nodo: **HTTP Request**
2. Conecta desde Google Calendar node
3. Configuración:
   - **Method**: POST
   - **URL**: `={{ $json.webhook_url }}`
   - **Body Type**: JSON
   - **Send Body**: true
   - **Body**:
   ```json
   {
     "doctor_id": {{ $('Webhook').item.json.doctor_id }},
     "calendar_id": "{{ $json.id }}",
     "calendar_email": "{{ $json.email }}"
   }
   ```

### Paso 5: Manejo de errores
1. Agrega nodo: **HTTP Request** (para error)
2. Conecta como alternativa si falla Google Calendar
3. Configuración:
   - **Method**: POST
   - **URL**: `={{ $json.webhook_url.replace('/doctor-calendar-created', '/doctor-calendar-error') }}`
   - **Body**:
   ```json
   {
     "doctor_id": {{ $('Webhook').item.json.doctor_id }},
     "error_message": "{{ $error.message }}"
   }
   ```

### Paso 6: Activar workflow
1. **Save** el workflow
2. Haz clic en **Activate** (arriba a la derecha)
3. Copia la URL del webhook y guárdala

---

## 2. Actualizar Agendamiento_v2 (Crear Citas)

### Ubicar el nodo Google Calendar existente
1. Abre **Agendamiento_v2** en N8N
2. Busca el nodo que dice "Google Calendar" con "Create an event"

### Paso 1: Agregar HTTP para obtener calendar_id
ANTES del nodo Google Calendar:
1. Agrega nodo: **HTTP Request** con nombre `Get_Doctor_Calendar`
2. Configuración:
   - **Method**: GET
   - **URL**: `=http://localhost:8000/api/doctores/{{ $json.doctor_id }}`
   - **Simplify Output**: true

### Paso 2: Actualizar parámetro calendar en Google Calendar
1. En el nodo "Create an event" de Google Calendar
2. Encuentra el parámetro **calendar**
3. Cambia de:
   ```
   calendar: "HARDCODED_CALENDAR_ID"
   ```
   A:
   ```
   calendar: "={{ $('Get_Doctor_Calendar').item.json.google_calendar_id }}"
   ```

### Paso 3: Guardar y testear
1. Save
2. Crea una cita de prueba
3. Verifica que aparezca en el calendario personal del doctor

---

## 3. Actualizar Cancelacion_v2 (Cancelar Citas)

### Paso 1: Agregar HTTP para obtener calendar_id
ANTES del nodo Google Calendar:
1. Agrega nodo: **HTTP Request** con nombre `Get_Doctor_Calendar`
2. Configuración:
   - **Method**: GET
   - **URL**: `=http://localhost:8000/api/doctores/{{ $json.doctor_id }}`
   - **Simplify Output**: true

### Paso 2: Actualizar parámetro calendar
1. En el nodo de Google Calendar (Delete operation)
2. Cambia de:
   ```
   calendar: "HARDCODED_CALENDAR_ID"
   ```
   A:
   ```
   calendar: "={{ $('Get_Doctor_Calendar').item.json.google_calendar_id }}"
   ```

### Paso 3: Guardar
1. Save

---

## 4. Actualizar Reagendamiento_v2 (Reagendar Citas)

### Paso 1: Agregar HTTP para obtener calendar_id
ANTES del nodo Google Calendar:
1. Agrega nodo: **HTTP Request** con nombre `Get_Doctor_Calendar`
2. Configuración:
   - **Method**: GET
   - **URL**: `=http://localhost:8000/api/doctores/{{ $json.doctor_id }}`
   - **Simplify Output**: true

### Paso 2: Actualizar parámetro calendar
1. En el nodo de Google Calendar (Update operation)
2. Cambia de:
   ```
   calendar: "HARDCODED_CALENDAR_ID"
   ```
   A:
   ```
   calendar: "={{ $('Get_Doctor_Calendar').item.json.google_calendar_id }}"
   ```

### Paso 3: Guardar
1. Save

---

## Configuración Final

1. **URL del webhook**: Copia la URL completa del webhook CreateDoctorCalendar
2. **Agregar a .env del backend**:
   ```env
   N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL=https://your-n8n.com/webhook/create-doctor-calendar
   BACKEND_URL=http://your-backend-ip:8000
   ```
3. **Reiniciar backend**

---

## Testing de Flujos

### Test 1: Crear Doctor (dispara CreateDoctorCalendar)
```bash
curl -X POST http://localhost:8000/api/doctores \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Test",
    "email": "dr.test@clinic.com",
    "phone": "555-1234",
    "specialty": "General",
    "licenseNumber": "LIC123",
    "yearsExperience": 5
  }'
```

**Verificar**:
- Backend dispara webhook a N8N (check N8N logs)
- N8N crea calendar en Google
- Backend recibe calendar_id y lo guarda

### Test 2: Verificar calendario se creó
```bash
curl -X GET http://localhost:8000/api/calendar/doctor/1/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Esperado**:
```json
{
  "calendar_configured": true,
  "calendar_id": "abc123@group.calendar.google.com",
  "calendar_email": "abc123@group.calendar.google.com",
  "sync_enabled": true
}
```

### Test 3: Crear cita (dispara Agendamiento_v2)
- Crea cita por WhatsApp o web
- Verifica que evento aparezca en Google Calendar personal del doctor

---

## Troubleshooting N8N

| Problema | Solución |
|----------|----------|
| Webhook no dispara | Verifica URL en backend matches webhook URL en N8N |
| Error 401 en HTTP request a backend | Verifica backend está accesible desde N8N. Intenta `http://docker-host:8000` si es Docker |
| Google Calendar retorna error | Verifica credenciales de Google están correctas. Verifica API está enabled |
| Calendar_id NULL en backend | Verifica callback HTTP está enviando `calendar_id` correctamente |

---

## Variables N8N Disponibles

En cualquier nodo, puedes usar:
- `$json.doctor_id` - ID del doctor
- `$json.doctor_name` - Nombre del doctor
- `$json.webhook_url` - URL del callback
- `$json.google_calendar_id` - Calendar ID (después de creado)

---

## Screenshots de Referencia

### Webhook Node Config
```
HTTP Method: POST
Path: /webhook/create-doctor-calendar
Authentication: None
```

### HTTP Request Node Config (Get Doctor)
```
Method: GET
URL: =http://localhost:8000/api/doctores/{{ $json.doctor_id }}
Simplify Output: ✓
```

### Google Calendar Node Config
```
Resource: Calendar
Operation: Create
Summary: =Calendar - {{ $json.doctor_name }}
Description: =Appointments for {{ $json.doctor_name }}
Timezone: America/Argentina/Buenos_Aires
```

### HTTP Callback Node Config
```
Method: POST
URL: ={{ $json.webhook_url }}
Body:
{
  "doctor_id": 1,
  "calendar_id": "...",
  "calendar_email": "..."
}
```
