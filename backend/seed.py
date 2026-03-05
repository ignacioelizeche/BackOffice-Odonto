"""
Seed script to populate initial data
Run from backend directory: python seed.py
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import Usuario, RoleEnum, Paciente, Doctor, GenderEnum, DoctorStatusEnum, PatientStatusEnum, Cita, AppointmentStatusEnum
from app.auth import hash_password
from datetime import datetime

def seed_database():
    """Seed the database with initial data"""
    # Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if admin user already exists
        existing_admin = db.query(Usuario).filter(
            Usuario.email == "admin@dentaloff.com"
        ).first()

        if not existing_admin:
            # Create admin user
            admin_user = Usuario(
                email="admin@dentaloff.com",
                name="Administrator",
                hashed_password=hash_password("admin123"),
                role=RoleEnum.administrador,
                initials="AD"
            )
            db.add(admin_user)
            print("✓ Admin user created")
        else:
            print("✓ Admin user already exists")

        # Seed test patients
        existing_patients = db.query(Paciente).count()
        if existing_patients == 0:
            patients = [
                Paciente(
                    name="Juan García López",
                    initials="JG",
                    email="juan.garcia@email.com",
                    phone="5551234567",
                    age=35,
                    gender=GenderEnum.masculino,
                    lastVisit="2024-02-10",
                    nextAppt="2024-02-24",
                    doctor="Dr. María Rodríguez",
                    status=PatientStatusEnum.activo,
                    totalVisits=5,
                    balance=500.00
                ),
                Paciente(
                    name="María Rodríguez Martínez",
                    initials="MR",
                    email="maria.rodriguez@email.com",
                    phone="5559876543",
                    age=28,
                    gender=GenderEnum.femenino,
                    lastVisit="2024-02-08",
                    nextAppt="2024-02-22",
                    doctor="Dr. Carlos López",
                    status=PatientStatusEnum.activo,
                    totalVisits=3,
                    balance=750.00
                ),
                Paciente(
                    name="Carlos Pérez Sánchez",
                    initials="CP",
                    email="carlos.perez@email.com",
                    phone="5552223333",
                    age=42,
                    gender=GenderEnum.masculino,
                    lastVisit="2024-02-12",
                    nextAppt=None,
                    doctor="Dr. Juan Domínguez",
                    status=PatientStatusEnum.activo,
                    totalVisits=8,
                    balance=1200.00
                )
            ]
            for patient in patients:
                db.add(patient)
            print(f"✓ {len(patients)} test patients created")
        else:
            print(f"✓ Patients already exist ({existing_patients} found)")

        # Seed test doctors
        existing_doctors = db.query(Doctor).count()
        if existing_doctors == 0:
            doctors = [
                Doctor(
                    name="Dr. María Rodríguez",
                    initials="MR",
                    email="maria.doctor@dentaloff.com",
                    phone="5551111111",
                    specialty="Odontología General",
                    licenseNumber="ODO-2020-001",
                    status=DoctorStatusEnum.disponible,
                    patientsToday=2,
                    patientsTotal=45,
                    rating=4.8,
                    reviewCount=12,
                    yearsExperience=8
                ),
                Doctor(
                    name="Dr. Carlos López",
                    initials="CL",
                    email="carlos.doctor@dentaloff.com",
                    phone="5552222222",
                    specialty="Endodoncia",
                    licenseNumber="ODO-2019-002",
                    status=DoctorStatusEnum.disponible,
                    patientsToday=1,
                    patientsTotal=38,
                    rating=4.9,
                    reviewCount=15,
                    yearsExperience=10
                ),
                Doctor(
                    name="Dr. Juan Domínguez",
                    initials="JD",
                    email="juan.doctor@dentaloff.com",
                    phone="5553333333",
                    specialty="Ortodoncia",
                    licenseNumber="ODO-2021-003",
                    status=DoctorStatusEnum.disponible,
                    patientsToday=3,
                    patientsTotal=52,
                    rating=4.7,
                    reviewCount=18,
                    yearsExperience=6
                )
            ]
            for doctor in doctors:
                db.add(doctor)
            print(f"✓ {len(doctors)} test doctors created")
        else:
            print(f"✓ Doctors already exist ({existing_doctors} found)")

        # Commit all changes
        db.commit()

        print("\n✓ Database seeding completed successfully!")
        print(f"  Email: admin@dentaloff.com")
        print(f"  Password: admin123")
        print(f"  Role: Administrador")

    except Exception as e:
        print(f"✗ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
