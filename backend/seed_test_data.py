"""
Comprehensive Test Data Seeder for Attendance Management System

This script creates realistic test data for all admin_api.py endpoints.
Run with: python seed_test_data.py
"""

import sys
import os
from datetime import datetime, timedelta, timezone
import random
import uuid
import warnings

# Suppress SQLAlchemy warnings for relationship configuration
warnings.filterwarnings("ignore", message=".*relationship.*generic class.*")

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, select, text
import bcrypt

# Import engine from database (this handles model imports and configure_mappers)
from src.core.database import engine

# Import models after database to ensure proper mapper configuration
from src.models.user import User
from src.models.admin import Admin
from src.models.teacher import Teacher
from src.models.student import Student
from src.models.level import Level
from src.models.module import Module
from src.models.schedule import Schedule
from src.models.sday import SDay
from src.models.teacher_modules import TeacherModules
from src.models.enrollement import Enrollment
from src.models.session import Session as ClassSession
from src.models.attendance import AttendanceRecord
from src.models.justification import Justification
from src.models.notification import Notification
from src.models.report import Report
from src.models.enums import (
    ScheduleDays, 
    AttendanceStatus, 
    JustificationStatus, 
    NotificationType
)


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def generate_session_code() -> str:
    """Generate a unique session code"""
    return f"SES-{uuid.uuid4().hex[:8].upper()}"


def clear_existing_data(session: Session):
    """Clear existing data in reverse order of dependencies using TRUNCATE CASCADE"""
    print("🧹 Clearing existing test data...")
    
    # Use TRUNCATE CASCADE to handle all FK constraints automatically
    # This is much faster and cleaner than DELETE for test data
    tables = [
        "attendance_records",
        "justifications",
        "sessions",
        "s_day",
        "schedule",
        "enrollments",
        "teacher_modules",
        "students",
        "teacher",
        "admins",
        "module",
        "level",
        "notifications",
        "report",
        "users"
    ]
    
    try:
        # Truncate all tables with CASCADE in one transaction
        for table in tables:
            try:
                session.exec(text(f"TRUNCATE TABLE public.{table} CASCADE"))
            except Exception as e:
                session.rollback()
                print(f"  ⚠️ Could not truncate {table}: {e}")
                continue
        
        session.commit()
        print("  ✅ Existing data cleared")
    except Exception as e:
        session.rollback()
        print(f"  ⚠️ Error during clear: {e}")
        # Try alternative approach - delete in correct order
        print("  🔄 Trying alternative clear method...")
        try:
            # First nullify FK references
            session.exec(text("UPDATE public.attendance_records SET justification_id = NULL WHERE justification_id IS NOT NULL"))
            session.commit()
            
            # Now delete in proper order
            delete_order = [
                "justifications",
                "attendance_records", 
                "sessions",
                "s_day",
                "schedule",
                "enrollments",
                "teacher_modules",
                "students",
                "teacher",
                "admins",
                "module",
                "level",
                "notifications",
                "report",
                "users"
            ]
            for table in delete_order:
                try:
                    session.exec(text(f"DELETE FROM public.{table}"))
                    session.commit()
                except Exception as del_e:
                    session.rollback()
                    print(f"  ⚠️ Could not delete from {table}: {del_e}")
            
            print("  ✅ Existing data cleared (alternative method)")
        except Exception as alt_e:
            session.rollback()
            print(f"  ⚠️ Alternative clear also failed: {alt_e}")


def seed_levels(session: Session) -> list:
    """Create test levels"""
    print("\n📚 Creating Levels...")
    
    levels_data = [
        {"name": "Computer Science Year 1", "year_level": "L1"},
        {"name": "Computer Science Year 2", "year_level": "L2"},
        {"name": "Computer Science Year 3", "year_level": "L3"},
    ]
    
    levels = []
    for data in levels_data:
        level = Level(
            name=data["name"],
            year_level=data["year_level"],
            created_at=datetime.now(timezone.utc)
        )
        session.add(level)
        session.commit()
        session.refresh(level)
        levels.append(level)
        print(f"  ✅ Level: {level.name} (ID: {level.id})")
    
    return levels


