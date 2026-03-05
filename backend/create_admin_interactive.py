#!/usr/bin/env python
"""
Interactive script to create admin users in BackOffice Odonto
"""

import sys
import getpass
from app.database import SessionLocal
from app.models import Empresa, Usuario, RoleEnum
from app.auth import hash_password

def validate_email(email: str) -> bool:
    """Simple email validation"""
    return "@" in email and "." in email

def create_admin_interactive():
    """Interactively create an admin user"""

    print("\n" + "="*50)
    print("   BackOffice Odonto - Create Admin User")
    print("="*50 + "\n")

    db = SessionLocal()

    try:
        # ============= ENTERPRISE DATA =============
        print("--- Enterprise Information ---")
        while True:
            empresa_name = input("Enterprise name: ").strip()
            if empresa_name:
                break
            print("❌ Enterprise name cannot be empty")

        while True:
            rfc = input("RFC/Tax ID (e.g., RFC123456789): ").strip()
            if rfc:
                break
            print("❌ RFC cannot be empty")

        email_empresa = input("Enterprise email (optional): ").strip() or None
        phone_empresa = input("Enterprise phone (optional): ").strip() or None

        # Check if enterprise already exists
        existing_empresa = db.query(Empresa).filter(Empresa.rfc == rfc).first()
        if existing_empresa:
            print(f"\n✓ Using existing enterprise: {existing_empresa.name}")
            empresa = existing_empresa
        else:
            print("\nCreating new enterprise...")
            empresa = Empresa(
                name=empresa_name,
                rfc=rfc,
                email=email_empresa,
                phone=phone_empresa,
                status="activa",
                subscription_plan="premium",
                max_users=50,
                max_patients=2000
            )
            db.add(empresa)
            db.flush()
            print(f"✓ Enterprise created: {empresa_name}")

        # ============= ADMIN USER DATA =============
        print("\n--- Admin User Information ---")
        while True:
            admin_name = input("Admin name: ").strip()
            if admin_name:
                break
            print("❌ Name cannot be empty")

        while True:
            admin_email = input("Admin email: ").strip()
            if not admin_email:
                print("❌ Email cannot be empty")
                continue
            if not validate_email(admin_email):
                print("❌ Invalid email format")
                continue

            # Check if user already exists
            existing_user = db.query(Usuario).filter(Usuario.email == admin_email).first()
            if existing_user:
                print("❌ This email already exists in the system")
                continue
            break

        while True:
            password = getpass.getpass("Password (min 8 characters): ")
            if len(password) < 8:
                print("❌ Password must be at least 8 characters")
                continue

            password_confirm = getpass.getpass("Confirm password: ")
            if password != password_confirm:
                print("❌ Passwords do not match")
                continue
            break

        # ============= CREATE ADMIN USER =============
        print("\n--- Summary ---")
        print(f"Enterprise: {empresa.name}")
        print(f"Admin Name: {admin_name}")
        print(f"Admin Email: {admin_email}")
        print(f"Password: {'*' * len(password)}")

        confirm = input("\nCreate admin user? (yes/no): ").strip().lower()
        if confirm not in ['yes', 'y']:
            print("❌ Creation cancelled")
            return False

        admin = Usuario(
            empresa_id=empresa.id,
            name=admin_name,
            initials=admin_name[:2].upper(),
            email=admin_email,
            hashed_password=hash_password(password),
            role=RoleEnum.administrador
        )
        db.add(admin)
        db.commit()

        print("\n" + "="*50)
        print("✓ Admin user created successfully!")
        print("="*50)
        print(f"\nLogin credentials:")
        print(f"  Email: {admin_email}")
        print(f"  Password: {password}")
        print(f"  Enterprise: {empresa.name}")
        print("\n")

        return True

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error creating admin user: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = create_admin_interactive()
    sys.exit(0 if success else 1)
