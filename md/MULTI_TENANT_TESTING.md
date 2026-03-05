# Multi-Tenant Data Isolation Testing Guide

## Overview
This guide walks through testing the multi-tenant data isolation implementation for the BackOffice Odonto system. The system now supports multiple enterprises (dental clinics) where each user can only access data from their own enterprise.

## Architecture Summary

### What Was Implemented
1. **Enterprise Model** - New `Empresa` table for multi-tenant support
2. **JWT Enhancement** - Tokens now include `empresa_id` field
3. **Row-Level Security** - All queries filtered by `empresa_id`
4. **Ownership Verification** - 403 Forbidden for cross-enterprise access
5. **Schema Updates** - Response models include `empresa_id` field

### Key Files
- **Backend**:
  - `app/models.py` - Empresa model + FK relationships
  - `app/auth.py` - JWT token generation with empresa_id
  - `app/routers/*.py` - Data isolation in all endpoints
  - `app/schemas.py` - Updated response schemas

- **Tests**:
  - `tests/test_multi_tenant.py` - Comprehensive test suite
  - `run_multi_tenant_tests.sh` - Test execution script

## Running the Tests

### 1. Prerequisites
```bash
# Install dependencies
pip install pytest requests

# Ensure backend is running
python -m uvicorn app.main:app --reload
```

### 2. Quick Start
```bash
# Option A: Run bash script
chmod +x run_multi_tenant_tests.sh
./run_multi_tenant_tests.sh

# Option B: Run pytest directly
pytest tests/test_multi_tenant.py -v -s

# Option C: Run specific test class
pytest tests/test_multi_tenant.py::TestDataIsolation -v -s
```

### 3. Interpreting Results

#### Successful Multi-Tenant Setup
```
TestMultiTenantSetup::test_001_register_enterprise_a_user PASSED
TestMultiTenantSetup::test_002_register_enterprise_b_user PASSED
TestMultiTenantSetup::test_003_login_enterprise_a PASSED
TestMultiTenantSetup::test_004_login_enterprise_b PASSED
```

#### Successful Data Isolation
```
TestDataIsolation::test_020_list_doctors_enterprise_a PASSED
TestDataIsolation::test_021_list_doctors_enterprise_b PASSED
  ✅ Enterprise B lists own doctors only
  Doctors visible: ['Dr. Maria Garcia']

TestDataIsolation::test_022_list_patients_enterprise_a PASSED
TestDataIsolation::test_023_list_patients_enterprise_b PASSED
  ✅ Enterprise B lists own patients only
```

#### Successful Cross-Enterprise Denial
```
TestCrossEnterpriseAccess::test_030_access_enterprise_a_doctor_from_b PASSED
  ✅ Cross-enterprise doctor access denied (403)

TestCrossEnterpriseAccess::test_031_access_enterprise_a_patient_from_b PASSED
  ✅ Cross-enterprise patient access denied (403)
```

## Test Scenarios Covered

### Test Suite 1: Setup (4 tests)
- Register two users (one per enterprise)
- Login and obtain JWT tokens with empresa_id
- Verify token generation

### Test Suite 2: Data Creation (4 tests)
- Create doctors in separate enterprises
- Create patients in separate enterprises
- Verify data is assigned to correct enterprise

### Test Suite 3: Data Isolation (4 tests)
- List endpoints return only own data
- Enterprise A doctors invisible to B
- Enterprise B patients invisible to A
- Correct filtering by empresa_id

### Test Suite 4: Cross-Enterprise Access (4 tests)
- GET cross-enterprise resource → 403
- PUT cross-enterprise resource → 403
- DELETE cross-enterprise resource → 403
- Verify strong isolation

### Test Suite 5: Dashboard Isolation (2 tests)
- Dashboard stats only count own data
- Aggregations properly scoped

### Test Suite 6: Configuration Isolation (3 tests)
- Configuration updated per enterprise
- Changes don't affect other enterprises
- Separate settings maintained

### Test Suite 7: User Isolation (2 tests)
- Users listed per enterprise
- User count correct for each

## Expected Test Results

| Test Category | Total | Expected | Status |
|---|---|---|---|
| Setup | 4 | 4 PASS | ✅ |
| Data Creation | 4 | 4 PASS | ✅ |
| Data Isolation | 4 | 4 PASS | ✅ |
| Cross-Enterprise | 4 | 4 PASS (403) | ✅ |
| Dashboard | 2 | 2 PASS | ✅ |
| Configuration | 3 | 3 PASS | ✅ |
| User Isolation | 2 | 2 PASS | ✅ |
| **TOTAL** | **23** | **23 PASS** | ✅ |

## Manual Testing Scenarios

If you prefer to test manually using cURL or Postman:

### Scenario 1: Cross-Enterprise Access Prevention
```bash
# Login as Enterprise A
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin-a@clinic-a.com","password":"SecurePassword123!"}'

# Copy the access_token, then try to access Enterprise B's patient with it
PATIENT_ID=$(curl -X GET http://localhost:8000/pacientes \
  -H "Authorization: Bearer TOKEN_FROM_ENTERPRISE_B" \
  -H "Content-Type: application/json" | jq '.data[0].id')

# This should return 403 Forbidden:
curl -X GET http://localhost:8000/pacientes/$PATIENT_ID \
  -H "Authorization: Bearer TOKEN_FROM_ENTERPRISE_A" \
  -H "Content-Type: application/json"
# Expected: 403 {"detail":"No tienes permisos para acceder a este recurso"}
```