def seed_admins(session: Session) -> list:
    """Create admin users"""
    print("\n👔 Creating Admin Users...")
    
    admins_data = [
        {
            "full_name": "Dr. Ahmed Ben Ali",
            "email": "admin@university.dz",
            "department": "Computer Science Department",
            "password": "admin123"
        },
        {
            "full_name": "Prof. Fatima Zohra",
            "email": "fatima.admin@university.dz",
            "department": "Administration",
            "password": "admin456"
        }
    ]
    
    admins = []
    for data in admins_data:
        # Create user first
        user = User(
            full_name=data["full_name"],
            email=data["email"],
            department=data["department"],
            hashed_password=hash_password(data["password"]),
            role="admin",
            is_active=True,
            is_superuser=True,
            is_verified=True
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
        # Create admin profile
        admin = Admin(user_id=user.id)
        session.add(admin)
        session.commit()
        session.refresh(admin)
        
        admins.append({"user": user, "admin": admin})
        print(f"  ✅ Admin: {user.full_name} (User ID: {user.id}, Admin ID: {admin.id})")
    
    return admins


def seed_modules(session: Session, levels: list) -> dict:
    """Create modules for each level"""
    print("\n📖 Creating Modules...")
    
    modules_by_level = {}
    
    # Modules for Year 1 (only use fields that exist in DB: name, code, room)
    year1_modules = [
        {"name": "Introduction to Programming", "code": "CS101", "room": "Lab A1"},
        {"name": "Mathematics for CS", "code": "MATH101", "room": "Room 101"},
        {"name": "Computer Architecture", "code": "CS102", "room": "Room 102"},
        {"name": "English for IT", "code": "ENG101", "room": "Room 201"},
        {"name": "Data Structures", "code": "CS103", "room": "Lab A2"},
    ]
    
    # Modules for Year 2
    year2_modules = [
        {"name": "Object-Oriented Programming", "code": "CS201", "room": "Lab B1"},
        {"name": "Database Systems", "code": "CS202", "room": "Lab B2"},
        {"name": "Algorithms", "code": "CS203", "room": "Room 301"},
        {"name": "Operating Systems", "code": "CS204", "room": "Room 302"},
        {"name": "Web Development", "code": "CS205", "room": "Lab B3"},
    ]
    
    # Modules for Year 3
    year3_modules = [
        {"name": "Software Engineering", "code": "CS301", "room": "Room 401"},
        {"name": "Artificial Intelligence", "code": "CS302", "room": "Lab C1"},
        {"name": "Computer Networks", "code": "CS303", "room": "Lab C2"},
        {"name": "Mobile Development", "code": "CS304", "room": "Lab C3"},
        {"name": "Capstone Project", "code": "CS305", "room": "Project Lab"},
    ]
    
    all_modules = [year1_modules, year2_modules, year3_modules]
    
    for i, level in enumerate(levels):
        modules_by_level[level.id] = []
        modules_data = all_modules[i] if i < len(all_modules) else year1_modules
        
        for mod_data in modules_data:
            module = Module(
                name=mod_data["name"],
                code=mod_data["code"],
                room=mod_data.get("room"),
                level_id=level.id
            )
            session.add(module)
            session.commit()
            session.refresh(module)
            modules_by_level[level.id].append(module)
            print(f"  ✅ Module: {module.code} - {module.name} (Level: {level.year_level})")
    
    return modules_by_level


def seed_teachers(session: Session) -> list:
    """Create teacher users"""
    print("\n👨‍🏫 Creating Teachers...")
    
    teachers_data = [
        {"full_name": "Dr. Mohamed Larbi", "email": "m.larbi@university.dz", "department": "Computer Science"},
        {"full_name": "Dr. Amina Khelif", "email": "a.khelif@university.dz", "department": "Computer Science"},
        {"full_name": "Prof. Youcef Brahimi", "email": "y.brahimi@university.dz", "department": "Mathematics"},
        {"full_name": "Dr. Samia Benali", "email": "s.benali@university.dz", "department": "Computer Science"},
        {"full_name": "Dr. Karim Meziane", "email": "k.meziane@university.dz", "department": "Networks"},
    ]
    
    teachers = []
    for data in teachers_data:
        user = User(
            full_name=data["full_name"],
            email=data["email"],
            department=data["department"],
            hashed_password=hash_password("teacher123"),
            role="teacher",
            is_active=True,
            is_verified=True
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
        teacher = Teacher(user_id=user.id)
        session.add(teacher)
        session.commit()
        session.refresh(teacher)
        
        teachers.append({"user": user, "teacher": teacher})
        print(f"  ✅ Teacher: {user.full_name} (ID: {teacher.id})")
    
    return teachers


def seed_teacher_modules(session: Session, teachers: list, modules_by_level: dict) -> list:
    """Assign teachers to modules"""
    print("\n🔗 Assigning Teachers to Modules...")
    
    teacher_modules = []
    all_modules = []
    for level_modules in modules_by_level.values():
        all_modules.extend(level_modules)
    
    # Distribute modules among teachers
    for i, module in enumerate(all_modules):
        teacher = teachers[i % len(teachers)]
        
        tm = TeacherModules(
            teacher_id=teacher["teacher"].id,
            module_id=module.id
        )
        session.add(tm)
        session.commit()
        session.refresh(tm)
        
        teacher_modules.append(tm)
        print(f"  ✅ {teacher['user'].full_name} → {module.code}")
    
    return teacher_modules


def seed_schedules(session: Session, levels: list, modules_by_level: dict) -> dict:
    """Create schedules and SDays for each level"""
    print("\n📅 Creating Schedules and SDays...")
    
    schedules = {}
    days = [ScheduleDays.MONDAY, ScheduleDays.TUESDAY, ScheduleDays.WEDNESDAY, 
            ScheduleDays.THURSDAY, ScheduleDays.SUNDAY]
    time_slots = ["08:00-09:30", "09:45-11:15", "11:30-13:00", "14:00-15:30", "15:45-17:15"]
    
    for level in levels:
        # Create schedule
        schedule = Schedule(
            level_id=level.id,
            last_updated=datetime.now(timezone.utc)
        )
        session.add(schedule)
        session.commit()
        session.refresh(schedule)
        schedules[level.id] = {"schedule": schedule, "sdays": []}
        
        print(f"  📆 Schedule for {level.name} (ID: {schedule.id})")
        
        # Create SDays (3-5 per level)
        level_modules = modules_by_level.get(level.id, [])
        sday_count = min(len(level_modules), 5)
        
        for i in range(sday_count):
            module = level_modules[i]
            day = days[i % len(days)]
            time = time_slots[i % len(time_slots)]
            
            sday = SDay(
                day=day,
                time=time,
                schedule_id=schedule.id,
                module_id=module.id
            )
            session.add(sday)
            session.commit()
            session.refresh(sday)
            
            schedules[level.id]["sdays"].append(sday)
            print(f"    ✅ {day.value} {time} - {module.code}")
    
    return schedules


def seed_students(session: Session, levels: list, modules_by_level: dict) -> list:
    """Create students with auto-enrollment"""
    print("\n🎓 Creating Students with Auto-Enrollment...")
    
    # Student names (realistic Algerian names)
    first_names = ["Ali", "Omar", "Yassine", "Amine", "Sofiane", "Riad", "Bilal", 
                   "Imane", "Sara", "Lina", "Nour", "Amira", "Meriem", "Rania"]
    last_names = ["Boudiaf", "Benali", "Hamidi", "Mansouri", "Belkacem", "Zidane",
                  "Benmoussa", "Cherifi", "Hadj", "Mebarki", "Saadi", "Taleb"]
    
    students = []
    student_count = 0
    
    for level in levels:
        # 5-7 students per level
        num_students = random.randint(5, 7)
        
        for i in range(num_students):
            first = random.choice(first_names)
            last = random.choice(last_names)
            full_name = f"{first} {last}"
            email = f"{first.lower()}.{last.lower()}{student_count}@student.university.dz"
            
            # Create user
            user = User(
                full_name=full_name,
                email=email,
                department="Computer Science",
                hashed_password=hash_password("student123"),
                role="student",
                is_active=True,
                is_verified=True
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            
            # Create student
            student = Student(
                user_id=user.id,
                level_id=level.id
            )
            session.add(student)
            session.commit()
            session.refresh(student)
            
            # Auto-enroll in all level modules
            level_modules = modules_by_level.get(level.id, [])
            enrollments = []
            
            for module in level_modules:
                # Some students are excluded (5% chance)
                is_excluded = random.random() < 0.05
                absences = random.randint(0, 4) if not is_excluded else 0
                justified = random.randint(0, absences) if absences > 0 else 0
                
                enrollment = Enrollment(
                    student_id=student.id,
                    module_id=module.id,
                    number_of_absences=absences,
                    number_of_absences_justified=justified,
                    is_excluded=is_excluded,
                    student_name=full_name,
                    student_email=email
                )
                session.add(enrollment)
                enrollments.append(enrollment)
            
            session.commit()
            
            students.append({
                "user": user,
                "student": student,
                "enrollments": enrollments
            })
            student_count += 1
            print(f"  ✅ Student: {full_name} ({level.year_level}, {len(level_modules)} modules)")
    
    return students


def seed_sessions(session: Session, teacher_modules: list) -> list:
    """Create class sessions"""
    print("\n🎬 Creating Class Sessions...")
    
    sessions_list = []
    base_date = datetime.now(timezone.utc) - timedelta(days=30)
    
    for tm in teacher_modules:
        # 2-3 sessions per teacher-module assignment
        num_sessions = random.randint(2, 3)
        
        for i in range(num_sessions):
            session_date = base_date + timedelta(days=i*7)
            
            # Get module to use its room for the session
            module = session.get(Module, tm.module_id)
            session_room = module.room if module else f"Room {tm.id}"
            
            class_session = ClassSession(
                session_code=generate_session_code(),
                room=session_room,
                date_time=session_date,
                duration_minutes=90,
                is_active=i == num_sessions - 1,  # Only last session is active
                teacher_module_id=tm.id
            )
            session.add(class_session)
            session.commit()
            session.refresh(class_session)
            
            sessions_list.append(class_session)
        
        print(f"  ✅ {num_sessions} sessions for TeacherModule ID: {tm.id}")
    
    print(f"  📊 Total sessions created: {len(sessions_list)}")
    return sessions_list


def seed_attendance_records(session: Session, sessions_list: list, students: list) -> list:
    """Create attendance records"""
    print("\n📝 Creating Attendance Records...")
    
    attendance_records = []
    statuses = [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.EXCLUDED]
    status_weights = [0.7, 0.25, 0.05]  # 70% present, 25% absent, 5% excluded
    
    for class_session in sessions_list:
        # Get the module for this session
        tm = session.get(TeacherModules, class_session.teacher_module_id)
        if not tm:
            continue
        
        # Get all enrollments for this module
        enrollments = session.exec(
            select(Enrollment).where(Enrollment.module_id == tm.module_id)
        ).all()
        
        for enrollment in enrollments:
            if enrollment.is_excluded:
                status = AttendanceStatus.EXCLUDED
            else:
                status = random.choices(statuses, weights=status_weights)[0]
            
            record = AttendanceRecord(
                status=status,
                created_at=class_session.date_time,
                session_id=class_session.id,
                module_id=tm.module_id,
                enrollement_id=enrollment.id
            )
            session.add(record)
            attendance_records.append(record)
    
    session.commit()
    
    # Refresh all records
    for record in attendance_records:
        session.refresh(record)
    
    # Count by status
    status_counts = {}
    for record in attendance_records:
        status_counts[record.status.value] = status_counts.get(record.status.value, 0) + 1
    
    print(f"  📊 Total attendance records: {len(attendance_records)}")
    for status, count in status_counts.items():
        print(f"    - {status}: {count}")
    
    return attendance_records


def seed_justifications(session: Session, attendance_records: list) -> list:
    """Create justifications for some absent records"""
    print("\n📄 Creating Justifications...")
    
    justifications = []
    absent_records = [r for r in attendance_records if r.status == AttendanceStatus.ABSENT]
    
    # Create justifications for 30% of absent records
    num_justifications = max(1, int(len(absent_records) * 0.3))
    records_to_justify = random.sample(absent_records, min(num_justifications, len(absent_records)))
    
    comments = [
        "Medical appointment - doctor's certificate attached",
        "Family emergency",
        "Transportation issues due to strike",
        "Illness - medical certificate provided",
        "Official university event participation"
    ]
    
    statuses = [JustificationStatus.PENDING, JustificationStatus.APPROVED, JustificationStatus.REJECTED]
    status_weights = [0.4, 0.5, 0.1]
    
    for record in records_to_justify:
        status = random.choices(statuses, weights=status_weights)[0]
        
        justification = Justification(
            attendance_record_id=record.id,
            comment=random.choice(comments),
            file_url=f"uploads/justifications/just_{record.id}.pdf" if random.random() > 0.3 else None,
            status=status,
            created_at=record.created_at + timedelta(days=1)
        )
        session.add(justification)
        session.commit()
        session.refresh(justification)
        
        # Update attendance record with justification
        record.justification_id = justification.id
        session.add(record)
        
        justifications.append(justification)
    
    session.commit()
    
    print(f"  📊 Total justifications: {len(justifications)}")
    return justifications


def seed_notifications(session: Session, students: list, admins: list) -> list:
    """Create notifications for users"""
    print("\n🔔 Creating Notifications...")
    
    notifications = []
    
    notification_templates = [
        {"title": "Welcome to the System", "message": "Welcome to the Attendance Management System!", "type": NotificationType.JUSTIFICATION_APPROVED},
        {"title": "Justification Approved", "message": "Your justification has been approved.", "type": NotificationType.JUSTIFICATION_APPROVED},
        {"title": "Justification Rejected", "message": "Your justification has been rejected. Please contact admin.", "type": NotificationType.JUSTIFICATION_REJECTED},
        {"title": "New Justification", "message": "A new justification has been submitted for review.", "type": NotificationType.JUSTIFICATION_SUBMITTED},
    ]
    
    # Add notifications to some students
    for student_data in students[:5]:  # First 5 students
        template = random.choice(notification_templates)
        notification = Notification(
            title=template["title"],
            message=template["message"],
            type=template["type"],
            is_read=random.random() > 0.5,
            user_id=student_data["user"].id
        )
        session.add(notification)
        notifications.append(notification)
    
    # Add notifications to admins
    for admin_data in admins:
        notification = Notification(
            title="System Update",
            message="New students have been enrolled in the system.",
            type=NotificationType.JUSTIFICATION_SUBMITTED,
            is_read=False,
            user_id=admin_data["user"].id
        )
        session.add(notification)
        notifications.append(notification)
    
    session.commit()
    
    print(f"  📊 Total notifications: {len(notifications)}")
    return notifications


def seed_reports(session: Session, admins: list) -> list:
    """Create sample reports"""
    print("\n📊 Creating Reports...")
    
    reports = []
    
    for admin_data in admins:
        # Monthly report
        report1 = Report(
            content="Monthly Attendance Report - December 2025",
            period_start=datetime(2025, 12, 1, tzinfo=timezone.utc),
            period_end=datetime(2025, 12, 31, tzinfo=timezone.utc),
            generated_date=datetime.now(timezone.utc),
            pdf_url="uploads/reports/report_dec_2025.pdf",
            excel_url="uploads/reports/report_dec_2025.xlsx",
            admin_id=admin_data["admin"].id
        )
        session.add(report1)
        reports.append(report1)
        
        # Weekly report
        report2 = Report(
            content="Weekly Attendance Report - Week 3 January 2026",
            period_start=datetime(2026, 1, 13, tzinfo=timezone.utc),
            period_end=datetime(2026, 1, 19, tzinfo=timezone.utc),
            generated_date=datetime.now(timezone.utc),
            pdf_url="uploads/reports/report_week3_jan_2026.pdf",
            excel_url="uploads/reports/report_week3_jan_2026.xlsx",
            admin_id=admin_data["admin"].id
        )
        session.add(report2)
        reports.append(report2)
    
    session.commit()
    
    print(f"  📊 Total reports: {len(reports)}")
    return reports


def print_summary(data: dict):
    """Print a summary of all created data"""
    print("\n" + "=" * 60)
    print("📈 TEST DATA CREATION SUMMARY")
    print("=" * 60)
    
    print(f"\n✅ Levels: {len(data['levels'])}")
    for level in data['levels']:
        print(f"   - ID: {level.id} | {level.name} ({level.year_level})")
    
    print(f"\n✅ Admins: {len(data['admins'])}")
    for admin in data['admins']:
        print(f"   - Admin ID: {admin['admin'].id} | User ID: {admin['user'].id} | {admin['user'].email}")
    
    print(f"\n✅ Teachers: {len(data['teachers'])}")
    for teacher in data['teachers']:
        print(f"   - Teacher ID: {teacher['teacher'].id} | {teacher['user'].full_name}")
    
    print(f"\n✅ Modules: {sum(len(m) for m in data['modules_by_level'].values())}")
    for level_id, modules in data['modules_by_level'].items():
        print(f"   Level {level_id}: {len(modules)} modules")
    
    print(f"\n✅ Teacher-Module Assignments: {len(data['teacher_modules'])}")
    
    print(f"\n✅ Schedules: {len(data['schedules'])}")
    for level_id, sched_data in data['schedules'].items():
        print(f"   Level {level_id}: {len(sched_data['sdays'])} SDays")
    
    print(f"\n✅ Students: {len(data['students'])}")
    
    total_enrollments = sum(len(s['enrollments']) for s in data['students'])
    print(f"\n✅ Enrollments: {total_enrollments}")
    
    print(f"\n✅ Class Sessions: {len(data['sessions'])}")
    print(f"\n✅ Attendance Records: {len(data['attendance_records'])}")
    print(f"\n✅ Justifications: {len(data['justifications'])}")
    print(f"\n✅ Notifications: {len(data['notifications'])}")
    print(f"\n✅ Reports: {len(data['reports'])}")
    
    print("\n" + "=" * 60)
    print("🎉 TEST DATA READY FOR API TESTING!")
    print("=" * 60)
    
    print("\n📋 TEST CREDENTIALS:")
    print("   Admin: admin@university.dz / admin123")
    print("   Teacher: m.larbi@university.dz / teacher123")
    print("   Student: (check database for emails) / student123")
    print("\n🌐 API Docs: http://127.0.0.1:8000/api/docs")


def main():
    """Main function to seed all test data"""
    print("=" * 60)
    print("🚀 ATTENDANCE MANAGEMENT SYSTEM - TEST DATA SEEDER")
    print("=" * 60)
    
    with Session(engine) as session:
        try:
            # Clear existing data
            clear_existing_data(session)
            
            # Create data in order (respecting FK constraints)
            levels = seed_levels(session)
            admins = seed_admins(session)
            modules_by_level = seed_modules(session, levels)
            teachers = seed_teachers(session)
            teacher_modules = seed_teacher_modules(session, teachers, modules_by_level)
            schedules = seed_schedules(session, levels, modules_by_level)
            students = seed_students(session, levels, modules_by_level)
            sessions_list = seed_sessions(session, teacher_modules)
            attendance_records = seed_attendance_records(session, sessions_list, students)
            justifications = seed_justifications(session, attendance_records)
            notifications = seed_notifications(session, students, admins)
            reports = seed_reports(session, admins)
            
            # Collect all data for summary
            all_data = {
                "levels": levels,
                "admins": admins,
                "modules_by_level": modules_by_level,
                "teachers": teachers,
                "teacher_modules": teacher_modules,
                "schedules": schedules,
                "students": students,
                "sessions": sessions_list,
                "attendance_records": attendance_records,
                "justifications": justifications,
                "notifications": notifications,
                "reports": reports
            }
            
            print_summary(all_data)
            
        except Exception as e:
            print(f"\n❌ Error during seeding: {e}")
            import traceback
            traceback.print_exc()
            session.rollback()
            raise


if __name__ == "__main__":
    main()
