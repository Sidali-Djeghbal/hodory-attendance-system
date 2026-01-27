"""
Database migration script to rename specialty_id to level_id across tables.
This aligns the database with the model refactoring from 'specialty' to 'level'.
"""
from src.core.database import engine
from sqlalchemy import text

def update_foreign_keys():
    """Update FK constraints from specialty to level"""
    
    fk_migrations = [
        # Drop old FK constraints that reference specialty
        "ALTER TABLE public.module DROP CONSTRAINT IF EXISTS module_specialty_id_fkey",
        "ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_specialty_id_fkey",
        "ALTER TABLE public.schedule DROP CONSTRAINT IF EXISTS schedule_specialty_id_fkey",
        
        # Add new FK constraints that reference level
        "ALTER TABLE public.module ADD CONSTRAINT module_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.level(id)",
        "ALTER TABLE public.students ADD CONSTRAINT students_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.level(id)",
        "ALTER TABLE public.schedule ADD CONSTRAINT schedule_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.level(id)",
    ]
    
    with engine.connect() as conn:
        for sql in fk_migrations:
            try:
                print(f"Executing: {sql}")
                conn.execute(text(sql))
                conn.commit()
                print("  ✅ Success")
            except Exception as e:
                if "does not exist" in str(e) or "already exists" in str(e):
                    print(f"  ⚠️ Skipped: {e}")
                else:
                    print(f"  ❌ Error: {e}")
                    conn.rollback()

def add_missing_columns():
    """Add columns that exist in models but not in database"""
    
    additions = [
        # Add user_id to notifications (currently has attendence_record_id)
        "ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES public.users(id)",
        # Add student_name and student_email to enrollments
        "ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS student_name VARCHAR",
        "ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS student_email VARCHAR",
    ]
    
    with engine.connect() as conn:
        for sql in additions:
            try:
                print(f"Executing: {sql}")
                conn.execute(text(sql))
                conn.commit()
                print("  ✅ Success")
            except Exception as e:
                if "already exists" in str(e):
                    print(f"  ⚠️ Skipped (column already exists)")
                else:
                    print(f"  ❌ Error: {e}")
                    conn.rollback()

def create_reports_table():
    """Create reports table if it doesn't exist"""
    
    sql = """
    CREATE TABLE IF NOT EXISTS public.reports (
        id SERIAL PRIMARY KEY,
        title VARCHAR NOT NULL,
        description TEXT,
        report_type VARCHAR NOT NULL,
        file_url VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        admin_id INTEGER REFERENCES public.admins(id)
    )
    """
    
    with engine.connect() as conn:
        try:
            print("Creating reports table...")
            conn.execute(text(sql))
            conn.commit()
            print("  ✅ Reports table created")
        except Exception as e:
            print(f"  ❌ Error: {e}")
            conn.rollback()

if __name__ == "__main__":
    print("=" * 60)
    print("🔄 DATABASE MIGRATION: Update Foreign Keys")
    print("=" * 60)
    
    print("\n📝 Step 1: Updating FK constraints...")
    update_foreign_keys()
    
    print("\n✅ Migration complete!")
