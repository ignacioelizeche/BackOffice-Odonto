#!/usr/bin/env python3
"""
Migration runner for BackOffice Odonto
Applies SQL migration files to the database and verifies data integrity
"""

import os
import sys
from pathlib import Path
from sqlalchemy import text, inspect
import logging

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from app.config import settings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

def get_existing_columns(table_name: str) -> list:
    """Get list of existing columns in a table"""
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        return [col['name'] for col in columns]
    except Exception as e:
        logger.warning(f"Could not inspect table {table_name}: {e}")
        return []

def parse_sql_statements(sql_content: str) -> list:
    """Parse SQL statements, handling comments"""
    # Remove block comments /* ... */
    import re
    sql_content = re.sub(r'/\*.*?\*/', '', sql_content, flags=re.DOTALL)

    # Remove line comments --
    lines = []
    for line in sql_content.split('\n'):
        # Remove comment part of the line
        if '--' in line:
            line = line[:line.index('--')]
        lines.append(line)

    sql_content = '\n'.join(lines)

    # Split by semicolon and filter empty statements
    statements = [s.strip() for s in sql_content.split(';') if s.strip()]
    return statements

def run_migration_file(filepath: str) -> bool:
    """Run a single migration file"""
    logger.info(f"Running migration: {Path(filepath).name}")

    try:
        with open(filepath, 'r') as f:
            sql_content = f.read()

        statements = parse_sql_statements(sql_content)

        with engine.connect() as connection:
            for statement in statements:
                if statement:
                    logger.debug(f"Executing: {statement[:100]}...")
                    connection.execute(text(statement))
            connection.commit()

        logger.info(f"✓ Migration completed successfully: {Path(filepath).name}")
        return True
    except Exception as e:
        logger.error(f"✗ Migration failed: {e}")
        return False

def check_migration_status() -> dict:
    """Check the status of migrations"""
    status = {
        "doctor_id_column_exists": False,
        "foreign_key_exists": False,
        "doctor_usuario_linked": 0,
        "doctor_usuario_unlinked": 0
    }

    try:
        usuarios_columns = get_existing_columns("usuarios")
        status["doctor_id_column_exists"] = "doctor_id" in usuarios_columns

        if status["doctor_id_column_exists"]:
            logger.info("✓ doctor_id column exists in usuarios table")

            # Check linking
            with engine.connect() as connection:
                result = connection.execute(text("""
                    SELECT
                        COUNT(*) FILTER (WHERE u.doctor_id IS NOT NULL) as linked,
                        COUNT(*) FILTER (WHERE u.doctor_id IS NULL AND u.role = 'doctor'::roleenum) as unlinked
                    FROM usuarios u
                """))
                row = result.fetchone()
                status["doctor_usuario_linked"] = row[0] if row else 0
                status["doctor_usuario_unlinked"] = row[1] if row else 0
        else:
            logger.info("✗ doctor_id column NOT found in usuarios table - Migration needed")

        return status
    except Exception as e:
        logger.error(f"Error checking migration status: {e}")
        return status

def link_existing_doctors() -> int:
    """Link existing doctor usuarios to their doctor records (if not already linked)"""
    try:
        with engine.connect() as connection:
            result = connection.execute(text("""
                UPDATE usuarios u
                SET doctor_id = d.id
                FROM doctores d
                WHERE u.email = d.email
                  AND u.role = 'doctor'::roleenum
                  AND u.empresa_id = d.empresa_id
                  AND u.doctor_id IS NULL
                RETURNING u.id
            """))
            connection.commit()
            count = len(result.fetchall())
            if count > 0:
                logger.info(f"✓ Linked {count} existing doctor users to doctor records")
            return count
    except Exception as e:
        logger.error(f"Error linking doctor users: {e}")
        return 0

def main():
    """Main migration runner"""
    logger.info("=" * 60)
    logger.info("BackOffice Odonto - Migration Runner")
    logger.info("=" * 60)

    # Check current status
    logger.info("\nChecking migration status...")
    status_before = check_migration_status()

    # List migration files
    migrations_dir = Path(__file__).parent / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        logger.error("No migration files found!")
        return False

    logger.info(f"\nFound {len(migration_files)} migration files")

    # Always run all migrations in order.
    # Migration files are written to be idempotent (IF EXISTS / IF NOT EXISTS), so
    # re-running them safely applies any newer schema changes that may be missing.
    logger.info("\nApplying pending migrations...")
    for migration_file in migration_files:
        if migration_file.name == "001_create_empresas_and_add_fk.sql":
            # Skip first migration if constraints already exist (means it was already applied)
            try:
                with engine.connect() as conn:
                    result = conn.execute(text("SELECT constraint_name FROM information_schema.table_constraints WHERE constraint_name = 'fk_usuarios_empresa_id'"))
                    if result.fetchone():
                        logger.info(f"⊘ Skipping {migration_file.name} - already applied")
                        continue
            except:
                pass
        run_migration_file(str(migration_file))

    # Check status after migrations
    logger.info("\nVerifying migrations...")
    status_after = check_migration_status()

    if status_after["doctor_id_column_exists"]:
        logger.info("✓ Migrations applied successfully!")
    else:
        logger.error("✗ Migrations failed - doctor_id column still not found")
        return False

    # Link existing doctor users
    logger.info("\nLinking existing doctor users...")
    linked_count = link_existing_doctors()

    # Final status check
    logger.info("\nFinal migration status:")
    final_status = check_migration_status()
    logger.info(f"  doctor_id column: {final_status['doctor_id_column_exists']}")
    logger.info(f"  Doctor users linked: {final_status['doctor_usuario_linked']}")
    logger.info(f"  Doctor users unlinked: {final_status['doctor_usuario_unlinked']}")

    logger.info("\n" + "=" * 60)
    logger.info("Migration process complete!")
    logger.info("=" * 60)

    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)
