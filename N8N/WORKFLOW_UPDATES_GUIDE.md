# N8N Workflow Updates: Using Per-Doctor Calendars

## Overview
The existing workflows (Agendamiento_v2, Cancelacion_v2, Reagendamiento_v2) need to be updated to use each doctor's individual Google Calendar ID instead of the shared calendar.

## Changes Required

### 1. Get Doctor Calendar ID (New First Step in Each Workflow)

Before calling any Google Calendar node, add an HTTP request to get the doctor's calendar ID:

- **Type**: HTTP Request
- **Method**: GET
- **URL**: `=http://your-backend:8000/api/doctores/{{ $json.doctor_id }}`
- **Headers**:
  - Add Authorization: `Bearer {{$env.BACKEND_AUTH_TOKEN}}` (if required)
- **Assign Output**: Store as variable or output field
- **Save Response Output** as `DoctorData` or similar

Expected Response:
```json
{
  "id": 123,
  "name": "Dr. Smith",
  "email": "smith@clinic.com",
  "google_calendar_id": "abc123@group.calendar.google.com",
  "google_calendar_email": "abc123@group.calendar.google.com",
  "calendar_sync_enabled": true
}
```

### 2. Update Agendamiento_v2 (Create Appointment)

**Node: "Create an event" (Google Calendar)**

- **Old Calendar Parameter**:
  ```
  calendar_id: "<hardcoded-shared-calendar-id>"
  ```

- **New Calendar Parameter**:
  ```
  calendar_id: "={{ $('HTTP_GetDoctor').item.json.google_calendar_id }}"
  ```

- **Optional: Send Invitation to Patient**
  - Add attendee: `=<patient_email_from_appointment>`

### 3. Update Cancelacion_v2 (Cancel Appointment)

**Node: "Delete event" (Google Calendar)**

- **Old Calendar Parameter**:
  ```javascript
  calendar_id: "<hardcoded-shared-calendar-id>"
  ```

- **New Calendar Parameter**:
  ```javascript
  calendar_id: "={{ $('HTTP_GetDoctor').item.json.google_calendar_id }}"
  ```

### 4. Update Reagendamiento_v2 (Reschedule Appointment)

**Node: "Update event" (Google Calendar)**

- **Old Calendar Parameter**:
  ```javascript
  calendar_id: "<hardcoded-shared-calendar-id>"
  ```

- **New Calendar Parameter**:
  ```javascript
  calendar_id: "={{ $('HTTP_GetDoctor').item.json.google_calendar_id }}"
  ```

## Step-by-Step Update Process

1. **Open Workflow**: Go to N8N and open each workflow (Agendamiento_v2, Cancelacion_v2, Reagendamiento_v2)

2. **Add HTTP Node** (at the beginning):
   - After the trigger/webhook, add a new HTTP Request node
   - Name it: "Get_Doctor_Data" or similar
   - Configure as described in section 1

3. **Update Google Calendar Node**:
   - Find the Google Calendar node in the workflow
   - Replace the hardcoded calendar_id value
   - Use the expression from section 2/3/4 depending on the operation

4. **Test**:
   - Create a test doctor with `POST /api/doctores`
   - Verify N8N receives the webhook
   - Check that the doctor has a `google_calendar_id`
   - Trigger an appointment creation
   - Verify the event appears in the doctor's personal Google Calendar (not the shared one)

## Important Notes

- **Doctor Linking**: Make sure the doctor_id is properly passed through the N8N workflow
- **Error Handling**: Add error handling if the HTTP request to get doctor fails
- **Fallback**: If you want a fallback to the shared calendar, use:
  ```javascript
  calendar_id: "={{ $('HTTP_GetDoctor').item.json.google_calendar_id || 'shared-calendar-id-backup' }}"
  ```

## Step-by-Step Screenshots (for Manual Setup)

### Step 1: After Webhook, Add HTTP Node
```
[Webhook Trigger] → [HTTP Request: Get Doctor] → [Google Calendar Op.]
```

### Step 2: Configure HTTP Node
- Method: GET
- URL: `http://backend:8000/api/doctores/123` (doctor_id comes from JSON data)
- Output to: Use for next node

### Step 3: Update Google Calendar Node
- Select the Calendar node
- Find "Calendar ID" field
- Replace hardcoded value with expression from this doctor's data

## Testing Workflow

```bash
# 1. Create a test doctor
curl -X POST http://localhost:8000/api/doctores \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Doctor",
    "email": "test@clinic.com",
    "phone": "123456",
    "specialty": "General",
    "licenseNumber": "12345"
  }'

# 2. Verify calendar was created
# Check backend logs or query: GET /api/doctores/{doctor_id}
# Should show google_calendar_id populated

# 3. Create appointment for this doctor
# Send WhatsApp message or trigger N8N webhook with doctor_id
# Verify event appears in doctor's personal Google Calendar
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "calendar not found" error | Verify google_calendar_id is not null in doctor record |
| Event appears in wrong calendar | Check doctor_id in workflow - ensure it's the right doctor's calendar |
| HTTP request returns 401 | Add auth header if backend requires authentication |
| Event creation succeeds but not visible | Verify Google Calendar service account has access to the calendar |

## Future Improvements

1. **Bidirectional Sync**: Changes made in Google Calendar will be synced back (automatic, happens every 10 min)
2. **Doctor OAuth**: Eventually, allow doctors to connect their own Google accounts (not yet implemented)
3. **Multiple Calendars**: Support for doctors with multiple calendars (main + personal availability, etc.)
