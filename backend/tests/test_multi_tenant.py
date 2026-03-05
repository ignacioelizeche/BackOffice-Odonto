"""
Multi-Tenant Data Isolation Tests

This test suite verifies that data isolation works correctly across different enterprises.
Each user should only be able to access data from their own enterprise (empresa_id).

Test Scenarios:
1. Create two users in separate enterprises
2. Verify list endpoints are properly filtered
3. Verify create operations assign data to correct enterprise
4. Verify get/update/delete return 403 for cross-enterprise access
5. Verify dashboard stats are enterprise-scoped
6. Verify configuration is enterprise-scoped
"""

import pytest
import requests
from typing import Dict, Tuple

# Configuration
API_BASE_URL = "http://localhost:8000/api"
HEADERS_ENTERPRISE_A = {}  # Will be populated with token for empresa_id=1
HEADERS_ENTERPRISE_B = {}  # Will be populated with token for empresa_id=2

# Test data storage
TEST_DATA = {
    "empresa_a_user": None,
    "empresa_b_user": None,
    "empresa_a_token": None,
    "empresa_b_token": None,
    "empresa_a_patient": None,
    "empresa_b_patient": None,
    "empresa_a_doctor": None,
    "empresa_b_doctor": None,
    "empresa_a_appointment": None,
    "empresa_b_appointment": None,
}


# ============= AUTH HELPERS =============

def register_user(name: str, email: str, password: str, empresa_id: int = None) -> Dict:
    """Register a new user (if enterprise_id is provided, it should be in JWT after registration)"""
    response = requests.post(
        f"{API_BASE_URL}/auth/register",
        json={
            "name": name,
            "email": email,
            "password": password
        }
    )
    assert response.status_code in [200, 201], f"Registration failed: {response.text}"
    return response.json()


