"""
Admin API Router - FastAPI endpoints for admin operations

This module provides RESTful API endpoints for administrative operations
including management of students, teachers, modules, levels, schedules,
and attendance monitoring/reporting.

All endpoints require admin authentication via JWT/OAuth2.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# Database and authentication dependencies
from ..core.database import get_session
from ..auth.router import get_current_admin

# Models
from ..models.user import User
from ..models.student import Student
from ..models.teacher import Teacher
from ..models.admin import Admin
from ..models.module import Module
from ..models.level import Level
from ..models.schedule import Schedule
from ..models.sday import SDay
from ..models.teacher_modules import TeacherModules
from ..models.enrollement import Enrollment
from ..models.enums import ScheduleDays

# Controller
from ..controllers.admin_controller import AdminController
from ..utils.email import build_welcome_email, send_email


# ==================== REQUEST/RESPONSE SCHEMAS ====================

class AdminProfileResponse(BaseModel):
    """Response schema for admin profile"""
    id: int
    user_id: int
    full_name: str
    email: str
    department: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class StudentCreateRequest(BaseModel):
    """Request schema for creating a student"""
    full_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=6)
    department: str = Field(..., min_length=1, max_length=100)
    level_id: int


class StudentUpdateRequest(BaseModel):
    """Request schema for updating a student"""
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = Field(None, min_length=5, max_length=100)
    department: Optional[str] = Field(None, min_length=1, max_length=100)
    level_id: Optional[int] = None


class BulkStudentCreateRequest(BaseModel):
    """Request schema for bulk student creation"""
    students: List[StudentCreateRequest]


class TeacherCreateRequest(BaseModel):
    """Request schema for creating a teacher"""
    full_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=6)
    department: str = Field(..., min_length=1, max_length=100)


class TeacherUpdateRequest(BaseModel):
    """Request schema for updating a teacher"""
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = Field(None, min_length=5, max_length=100)
    department: Optional[str] = Field(None, min_length=1, max_length=100)


class TeacherModuleAssignRequest(BaseModel):
    """Request schema for assigning teacher to module"""
    teacher_id: int
    module_id: int


class BulkTeacherModuleAssignRequest(BaseModel):
    """Request schema for bulk assigning teachers to modules"""
    assignments: List[TeacherModuleAssignRequest]


class ModuleCreateRequest(BaseModel):
    """Request schema for creating a module"""
    name: str = Field(..., min_length=1, max_length=100)
    level_id: int
    room: Optional[str] = None


class ModuleUpdateRequest(BaseModel):
    """Request schema for updating a module"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    room: Optional[str] = None


class ScheduleCreateRequest(BaseModel):
    """Request schema for creating a schedule"""
    level_id: int


class SDayCreateRequest(BaseModel):
    """Request schema for creating an SDay"""
    level_id: int
    day: ScheduleDays
    time: str = Field(..., description="Time slot, e.g., '08:00-10:00'")
    module_id: int


class SDayUpdateRequest(BaseModel):
    """Request schema for updating an SDay"""
    day: Optional[ScheduleDays] = None
    time: Optional[str] = None
    module_id: Optional[int] = None


class ReportGenerateRequest(BaseModel):
    """Request schema for generating a report"""
    period_start: datetime
    period_end: datetime


# ==================== ROUTER DEFINITION ====================

admin_router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    responses={
        401: {"description": "Unauthorized - Invalid or missing token"},
        403: {"description": "Forbidden - Admin access required"},
        404: {"description": "Resource not found"},
        500: {"description": "Internal server error"}
    }
)


# ==================== PROFILE ENDPOINTS ====================

