# Per-Doctor Google Calendar Integration - N8N Only

## Architecture

**Backend**: Data storage + webhook dispatcher (NO calendar logic)
**N8N**: 100% of calendar operations

```
┌─────────────────────────────────────────────────────────────────┐
│                      N8N Workflows                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  │ CreateDoctor    │  │ Agendamiento_v2  │  │ Cancelacion_v2   │
│  │ Calendar        │  │                  │  │                  │
│  │ (Google API)    │  │ (Update events)  │  │ (Delete events)  │
│  └────────┬────────┘  └──────────────────┘  └──────────────────┘
│           │
│           │ calendar_id
│           ↓
├─────────────────────────────────────────────────────────────────┤
│                      Backend (FastAPI)                          │
│  ┌──────────────────────────────────────────────────────────────┐
│  │ POST /api/doctores                                           │
│  │ - Create doctor in DB                                        │
│  │ - Background: trigger N8N webhook                            │
│  │                                                              │
│  │ POST /api/calendar/doctor-calendar-created (N8N callback)   │
│  │ - Save calendar_id to doctor record                          │
│  │                                                              │
│  │ GET /api/calendar/doctor/{id}/status                        │
│  │ - Get calendar status                                        │
│  └──────────────────────────────────────────────────────────────┘
├─────────────────────────────────────────────────────────────────┤
│                      PostgreSQL Database                        │
│  doctores.google_calendar_id       (stored by backend)          │
│  doctores.google_calendar_email    (stored by backend)          │
│  doctores.calendar_sync_enabled    (stored by backend)          │
└─────────────────────────────────────────────────────────────────┘
```

## Files Modified

### Database
✅ `backend/migrations/007_add_doctor_google_calendar_fields.sql`

### Backend Code
✅ `backend/app/models.py` - Doctor model (3 fields)
✅ `backend/app/config.py` - Environment variables
✅ `backend/app/routers/doctors.py` - N8N webhook trigger
✅ `backend/app/routers/calendar.py` - N8N callbacks only
✅ `backend/app/services/n8n_integration_service.py` - Webhook sender
✅ `backend/main.py` - Router registration

### What Was REMOVED
❌ `google_calendar_service.py` - NOT needed (N8N does this)
❌ `calendar_sync_service.py` - NOT needed (N8N does this)
❌ `sync_doctor_calendars()` scheduler - NOT needed (N8N does this)
❌ Google API dependencies - NOT needed (N8N uses its own)

## Setup

### 1. Run Database Migration
```bash
psql -U your_user -d your_db -f backend/migrations/007_add_doctor_google_calendar_fields.sql
```

### 2. Set Environment Variables
```env
BACKEND_URL=http://your-backend:8000
N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL=https://your-n8n.com/webhook/create-doctor-calendar
```

### 3. Create N8N Workflows

#### Workflow 1: CreateDoctorCalendar
- Trigger: Webhook from backend
- Node 1: Google Calendar - Create Calendar
  - Input: doctor data from webhook
  - Output: calendar_id, calendar_email
- Node 2: HTTP - Callback to backend
  - `POST /api/calendar/doctor-calendar-created`
  - Body: { doctor_id, calendar_id, calendar_email }

See: `/N8N/CreateDoctorCalendar_SETUP_GUIDE.md`

#### Workflow 2-4: Update Existing Workflows
- **Agendamiento_v2** (Create appointment)
  - Add HTTP node to get doctor's calendar_id
  - Use that calendar_id in Google Calendar - Create Event

- **Cancelacion_v2** (Cancel appointment)
  - Add HTTP node to get doctor's calendar_id
  - Use that calendar_id in Google Calendar - Delete Event

- **Reagendamiento_v2** (Reschedule appointment)
  - Add HTTP node to get doctor's calendar_id
  - Use that calendar_id in Google Calendar - Update Event

See: `/N8N/WORKFLOW_UPDATES_GUIDE.md`

### 4. Restart Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

## Testing

```bash
# 1. Create a doctor
curl -X POST http://localhost:8000/api/doctores \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Doctor",
    "email": "test@clinic.com",
    "phone": "555-1234",
    "specialty": "General",
    "licenseNumber": "12345",
    "yearsExperience": 5
  }'

# 2. Wait for N8N webhook to fire (check N8N dashboard)

# 3. Verify calendar was created
curl -X GET http://localhost:8000/api/calendar/doctor/1/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
{
  "calendar_configured": true,
  "calendar_id": "abc123@group.calendar.google.com",
  "calendar_email": "abc123@group.calendar.google.com",
  "sync_enabled": true
}
```

## How It Works

### Doctor Creation Flow
1. Admin creates doctor via `POST /api/doctores`
2. Backend creates doctor record in DB
3. Backend queues background task: call N8N webhook
4. N8N receives webhook with doctor data
5. N8N Google Calendar node creates calendar for doctor
6. N8N extracts calendar_id from response
7. N8N calls backend `POST /api/calendar/doctor-calendar-created` with calendar_id
8. Backend updates doctor record with calendar_id
9. ✅ Doctor now has personal calendar

### Appointment Creation Flow
1. Patient schedules appointment via WhatsApp or web
2. N8N Agendamiento_v2 workflow triggered
3. N8N HTTP node calls `GET /api/doctores/{doctor_id}` to get calendar_id
4. N8N Google Calendar node creates event in doctor's calendar (using their calendar_id)
5. ✅ Event appears in doctor's personal Google Calendar

### Appointment Cancellation Flow
1. Patient cancels appointment
2. N8N Cancelacion_v2 workflow triggered
3. N8N HTTP node calls `GET /api/doctores/{doctor_id}` to get calendar_id
4. N8N loads event_id from DB
5. N8N Google Calendar node deletes event from doctor's calendar
6. ✅ Event removed from doctor's personal Google Calendar

## Backend Endpoints

`POST /api/doctores`
- Creates a doctor
- Triggers N8N webhook in background

`POST /api/calendar/doctor-calendar-created`
- N8N calls this when calendar is created
- Saves `google_calendar_id` to doctor record

`POST /api/calendar/doctor-calendar-error`
- N8N calls this if calendar creation fails
- Logs error and marks calendar as disabled

`GET /api/calendar/doctor/{doctor_id}/status`
- Returns calendar configuration status

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Calendar ID is NULL | Check N8N logs - webhook might not be firing. Verify `N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL` |
| Event not in doctor's calendar | Verify doctor has `google_calendar_id` filled. Check N8N Agendamiento_v2 is using that ID |
| N8N webhook returns 401 | Check backend is accessible from N8N. Verify BACKEND_URL is correct |
| Backend receives 405 on callback | Check N8N is POSTing to correct URL: `/api/calendar/doctor-calendar-created` |

## Key Points

🔑 **Backend has NO Google Calendar code**
- No API credentials in backend
- No sync logic in backend
- No event creation in backend
- Just HTTP requests to/from N8N

🔑 **N8N has ALL calendar logic**
- N8N manages Google Calendar credentials
- N8N creates/updates/deletes events
- N8N handles bidirectional sync
- N8N sends callbacks to backend

🔑 **Data Flow**
- Backend: Storage (DB) + Orchestration (webhooks)
- N8N: Execution (Google Calendar operations)

## Future Enhancements

1. Real-time sync: Replace polling with Google Calendar webhooks
2. Error recovery: N8N retries failed calendar operations
3. Audit trail: Log all calendar changes in backend
4. Doctor OAuth: Let doctors connect their own Google accounts
5. Calendar sharing: Share doctor calendars with clinic staff