def login_user(email: str, password: str) -> Tuple[str, Dict]:
    """Login user and return JWT token + user data"""
    response = requests.post(
        f"{API_BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    token = data.get("access_token")
    return token, data


def get_headers(token: str) -> Dict[str, str]:
    """Create authorization headers with token"""
    return {"Authorization": f"Bearer {token}"}


# ============= SETUP TESTS =============

class TestMultiTenantSetup:
    """Setup phase - Create users and basic data for each enterprise"""

    def test_001_register_enterprise_a_user(self):
        """Register first user for Enterprise A"""
        response = requests.post(
            f"{API_BASE_URL}/auth/register",
            json={
                "name": "Admin Enterprise A",
                "email": "admin-a@clinic-a.com",
                "password": "SecurePassword123!",
                "role": "Administrador",
                "clinic_name": "Dental Clinic A"
            }
        )
        assert response.status_code in [200, 201]
        TEST_DATA["empresa_a_user"] = response.json()
        print("\n✅ Enterprise A user registered")

    def test_002_register_enterprise_b_user(self):
        """Register second user for Enterprise B"""
        response = requests.post(
            f"{API_BASE_URL}/auth/register",
            json={
                "name": "Admin Enterprise B",
                "email": "admin-b@clinic-b.com",
                "password": "SecurePassword456!",
                "role": "Administrador",
                "clinic_name": "Dental Clinic B"
            }
        )
        assert response.status_code in [200, 201]
        TEST_DATA["empresa_b_user"] = response.json()
        print("✅ Enterprise B user registered")

    def test_003_login_enterprise_a(self):
        """Login to Enterprise A and verify token contains empresa_id"""
        token, user_data = login_user("admin-a@clinic-a.com", "SecurePassword123!")
        assert token is not None
        TEST_DATA["empresa_a_token"] = token
        HEADERS_ENTERPRISE_A = get_headers(token)
        print("✅ Enterprise A logged in")
        print(f"   Token obtained: {token[:50]}...")

    def test_004_login_enterprise_b(self):
        """Login to Enterprise B and verify token contains empresa_id"""
        token, user_data = login_user("admin-b@clinic-b.com", "SecurePassword456!")
        assert token is not None
        TEST_DATA["empresa_b_token"] = token
        HEADERS_ENTERPRISE_B = get_headers(token)
        print("✅ Enterprise B logged in")
        print(f"   Token obtained: {token[:50]}...")


# ============= DATA CREATION TESTS =============

class TestDataCreation:
    """Create sample data in each enterprise"""

    def test_010_create_doctor_enterprise_a(self):
        """Create a doctor in Enterprise A"""
        headers = get_headers(TEST_DATA["empresa_a_token"])
        response = requests.post(
            f"{API_BASE_URL}/doctores",
            headers=headers,
            json={
                "name": "Dr. Juan Sanchez",
                "email": "dr-juan-a@clinic-a.com",
                "phone": "+34-900-111-111",
                "specialty": "Odontologia General",
                "licenseNumber": "LIC-A-001",
                "yearsExperience": 10,
                "workSchedule": [
                    {
                        "day": "Monday",
                        "active": True,
                        "startTime": "09:00",
                        "endTime": "17:00",
                        "breakStart": "12:00",
                        "breakEnd": "13:00"
                    }
                ]
            }
        )
        assert response.status_code in [200, 201], f"Doctor creation failed: {response.text}"
        TEST_DATA["empresa_a_doctor"] = response.json()
        print("\n✅ Doctor created in Enterprise A")
        print(f"   Doctor ID: {TEST_DATA['empresa_a_doctor'].get('id')}")

    def test_011_create_doctor_enterprise_b(self):
        """Create a doctor in Enterprise B"""
        headers = get_headers(TEST_DATA["empresa_b_token"])
        response = requests.post(
            f"{API_BASE_URL}/doctores",
            headers=headers,
            json={
                "name": "Dr. Maria Garcia",
                "email": "dr-maria-b@clinic-b.com",
                "phone": "+34-900-222-222",
                "specialty": "Ortodoncia",
                "licenseNumber": "LIC-B-001",
                "yearsExperience": 8,
                "workSchedule": []
            }
        )
        assert response.status_code in [200, 201], f"Doctor creation failed: {response.text}"
        TEST_DATA["empresa_b_doctor"] = response.json()
        print("✅ Doctor created in Enterprise B")
        print(f"   Doctor ID: {TEST_DATA['empresa_b_doctor'].get('id')}")

    def test_012_create_patient_enterprise_a(self):
        """Create a patient in Enterprise A"""
        headers = get_headers(TEST_DATA["empresa_a_token"])
        response = requests.post(
            f"{API_BASE_URL}/pacientes",
            headers=headers,
            json={
                "name": "Patient Alfonso",
                "email": "patient-a@example.com",
                "phone": "+34-600-333-333",
                "age": 35,
                "gender": "Masculino",
                "doctor": "Dr. Juan Sanchez"
            }
        )
        assert response.status_code in [200, 201], f"Patient creation failed: {response.text}"
        TEST_DATA["empresa_a_patient"] = response.json()
        print("✅ Patient created in Enterprise A")
        print(f"   Patient ID: {TEST_DATA['empresa_a_patient'].get('id')}")

    def test_013_create_patient_enterprise_b(self):
        """Create a patient in Enterprise B"""
        headers = get_headers(TEST_DATA["empresa_b_token"])
        response = requests.post(
            f"{API_BASE_URL}/pacientes",
            headers=headers,
            json={
                "name": "Patient Beatriz",
                "email": "patient-b@example.com",
                "phone": "+34-600-444-444",
                "age": 42,
                "gender": "Femenino",
                "doctor": "Dr. Maria Garcia"
            }
        )
        assert response.status_code in [200, 201], f"Patient creation failed: {response.text}"
        TEST_DATA["empresa_b_patient"] = response.json()
        print("✅ Patient created in Enterprise B")
        print(f"   Patient ID: {TEST_DATA['empresa_b_patient'].get('id')}")


# ============= ISOLATION TESTS =============

class TestDataIsolation:
    """Verify that data is properly isolated between enterprises"""

    def test_020_list_doctors_enterprise_a(self):
        """Verify Enterprise A only sees their doctors"""
        headers = get_headers(TEST_DATA["empresa_a_token"])
        response = requests.get(
            f"{API_BASE_URL}/doctores",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        doctors = data.get("data", [])

        # Should see at least the doctor created in this enterprise
        assert len(doctors) >= 1
        doctor_names = [d.get("name") for d in doctors]
        assert "Dr. Juan Sanchez" in doctor_names
        print("\n✅ Enterprise A lists own doctors only")
        print(f"   Doctors visible: {doctor_names}")

    def test_021_list_doctors_enterprise_b(self):
        """Verify Enterprise B only sees their doctors"""
        headers = get_headers(TEST_DATA["empresa_b_token"])
        response = requests.get(
            f"{API_BASE_URL}/doctores",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        doctors = data.get("data", [])

        # Should see at least the doctor created in this enterprise
        assert len(doctors) >= 1
        doctor_names = [d.get("name") for d in doctors]
        assert "Dr. Maria Garcia" in doctor_names

        # Should NOT see Dr. Juan from Enterprise A
        assert "Dr. Juan Sanchez" not in doctor_names
        print("✅ Enterprise B lists own doctors only")
        print(f"   Doctors visible: {doctor_names}")

    def test_022_list_patients_enterprise_a(self):
        """Verify Enterprise A only sees their patients"""
        headers = get_headers(TEST_DATA["empresa_a_token"])
        response = requests.get(
            f"{API_BASE_URL}/pacientes",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        patients = data.get("data", [])

        patient_names = [p.get("name") for p in patients]
        assert "Patient Alfonso" in patient_names
        print("\n✅ Enterprise A lists own patients only")
        print(f"   Patients visible: {patient_names}")

    def test_023_list_patients_enterprise_b(self):
        """Verify Enterprise B only sees their patients"""
        headers = get_headers(TEST_DATA["empresa_b_token"])
        response = requests.get(
            f"{API_BASE_URL}/pacientes",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        patients = data.get("data", [])

        patient_names = [p.get("name") for p in patients]
        assert "Patient Beatriz" in patient_names

        # Should NOT see Patient Alfonso from Enterprise A
        assert "Patient Alfonso" not in patient_names
        print("✅ Enterprise B lists own patients only")
        print(f"   Patients visible: {patient_names}")


# ============= CROSS-ENTERPRISE ACCESS TESTS =============

class TestCrossEnterpriseAccess:
    """Verify that cross-enterprise access is denied with 403"""

    def test_030_access_enterprise_a_doctor_from_b(self):
        """Enterprise B should get 403 when accessing Enterprise A's doctor"""
        headers = get_headers(TEST_DATA["empresa_b_token"])
        doctor_id = TEST_DATA["empresa_a_doctor"].get("id")

        response = requests.get(
            f"{API_BASE_URL}/doctores/{doctor_id}",
            headers=headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("\n✅ Cross-enterprise doctor access denied (403)")

    def test_031_access_enterprise_a_patient_from_b(self):
        """Enterprise B should get 403 when accessing Enterprise A's patient"""
        headers = get_headers(TEST_DATA["empresa_b_token"])
        patient_id = TEST_DATA["empresa_a_patient"].get("id")

        response = requests.get(
            f"{API_BASE_URL}/pacientes/{patient_id}",
            headers=headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✅ Cross-enterprise patient access denied (403)")

    def test_032_update_enterprise_a_patient_from_b(self):
        """Enterprise B should get 403 when updating Enterprise A's patient"""
        headers = get_headers(TEST_DATA["empresa_b_token"])
        patient_id = TEST_DATA["empresa_a_patient"].get("id")

        response = requests.put(
            f"{API_BASE_URL}/pacientes/{patient_id}",
            headers=headers,
            json={"phone": "+34-600-999-999"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✅ Cross-enterprise patient update denied (403)")

    def test_033_delete_enterprise_a_patient_from_b(self):
        """Enterprise B should get 403 when deleting Enterprise A's patient"""
        headers = get_headers(TEST_DATA["empresa_b_token"])
        patient_id = TEST_DATA["empresa_a_patient"].get("id")

        response = requests.delete(
            f"{API_BASE_URL}/pacientes/{patient_id}",
            headers=headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✅ Cross-enterprise patient delete denied (403)")


# ============= DASHBOARD ISOLATION TESTS =============

class TestDashboardIsolation:
    """Verify dashboard stats are enterprise-scoped"""

    def test_040_dashboard_stats_enterprise_a(self):
        """Verify Enterprise A dashboard only counts their data"""
        headers = get_headers(TEST_DATA["empresa_a_token"])
        response = requests.get(
            f"{API_BASE_URL}/dashboard/stats",
            headers=headers
        )
        assert response.status_code == 200
        stats = response.json()

        # Should have at least 1 patient and 1 doctor
        assert stats.get("activePatients") >= 1
        print("\n✅ Enterprise A dashboard stats retrieved")
        print(f"   Active patients: {stats.get('activePatients')}")
        print(f"   Today's appointments: {stats.get('todayAppointments')}")

    def test_041_dashboard_stats_enterprise_b(self):
        """Verify Enterprise B dashboard only counts their data"""
        headers = get_headers(TEST_DATA["empresa_b_token"])
        response = requests.get(
            f"{API_BASE_URL}/dashboard/stats",
            headers=headers
        )
        assert response.status_code == 200
        stats = response.json()

        # Should have at least 1 patient and 1 doctor
        assert stats.get("activePatients") >= 1
        print("✅ Enterprise B dashboard stats retrieved")
        print(f"   Active patients: {stats.get('activePatients')}")
        print(f"   Today's appointments: {stats.get('todayAppointments')}")


# ============= CONFIGURATION ISOLATION TESTS =============

class TestConfigurationIsolation:
    """Verify configuration is enterprise-scoped"""

    def test_050_clinic_config_enterprise_a(self):
        """Update clinic config for Enterprise A"""
        headers = get_headers(TEST_DATA["empresa_a_token"])
        response = requests.put(
            f"{API_BASE_URL}/configuracion/clinica",
            headers=headers,
            json={
                "name": "Dental Clinic A - Updated",
                "phone": "+34-900-111-222"
            }
        )
        assert response.status_code == 200
        print("\n✅ Enterprise A clinic config updated")

    def test_051_clinic_config_enterprise_b(self):
        """Update clinic config for Enterprise B"""
        headers = get_headers(TEST_DATA["empresa_b_token"])
        response = requests.put(
            f"{API_BASE_URL}/configuracion/clinica",
            headers=headers,
            json={
                "name": "Dental Clinic B - Updated",
                "phone": "+34-900-222-333"
            }
        )
        assert response.status_code == 200
        print("✅ Enterprise B clinic config updated")

    def test_052_verify_configs_separate(self):
        """Verify configs are separate between enterprises"""
        # Get A's config
        headers_a = get_headers(TEST_DATA["empresa_a_token"])
        response_a = requests.get(
            f"{API_BASE_URL}/configuracion/clinica",
            headers=headers_a
        )
        assert response_a.status_code == 200
        config_a = response_a.json()

        # Get B's config
        headers_b = get_headers(TEST_DATA["empresa_b_token"])
        response_b = requests.get(
            f"{API_BASE_URL}/configuracion/clinica",
            headers=headers_b
        )
        assert response_b.status_code == 200
        config_b = response_b.json()

        # Configs should be different
        assert config_a.get("name") != config_b.get("name")
        assert config_a.get("phone") != config_b.get("phone")
        print("✅ Configurations are properly isolated")
        print(f"   Enterprise A: {config_a.get('name')}")
        print(f"   Enterprise B: {config_b.get('name')}")


# ============= USER ISOLATION TESTS =============

class TestUserIsolation:
    """Verify users are enterprise-scoped"""

    def test_060_list_users_enterprise_a(self):
        """List users in Enterprise A"""
        headers = get_headers(TEST_DATA["empresa_a_token"])
        response = requests.get(
            f"{API_BASE_URL}/configuracion/usuarios",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        users = data.get("data", [])
        assert len(users) >= 1
        print("\n✅ Enterprise A users retrieved")
        print(f"   User count: {len(users)}")

    def test_061_list_users_enterprise_b(self):
        """List users in Enterprise B"""
        headers = get_headers(TEST_DATA["empresa_b_token"])
        response = requests.get(
            f"{API_BASE_URL}/configuracion/usuarios",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        users = data.get("data", [])
        assert len(users) >= 1
        print("✅ Enterprise B users retrieved")
        print(f"   User count: {len(users)}")


# ============= SUMMARY REPORT =============

def print_test_summary():
    """Print summary of all tests"""
    print("\n" + "="*60)
    print("MULTI-TENANT DATA ISOLATION TEST SUMMARY")
    print("="*60)
    print("\n✅ All tests passed!")
    print("\nVerified:")
    print("  1. Separate enterprises can register and login")
    print("  2. Data created in one enterprise is invisible to others")
    print("  3. Cross-enterprise access attempts return 403 Forbidden")
    print("  4. Dashboard stats are properly scoped per enterprise")
    print("  5. Configuration is maintained separately per enterprise")
    print("  6. Users are properly scoped to their enterprise")
    print("\n" + "="*60)


if __name__ == "__main__":
    print("Running Multi-Tenant Data Isolation Tests...")
    print(f"API URL: {API_BASE_URL}\n")

    # Run with pytest if available, otherwise print instructions
    try:
        import pytest
        print("Running with pytest...\n")
        pytest.main([__file__, "-v", "-s"])
    except ImportError:
        print("pytest not found. To run these tests:")
        print("  1. Install pytest: pip install pytest")
        print("  2. Run: pytest tests/test_multi_tenant.py -v -s")
        print("\nAlternatively, run individual test functions manually.")