@admin_router.get(
    "/profile",
    response_model=Dict[str, Any],
    summary="Get Admin Profile",
    description="Get the authenticated admin's user profile information."
)
async def get_admin_profile(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get the current admin's profile.
    
    Returns the admin user's profile information including:
    - User details (id, name, email, department)
    - Admin-specific info (admin_id)
    - Account status (is_active, is_verified)
    """
    # Get admin profile
    admin = db.exec(
        select(Admin).where(Admin.user_id == current_admin.id)
    ).first()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin profile not found"
        )
    
    return {
        "success": True,
        "data": {
            "admin_id": admin.id,
            "user_id": current_admin.id,
            "full_name": current_admin.full_name,
            "email": current_admin.email,
            "department": current_admin.department,
            "role": current_admin.role,
            "is_active": current_admin.is_active,
            "is_verified": current_admin.is_verified,
            "created_at": current_admin.created_at.isoformat() if current_admin.created_at else None,
            "updated_at": current_admin.updated_at.isoformat() if current_admin.updated_at else None
        }
    }


# ==================== LEVEL ENDPOINTS ====================

@admin_router.get(
    "/levels",
    response_model=Dict[str, Any],
    summary="Get All Levels",
    description="Get all levels with their associated modules."
)
async def get_all_levels(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get all levels with their modules, schedules, and SDays.
    
    Returns a list of all levels, each containing:
    - Level info (id, name, year_level)
    - List of modules belonging to the level
    - Schedule with all SDays (time slots)
    """
    levels = db.exec(select(Level)).all()
    
    levels_data = []
    for level in levels:
        # Get modules for this level
        modules = db.exec(
            select(Module).where(Module.level_id == level.id)
        ).all()
        
        modules_data = [
            {
                "id": module.id,
                "name": module.name,
                "code": module.code,
                "room": module.room
            }
            for module in modules
        ]
        
        # Get schedule for this level
        schedule = db.exec(
            select(Schedule).where(Schedule.level_id == level.id)
        ).first()
        
        schedule_data = None
        if schedule:
            # Get all SDays for this schedule
            sdays = db.exec(
                select(SDay).where(SDay.schedule_id == schedule.id)
            ).all()
            
            sdays_data = []
            for sday in sdays:
                module = db.get(Module, sday.module_id)
                sdays_data.append({
                    "id": sday.id,
                    "day": sday.day.value if sday.day else None,
                    "time": sday.time,
                    "module_id": sday.module_id,
                    "module_name": module.name if module else None,
                    "module_code": module.code if module else None
                })
            
            schedule_data = {
                "id": schedule.id,
                "last_updated": schedule.last_updated.isoformat() if schedule.last_updated else None,
                "sdays": sdays_data,
                "sdays_count": len(sdays_data)
            }
        
        levels_data.append({
            "id": level.id,
            "name": level.name,
            "year_level": level.year_level,
            "created_at": level.created_at.isoformat() if level.created_at else None,
            "modules": modules_data,
            "module_count": len(modules_data),
            "schedule": schedule_data
        })
    
    return {
        "success": True,
        "data": levels_data,
        "total": len(levels_data)
    }


@admin_router.get(
    "/level/{level_id}",
    response_model=Dict[str, Any],
    summary="Get Level by ID",
    description="Get a specific level with its modules and schedule."
)
async def get_level_by_id(
    level_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get a specific level by ID.
    
    Returns level information including:
    - Level info (id, name, year_level)
    - List of modules belonging to the level
    - Schedule with all SDays (time slots)
    """
    level = db.get(Level, level_id)
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Level with ID {level_id} not found"
        )
    
    # Get modules for this level
    modules = db.exec(
        select(Module).where(Module.level_id == level.id)
    ).all()
    
    modules_data = [
        {
            "id": module.id,
            "name": module.name,
            "code": module.code,
            "room": module.room
        }
        for module in modules
    ]
    
    # Get schedule for this level
    schedule = db.exec(
        select(Schedule).where(Schedule.level_id == level.id)
    ).first()
    
    schedule_data = None
    if schedule:
        # Get all SDays for this schedule
        sdays = db.exec(
            select(SDay).where(SDay.schedule_id == schedule.id)
        ).all()
        
        sdays_data = []
        for sday in sdays:
            module = db.get(Module, sday.module_id)
            sdays_data.append({
                "id": sday.id,
                "day": sday.day.value if sday.day else None,
                "time": sday.time,
                "module_id": sday.module_id,
                "module_name": module.name if module else None,
                "module_code": module.code if module else None
            })
        
        schedule_data = {
            "id": schedule.id,
            "last_updated": schedule.last_updated.isoformat() if schedule.last_updated else None,
            "sdays": sdays_data,
            "sdays_count": len(sdays_data)
        }
    
    # Get students count for this level
    students_count = len(db.exec(
        select(Student).where(Student.level_id == level.id)
    ).all())
    
    return {
        "success": True,
        "data": {
            "id": level.id,
            "name": level.name,
            "year_level": level.year_level,
            "created_at": level.created_at.isoformat() if level.created_at else None,
            "modules": modules_data,
            "module_count": len(modules_data),
            "schedule": schedule_data,
            "students_count": students_count
        }
    }


# ==================== TEACHER-MODULE ASSIGNMENT ENDPOINTS ====================

@admin_router.get(
    "/teacher-modules",
    response_model=Dict[str, Any],
    summary="Get All Teacher-Module Assignments",
    description="Get all teacher-module assignments with teacher and module details."
)
async def get_all_teacher_modules(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get all teacher-module assignments.
    
    Returns a list of all assignments including:
    - Assignment ID
    - Teacher details (id, name, email, department)
    - Module details (id, name, code, level info)
    """
    teacher_modules = db.exec(select(TeacherModules)).all()
    
    assignments_data = []
    for tm in teacher_modules:
        teacher = db.get(Teacher, tm.teacher_id)
        module = db.get(Module, tm.module_id)
        
        teacher_user = db.get(User, teacher.user_id) if teacher else None
        level = db.get(Level, module.level_id) if module and module.level_id else None
        
        assignments_data.append({
            "id": tm.id,
            "teacher": {
                "id": teacher.id if teacher else None,
                "user_id": teacher.user_id if teacher else None,
                "full_name": teacher_user.full_name if teacher_user else None,
                "email": teacher_user.email if teacher_user else None,
                "department": teacher_user.department if teacher_user else None
            } if teacher else None,
            "module": {
                "id": module.id if module else None,
                "name": module.name if module else None,
                "code": module.code if module else None,
                "level": {
                    "id": level.id,
                    "name": level.name,
                    "year_level": level.year_level
                } if level else None
            } if module else None
        })
    
    return {
        "success": True,
        "data": assignments_data,
        "total": len(assignments_data)
    }


@admin_router.post(
    "/teacher-modules",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Assign Teacher to Module",
    description="Create a new teacher-module assignment."
)
async def assign_teacher_to_module(
    request: TeacherModuleAssignRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Assign a teacher to a module.
    
    Creates a new assignment linking a teacher to a module.
    The teacher will be able to create sessions for this module.
    """
    controller = AdminController(db)
    assignment = controller.assign_teacher_to_module(
        teacher_id=request.teacher_id,
        module_id=request.module_id
    )
    
    return {
        "success": True,
        "message": "Teacher assigned to module successfully",
        "data": {
            "id": assignment.id,
            "teacher_id": assignment.teacher_id,
            "module_id": assignment.module_id
        }
    }


@admin_router.post(
    "/teacher-modules/bulk",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Bulk Assign Teachers to Modules",
    description="Assign multiple teachers to modules in one request."
)
async def bulk_assign_teachers_to_modules(
    request: BulkTeacherModuleAssignRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Bulk assign teachers to modules.
    
    Processes a list of teacher-module assignments.
    Returns summary of successes and failures.
    """
    controller = AdminController(db)
    result = controller.bulk_assign_teachers_to_modules(
        [(a.teacher_id, a.module_id) for a in request.assignments]
    )
    
    return {
        "success": True,
        **result
    }


@admin_router.delete(
    "/teacher-modules/{teacher_module_id}",
    summary="Unassign Teacher from Module",
    description="Delete a teacher-module assignment (blocked if sessions exist)."
)
async def delete_teacher_module_assignment(
    teacher_module_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    controller = AdminController(db)
    deleted_id = controller.unassign_teacher_module(teacher_module_id)
    return {
        "success": True,
        "message": "Teacher-module assignment deleted successfully",
        "deleted_id": deleted_id
    }


# ==================== STUDENT ENDPOINTS ====================

@admin_router.get(
    "/students/{student_id}",
    response_model=Dict[str, Any],
    summary="Get Student Profile",
    description="Get a student's complete profile including user info, level, modules, enrollments, and schedule."
)
async def get_student_profile(
    student_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get complete student profile.
    
    Returns comprehensive student information:
    - User info (name, email, department)
    - Student info (id, level assignment)
    - Level details with all modules
    - All enrollments with module info
    - Level's schedule with SDays
    """
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {student_id} not found"
        )
    
    user = db.get(User, student.user_id)
    level = db.get(Level, student.level_id) if student.level_id else None
    
    # Get level's modules
    level_modules = []
    if level:
        modules = db.exec(
            select(Module).where(Module.level_id == level.id)
        ).all()
        level_modules = [
            {
                "id": m.id,
                "name": m.name,
                "code": m.code,
                "room": m.room
            }
            for m in modules
        ]
    
    # Get enrollments
    enrollments = db.exec(
        select(Enrollment).where(Enrollment.student_id == student_id)
    ).all()
    
    enrollments_data = []
    for enrollment in enrollments:
        module = db.get(Module, enrollment.module_id)
        enrollments_data.append({
            "id": enrollment.id,
            "module_id": enrollment.module_id,
            "module_name": module.name if module else None,
            "module_code": module.code if module else None,
            "number_of_absences": enrollment.number_of_absences,
            "number_of_absences_justified": enrollment.number_of_absences_justified,
            "is_excluded": enrollment.is_excluded
        })
    
    # Get schedule from level
    schedule_data = None
    if level:
        schedule = db.exec(
            select(Schedule).where(Schedule.level_id == level.id)
        ).first()
        
        if schedule:
            sdays = db.exec(
                select(SDay).where(SDay.schedule_id == schedule.id)
            ).all()
            
            sdays_data = []
            for sday in sdays:
                module = db.get(Module, sday.module_id)
                sdays_data.append({
                    "id": sday.id,
                    "day": sday.day.value if sday.day else None,
                    "time": sday.time,
                    "module_id": sday.module_id,
                    "module_name": module.name if module else None
                })
            
            schedule_data = {
                "id": schedule.id,
                "last_updated": schedule.last_updated.isoformat() if schedule.last_updated else None,
                "sdays": sdays_data
            }
    
    return {
        "success": True,
        "data": {
            "student": {
                "id": student.id,
                "user_id": student.user_id,
                "level_id": student.level_id
            },
            "user": {
                "id": user.id if user else None,
                "full_name": user.full_name if user else None,
                "email": user.email if user else None,
                "department": user.department if user else None,
                "is_active": user.is_active if user else None,
                "is_verified": user.is_verified if user else None,
                "created_at": user.created_at.isoformat() if user and user.created_at else None
            } if user else None,
            "level": {
                "id": level.id,
                "name": level.name,
                "year_level": level.year_level,
                "modules": level_modules
            } if level else None,
            "enrollments": enrollments_data,
            "schedule": schedule_data
        }
    }


@admin_router.get(
    "/students",
    response_model=Dict[str, Any],
    summary="Get All Students",
    description="Get all students with their complete profiles."
)
async def get_all_students(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return")
) -> Dict[str, Any]:
    """
    Get all students with pagination.
    
    Returns a list of all students with their complete profiles.
    Supports pagination via skip and limit parameters.
    """
    students = db.exec(
        select(Student).offset(skip).limit(limit)
    ).all()
    
    total_count = len(db.exec(select(Student)).all())
    
    students_data = []
    for student in students:
        user = db.get(User, student.user_id)
        level = db.get(Level, student.level_id) if student.level_id else None
        
        # Get enrollments count
        enrollments = db.exec(
            select(Enrollment).where(Enrollment.student_id == student.id)
        ).all()
        
        students_data.append({
            "id": student.id,
            "user_id": student.user_id,
            "full_name": user.full_name if user else None,
            "email": user.email if user else None,
            "department": user.department if user else None,
            "is_active": user.is_active if user else None,
            "level": {
                "id": level.id,
                "name": level.name,
                "year_level": level.year_level
            } if level else None,
            "enrollments_count": len(enrollments),
            "created_at": user.created_at.isoformat() if user and user.created_at else None
        })
    
    return {
        "success": True,
        "data": students_data,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }


@admin_router.post(
    "/students",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Add Student",
    description="Add a new student with level assignment."
)
async def add_student(
    request: StudentCreateRequest,
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Add a new student.
    
    Creates a new user account with 'student' role and a student profile.
    Auto-enrolls the student in all modules of the assigned level.
    """
    controller = AdminController(db)
    student = controller.add_student(
        full_name=request.full_name,
        email=request.email,
        password=request.password,
        department=request.department,
        level_id=request.level_id
    )
    
    user = db.get(User, student.user_id)
    level = db.get(Level, student.level_id)

    if user and user.email:
        payload = build_welcome_email(
            role="student",
            full_name=user.full_name or "Student",
            email=user.email,
            password=request.password,
        )
        background_tasks.add_task(
            send_email,
            to_email=user.email,
            subject=payload["subject"],
            text=payload["text"],
            html=payload["html"],
        )
    
    return {
        "success": True,
        "message": "Student added successfully",
        "data": {
            "student_id": student.id,
            "user_id": student.user_id,
            "full_name": user.full_name if user else None,
            "email": user.email if user else None,
            "level": {
                "id": level.id,
                "name": level.name
            } if level else None
        }
    }


@admin_router.post(
    "/students/bulk",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Add Multiple Students",
    description="Add multiple students in bulk."
)
async def add_students_bulk(
    request: BulkStudentCreateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Add multiple students in bulk.
    
    Processes a list of student data and creates user accounts
    and student profiles for each. Returns summary of successes and failures.
    """
    controller = AdminController(db)
    
    # Convert request to list of dicts
    students_data = [
        {
            "full_name": s.full_name,
            "email": s.email,
            "password": s.password,
            "department": s.department,
            "level_id": s.level_id
        }
        for s in request.students
    ]
    
    result = controller.add_students(students_data)
    
    return {
        "success": True,
        **result
    }


@admin_router.put(
    "/students/{student_id}",
    response_model=Dict[str, Any],
    summary="Update Student",
    description="Update an existing student's information."
)
async def update_student(
    student_id: int,
    request: StudentUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Update an existing student.
    
    Updates the student's user info and/or level assignment.
    Only provided fields will be updated.
    """
    controller = AdminController(db)
    student = controller.update_student(
        student_id=student_id,
        full_name=request.full_name,
        email=request.email,
        department=request.department,
        level_id=request.level_id
    )
    
    user = db.get(User, student.user_id)
    level = db.get(Level, student.level_id) if student.level_id else None
    
    return {
        "success": True,
        "message": "Student updated successfully",
        "data": {
            "student_id": student.id,
            "user_id": student.user_id,
            "full_name": user.full_name if user else None,
            "email": user.email if user else None,
            "department": user.department if user else None,
            "level": {
                "id": level.id,
                "name": level.name
            } if level else None
        }
    }


@admin_router.delete(
    "/students/{student_id}",
    response_model=Dict[str, Any],
    summary="Delete Student",
    description="Delete a student and their user account."
)
async def delete_student(
    student_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Delete a student.
    
    Removes the student profile and associated user account.
    This action is irreversible.
    """
    controller = AdminController(db)
    result = controller.delete_student(student_id)
    
    return {
        "success": True,
        **result
    }


# ==================== TEACHER ENDPOINTS ====================

@admin_router.get(
    "/teachers/{teacher_id}",
    response_model=Dict[str, Any],
    summary="Get Teacher Profile",
    description="Get a teacher's complete profile including assigned modules and their enrolled students."
)
async def get_teacher_profile(
    teacher_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get complete teacher profile.
    
    Returns comprehensive teacher information:
    - User info (name, email, department)
    - Teacher info (id)
    - Assigned modules with level info
    - For each module: enrolled students with details
    """
    teacher = db.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID {teacher_id} not found"
        )
    
    user = db.get(User, teacher.user_id)
    
    # Get teacher's module assignments
    teacher_modules = db.exec(
        select(TeacherModules).where(TeacherModules.teacher_id == teacher_id)
    ).all()
    
    modules_data = []
    for tm in teacher_modules:
        module = db.get(Module, tm.module_id)
        if not module:
            continue
            
        level = db.get(Level, module.level_id) if module.level_id else None
        
        # Get enrolled students for this module
        enrollments = db.exec(
            select(Enrollment).where(Enrollment.module_id == module.id)
        ).all()
        
        students_data = []
        for enrollment in enrollments:
            student = db.get(Student, enrollment.student_id)
            if student:
                student_user = db.get(User, student.user_id)
                students_data.append({
                    "student_id": student.id,
                    "user_id": student.user_id,
                    "full_name": student_user.full_name if student_user else None,
                    "email": student_user.email if student_user else None,
                    "enrollment": {
                        "id": enrollment.id,
                        "number_of_absences": enrollment.number_of_absences,
                        "number_of_absences_justified": enrollment.number_of_absences_justified,
                        "is_excluded": enrollment.is_excluded
                    }
                })
        
        modules_data.append({
            "teacher_module_id": tm.id,
            "module": {
                "id": module.id,
                "name": module.name,
                "code": module.code,
                "room": module.room
            },
            "level": {
                "id": level.id,
                "name": level.name,
                "year_level": level.year_level
            } if level else None,
            "enrolled_students": students_data,
            "enrolled_count": len(students_data)
        })
    
    return {
        "success": True,
        "data": {
            "teacher": {
                "id": teacher.id,
                "user_id": teacher.user_id
            },
            "user": {
                "id": user.id if user else None,
                "full_name": user.full_name if user else None,
                "email": user.email if user else None,
                "department": user.department if user else None,
                "is_active": user.is_active if user else None,
                "is_verified": user.is_verified if user else None,
                "created_at": user.created_at.isoformat() if user and user.created_at else None
            } if user else None,
            "assigned_modules": modules_data,
            "total_modules": len(modules_data)
        }
    }


@admin_router.get(
    "/teachers",
    response_model=Dict[str, Any],
    summary="Get All Teachers",
    description="Get all teachers with their profiles and assigned modules."
)
async def get_all_teachers(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return")
) -> Dict[str, Any]:
    """
    Get all teachers with pagination.
    
    Returns a list of all teachers with their profiles and module counts.
    Supports pagination via skip and limit parameters.
    """
    teachers = db.exec(
        select(Teacher).offset(skip).limit(limit)
    ).all()
    
    total_count = len(db.exec(select(Teacher)).all())
    
    teachers_data = []
    for teacher in teachers:
        user = db.get(User, teacher.user_id)
        
        # Get assigned modules count
        teacher_modules = db.exec(
            select(TeacherModules).where(TeacherModules.teacher_id == teacher.id)
        ).all()
        
        # Get module names
        module_names = []
        for tm in teacher_modules:
            module = db.get(Module, tm.module_id)
            if module:
                module_names.append(module.name)
        
        teachers_data.append({
            "id": teacher.id,
            "user_id": teacher.user_id,
            "full_name": user.full_name if user else None,
            "email": user.email if user else None,
            "department": user.department if user else None,
            "is_active": user.is_active if user else None,
            "assigned_modules_count": len(teacher_modules),
            "assigned_modules": module_names,
            "created_at": user.created_at.isoformat() if user and user.created_at else None
        })
    
    return {
        "success": True,
        "data": teachers_data,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }


@admin_router.post(
    "/teachers",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Add Teacher",
    description="Add a new teacher."
)
async def add_teacher(
    request: TeacherCreateRequest,
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Add a new teacher.
    
    Creates a new user account with 'teacher' role and a teacher profile.
    """
    controller = AdminController(db)
    teacher = controller.add_teacher(
        full_name=request.full_name,
        email=request.email,
        password=request.password,
        department=request.department
    )
    
    user = db.get(User, teacher.user_id)

    if user and user.email:
        payload = build_welcome_email(
            role="teacher",
            full_name=user.full_name or "Teacher",
            email=user.email,
            password=request.password,
        )
        background_tasks.add_task(
            send_email,
            to_email=user.email,
            subject=payload["subject"],
            text=payload["text"],
            html=payload["html"],
        )
    
    return {
        "success": True,
        "message": "Teacher added successfully",
        "data": {
            "teacher_id": teacher.id,
            "user_id": teacher.user_id,
            "full_name": user.full_name if user else None,
            "email": user.email if user else None,
            "department": user.department if user else None
        }
    }


@admin_router.put(
    "/teachers/{teacher_id}",
    response_model=Dict[str, Any],
    summary="Update Teacher",
    description="Update an existing teacher's information."
)
async def update_teacher(
    teacher_id: int,
    request: TeacherUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Update an existing teacher.
    
    Updates the teacher's user info.
    Only provided fields will be updated.
    """
    controller = AdminController(db)
    teacher = controller.update_teacher(
        teacher_id=teacher_id,
        full_name=request.full_name,
        email=request.email,
        department=request.department
    )
    
    user = db.get(User, teacher.user_id)
    
    return {
        "success": True,
        "message": "Teacher updated successfully",
        "data": {
            "teacher_id": teacher.id,
            "user_id": teacher.user_id,
            "full_name": user.full_name if user else None,
            "email": user.email if user else None,
            "department": user.department if user else None
        }
    }


@admin_router.delete(
    "/teachers/{teacher_id}",
    response_model=Dict[str, Any],
    summary="Delete Teacher",
    description="Delete a teacher and their user account."
)
async def delete_teacher(
    teacher_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Delete a teacher.
    
    Removes the teacher profile and associated user account.
    This action is irreversible.
    """
    controller = AdminController(db)
    result = controller.delete_teacher(teacher_id)
    
    return {
        "success": True,
        **result
    }


# ==================== MODULE ENDPOINTS ====================

@admin_router.get(
    "/modules",
    response_model=Dict[str, Any],
    summary="Get All Modules",
    description="Get all modules with their level info."
)
async def get_all_modules(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return")
) -> Dict[str, Any]:
    """
    Get all modules with pagination.
    """
    modules = db.exec(select(Module).offset(skip).limit(limit)).all()
    total_count = len(db.exec(select(Module)).all())

    data = []
    for module in modules:
        level = db.get(Level, module.level_id) if module.level_id else None
        data.append({
            "id": module.id,
            "name": module.name,
            "code": module.code,
            "room": module.room,
            "level": {
                "id": level.id,
                "name": level.name,
                "year_level": level.year_level
            } if level else None
        })

    return {
        "success": True,
        "data": data,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }

@admin_router.post(
    "/modules",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Create Module",
    description="Create a new module for a level."
)
async def create_module(
    request: ModuleCreateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Create a new module.
    
    Creates a new module and assigns it to the specified level.
    """
    controller = AdminController(db)
    module = controller.create_module(
        name=request.name,
        level_id=request.level_id,
        room=request.room
    )
    
    level = db.get(Level, module.level_id)
    
    return {
        "success": True,
        "message": "Module created successfully",
        "data": {
            "id": module.id,
            "name": module.name,
            "code": module.code,
            "room": module.room,
            "level": {
                "id": level.id,
                "name": level.name
            } if level else None
        }
    }


@admin_router.put(
    "/modules/{module_id}",
    response_model=Dict[str, Any],
    summary="Update Module",
    description="Update an existing module."
)
async def update_module(
    module_id: int,
    request: ModuleUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Update an existing module.
    
    Updates the module's information.
    Only provided fields will be updated.
    """
    controller = AdminController(db)
    module = controller.update_module(
        module_id=module_id,
        name=request.name,
        room=request.room
    )
    
    level = db.get(Level, module.level_id) if module.level_id else None
    
    return {
        "success": True,
        "message": "Module updated successfully",
        "data": {
            "id": module.id,
            "name": module.name,
            "code": module.code,
            "room": module.room,
            "level": {
                "id": level.id,
                "name": level.name
            } if level else None
        }
    }


@admin_router.delete(
    "/modules/{module_id}",
    response_model=Dict[str, Any],
    summary="Delete Module",
    description="Delete a module."
)
async def delete_module(
    module_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Delete a module.
    
    Removes the module from the system.
    Cannot delete modules with existing enrollments.
    """
    controller = AdminController(db)
    result = controller.delete_module(module_id)
    
    return {
        "success": True,
        **result
    }


# ==================== SCHEDULE ENDPOINTS ====================

@admin_router.post(
    "/schedules",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Create Schedule",
    description="Create a schedule for a level."
)
async def create_schedule(
    request: ScheduleCreateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Create a schedule for a level.
    
    Each level can have only one schedule.
    SDays (schedule days) can be added after creation.
    """
    controller = AdminController(db)
    schedule = controller.make_schedule_for_level(request.level_id)
    
    level = db.get(Level, schedule.level_id)
    
    return {
        "success": True,
        "message": "Schedule created successfully",
        "data": {
            "id": schedule.id,
            "level_id": schedule.level_id,
            "level_name": level.name if level else None,
            "last_updated": schedule.last_updated.isoformat() if schedule.last_updated else None
        }
    }


@admin_router.post(
    "/sdays",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Add SDay to Schedule",
    description="Add a schedule day (SDay) to a level's schedule."
)
async def add_sday(
    request: SDayCreateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Add an SDay to a level's schedule.
    
    Creates a new schedule day linking a day/time slot to a module.
    The module must belong to the same level as the schedule.
    """
    controller = AdminController(db)
    sday = controller.add_sday_to_schedule_of_level(
        level_id=request.level_id,
        day=request.day,
        time=request.time,
        module_id=request.module_id
    )
    
    module = db.get(Module, sday.module_id)
    
    return {
        "success": True,
        "message": "SDay added successfully",
        "data": {
            "id": sday.id,
            "day": sday.day.value if sday.day else None,
            "time": sday.time,
            "schedule_id": sday.schedule_id,
            "module_id": sday.module_id,
            "module_name": module.name if module else None
        }
    }


@admin_router.put(
    "/sdays/{sday_id}",
    response_model=Dict[str, Any],
    summary="Update SDay",
    description="Update an existing schedule day."
)
async def update_sday(
    sday_id: int,
    request: SDayUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Update an existing SDay.
    
    Updates the schedule day's information.
    Only provided fields will be updated.
    """
    controller = AdminController(db)
    sday = controller.update_sday_of_schedule(
        sday_id=sday_id,
        day=request.day,
        time=request.time,
        module_id=request.module_id
    )
    
    module = db.get(Module, sday.module_id)
    
    return {
        "success": True,
        "message": "SDay updated successfully",
        "data": {
            "id": sday.id,
            "day": sday.day.value if sday.day else None,
            "time": sday.time,
            "schedule_id": sday.schedule_id,
            "module_id": sday.module_id,
            "module_name": module.name if module else None
        }
    }


@admin_router.delete(
    "/sdays/{sday_id}",
    response_model=Dict[str, Any],
    summary="Delete SDay",
    description="Delete a schedule day from the schedule."
)
async def delete_sday(
    sday_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Delete an SDay from a schedule.
    
    Removes the schedule day from the system.
    """
    controller = AdminController(db)
    result = controller.delete_sday_from_schedule(sday_id)
    
    return {
        "success": True,
        **result
    }


# ==================== MONITORING & REPORTING ENDPOINTS ====================

@admin_router.get(
    "/monitor",
    response_model=Dict[str, Any],
    summary="Monitor Attendance",
    description="Get comprehensive system data including all levels, students, modules, teachers, sessions, and attendance records."
)
async def monitor_attendance(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Monitor all attendance and system data.
    
    Returns comprehensive system information:
    - All levels with students, modules, schedules
    - All teacher assignments and sessions
    - All attendance records with status
    - Summary statistics
    """
    controller = AdminController(db)
    system_data = controller.monitor_attendance()
    
    return {
        "success": True,
        "data": system_data
    }


@admin_router.post(
    "/reports",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Generate Report",
    description="Generate an attendance report for a specified period."
)
async def generate_report(
    request: ReportGenerateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Generate an attendance report.
    
    Creates a PDF and Excel report for the specified period.
    Files are saved to uploads/reports/ directory.
    
    Returns report info with file URLs.
    """
    # Get admin profile
    admin = db.exec(
        select(Admin).where(Admin.user_id == current_admin.id)
    ).first()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin profile not found"
        )
    
    controller = AdminController(db)
    result = controller.generate_report(
        admin_id=admin.id,
        period_start=request.period_start,
        period_end=request.period_end
    )
    
    return {
        "success": True,
        "message": "Report generated successfully",
        "data": result
    }
