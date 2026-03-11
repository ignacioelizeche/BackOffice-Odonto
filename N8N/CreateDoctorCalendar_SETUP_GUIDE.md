# N8N Workflow: CreateDoctorCalendar

## Overview
This workflow creates a Google Calendar for each newly created doctor in the system.

## Setup Instructions

### 1. Trigger: Webhook
- **Type**: Webhook (Receive Data)
- **Method**: POST
- **URL**: `/webhook/create-doctor-calendar` (N8N will generate the full URL)
- **Expected JSON**:
```json
{
  "doctor_id": 123,
  "doctor_name": "Dr. Smith",
  "doctor_email": "smith@clinic.com",
  "empresa_id": 1,
  "webhook_url": "http://backend:8000/api/calendar/doctor-calendar-created"
}
```

### 2. Google Calendar Node: Create Calendar
- **Type**: Google Calendar
- **Operation**: Create
- **Credentials**: Use your Google service account (the generic account used for all doctor calendars)
- **Summary**: `=Calendar - {{ $json.doctor_name }}`
- **Description**: `=Dental appointments for {{ $json.doctor_name }}`
- **Additional Fields**:
  - Set timezone to your clinic's timezone (Argentina/Buenos_Aires or similar)
- **Output**: Extract `calendar_id` and `email` from response

### 3. HTTP Node: Notify Backend (Success)
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `={{ $json.webhook_url.replace("/created", "") }}/doctor-calendar-created`
- **Send Body**: JSON
```json
{
  "doctor_id": {{ $json.doctor_id }},
  "calendar_id": "=<output from Google Calendar node: calendar_id>",
  "calendar_email": "=<output from Google Calendar node: email>"
}
```

### 4. Error Handling Node
- **Type**: HTTP Request (on error path)
- **Method**: POST
- **URL**: `={{ $json.webhook_url.replace("/created", "") }}/doctor-calendar-error`
- **Send Body**:
```json
{
  "doctor_id": {{ $json.doctor_id }},
  "error_message": "=Failed to create Google Calendar: {{ $error.message }}"
}
```

## Configuration in N8N UI

1. Create New Workflow: "CreateDoctorCalendar"
2. Add "Webhook" node as start trigger
3. Configure as described above in step 1
4. Add "Google Calendar" node
5. Select "Create" operation
6. Connect to webhook
7. Add HTTP node for success callback
8. Add error handling HTTP node
9. Save and Activate

## Testing

Use curl or Postman:
```bash
curl -X POST https://your-n8n-instance.com/webhook/create-doctor-calendar \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": 999,
    "doctor_name": "Test Doctor",
    "doctor_email": "test@example.com",
    "empresa_id": 1,
    "webhook_url": "http://backend:8000/api/calendar/doctor-calendar-created"
  }'
```

## Integration Notes

- This workflow is triggered automatically when a doctor is created via the backend
- The backend sends data to the N8N webhook in a background task
- N8N responds back to the backend with calendar ID
- Backend stores the calendar ID in the doctor's record
