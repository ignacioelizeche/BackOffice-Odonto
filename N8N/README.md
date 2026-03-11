# N8N Workflows - Guía de Implementación Completa

## Archivos Disponibles

### 1. **WORKFLOW_CREATION_STEP_BY_STEP.md** ← **LEE ESTO PRIMERO**
   - Instrucciones detalladas línea por línea
   - Cómo crear cada nodo en N8N UI
   - Configuración exacta para cada parámetro

### 2. **CreateDoctorCalendar.json**
   - Plantilla JSON que puedes importar en N8N (opcional)
   - Requiere ajustes manuales

### 3. **test_n8n_workflows.py**
   - Script para verificar que todo funciona
   - Testea conexión, webhooks, creación de calendarios

---

## 🚀 Quick Start (Resumen)

### Paso 1: Entender la Arquitectura
```
Doctor Creation
    ↓
Backend dispara webhook a N8N
    ↓
N8N CreateDoctorCalendar workflow
    ↓
N8N crea Google Calendar
    ↓
N8N callback a Backend
    ↓
Backend guarda calendar_id
```

### Paso 2: Crear Workflows en N8N (30 minutos)

**CreateDoctorCalendar (nuevo)**
- 1 webhook
- 1 HTTP GET (obtener doctor)
- 1 Google Calendar (crear)
- 2 HTTP POST (callbacks)
- Total: 5 nodos

[VER: WORKFLOW_CREATION_STEP_BY_STEP.md - Sección "CreateDoctorCalendar"]

**Agendamiento_v2 (modificar)**
- Agregar 1 HTTP GET (obtener doctor)
- Cambiar 1 línea en Google Calendar

[VER: WORKFLOW_CREATION_STEP_BY_STEP.md - Sección "Actualizar Agendamiento_v2"]

**Cancelacion_v2 (modificar)**
- Agregar 1 HTTP GET (obtener doctor)
- Cambiar 1 línea en Google Calendar

[VER: WORKFLOW_CREATION_STEP_BY_STEP.md - Sección "Actualizar Cancelacion_v2"]

**Reagendamiento_v2 (modificar)**
- Agregar 1 HTTP GET (obtener doctor)
- Cambiar 1 línea en Google Calendar

[VER: WORKFLOW_CREATION_STEP_BY_STEP.md - Sección "Actualizar Reagendamiento_v2"]

### Paso 3: Configurar Backend

**Variables de entorno (.env)**
```env
N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL=https://your-n8n.com/webhook/create-doctor-calendar
BACKEND_URL=http://your-backend:8000
```

**Base de datos**
```bash
psql -U user -d database -f backend/migrations/007_add_doctor_google_calendar_fields.sql
```

**Python**
```bash
pip install -r requirements.txt
# (No hay dependencias nuevas de Google)
```

**Reiniciar**
```bash
cd backend
python -m uvicorn main:app --reload
```

### Paso 4: Testear

**Script de test**
```bash
python test_n8n_workflows.py
```

**Manual**
```bash
# Crear doctor
curl -X POST http://localhost:8000/api/doctores \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test", "email":"test@clinic.com", "phone":"555-1234", "specialty":"General", "licenseNumber":"LIC123", "yearsExperience":5}'

# Verificar calendar creado
curl -X GET http://localhost:8000/api/calendar/doctor/1/status \
  -H "Authorization: Bearer TOKEN"
```

---

## 📋 Checklist de Implementación

### Fase 1: Backend (15 min)
- [ ] Ejecutar migración SQL 007
- [ ] Instalar dependencias: `pip install -r requirements.txt`
- [ ] Configurar variables .env (2 variables)
- [ ] Reiniciar backend `python main.py`

### Fase 2: N8N CreateDoctorCalendar (20 min)
- [ ] Crear nuevo workflow: "CreateDoctorCalendar"
- [ ] Agregar nodo Webhook
- [ ] Agregar nodo HTTP GET (obtener doctor)
- [ ] Agregar nodo Google Calendar (crear)
- [ ] Agregar nodo HTTP POST (callback éxito)
- [ ] Agregar nodo HTTP POST (callback error)
- [ ] Activar workflow
- [ ] Copiar URL del webhook → guardar en .env

### Fase 3: N8N Agendamiento_v2 (5 min)
- [ ] Abrir workflow: "Agendamiento_v2"
- [ ] Agregar HTTP GET (obtener doctor calendar_id)
- [ ] Modificar Google Calendar: `calendar: "={{ $('Get_Doctor_Calendar').item.json.google_calendar_id }}"`
- [ ] Save & Test

