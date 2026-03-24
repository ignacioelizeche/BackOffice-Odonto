# N8N Appointment Calendar Sync Setup Guide

## Overview

This guide shows how to set up N8N workflows to synchronize appointment updates from the backend with individual doctor's Google Calendars.

## New Workflows Required

### 1. UpdateAppointmentCalendar Workflow

**Purpose**: Handle appointment updates/creates from backend API
**Trigger**: Webhook from backend when appointments are updated
**Webhook URL**: `/webhook/update-appointment`

**Environment Variable**:
```bash
N8N_UPDATE_APPOINTMENT_WEBHOOK_URL=https://your-n8n-domain.com/webhook/update-appointment
```

**Workflow Steps**:
1. **Webhook Trigger** - Receives appointment data from backend
2. **Get Doctor Details** - Query database for doctor's `google_calendar_id`
3. **Format Event Data** - Prepare Google Calendar event format
4. **Conditional Logic**:
   - If `google_calendar_event_id` exists → Update existing event
   - If no `google_calendar_event_id` → Create new event
5. **Google Calendar Action** - Create/Update event in doctor's calendar
6. **Backend Callback** - Send event ID back to backend (if new event)

**Input Payload**:
```json
{
  "appointment_id": 123,
  "doctor_id": 456,
  "patient_name": "Juan Pérez",
  "appointment_date": "2026-03-20",
  "appointment_time": "10:30",
  "status": "confirmada",
  "google_calendar_event_id": "abc123def456",  // null for new events
  "empresa_id": 1
}
```

**Database Queries Needed**:
```sql
-- Get doctor's calendar info
SELECT google_calendar_id, calendar_sync_enabled
FROM doctores
WHERE id = {{ $json.doctor_id }} AND empresa_id = {{ $json.empresa_id }};
```

**Google Calendar Event Format**:
```json
{
  "summary": "Cita - {{ $json.patient_name }}",
  "start": {
    "dateTime": "{{ $json.appointment_date }}T{{ $json.appointment_time }}:00",
    "timeZone": "America/Argentina/Buenos_Aires"
  },
  "end": {
    "dateTime": "{{ $json.appointment_date }}T{{ moment($json.appointment_time, 'HH:mm').add(30, 'minutes').format('HH:mm') }}:00",
    "timeZone": "America/Argentina/Buenos_Aires"
  },
  "description": "Paciente: {{ $json.patient_name }}\nEstado: {{ $json.status }}\nID Cita: {{ $json.appointment_id }}"
}
```

**Backend Callback for New Events**:
```http
POST {{$node["Webhook"].json["webhook_url"]}}/api/calendar/appointment-calendar-updated
Content-Type: application/json

{
  "appointment_id": "{{ $json.appointment_id }}",
  "google_calendar_event_id": "{{ $json.google_calendar_event_id }}",
  "success": true
}
```

### 2. DeleteAppointmentCalendar Workflow

**Purpose**: Handle appointment deletions from backend API
**Trigger**: Webhook from backend when appointments are deleted/cancelled
**Webhook URL**: `/webhook/delete-appointment`

**Environment Variable**:
```bash
N8N_DELETE_APPOINTMENT_WEBHOOK_URL=https://your-n8n-domain.com/webhook/delete-appointment
```

**Workflow Steps**:
1. **Webhook Trigger** - Receives appointment data from backend
2. **Get Doctor Details** - Query for doctor's `google_calendar_id`
3. **Google Calendar Delete** - Remove event from doctor's calendar
4. **Backend Callback** - Confirm deletion to backend

**Input Payload**:
```json
{
  "appointment_id": 123,
  "google_calendar_event_id": "abc123def456",
  "doctor_id": 456,
  "empresa_id": 1
}
```

## Backend Callback Endpoints

The backend has been updated with new callback endpoints that N8N should use:

### Update/Create Callback
```http
POST /api/calendar/appointment-calendar-updated
{
  "appointment_id": 123,
  "google_calendar_event_id": "abc123def456",
  "success": true,
  "error": "Optional error message if failed"
}
```

### Delete Callback
```http
POST /api/calendar/appointment-calendar-deleted
{
  "appointment_id": 123,
  "google_calendar_event_id": "abc123def456",
  "success": true,
  "error": "Optional error message if failed"
}
```

## Error Handling

### In N8N Workflows:
- If doctor has no `google_calendar_id` → Log warning and skip
- If `calendar_sync_enabled` is false → Skip sync
- If Google Calendar API fails → Send error callback to backend
- Always send callback to backend (success or failure)

### In Backend:
- Calendar sync errors don't block appointment operations
- Errors are logged but appointment updates still succeed
- Missing webhook URLs are handled gracefully (warnings only)

## Environment Variables Summary

Add these to your N8N environment:

```bash
# Existing
N8N_CREATE_DOCTOR_CALENDAR_WEBHOOK_URL=https://your-n8n-domain.com/webhook/create-doctor-calendar

# New for appointment sync
N8N_UPDATE_APPOINTMENT_WEBHOOK_URL=https://your-n8n-domain.com/webhook/update-appointment
N8N_DELETE_APPOINTMENT_WEBHOOK_URL=https://your-n8n-domain.com/webhook/delete-appointment

# Backend callback URL
BACKEND_URL=http://your-backend:8000
```

## Testing the Integration

### Test Appointment Update:
1. Update an appointment via web UI (`PUT /api/citas/{id}`)
2. Check N8N logs for webhook trigger
3. Verify event is created/updated in doctor's Google Calendar
4. Check backend logs for callback success

### Test Appointment Deletion:
1. Cancel/delete appointment via web UI
2. Check N8N logs for delete webhook trigger
3. Verify event is removed from Google Calendar
4. Check backend logs for callback success

### Test Error Scenarios:
1. Update appointment for doctor without `google_calendar_id`
2. Update with invalid Google Calendar data
3. Network failures between N8N and Google Calendar
4. Callback failures to backend

## Migration Notes

- **No database changes needed** - the appointment calendar sync uses existing fields
- **No new Python dependencies** - uses existing httpx for webhooks
- **Backward compatible** - existing WhatsApp flows continue to work
- **Gradual rollout** - can enable per-enterprise or per-doctor

## Next Steps

1. Create the two N8N workflows using this guide
2. Configure webhook URLs in environment variables
3. Test with a sample appointment update
4. Monitor logs for proper synchronization
5. Enable for production traffic