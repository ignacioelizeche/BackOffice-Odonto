# Per-Doctor Google Calendar Integration - Implementation Guide

## What Was Implemented

This implementation adds individual Google Calendar support for each doctor. When a doctor is created, a dedicated Google Calendar is automatically created for them. All appointments (via WhatsApp or web) sync to that doctor's personal calendar, and changes in Google Calendar sync back to the app automatically.

## Key Components

### 1. **Database** (`backend/migrations/007_*.sql`)
- Added 3 fields to `doctores` table:
  - `google_calendar_id`: Stores the Google Calendar ID
  - `google_calendar_email`: Email address of the calendar
  - `calendar_sync_enabled`: Toggle for bidirectional sync

### 2. **Backend Services**

#### `app/services/n8n_integration_service.py`
- Triggers N8N webhook when a doctor is created
- Sends doctor data for calendar creation

#### `app/services/google_calendar_service.py`
- Direct Google Calendar API integration
- Methods: create_event, update_event, delete_event, get_calendar_changes
- Uses service account credentials

#### `app/services/calendar_sync_service.py`
- Bidirectional synchronization service
- Periodically checks for changes in Google Calendar
- Syncs deletions and modifications back to the app

### 3. **Backend Endpoints** (`app/routers/calendar.py`)
- `POST /api/calendar/doctor-calendar-created` - Callback from N8N when calendar is created
- `POST /api/calendar/doctor-calendar-error` - Error callback from N8N
- `GET /api/calendar/doctor/{doctor_id}/status` - Check calendar status
- `POST /api/calendar/sync-now` - Manual trigger for calendar sync

### 4. **N8N Workflows**
- **CreateDoctorCalendar**: New workflow that creates a calendar for each doctor
- **Agendamiento_v2, Cancelacion_v2, Reagendamiento_v2**: Need to be updated to use per-doctor calendars

### 5. **Scheduler** (`app/tasks/scheduled_tasks.py`)
- Added `sync_doctor_calendars()` task
- Runs every 10 minutes (configurable)
- Syncs all doctor calendars automatically

## Setup Steps

### Step 1: Run Database Migration
```bash
cd backend
# Apply SQL migration
psql -U your_user -d your_database -f migrations/007_add_doctor_google_calendar_fields.sql

# OR if using Alembic
alembic upgrade head
```

### Step 2: Configure Environment Variables
Add to `.env`:
```
# Google Calendar Integration
BACKEND_URL=http://your-backend-url:8000
N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL=https://your-n8n-instance.com/webhook/create-doctor-calendar
CALENDAR_SYNC_ENABLED=true
CALENDAR_SYNC_INTERVAL_MINUTES=10

# Google Service Account (for bidirectional sync)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"..."}
```

### Step 3: Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
# New packages: google-auth, google-api-python-client
```

### Step 4: Create N8N Workflow
- Follow: `/N8N/CreateDoctorCalendar_SETUP_GUIDE.md`
- Set up webhook to receive doctor data
- Configure Google Calendar node to create calendar
- Configure callback to backend

### Step 5: Update Existing N8N Workflows
- Follow: `/N8N/WORKFLOW_UPDATES_GUIDE.md`
- Update Agendamiento_v2 (appointment creation)
- Update Cancelacion_v2 (appointment cancellation)
- Update Reagendamiento_v2 (appointment rescheduling)
- Each should now get doctor's personal calendar and use that

### Step 6: Restart Backend
```bash
# The scheduler will automatically start calendar sync on startup
cd backend
python -m uvicorn main:app --reload
```

### Step 7: Test End-to-End

1. **Create a Doctor**
   ```bash
   curl -X POST http://localhost:8000/api/doctores \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Dr. Juan García",
       "email": "juan@clinic.com",
       "phone": "555-1234",
       "specialty": "Odontología General",
       "licenseNumber": "LIC123456",
       "yearsExperience": 10
     }'
   ```

2. **Wait for N8N Webhook**
   - Backend sends webhook to N8N in background
   - N8N creates Google Calendar
   - N8N responds back with calendar ID
   - Backend updates doctor record

3. **Verify Calendar was Created**
   ```bash
   curl -X GET http://localhost:8000/api/calendar/doctor/{doctor_id}/status \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   Expected response:
   ```json
   {
     "calendar_configured": true,
     "calendar_id": "abc123@group.calendar.google.com",
     "calendar_email": "abc123@group.calendar.google.com",
     "sync_enabled": true
   }
   ```

4. **Create an Appointment**
   - Via WhatsApp or web interface
   - Specify the doctor
   - Verify event appears in their Google Calendar (not shared calendar)

