"""
Script to clean the database and create 2 admin users for testing
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, Base, SessionLocal
from app.models import Usuario, Empresa, RoleEnum
from app.auth import hash_password
from sqlalchemy import text

def cleanup_database():
    """Delete all tables with CASCADE"""
    print("🔄 Dropping all tables with CASCADE...")
    
    with engine.connect() as conn:
        # Get list of all tables
        result = conn.execute(text("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
        """))
        tables = [row[0] for row in result]
        
        # Drop all tables
        for table in tables:
            print(f"   Dropping table: {table}")
            try:
                conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
            except Exception as e:
                print(f"   Warning: {e}")
        
        conn.commit()
    
    print("✅ Database cleaned")

def recreate_tables():
    """Recreate all tables"""
    print("🔄 Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables recreated")

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
        
        print("\n" + "=" * 70)
        print("✅ DATABASE CLEANUP AND SETUP COMPLETE!")
        print("=" * 70)
        print("\nCreated Enterprises:")
        print(f"  • Enterprise A (empA): ID={empA.id}, Name='{empA.name}'")
        print(f"  • Enterprise B (empB): ID={empB.id}, Name='{empB.name}'")
        print("\nCreated Admin Users:")
        print(f"  • Admin A: email=admin-a@clinica-a.com, password=AdminPass123!")
        print(f"            empresa_id={empA.id}")
        print(f"  • Admin B: email=admin-b@clinica-b.com, password=AdminPass456!")
        print(f"            empresa_id={empB.id}")
        print("\n" + "=" * 70)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating test users: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_database()
    recreate_tables()
    create_test_users()
