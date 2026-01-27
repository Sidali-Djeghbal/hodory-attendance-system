from sqlmodel import SQLModel, Session as SQLModelSession, create_engine, text
from typing import Generator
import logging
import bcrypt

from .config import settings

# Set up logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ✅ Import all models at once to avoid circular dependency issues
# This ensures all classes are available when relationships are configured
from ..models.user import User
from ..models.level import Level
from ..models.schedule import Schedule
from ..models.admin import Admin
from ..models.teacher import Teacher
from ..models.student import Student
from ..models.module import Module
from ..models.sday import SDay
from ..models.teacher_modules import TeacherModules
from ..models.enrollement import Enrollment
from ..models.session import Session
from ..models.attendance import AttendanceRecord
from ..models.justification import Justification
from ..models.notification import Notification
from ..models.report import Report

# ✅ Configure all mappers now that all classes are imported
from sqlalchemy.orm import configure_mappers
try:
    configure_mappers()
except Exception as e:
    logger.warning(f"⚠️ Mapper configuration warning: {e}")

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Create engine with connection pool settings for Neon DB
engine = create_engine(
    settings.DATABASE_URL, 
    echo=False,
    pool_pre_ping=True,  # Check connection before using
    pool_recycle=300,    # Recycle connections after 5 minutes
    pool_size=5,
    max_overflow=10
)

def check_database_connection() -> bool:
    """Check if database connection is successful"""
    try:
        with SQLModelSession(engine) as session:
            session.exec(text("SELECT 1"))
        logger.info("✅ Database connection successful!")
        logger.info(f"📍 Connected to: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
        return True
    except Exception as e:
        import traceback
        logger.error(f"❌ Database connection failed: {str(e)}")
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return False


def init_db():
    """Initialize database tables in dependency order"""
    # First check connection
    if check_database_connection():
        # Drop ALL existing tables and types in public schema first
        with SQLModelSession(engine) as session:
            #Drop all tables with CASCADE
            #session.exec(text("DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE'; END LOOP; FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'c') LOOP EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE'; END LOOP; END $$;"))
            #session.commit()
            #logger.info("🗑️ All existing tables and types dropped!")
        
        # Create all tables (order matters for foreign keys)
            SQLModel.metadata.create_all(engine, checkfirst=True)

        # Ensure indexes exist (safe + fast, even if tables already exist)
            for table in SQLModel.metadata.tables.values():
                for index in getattr(table, "indexes", set()):
                    try:
                        index.create(bind=engine, checkfirst=True)
                    except Exception as e:
                        logger.debug(f"ℹ️ Index create skipped/failed for {index.name}: {e}")
        
        # Log created tables in order
        logger.info("✅ All tables created successfully!")
        logger.info("📊 Tables created (in dependency order):")
        logger.info("   1️⃣  Base tables: users, level, schedule")
        logger.info("   2️⃣  User-dependent: admins, teacher")
        logger.info("   3️⃣  Multi-dependent: students, module")
        logger.info("   4️⃣  Composite: s_day, teacher_modules, enrollments")
        logger.info("   5️⃣  Advanced: sessions, attendance_records")
        logger.info("   6️⃣  Final: justifications, notifications, report")
        
        # Seed test users - do this last after all models are configured
        try:
            with SQLModelSession(engine) as session:
                pass
        except Exception as e:
            logger.debug(f"ℹ️ Info: Test users seeding skipped: {str(e)}")
    else:
        logger.error("❌ Cannot initialize database - connection failed!")
        raise Exception("Database connection failed")

def get_session() -> Generator[SQLModelSession, None, None]:
    """Get database session"""
    with SQLModelSession(engine) as session:
        yield session
