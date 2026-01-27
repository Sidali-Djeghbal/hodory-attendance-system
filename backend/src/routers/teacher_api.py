"""
Teacher API Router - FastAPI endpoints for teacher operations

This module provides RESTful API endpoints for teacher-specific operations
including profile management, module viewing, session management,
attendance tracking, and justification management.

Authentication: All endpoints require a valid JWT token with teacher role.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional

from ..core.database import get_session
from ..auth.router import get_current_teacher
from ..models.user import User
from ..models.teacher import Teacher
from ..models.teacher_modules import TeacherModules
from ..controllers.teacher_controller import TeacherController
from ..schema.teacher import (
    CreateSessionRequest,
    TeacherProfileResponse,
    TeacherModulesListResponse,
    TeacherSessionsListResponse,
    SessionDetailResponse,
    CreateSessionResponse,
    CloseSessionResponse,
    MyModulesResponse,
    SimpleModuleResponse,
    ModuleWithSessionsResponse,
    TeacherJustificationsListResponse,
    ValidateJustificationRequest,
    ValidateJustificationResponse
)


teacher_router = APIRouter(
    prefix="/teacher",
    tags=["Teacher"],
    responses={
        401: {"description": "Unauthorized - Invalid or missing token"},
        403: {"description": "Forbidden - Not a teacher"},
        404: {"description": "Resource not found"},
    }
)


def get_teacher_from_user(db: Session, user: User) -> Teacher:
    """
    Get Teacher model instance from User.
    
    Args:
        db: Database session
        user: Authenticated User instance
        
    Returns:
        Teacher: The teacher profile linked to the user
        
    Raises:
        HTTPException: If teacher profile not found
    """
    teacher = db.exec(
        select(Teacher).where(Teacher.user_id == user.id)
    ).first()
    
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher profile not found. Please contact administrator."
        )
    return teacher


# ==================== PROFILE ENDPOINTS ====================

@teacher_router.get(
    "/profile",
    response_model=TeacherProfileResponse,
    summary="Get Teacher Profile",
    description="Get the current teacher's complete profile including user info and statistics."
)
async def get_teacher_profile(
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get teacher's profile with user information and statistics.
    
    Returns:
        - Teacher ID and User ID
        - Full name, email, department
        - Account status (active, verified)
        - Statistics (modules count, sessions count)
    """
    controller = TeacherController(db)
    return controller.get_teacher_profile(current_user.id)

