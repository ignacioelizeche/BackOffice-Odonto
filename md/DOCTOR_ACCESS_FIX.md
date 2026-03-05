# Doctor Role-Based Access Control - Fix Summary

## Problem
The frontend was getting a **403 Forbidden** error when trying to access a doctor's own profile via `GET /api/doctores/{doctor_id}`.

### Root Cause
The database migrations that link Doctor users to Doctor records (via `doctor_id` foreign key) had not been properly applied, and the enum values in the migrations didn't match the lowercase enum values in the PostgreSQL database.

## Solution Implemented

### 1. Database Migration (Fixed)
**File**: `/backend/migrations/002_add_doctor_id_to_usuarios.sql`

Fixed the enum comparison issue:
```sql
-- Before (caused error):
WHERE usuarios.role = 'Doctor'

-- After (correct):
WHERE usuarios.role = 'doctor'::roleenum
```

**What it does:**
- Adds `doctor_id` column to `usuarios` table
- Creates foreign key constraint: `usuarios.doctor_id → doctores.id`
- Creates index on `doctor_id` for performance
- Populates `doctor_id` for existing doctor users by matching emails

### 2. Migration Runner Script
**File**: `/backend/run_migrations.py`

Created a Python script that:
- Parses SQL migrations (handling comments and semicolons)
- Checks if migrations have already been applied
- Applies pending migrations to the database
- Verifies doctor/usuario linkage
- Provides clear status output

**Run with:**
```bash
cd backend
source venv/bin/activate
python run_migrations.py
```

### 3. Database Data Fixed
All doctor users are now properly linked:

```
Usuario 4 (teste@tes.com) → Doctor 2 (Ignacio Elizeche)
Usuario 5 (ignacio@elizeche.com) → Doctor 1 (Dr Ignacio Elizeche)
```

### 4. JWT Token Enhancement
The authentication system now includes `doctor_id` in JWT tokens for doctor users:

```python
# In /backend/app/routers/auth.py (login endpoint)
if user.role and user.role.value == "Doctor" and user.doctor_id:
    token_data["doctor_id"] = user.doctor_id
```

**Token payload for doctors:**
```json
{
  "sub": "4",
  "email": "teste@tes.com",
  "role": "doctor",
  "empresa_id": 2,
  "doctor_id": 2
}
```

## How It Works Now

### 1. Doctor Login Flow
```
1. User logs in with doctor email → /auth/login
2. Backend finds Usuario and checks:
   - Password verification ✓
   - User has doctor_id set ✓
3. JWT token is created with:
   - user_id
   - email
   - role = "doctor"
   - empresa_id
   - doctor_id ← Critical for role-based access
4. Token is returned to frontend
```

### 2. Doctor Accessing Their Profile
```
Doctor clicks "Doctores" tab
↓
Frontend detects user.role === "Doctor"
↓
Calls GET /api/doctores (which returns only their profile)
↓
Then calls GET /api/doctores/{doctor_id}
↓
Backend validates:
  - current_user.doctor_id == requested_doctor_id
  ✓ Match → Returns doctor profile
  ✗ Mismatch → 403 Forbidden
↓
Frontend displays doctor profile (DoctorDetailView)
```

### 3. Data Filtering
All endpoints filter data by `current_user.doctor_id`:

**Patients**: Only patients with citas assigned to the doctor
```python
query = query.join(Cita, Paciente.id == Cita.patient_id)
        .filter(Cita.doctor_id == current_user.doctor_id)
```

**Appointments**: Only their own citas
```python
query = query.filter(Cita.doctor_id == current_user.doctor_id)
```

**Dashboard**: Only their statistics
```python
if current_user.doctor_id:
    base_filter.append(Cita.doctor_id == current_user.doctor_id)
```

## Files Modified

### Backend
1. **`/backend/migrations/002_add_doctor_id_to_usuarios.sql`** - Fixed enum comparison
2. **`/backend/app/models.py`** - Added `doctor_id` column and relationships (already done)
3. **`/backend/app/auth.py`** - Enhanced token with `doctor_id` (already done)
4. **`/backend/app/routers/doctors.py`** - Added filtering for doctors (already done)
5. **`/backend/app/routers/patients.py`** - Added filtering for doctors (already done)
6. **`/backend/app/routers/appointments.py`** - Added filtering for doctors (already done)
7. **`/backend/app/routers/dashboard.py`** - Added filtering for doctors (already done)

### New Utilities
1. **`/backend/run_migrations.py`** - Migration runner (created)
2. **`/backend/test_doctor_access.py`** - Test script (created)

### Frontend
1. **`/frontend/dental-back-office/app/doctores/page.tsx`** - Auto-show doctor profile (already done)
2. **`/frontend/dental-back-office/components/pacientes/create-patient-form.tsx`** - Auto-assign doctor (already done)
3. **`/frontend/dental-back-office/components/citas/appointment-form.tsx`** - Auto-assign doctor (already done)

## Verification

### Test Script
Run the verification test to confirm everything works:
```bash
source venv/bin/activate
python test_doctor_access.py
```

Expected output: ✓ ALL TESTS PASSED

### Manual Testing
1. **Doctor Login**:
   - Login with doctor email (teste@tes.com or ignacio@elizeche.com)
   - Verify JWT includes doctor_id in token

2. **Doctor Profile Access**:
   - Navigate to Doctores tab
   - Should auto-show doctor's own profile
   - Should NOT get 403 error

3. **Data Filtering**:
   - Go to Pacientes tab → Should see only assigned patients
   - Go to Citas tab → Should see only their citas
   - Go to Dashboard → Should see only their statistics

## Key Differences from Before

| Aspect | Before | After |
|--------|--------|-------|
| Doctor to User Link | Manual, not enforced | Automatic via `doctor_id` FK |
| JWT for Doctors | No `doctor_id` claim | Includes `doctor_id` claim |
| Authorization | Could access other doctors' data | Restricted to own data |
| Form Fields | Dropdown required manual selection | Auto-filled based on role |
| Doctor Tab | Listed all doctors | Auto-shows own profile |

## Notes

- **Enum Values**: Database uses lowercase ('doctor', 'administrador') while Python enum uses values like `"Doctor"`. This is handled in comparisons where needed.
- **Multi-tenant Safe**: `empresa_id` filtering maintained alongside `doctor_id` filtering
- **Backward Compatible**: Non-doctor roles (Recepcionista, Asistente, Administrador) continue working unchanged
- **No Breaking Changes**: Existing database is upgraded safely

## Future Considerations

1. Add "Create Doctor" functionality to properly set doctor_id when creating new doctors
2. Consider adding doctor_id to the existing configuration/usuarios endpoint
3. Add audit logging to track which doctor accessed what data
4. Consider restricting which doctors can see which clinic data (multi-clinic support)
