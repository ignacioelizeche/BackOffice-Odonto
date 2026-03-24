# N8N Workflows - Implementation Complete

## ✅ Created Files

### Workflow JSON Files
1. **`/N8N/UpdateAppointmentCalendar.json`**
   - Handles appointment CREATE and UPDATE operations
   - Webhook: `/webhook/update-appointment`
   - Creates or updates Google Calendar events
   - Sends success/failure callbacks to backend

2. **`/N8N/DeleteAppointmentCalendar.json`**
   - Handles appointment DELETE operations
   - Webhook: `/webhook/delete-appointment`
   - Deletes Google Calendar events
   - Sends deletion confirmation to backend

### Documentation
3. **`/N8N/WORKFLOWS_IMPORT_GUIDE.md`**
   - Step-by-step import and configuration guide
   - Credential setup instructions
   - Testing procedures and troubleshooting

## 📈 Workflow Architecture

### UpdateAppointmentCalendar
```
Backend API → N8N Webhook → Get Doctor Calendar ID
    ↓
Check Calendar Enabled → Create/Update Calendar Event
    ↓
Send Callback to Backend → Update appointment.google_calendar_event_id
```

### DeleteAppointmentCalendar
```
Backend API → N8N Webhook → Get Doctor Calendar ID
    ↓
Delete Calendar Event → Send Callback to Backend
    ↓
Clear appointment.google_calendar_event_id
```

## 🔧 Key Features

### Smart Logic
- ✅ **Conditional Updates**: Creates new events or updates existing ones based on `google_calendar_event_id`
- ✅ **Calendar Validation**: Checks if doctor has calendar configured and sync enabled
- ✅ **Event ID Validation**: Only deletes if `google_calendar_event_id` exists
- ✅ **Error Handling**: Graceful failures with proper callback notifications

### Integration Points
- ✅ **Database Queries**: Gets doctor's `google_calendar_id` and `calendar_sync_enabled`
- ✅ **Google Calendar API**: Creates, updates, and deletes events in doctor's individual calendar
- ✅ **Backend Callbacks**: Confirms success/failure back to backend for data consistency
- ✅ **Webhook Responses**: Provides immediate feedback to backend about operation status

### Data Flow
```json
// Backend → N8N (Update/Create)
{
  "appointment_id": 123,
  "doctor_id": 456,
  "patient_name": "Juan Pérez",
  "appointment_date": "2026-03-20",
  "appointment_time": "10:30",
  "status": "confirmada",
  "google_calendar_event_id": "existing_id_or_null",
  "empresa_id": 1
}

// N8N → Backend (Callback)
{
  "appointment_id": 123,
  "google_calendar_event_id": "abc123def456",
  "success": true,
  "error": null
}
```

## 🚀 Next Steps

### 1. Import to N8N
```bash
# Import the workflow files into your N8N instance
1. Upload UpdateAppointmentCalendar.json
2. Upload DeleteAppointmentCalendar.json
```

### 2. Configure Credentials
```bash
# Set up in N8N dashboard:
- PostgreSQL Database (for doctor queries)
- Google Calendar Service Account (for API operations)
```

### 3. Set Environment Variables
```bash
# Add to backend .env:
N8N_UPDATE_APPOINTMENT_WEBHOOK_URL=https://your-n8n/webhook/update-appointment
N8N_DELETE_APPOINTMENT_WEBHOOK_URL=https://your-n8n/webhook/delete-appointment

# Add to N8N environment:
BACKEND_URL=http://your-backend:8000
```

### 4. Activate Workflows
```bash
# In N8N dashboard:
1. Activate UpdateAppointmentCalendar workflow
2. Activate DeleteAppointmentCalendar workflow
3. Test webhook endpoints
```

### 5. Test Integration
```bash
# Test appointment update via backend API:
curl -X PUT "http://localhost:8000/citas/123" \
  -H "Authorization: Bearer <token>" \
  -d '{"status": "confirmada"}'

# Check Google Calendar for event creation
# Check backend logs for sync confirmations
```

## 📊 Expected Results

### Before Implementation:
❌ Web appointment edits → No calendar sync

### After Implementation:
✅ Web appointment CREATE → Calendar event created
✅ Web appointment UPDATE → Calendar event updated
✅ Web appointment DELETE → Calendar event deleted
✅ Backend receives sync confirmations
✅ Database stores google_calendar_event_id
✅ Full bidirectional sync with WhatsApp flows

## 🎉 Complete Solution

You now have **full appointment-calendar synchronization**:

1. **WhatsApp Flows** → N8N → Google Calendar ✅ (existing)
2. **Web Interface** → Backend → N8N → Google Calendar ✅ (implemented)
3. **Error Handling** → Graceful degradation ✅
4. **Individual Calendars** → Per-doctor Google Calendar ✅
5. **Background Processing** → Non-blocking operations ✅

The system maintains **data consistency** across all channels while preserving the architectural principle: **"Backend triggers, N8N executes"**.