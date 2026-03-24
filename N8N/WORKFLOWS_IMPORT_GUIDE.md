# N8N Workflows Import and Configuration Guide

## Overview

This guide shows how to import and configure the two new N8N workflows for automatic appointment calendar synchronization from the backend API.

## Workflows to Import

1. **UpdateAppointmentCalendar.json** - Handles appointment creation and updates
2. **DeleteAppointmentCalendar.json** - Handles appointment deletions

## Prerequisites

### 1. Environment Variables

Add these to your N8N environment:

```bash
# Backend URL for callbacks
BACKEND_URL=http://your-backend-domain:8000

# Optional: Database connection if not already configured
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=backoffice_odonto
POSTGRES_USER=your-user
POSTGRES_PASSWORD=your-password
```

### 2. Required Credentials in N8N

#### PostgreSQL Database
- **Name**: `PostgreSQL Database`
- **Type**: PostgreSQL
- **Host**: Your PostgreSQL server
- **Database**: `backoffice_odonto`
- **User/Password**: With read access to `doctores` table

#### Google Calendar Service Account
- **Name**: `Google Calendar Service Account`
- **Type**: Google Calendar OAuth2 API
- **Authentication**: Service Account
- **Service Account Email**: Your Google service account
- **Private Key**: Your Google service account private key

## Import Steps

### 1. Import Workflows

1. Go to N8N Dashboard → Workflows
2. Click **"Import from File"**
3. Upload `UpdateAppointmentCalendar.json`
4. Repeat for `DeleteAppointmentCalendar.json`

### 2. Configure Credentials

For each workflow:

1. Open the workflow
2. Click on **"Get Doctor Calendar Info"** node
3. Set credentials to **"PostgreSQL Database"**
4. Click on **"Create Calendar Event"** / **"Update Calendar Event"** / **"Delete Calendar Event"** nodes
5. Set credentials to **"Google Calendar Service Account"**

### 3. Configure Webhook URLs

#### UpdateAppointmentCalendar Webhook:
1. Click on the **"Webhook"** node
2. Note the webhook URL (e.g., `https://your-n8n-domain.com/webhook/update-appointment`)
3. Add this URL to your backend environment:
   ```bash
   N8N_UPDATE_APPOINTMENT_WEBHOOK_URL=https://your-n8n-domain.com/webhook/update-appointment
   ```

#### DeleteAppointmentCalendar Webhook:
1. Click on the **"Webhook"** node
2. Note the webhook URL (e.g., `https://your-n8n-domain.com/webhook/delete-appointment`)
3. Add this URL to your backend environment:
   ```bash
   N8N_DELETE_APPOINTMENT_WEBHOOK_URL=https://your-n8n-domain.com/webhook/delete-appointment
   ```

### 4. Activate Workflows

1. Click **"Active"** toggle for both workflows
2. Verify webhooks are accessible with a test request

## Workflow Details

### UpdateAppointmentCalendar Flow

```
Webhook → Get Doctor Info → Check Calendar Enabled
  ↓                           ↓
  ↓ (Calendar Disabled)      Check If Update (Event ID exists?)
  ↓                           ↓              ↓
  ↓                    Create Event    Update Event
  ↓                           ↓              ↓
  ↓                           ↓ ←──────────── ↓
  ↓                    Callback Success
  ↓                           ↓
  ↓ → Callback Skip    Respond Success
       ↓
    Respond Skip
```

### DeleteAppointmentCalendar Flow

```
Webhook → Check Event ID Exists → Get Doctor Info → Check Calendar Configured
  ↓                               ↓                        ↓
  ↓ (No Event ID)                ↓                 Delete Calendar Event
  ↓                               ↓                        ↓
  ↓ ← Callback Skip              ↓                 Callback Success
  ↓                               ↓                        ↓
  ↓ ← Callback No Calendar ←─────↓                 Respond Success
  ↓
Respond Skip
```

## Testing the Workflows

### Test Update Appointment

```bash
curl -X POST "https://your-n8n-domain.com/webhook/update-appointment" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": 123,
    "doctor_id": 456,
    "patient_name": "Juan Pérez",
    "appointment_date": "2026-03-20",
    "appointment_time": "10:30",
    "status": "confirmada",
    "google_calendar_event_id": null,
    "empresa_id": 1
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Appointment calendar updated",
  "appointment_id": 123
}
```

### Test Delete Appointment

```bash
curl -X POST "https://your-n8n-domain.com/webhook/delete-appointment" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": 123,
    "google_calendar_event_id": "abc123def456",
    "doctor_id": 456,
    "empresa_id": 1
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Calendar event deleted",
  "appointment_id": 123
}
```

## Troubleshooting

### Common Issues:

1. **"Credentials not found"**
   - Ensure PostgreSQL and Google Calendar credentials are configured
   - Credential names must match exactly: `"PostgreSQL Database"` and `"Google Calendar Service Account"`

2. **"Calendar not found"**
   - Check that the doctor has `google_calendar_id` in the database
   - Verify the Google service account has access to the calendar

3. **"Backend callback failed"**
   - Check `BACKEND_URL` environment variable in N8N
   - Ensure backend is accessible from N8N server
   - Verify callback endpoints exist: `/api/calendar/appointment-calendar-updated` and `/api/calendar/appointment-calendar-deleted`

4. **"Database query error"**
   - Verify PostgreSQL credentials and connectivity
   - Check that `doctores` table exists and has required fields
   - Ensure query parameters match the expected format

### Debug Mode:

1. Enable **"Execute Workflow"** in N8N to see step-by-step execution
2. Check execution logs for each node
3. Verify webhook payloads match expected format

## Security Notes

- Webhooks are public endpoints - consider adding authentication if needed
- Google service account should have minimal required permissions
- Database credentials should have read-only access to required tables
- Backend callback URLs should be accessible only from N8N server

## Monitoring

- Monitor N8N execution logs for failed appointments sync
- Check backend logs for callback success/failure
- Set up alerts for consecutive webhook failures
- Monitor Google Calendar API quotas and usage

## Complete Environment Variables Summary

**Backend (.env)**:
```bash
N8N_UPDATE_APPOINTMENT_WEBHOOK_URL=https://your-n8n-domain.com/webhook/update-appointment
N8N_DELETE_APPOINTMENT_WEBHOOK_URL=https://your-n8n-domain.com/webhook/delete-appointment
BACKEND_URL=http://your-backend:8000
```

**N8N Environment**:
```bash
BACKEND_URL=http://your-backend:8000
```

After configuration, restart both N8N and the backend to ensure all new settings are loaded.