### Scenario 2: Data Visibility Per Enterprise
```bash
# Login as Enterprise A and list doctors
HEADERS_A="Authorization: Bearer $(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin-a@clinic-a.com","password":"SecurePassword123!"}' | jq -r '.access_token')"

curl -X GET http://localhost:8000/doctores \
  -H "$HEADERS_A" \
  -H "Content-Type: application/json"
# Should only see Enterprise A's doctors

# Now login as Enterprise B
HEADERS_B="Authorization: Bearer $(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin-b@clinic-b.com","password":"SecurePassword456!"}' | jq -r '.access_token')"

curl -X GET http://localhost:8000/doctores \
  -H "$HEADERS_B" \
  -H "Content-Type: application/json"
# Should only see Enterprise B's doctors, NOT Enterprise A's
```

### Scenario 3: Dashboard Scope Verification
```bash
# Enterprise A dashboard
curl -X GET http://localhost:8000/dashboard/stats \
  -H "Authorization: Bearer TOKEN_A" \
  -H "Content-Type: application/json"
# Returns: activePatients, monthlyRevenue, weeklyChart (only for Enterprise A)

# Enterprise B dashboard
curl -X GET http://localhost:8000/dashboard/stats \
  -H "Authorization: Bearer TOKEN_B" \
  -H "Content-Type: application/json"
# Returns: Same fields but for Enterprise B data only
```

## Troubleshooting

### Issue: Tests fail with "Registration failed"
**Cause**: Backend auth endpoint not working or database not initialized
**Solution**:
```bash
# Check backend is running:
curl http://localhost:8000/docs

# Check database migrations:
python -m alembic upgrade head

# Restart backend:
python -m uvicorn app.main:app --reload
```

### Issue: "403 Unauthorized" instead of expected response
**Cause**: JWT token not properly including empresa_id
**Solution**: Verify `auth.py` has empresa_id in JWT payload:
```python
"empresa_id": user.empresa_id  # Must be present
```

### Issue: Tests pass but cross-enterprise requests return 400 instead of 403
**Cause**: Endpoint not properly checking ownership
**Solution**: Verify all routers have enterprise_id verification:
```python
if resource.empresa_id != current_user.empresa_id:
    raise HTTPException(status_code=403, detail="...")
```

### Issue: Dashboard shows data from all enterprises
**Cause**: Dashboard query missing empresa_id filter
**Solution**: Verify `routers/dashboard.py` filters:
```python
query = db.query(Cita).filter(
    Cita.empresa_id == current_user.empresa_id  # Must filter
)
```

## Verification Checklist

Use this checklist to manually verify multi-tenant implementation:

```
□ User Registration
  □ User A registers → created with empresa_id
  □ User B registers → created with different empresa_id
  □ Token A contains empresa_id=1
  □ Token B contains empresa_id=2

□ Data Isolation
  □ List doctors as A → only sees A's doctors
  □ List doctors as B → only sees B's doctors
  □ List patients as A → only sees A's patients
  □ List patients as B → only sees B's patients

□ Cross-Enterprise Denial
  □ Get A's doctor as B user → 403 Forbidden
  □ Get B's patient as A user → 403 Forbidden
  □ Update A's data as B → 403 Forbidden
  □ Delete B's data as A → 403 Forbidden

□ Dashboard & Config
  □ Dashboard A shows only A's stats
  □ Dashboard B shows only B's stats
  □ Config update by A doesn't affect B
  □ Each enterprise has separate settings

□ Users Management
  □ Can create users in own enterprise
  □ Cannot see users from other enterprises
  □ User deletion verified per enterprise
```

## Performance Considerations

The multi-tenant implementation adds minimal overhead:
- **Query filtering**: Single WHERE clause on empresa_id (indexed)
- **JWT parsing**: No additional processing
- **Schema changes**: Optional empresa_id field only

Expected performance: **No significant impact** on response times.

## Future Enhancements

1. **Multi-Clinic Users**: Allow one user to manage multiple clinics
   - Need: junction table `user_empresas`
   - Change: `usuario.empresa_id` → `usuario.empresas` (many-to-many)

2. **Cross-Enterprise Admin**: Super-admin role with full access
   - Add: `role="SuperAdmin"` permission bypasses empresa_id check

3. **Audit Logging**: Track which user accessed what in which enterprise
   - Add: `AuditLog` table with `empresa_id`, `user_id`, `action`, `resource`

4. **Data Export**: Per-enterprise reporting and exports
   - Maintain: Existing empresa_id filtering in export functions

## Support & Documentation

For questions or issues:
1. Check test file: `tests/test_multi_tenant.py`
2. Review models: `app/models.py` (Empresa class)
3. Check auth: `app/auth.py` (JWT generation)
4. Verify routers: `app/routers/*.py` (isolation patterns)
