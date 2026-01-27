"""
Student API Router - FastAPI endpoints for student operations

This module provides RESTful API endpoints for student-specific operations
including profile management, attendance marking, viewing records, 
justification submission, and module/enrollment viewing.

Authentication: All endpoints require a valid JWT token with student role.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
import os
import uuid
import shutil

from ..core.database import get_session
from ..auth.router import get_current_student
from ..models.user import User
from ..models.student import Student
from ..models.enums import AttendanceStatus
from ..controllers.student_controller import StudentController
from ..controllers.session_controller import SessionController


# ==================== PYDANTIC SCHEMAS ====================

class LevelInfo(BaseModel):
    """Level information"""
    id: int
    name: str
    year_level: str
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class ScheduleInfo(BaseModel):
    """Schedule information"""
    id: int
    level_id: int
    last_updated: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class SDayInfo(BaseModel):
    """Schedule day information"""
    id: int
    day: Optional[str] = None
    time: str
    module_id: int
    module_name: Optional[str] = None
    module_code: Optional[str] = None
    room: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class StudentInfo(BaseModel):
    """Student basic info"""
    id: int
    user_id: int
    level_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class UserInfo(BaseModel):
    """User information"""
    id: int
    full_name: str
    email: str
    department: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class AttendanceStatistics(BaseModel):
    """Attendance statistics"""
    modules_enrolled: int = 0
    total_sessions: int = 0
    present: int = 0
    absent: int = 0
    attendance_rate: float = 0.0


class StudentProfileResponse(BaseModel):
    """Complete student profile response"""
    success: bool = True
    student: StudentInfo
    user: UserInfo
    level: Optional[LevelInfo] = None
    schedule: Optional[ScheduleInfo] = None
    sdays: List[SDayInfo] = []
    statistics: AttendanceStatistics


class MarkAttendanceRequest(BaseModel):
    """Request schema for marking attendance"""
    # Teacher app uses codes like "SES-6061EBB7" (12 chars). Allow room for future formats.
    session_code: str = Field(..., min_length=4, max_length=32, description="Session code to mark attendance")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "session_code": "SES-6061EBB7"
        }
    })


class AttendanceRecordResponse(BaseModel):
    """Single attendance record response"""
    attendance_id: int
    module_id: int
    module_name: str
    module_code: Optional[str] = None
    room: Optional[str] = None
    session_id: int
    session_code: Optional[str] = None
    session_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: str
    has_justification: bool = False
    justification_id: Optional[int] = None
    justification_status: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class AttendanceListResponse(BaseModel):
    """List of attendance records response"""
    success: bool = True
    student_id: int
    total_records: int
    records: List[AttendanceRecordResponse]


class AttendanceSummaryResponse(BaseModel):
    """Attendance summary response"""
    success: bool = True
    absent: int = 0


class ModuleInfo(BaseModel):
    """Module information"""
    id: int
    name: str
    code: Optional[str] = None
    room: Optional[str] = None
    level_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class ModulesListResponse(BaseModel):
    """List of modules response"""
    success: bool = True
    student_id: int
    total_modules: int
    modules: List[ModuleInfo]


class EnrollmentStatistics(BaseModel):
    """Enrollment attendance statistics"""
    total_sessions: int = 0
    present: int = 0
    absent: int = 0
    attendance_rate: float = 0.0


class EnrollmentInfo(BaseModel):
    """Enrollment information with module details"""
    enrollment_id: int
    module_id: int
    module_name: str
    module_code: Optional[str] = None
    room: Optional[str] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    number_of_absences: int = 0
    number_of_absences_justified: int = 0
    is_excluded: bool = False
    statistics: EnrollmentStatistics
    
    model_config = ConfigDict(from_attributes=True)


class EnrollmentsListResponse(BaseModel):
    """List of enrollments response"""
    success: bool = True
    student_id: int
    total_enrollments: int
    enrollments: List[EnrollmentInfo]


class SessionInfoSimple(BaseModel):
    """Simple session info for justification"""
    id: Optional[int] = None
    session_code: Optional[str] = None
    date_time: Optional[datetime] = None
    room: Optional[str] = None


class ModuleInfoSimple(BaseModel):
    """Simple module info for justification"""
    id: Optional[int] = None
    name: Optional[str] = None
    code: Optional[str] = None


class AttendanceInfoSimple(BaseModel):
    """Simple attendance info for justification"""
    id: int
    status: str
    marked_at: Optional[datetime] = None


class JustificationInfo(BaseModel):
    """Justification information"""
    justification_id: int
    comment: Optional[str] = None
    file_url: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    attendance_record: AttendanceInfoSimple
    session: SessionInfoSimple
    module: ModuleInfoSimple
    
    model_config = ConfigDict(from_attributes=True)


class JustificationsListResponse(BaseModel):
    """List of justifications response"""
    success: bool = True
    student_id: int
    total_justifications: int
    justifications: List[JustificationInfo]


class JustificationCreateResponse(BaseModel):
    """Response after creating a justification"""
    success: bool = True
    message: str
    justification_id: int
    attendance_record_id: int
    comment: str
    file_url: Optional[str] = None
    status: str


class MarkAttendanceResponse(BaseModel):
    """Response after marking attendance"""
    success: bool = True
    message: str = "Attendance marked successfully"
    attendance_id: int
    status: str
    created_at: Optional[datetime] = None
    module_id: int
    module_name: str
    session_id: int
    session_code: str
    session_date: Optional[datetime] = None
    enrollment_id: int
    number_of_absences: int
    number_of_absences_justified: int


# ==================== ROUTER SETUP ====================

student_router = APIRouter(
    prefix="/student",
    tags=["Student"],
    responses={
        401: {"description": "Unauthorized - Invalid or missing token"},
        403: {"description": "Forbidden - Not a student"},
        404: {"description": "Resource not found"},
    }
)


def get_student_from_user(db: Session, user: User) -> Student:
    """
    Get Student model instance from User.
    
    Args:
        db: Database session
        user: Authenticated User instance
        
    Returns:
        Student: The student profile linked to the user
        
    Raises:
        HTTPException: If student profile not found
    """
    student = db.exec(
        select(Student).where(Student.user_id == user.id)
    ).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found. Please contact administrator."
        )
    return student


# ==================== PROFILE ENDPOINTS ====================

@student_router.get(
    "/profile",
    response_model=StudentProfileResponse,
    summary="Get Student Profile",
    description="Get the current student's complete profile including user info, level, schedule, and sdays."
)
async def get_student_profile(
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get student's complete profile with all related information.
    
    Returns:
        - Student info (ID, user_id, level_id)
        - User info (name, email, department, status)
        - Level info (name, year_level)
        - Schedule info with sdays (day, time, module)
        - Attendance statistics
    """
    controller = StudentController(db)
    return controller.get_profile(current_user.id)