5. **Modify in Google Calendar**
   - Delete the event in Google Calendar
   - Wait up to 10 minutes
   - Check that appointment status changed to "cancelada" in app

## Important Configuration

### Google Service Account

For bidirectional sync to work, you need a Google service account:

1. Go to Google Cloud Console
2. Create a service account
3. Create a JSON key
4. Enable Google Calendar API
5. Share the individual doctor calendars with the service account email
6. Paste JSON into GOOGLE_SERVICE_ACCOUNT_JSON env variable

Alternatively, if bidirectional sync is not needed yet:
- Leave GOOGLE_SERVICE_ACCOUNT_JSON empty
- Set CALENDAR_SYNC_ENABLED=false
- Only one-way sync (app → Google Calendar) will work

### N8N Webhook URL

The N8N webhook URL must be:
- Publicly accessible (or from backend)
- Include the PATH to the webhook
- Example: `https://n8n.example.com/webhook/create-doctor-calendar`

Check N8N workflow settings for the generated webhook URL.

## Architecture Overview

```
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │ 1. Create Doctor
       ↓
┌─────────────────────────────┐
│ POST /api/doctores          │
│ - Creates doctor in DB      │
│ - Queue: Trigger N8N webhook│
└──────┬──────────────────────┘
       │
       │ 2. Async: Send webhook
       ↓
┌─────────────────────────────┐
│   N8N Workflow              │
│ CreateDoctorCalendar        │
└──────┬──────────────────────┘
       │ 3. Create Calendar
       ↓
┌─────────────────────────────┐
│  Google Calendar API        │
│  (service account)          │
└──────┬──────────────────────┘
       │ 4. Calendar created
       ↓
┌─────────────────────────────┐
│ POST /api/calendar/         │
│ doctor-calendar-created     │
└──────┬──────────────────────┘
       │ 5. Update doctor record
       ↓
┌─────────────────────────────┐
│   Backend Database          │
│   - Save google_calendar_id │
│   - Set sync_enabled = true │
└─────────────────────────────┘

ONGOING:
Appointment Created → Event in Doctor's Calendar
Calendar Change (via Google) → App Syncs (every 10 min)
```

## Monitoring & Debugging

### Check Scheduler Status
```python
# In backend logs, look for:
# [Scheduler] Calendar sync completed: X/Y doctors synced successfully
```

### Manual Calendar Sync
```bash
curl -X POST http://localhost:8000/api/calendar/sync-now \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### View Doctor Calendar Status
```bash
curl -X GET http://localhost:8000/api/calendar/doctor/123/status \
  -H "Authorization: Bearer TOKEN"
```

### Check Logs
```bash
# Backend logs
tail -f backend/logs/app.log | grep calendar

# N8N logs
# Check N8N dashboard for workflow execution history
```

## Troubleshooting

### Calendar ID is NULL
- Check N8N logs - webhook might not be firing
- Verify N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL is correct
- Make sure N8N workflow is active and deployed

### Events not appearing in Google Calendar
- Verify google_calendar_id matches a real calendar
- Check service account has access to calendar
- Verify N8N is using correct Google Calendar credentials

### Sync not working
- Check CALENDAR_SYNC_ENABLED=true
- Verify GOOGLE_SERVICE_ACCOUNT_JSON is valid JSON
- Check Google service account has Calendar API enabled
- Look at scheduler logs for errors

## Next Steps

1. **Doctor OAuth**: Allow each doctor to connect their own Google account instead of service account
2. **Calendar Sharing**: Share doctor calendars with clinic staff for better visibility
3. **Real-time Webhooks**: Replace polling with Google Calendar webhooks for instant sync
4. **Mobile App**: Sync appointments to doctor's mobile calendar
5. **Analytics**: Track calendar usage and appointment patterns

## Files Modified/Created

### New Files
- `backend/migrations/007_add_doctor_google_calendar_fields.sql`
- `backend/app/services/n8n_integration_service.py`
- `backend/app/services/google_calendar_service.py`
- `backend/app/services/calendar_sync_service.py`
- `backend/app/routers/calendar.py`
- `N8N/CreateDoctorCalendar_SETUP_GUIDE.md`
- `N8N/WORKFLOW_UPDATES_GUIDE.md`

### Modified Files
- `backend/app/models.py` - Added 3 fields to Doctor model
- `backend/app/config.py` - Added environment variables
- `backend/app/routers/doctors.py` - Added N8N webhook trigger
- `backend/app/tasks/scheduled_tasks.py` - Added calendar sync scheduler
- `backend/main.py` - Added calendar router
- `backend/requirements.txt` - Added Google API libraries

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the setup guides in `/N8N/` directory
3. Check backend logs for errors
4. Verify environment variables are set correctly
