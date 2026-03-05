"""
Script to clean the database and create 2 admin users for testing
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, Base, SessionLocal
from app.models import Usuario, Empresa, RoleEnum
from app.auth import hash_password
from datetime import datetime

def cleanup_database():
    """Delete all tables and recreate them empty"""
    print("🔄 Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("🔄 Creating all tables...")
    Base.metadata.create_all(bind=engine)
    
    print("✅ Database cleaned and recreated")

def create_test_users():
    """Create 2 admin users with separate enterprises"""
    db = SessionLocal()
    
    try:
        # Create Enterprise A
        print("\n📝 Creating Enterprise A...")
        empA = Empresa(
            name="Clínica A",
            rfc="RFC-EMP-A-001",
            status="activa"
        )
        db.add(empA)
        db.flush()
        
        # Create Enterprise B
        print("📝 Creating Enterprise B...")
        empB = Empresa(
            name="Clínica B",
            rfc="RFC-EMP-B-002",
            status="activa"
        )
        db.add(empB)
        db.flush()
        
        # Create Admin A
        print("📝 Creating Admin User for Enterprise A...")
        admin_a = Usuario(
            name="Admin Clínica A",
            email="admin-a@clinica-a.com",
            hashed_password=hash_password("AdminPass123!"),
            role=RoleEnum.Administrador,
            initials="AA",
            empresa_id=empA.id
        )
        db.add(admin_a)
        
        # Create Admin B
        print("📝 Creating Admin User for Enterprise B...")
        admin_b = Usuario(
            name="Admin Clínica B",
            email="admin-b@clinica-b.com",
            hashed_password=hash_password("AdminPass456!"),
            role=RoleEnum.Administrador,
            initials="AB",
            empresa_id=empB.id
        )
        db.add(admin_b)
        
        db.commit()
        
        print("\n" + "=" * 60)
        print("✅ DATABASE CLEANUP AND SETUP COMPLETE!")
        print("=" * 60)
        print("\nCreated Enterprises:")
        print(f"  • Enterprise A (empA): ID={empA.id}, Name='{empA.name}'")
        print(f"  • Enterprise B (empB): ID={empB.id}, Name='{empB.name}'")
        print("\nCreated Admin Users:")
        print(f"  • Admin A: email=admin-a@clinica-a.com, password=AdminPass123!")
        print(f"  • Admin B: email=admin-b@clinica-b.com, password=AdminPass456!")
        print("\n" + "=" * 60)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating test users: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_database()
    create_test_users()