# ==================== ATTENDANCE ENDPOINTS ====================

@student_router.post(
    "/attendance/mark",
    response_model=MarkAttendanceResponse,
    summary="Mark Attendance",
    description="Mark attendance using a session code provided by the teacher."
)
async def mark_attendance(
    request: MarkAttendanceRequest,
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Mark attendance for an active session.
    
    The student must:
        - Be enrolled in the module for this session
        - Not be excluded from the module
        - Not have already marked attendance
        - Use a valid, active session code
    
    Args:
        request: MarkAttendanceRequest with session_code
        
    Returns:
        - Confirmation message
        - Attendance record details
        - Module and session info
    """
    student = get_student_from_user(db, current_user)
    controller = StudentController(db)
    
    result = controller.mark_attendance(student.id, request.session_code)
    
    return {
        "success": True,
        "message": "Attendance marked successfully",
        **result
    }


@student_router.get(
    "/attendance",
    response_model=AttendanceListResponse,
    summary="Get Attendance Records",
    description="Get all attendance records for the student with optional filters."
)
async def get_attendance_records(
    module_id: Optional[int] = Query(default=None, description="Filter by module ID"),
    status_filter: Optional[str] = Query(
        default=None,
        description="Filter by status (present, absent, excluded)",
        pattern="^(present|absent|excluded)$"
    ),
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get attendance records for the authenticated student.
    
    Optional filters:
        - module_id: Filter by specific module
        - status_filter: Filter by attendance status
    
    Returns:
        - Total count of records
        - List of attendance records with module and session info
    """
    student = get_student_from_user(db, current_user)
    controller = StudentController(db)
    
    # Convert status string to enum if provided
    status_enum = None
    if status_filter:
        status_enum = AttendanceStatus(status_filter)
    
    records = controller.view_attendance_records(
        student_id=student.id,
        module_id=module_id,
        status_filter=status_enum
    )
    
    return {
        "success": True,
        "student_id": student.id,
        "total_records": len(records),
        "records": records
    }


@student_router.get(
    "/attendance/summary",
    response_model=AttendanceSummaryResponse,
    summary="Get Attendance Summary",
    description="Get a summary of attendance statistics for the student."
)
async def get_attendance_summary(
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get attendance summary statistics.
    
    Returns:
        - Total absent count across all modules
    """
    student = get_student_from_user(db, current_user)
    controller = StudentController(db)
    
    summary = controller.get_attendance_summary(student.id)
    
    return {
        "success": True,
        **summary
    }


# ==================== MODULE ENDPOINTS ====================

@student_router.get(
    "/modules",
    response_model=ModulesListResponse,
    summary="Get My Modules",
    description="Get all modules the student is enrolled in."
)
async def get_my_modules(
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get list of modules the student is enrolled in.
    
    Only returns modules where the student is not excluded.
    
    Returns:
        - Total count of modules
        - List of modules with basic info
    """
    student = get_student_from_user(db, current_user)
    controller = StudentController(db)
    
    modules = controller.get_modules(student.id)
    
    modules_list = [
        {
            "id": m.id,
            "name": m.name,
            "code": m.code,
            "room": m.room,
            "level_id": m.level_id
        }
        for m in modules
    ]
    
    return {
        "success": True,
        "student_id": student.id,
        "total_modules": len(modules_list),
        "modules": modules_list
    }


# ==================== ENROLLMENT ENDPOINTS ====================

@student_router.get(
    "/enrollments",
    response_model=EnrollmentsListResponse,
    summary="Get My Enrollments",
    description="Get all enrollments for the student with detailed module and attendance info."
)
async def get_my_enrollments(
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get detailed list of all enrollments.
    
    For each enrollment returns:
        - Enrollment details (ID, absences, exclusion status)
        - Module info (name, code, room)
        - Attendance statistics for that module
    
    Returns:
        - Total enrollment count
        - List of enrollments with full details
    """
    student = get_student_from_user(db, current_user)
    controller = StudentController(db)
    
    return controller.get_all_enrollments_detailed(student.id)


# ==================== JUSTIFICATION ENDPOINTS ====================

@student_router.get(
    "/justifications",
    response_model=JustificationsListResponse,
    summary="Get My Justifications",
    description="Get all justifications submitted by the student."
)
async def get_my_justifications(
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get all justification requests submitted by the student.
    
    Returns:
        - Total justification count
        - List of justifications with:
            - Justification details (comment, file_url, status)
            - Attendance record info
            - Session info
            - Module info
    """
    student = get_student_from_user(db, current_user)
    controller = StudentController(db)
    
    return controller.get_justifications_detailed(student.id)


@student_router.post(
    "/justifications",
    response_model=JustificationCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Justification",
    description="Submit a justification for an absence with optional file upload."
)
async def submit_justification(
    attendance_record_id: int = Form(..., description="ID of the attendance record to justify"),
    comment: str = Form(..., min_length=10, max_length=1000, description="Explanation for the absence"),
    file: Optional[UploadFile] = File(default=None, description="Optional supporting document (PDF, JPG, PNG)"),
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Submit a justification for an absence.
    
    Requirements:
        - Attendance record must belong to the student
        - Attendance status must be ABSENT
        - No existing justification for this absence
    
    Args:
        attendance_record_id: The ID of the attendance record
        comment: Explanation for the absence (min 10 chars)
        file: Optional supporting document (PDF, JPG, PNG - max 5MB)
        
    Returns:
        - Confirmation message
        - Justification details
    """
    student = get_student_from_user(db, current_user)
    controller = StudentController(db)
    
    # Handle file upload if provided
    file_url = None
    if file:
        # Validate file type
        allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Allowed: PDF, JPG, PNG"
            )
        
        # Check file size (max 5MB)
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Seek back to start
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 5MB"
            )
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Create upload directory if not exists
        upload_dir = "uploads/justifications"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_dir, unique_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_url = file_path
    
    # Create justification
    justification = controller.justify_absence(
        student_id=student.id,
        attendance_record_id=attendance_record_id,
        comment=comment,
        file_url=file_url
    )
    
    return {
        "success": True,
        "message": "Justification submitted successfully. Pending review.",
        "justification_id": justification.id,
        "attendance_record_id": attendance_record_id,
        "comment": comment,
        "file_url": file_url,
        "status": justification.status.value
    }


# ==================== SCHEDULE ENDPOINTS ====================

@student_router.get(
    "/schedule",
    summary="Get My Schedule",
    description="Get the schedule for the student's level."
)
async def get_my_schedule(
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get the weekly schedule for the student's level.
    
    Returns:
        - Schedule info
        - List of sdays with day, time, and module info
    """
    student = get_student_from_user(db, current_user)
    controller = StudentController(db)
    
    profile = controller.get_profile(current_user.id)
    
    return {
        "success": True,
        "student_id": student.id,
        "level": profile.get("level"),
        "schedule": profile.get("schedule"),
        "sdays": profile.get("sdays", [])
    }


# ==================== SESSION PREVIEW ENDPOINTS ====================

@student_router.get(
    "/sessions/{session_code}",
    summary="Get Session Info",
    description="Get session details by code (useful to preview/confirm before marking)."
)
async def get_session_info(
    session_code: str,
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get basic session info by session code for the student.
    """
    # Ensure student profile exists.
    get_student_from_user(db, current_user)
    controller = SessionController(db)
    return controller.get_session_info(share_code=session_code)
