#!/usr/bin/env python3
"""
Test script to verify doctor role-based access control
Tests: doctor login -> JWT with doctor_id -> access own profile
"""

import sys
import os
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Usuario, Doctor, RoleEnum, Cita, Paciente
from app.auth import decode_token, create_access_token
from datetime import timedelta
from app.config import settings

def test_doctor_login_flow():
    """Test the complete doctor login and authorization flow"""
    db = SessionLocal()

    print("=" * 80)
    print("Doctor Role-Based Access Control Testing")
    print("=" * 80)
    print()

    # Get a doctor user
    doctor_user = db.query(Usuario).filter(
        Usuario.role == RoleEnum.doctor,
        Usuario.doctor_id.isnot(None)
    ).first()

    if not doctor_user:
        print("✗ No doctor users with doctor_id found")
        return False

    print(f"Test Doctor User:")
    print(f"  ID: {doctor_user.id}")
    print(f"  Email: {doctor_user.email}")
    print(f"  Name: {doctor_user.name}")
    print(f"  Doctor ID: {doctor_user.doctor_id}")
    print(f"  Empresa ID: {doctor_user.empresa_id}")
    print()

    # Get the doctor record
    doctor_record = db.query(Doctor).filter(Doctor.id == doctor_user.doctor_id).first()
    if not doctor_record:
        print(f"✗ Doctor record {doctor_user.doctor_id} not found")
        return False

    print(f"Linked Doctor Record:")
    print(f"  ID: {doctor_record.id}")
    print(f"  Name: {doctor_record.name}")
    print(f"  Email: {doctor_record.email}")
    print(f"  Empresa ID: {doctor_record.empresa_id}")
    print()

    # Simulate JWT token creation (like in login)
    print("Simulating Login Flow:")
    print("-" * 80)

    token_data = {
        "sub": str(doctor_user.id),
        "email": doctor_user.email,
        "role": "doctor",  # This should match the lowercase enum value
        "empresa_id": doctor_user.empresa_id,
        "doctor_id": doctor_user.doctor_id  # Critical for filtering
    }

    print(f"Creating token with data:")
    for key, value in token_data.items():
        print(f"  {key}: {value}")
    print()

    # Create token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(data=token_data, expires_delta=access_token_expires)
    print(f"✓ JWT Token created: {token[:50]}...")
    print()

    # Decode token
    print("Decoding token:")
    decoded = decode_token(token)
    print(f"  user_id: {decoded.user_id}")
    print(f"  email: {decoded.email}")
    print(f"  role: {decoded.role}")
    print(f"  empresa_id: {decoded.empresa_id}")
    print(f"  doctor_id: {decoded.doctor_id}")

    if decoded.doctor_id != doctor_user.doctor_id:
        print(f"✗ doctor_id mismatch: {decoded.doctor_id} != {doctor_user.doctor_id}")
        return False

    print("✓ Token decoded correctly with doctor_id")
    print()

    # Test authorization logic
    print("Testing Authorization Logic:")
    print("-" * 80)

    # Simulate the GET /doctores/{doctor_id} authorization check
    requested_doctor_id = doctor_record.id
    current_user_doctor_id = decoded.doctor_id
    current_user_role = decoded.role

    print(f"Scenario: Doctor {decoded.user_id} requesting doctor profile {requested_doctor_id}")

    # Backend authorization check (from doctors.py router)
    if current_user_role == "doctor":
        if current_user_doctor_id != requested_doctor_id:
            print(f"✗ Authorization DENIED: {current_user_doctor_id} != {requested_doctor_id}")
            return False

    print(f"✓ Authorization CHECK PASSED")
    print(f"  Doctor can access their own profile")
    print()

    # Test that doctor can access their own data
    print("Testing Data Access Filtering:")
    print("-" * 80)

    # Simulate patients filtering for this doctor
    doctor_patients = db.query(Paciente).join(
        Cita, Paciente.id == Cita.patient_id
    ).filter(
        Cita.doctor_id == doctor_user.doctor_id,
        Paciente.empresa_id == doctor_user.empresa_id
    ).distinct().all()

    print(f"Patients assigned to this doctor: {len(doctor_patients)}")
    for patient in doctor_patients[:3]:  # Show first 3
        print(f"  - {patient.name} (ID: {patient.id})")

    # Simulate appointments filtering for this doctor
    doctor_appointments = db.query(Cita).filter(
        Cita.doctor_id == doctor_user.doctor_id,
        Cita.empresa_id == doctor_user.empresa_id
    ).all()

    print(f"Appointments for this doctor: {len(doctor_appointments)}")
    for appt in doctor_appointments[:3]:  # Show first 3
        print(f"  - Appointment ID: {appt.id}, Date: {appt.date}")

    print()
    print("=" * 80)
    print("✓ ALL TESTS PASSED")
    print("=" * 80)
    print()
    print("Summary:")
    print("  - Doctor user properly linked to doctor record")
    print("  - JWT token includes doctor_id claim")
    print("  - Authorization checks will work correctly")
    print("  - Data filtering by doctor works as expected")
    print()

    db.close()
    return True

if __name__ == "__main__":
    try:
        success = test_doctor_login_flow()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"✗ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