### Fase 4: N8N Cancelacion_v2 (5 min)
- [ ] Abrir workflow: "Cancelacion_v2"
- [ ] Agregar HTTP GET (obtener doctor calendar_id)
- [ ] Modificar Google Calendar: `calendar: "={{ $('Get_Doctor_Calendar').item.json.google_calendar_id }}"`
- [ ] Save & Test

### Fase 5: N8N Reagendamiento_v2 (5 min)
- [ ] Abrir workflow: "Reagendamiento_v2"
- [ ] Agregar HTTP GET (obtener doctor calendar_id)
- [ ] Modificar Google Calendar: `calendar: "={{ $('Get_Doctor_Calendar').item.json.google_calendar_id }}"`
- [ ] Save & Test

### Fase 6: Testing (10 min)
- [ ] Ejecutar test script: `python test_n8n_workflows.py`
- [ ] Crear doctor manualmente
- [ ] Verificar calendar se creó
- [ ] Crear cita y verificar evento en Google Calendar

**Total: ~60 minutos**

---

## 🔧 Solución de Problemas

### "N8N webhook no dispara"
1. Verifica backend logs: `docker logs backend`
2. Busca error "Failed to trigger N8N webhook"
3. Verifica N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL es correcta
4. Verifica N8N webhook está ACTIVADO
5. Si N8N es Docker: usa `http://n8n:5678` en backend

### "Calendar ID is NULL"
1. Abre N8N dashboard
2. Busca workflow "CreateDoctorCalendar"
3. Mira "Execution History"
4. Verifica Google Calendar node tiene datos
5. Verifica callback HTTP está enviando data correcta

### "Google Calendar error: 401"
1. Verifica credenciales de Google en N8N
2. Verifica Google Calendar API está enabled
3. Verifica service account tiene permisos

### "Callback returns 404"
1. Verifica URL en callback matches exactamente: `/api/calendar/doctor-calendar-created`
2. Verifica backend URL en workflow es correcta
3. Test manualmente: `curl -X POST http://backend:8000/api/calendar/doctor-calendar-created -d '{"doctor_id":1,"calendar_id":"test"}'`

---

## 📖 Documentación Detallada

- **CALENDAR_INTEGRATION_FINAL.md** - Arquitectura general
- **WORKFLOW_CREATION_STEP_BY_STEP.md** - Pasos exactos (LEE ESTO)
- **IMPLEMENTATION_GUIDE_DOCTOR_CALENDARS.md** - Guía antigua (ignorar)

---

## 🎯 Lo que Funciona Después

✅ Doctor es creado con webhook a N8N
✅ N8N crea Google Calendar individual
✅ Backend guarda google_calendar_id
✅ Cuando se agenda cita → N8N crea evento en calendar del doctor
✅ Cuando se cancela cita → N8N elimina evento del calendar
✅ Cuando se reagenda cita → N8N actualiza evento en calendar

---

## 🔗 URLs importantes

```
N8N UI: http://localhost:5678
Backend: http://localhost:8000
Backend Health: http://localhost:8000/health
Backend API Docs: http://localhost:8000/docs
```

---

## 🆘 Necesitas Ayuda?

Para cada problema:

1. **Verifica logs**:
   - Backend: `docker logs backend`
   - N8N: Dashboard → últimas ejecuciones

2. **Test manual**:
   ```bash
   # Test webhook
   curl -X POST http://localhost:5678/webhook/test \
     -H "Content-Type: application/json" \
     -d '{"doctor_id":1}'

   # Test backend
   curl http://localhost:8000/health
   ```

3. **Verifica configuración**:
   - `.env` tiene N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL?
   - N8N webhook está ACTIVADO?
   - Migración SQL se ejecutó?

---

## 📱 Próximos Pasos (Futuro)

- [ ] Sincronización bidireccional (cambios en Google Calendar → app)
- [ ] Notificaciones a doctor cuando hay nueva cita
- [ ] OAuth personal para doctores
- [ ] Compartir calendarios con recepcionistas
- [ ] Integración mobile
- [ ] Respuestas automáticas de disponibilidad

---

**¡Listo para empezar? Abre WORKFLOW_CREATION_STEP_BY_STEP.md y sigue los pasos!**