@teacher_router.get(
    "/overview",
    summary="Get Teacher Overview (Dashboard)",
    description="Lightweight dashboard payload (modules, recent sessions, counts)."
)
async def get_teacher_overview(
    sessions_limit: int = Query(
        default=50,
        ge=1,
        le=200,
        description="Max number of most-recent sessions to include."
    ),
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    controller = TeacherController(db)
    return controller.get_teacher_overview(current_user.id, sessions_limit=sessions_limit)


# ==================== MODULE ENDPOINTS ====================

@teacher_router.get(
    "/modules",
    response_model=TeacherModulesListResponse,
    summary="Get Teacher's Modules (Detailed)",
    description="Get all modules assigned to the teacher with level info and enrolled students."
)
async def get_teacher_modules_detailed(
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get detailed list of modules assigned to the teacher.
    
    For each module returns:
        - Module info (name, code, room)
        - Level info (name, year_level)
        - Enrolled students with their enrollment details
    
    Ordered by module, then level, then students.
    """
    controller = TeacherController(db)
    return controller.get_teacher_modules_detailed(current_user.id)


@teacher_router.get(
    "/my-modules",
    response_model=MyModulesResponse,
    summary="Get My Modules (Simple)",
    description="Get a simple list of modules assigned to the teacher."
)
async def get_my_modules(
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get simple list of teacher's assigned modules.
    
    Returns basic module info with enrolled student count.
    Use this for dropdowns or quick module selection.
    """
    teacher = get_teacher_from_user(db, current_user)
    controller = TeacherController(db)
    modules = controller.get_my_modules(teacher.id)
    
    return {
        "success": True,
        "teacher_id": teacher.id,
        "total_modules": len(modules),
        "modules": modules
    }


@teacher_router.get(
    "/my-modules/{module_id}",
    response_model=ModuleWithSessionsResponse,
    summary="Get Module with All Sessions",
    description="Get a specific module with all its sessions and full attendance details."
)
async def get_module_with_sessions(
    module_id: int,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get detailed module information with all sessions.
    
    Verifies that the module belongs to the current teacher.
    
    Each session includes:
        - Session info (code, date, duration, room, status)
        - Attendance statistics (total, present, absent, excluded, rate)
        - Full attendance records with student info
        - Justification details for ABSENT records
    
    Args:
        module_id: The module database ID
        
    Returns:
        - Module info with level
        - Enrolled students list
        - All sessions with full attendance records
    """
    teacher = get_teacher_from_user(db, current_user)
    controller = TeacherController(db)
    return controller.get_module_with_sessions(teacher.id, module_id)


# ==================== SESSION ENDPOINTS ====================

@teacher_router.get(
    "/sessions",
    response_model=TeacherSessionsListResponse,
    summary="Get Teacher Sessions",
    description="Get teacher sessions with statistics. Use `include_records=true` to include full attendance records (slow)."
)
async def get_teacher_sessions_detailed(
    include_records: bool = Query(
        default=False,
        description="When true, expand full attendance records for each session (slow)."
    ),
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get detailed list of all sessions created by the teacher.
    
    For each session returns:
        - Session info (code, date, duration, room, active status)
        - Module info with level
        - Attendance statistics (total, present, absent, excluded, rate)
        - Full attendance records with student info
    
    Ordered by date (newest first), then by students.
    """
    controller = TeacherController(db)
    return controller.get_teacher_sessions(user_id=current_user.id, include_records=include_records)


@teacher_router.get(
    "/sessions/{session_code}",
    response_model=SessionDetailResponse,
    summary="Get Session by Code",
    description="Get detailed information for a specific session by its share code."
)
async def get_session_by_code(
    session_code: str,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get detailed session information by session code.
    
    Verifies that the session belongs to the current teacher.
    
    Args:
        session_code: The unique session share code (e.g., "ABC123")
        
    Returns:
        - Session details (ID, code, date, duration, room, status)
        - Module info with level
        - Attendance statistics
        - Full attendance records with student and enrollment info
    """
    controller = TeacherController(db)
    return controller.get_session_by_code(current_user.id, session_code)


@teacher_router.get(
    "/sessions/{session_id}/info",
    response_model=SessionDetailResponse,
    summary="Get Session Info by ID",
    description="Get detailed session information by session ID."
)
async def get_session_info(
    session_id: int,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get detailed session information by session ID.
    
    Verifies that the session belongs to the current teacher.
    
    Args:
        session_id: The session database ID
        
    Returns:
        - Session details with module info
        - Attendance statistics
        - Full attendance records with student info
    """
    teacher = get_teacher_from_user(db, current_user)
    controller = TeacherController(db)
    return controller.get_session_info(session_id, teacher.id)


@teacher_router.post(
    "/sessions",
    response_model=CreateSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Session",
    description="Create a new attendance session for a module."
)
async def create_session(
    request: CreateSessionRequest,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Create a new attendance session.
    
    This will:
        1. Verify teacher is assigned to the module
        2. Generate a unique share code
        3. Create the session with given duration and room
        4. Pre-create ABSENT attendance records for all enrolled students
    
    Args:
        request: CreateSessionRequest with module_id, duration_minutes, room
        
    Returns:
        - Session info with share code
        - List of created attendance records
        - Count of enrolled students
    """
    teacher = get_teacher_from_user(db, current_user)
    controller = TeacherController(db)
    
    return controller.create_session(
        teacher_id=teacher.id,
        module_id=request.module_id,
        duration_minutes=request.duration_minutes,
        room=request.room
    )


@teacher_router.post(
    "/sessions/{session_id}/close",
    response_model=CloseSessionResponse,
    summary="Close Session",
    description="Close an active session to prevent further attendance marking."
)
async def close_session(
    session_id: int,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Close an active session.
    
    Once closed, students can no longer mark attendance for this session.
    
    Args:
        session_id: The ID of the session to close
        
    Returns:
        - Confirmation message
        - Session ID
        - Updated status (is_active: false)
        - Timestamp of closure
    """
    teacher = get_teacher_from_user(db, current_user)
    controller = TeacherController(db)
    return controller.close_session(session_id, teacher.id)


# ==================== ATTENDANCE ENDPOINTS ====================

@teacher_router.get(
    "/sessions/{session_id}/attendance",
    summary="Get Session Attendance Records",
    description="Get detailed attendance records for a specific session."
)
async def get_session_attendance(
    session_id: int,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get detailed attendance records for a session.
    
    Verifies teacher ownership of the session.
    
    Args:
        session_id: The session ID to get attendance for
        
    Returns:
        - Session info (code, room, date, status)
        - Statistics (total, present, absent, excluded, rate)
        - List of attendance records with full student info
    """
    teacher = get_teacher_from_user(db, current_user)
    controller = TeacherController(db)
    return controller.validate_attendance_records(session_id, teacher.id)

# ==================== JUSTIFICATION ENDPOINTS ====================

@teacher_router.get(
    "/justifications",
    response_model=TeacherJustificationsListResponse,
    summary="Get Teacher's Justifications",
    description="Get all justifications for sessions belonging to the teacher's assigned modules."
)
async def get_teacher_justifications(
    status_filter: Optional[str] = Query(
        default=None,
        description="Filter by justification status (pending, approved, rejected)",
        pattern="^(pending|approved|rejected)$"
    ),
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get all justifications for the teacher's modules.
    
    This endpoint retrieves justifications submitted by students for absences
    in sessions that belong to the teacher's assigned modules.
    
    Args:
        status_filter: Optional filter by status (pending, approved, rejected)
        
    Returns:
        - Total count of justifications
        - List of justifications with:
            - Justification details (comment, file_url, status)
            - Attendance record info
            - Student info
            - Module info
            - Session info
    """
    teacher = get_teacher_from_user(db, current_user)
    controller = TeacherController(db)
    return controller.get_teacher_justifications(teacher.id, status_filter)

@teacher_router.get(
    "/justifications/count",
    summary="Get Teacher Justifications Count",
    description="Fast count of teacher justifications (use for badges/overview)."
)
async def get_teacher_justifications_count(
    status_filter: Optional[str] = Query(
        default=None,
        description="Filter by justification status (pending, approved, rejected)",
        pattern="^(pending|approved|rejected)$"
    ),
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    teacher = get_teacher_from_user(db, current_user)
    controller = TeacherController(db)
    return controller.get_teacher_justifications_count(teacher.id, status_filter)


@teacher_router.post(
    "/justifications/{justification_id}/validate",
    response_model=ValidateJustificationResponse,
    summary="Validate Justification",
    description="Approve or reject a justification request."
)
async def validate_justification(
    justification_id: int,
    request: ValidateJustificationRequest,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Validate (approve or reject) a justification request.
    
    This endpoint allows teachers to review and validate justification requests
    submitted by students for their absences. Only justifications for sessions
    belonging to the teacher's modules can be validated.
    
    If approved:
        - Justification status → APPROVED
        - AttendanceRecord status → PRESENT (absence is now justified)
        - Student receives notification
        
    If rejected:
        - Justification status → REJECTED
        - AttendanceRecord status remains ABSENT
        - Student receives notification
    
    Args:
        justification_id: The ID of the justification to validate
        request: ValidateJustificationRequest with decision and optional notes
        
    Returns:
        - Confirmation message
        - Updated justification details
        - Attendance record info
        - Student info
        - Module and session info
    """
    teacher = get_teacher_from_user(db, current_user)
    controller = TeacherController(db)
    
    return controller.validate_justification(
        justification_id=justification_id,
        teacher_id=teacher.id,
        decision=request.decision,
        teacher_notes=request.teacher_notes
    )


@teacher_router.post(
    "/justifications/{justification_id}/restore",
    summary="Restore Justification",
    description="Restore a mistakenly rejected justification back to pending."
)
async def restore_justification(
    justification_id: int,
    current_user: User = Depends(get_current_teacher),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    teacher = get_teacher_from_user(db, current_user)
    controller = TeacherController(db)
    return controller.restore_justification(
        justification_id=justification_id,
        teacher_id=teacher.id
    )
