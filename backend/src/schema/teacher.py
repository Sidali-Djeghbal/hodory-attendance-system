from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from .user import UserResponse


# ==================== BASE SCHEMAS ====================

class TeacherBase(BaseModel):
    """Base teacher schema"""
    pass


# ==================== REQUEST SCHEMAS ====================

class TeacherCreate(TeacherBase):
    """Schema for creating a teacher"""
    user: Dict[str, Any]  # UserCreate dict
    assigned_modules: Optional[List[str]] = Field(default_factory=list)
    assigned_specialties: Optional[List[str]] = Field(default_factory=list)


class TeacherUpdate(BaseModel):
    """Schema for updating a teacher"""
    assigned_modules: Optional[List[str]] = None
    assigned_specialties: Optional[List[str]] = None


class CreateSessionRequest(BaseModel):
    """Request schema for creating a new session"""
    module_id: int = Field(..., description="ID of the module to create session for")
    duration_minutes: int = Field(default=90, ge=15, le=240, description="Session duration in minutes")
    room: Optional[str] = Field(default=None, description="Room/location for the session")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "module_id": 1,
            "duration_minutes": 90,
            "room": "Lab A1"
        }
    })


class TeacherAssignment(BaseModel):
    """Schema for teacher-module assignment"""
    teacher_id: int
    module_id: int
    academic_year: Optional[str] = None
    semester: Optional[str] = None
    teaching_hours_per_week: Optional[int] = None


# ==================== NESTED RESPONSE SCHEMAS ====================

class LevelInfo(BaseModel):
    """Level information for nested responses"""
    id: int
    name: str
    year_level: str
    
    model_config = ConfigDict(from_attributes=True)


class StudentInfo(BaseModel):
    """Student information for nested responses"""
    student_id: int
    user_id: int
    full_name: str
    email: str
    department: Optional[str] = None
    level_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class EnrollmentInfo(BaseModel):
    """Enrollment information for nested responses"""
    enrollment_id: int
    student_id: int
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    number_of_absences: int = 0
    number_of_absences_justified: int = 0
    is_excluded: bool = False
    student: Optional[StudentInfo] = None
    
    model_config = ConfigDict(from_attributes=True)


class ModuleInfo(BaseModel):
    """Module information for nested responses"""
    module_id: int
    name: str
    code: str
    room: str
    level_id: int
    level: Optional[LevelInfo] = None
    
    model_config = ConfigDict(from_attributes=True)


class JustificationInfo(BaseModel):
    """Justification information for nested responses"""
    id: int
    comment: Optional[str] = None
    file_url: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class AttendanceRecordInfo(BaseModel):
    """Attendance record information for nested responses"""
    attendance_id: int
    status: str
    marked_at: Optional[datetime] = None
    justification_id: Optional[int] = None
    justification: Optional[JustificationInfo] = None
    student: Optional[StudentInfo] = None
    enrollment: Optional[EnrollmentInfo] = None
    
    model_config = ConfigDict(from_attributes=True)


class SessionStatistics(BaseModel):
    """Session attendance statistics"""
    total: int = 0
    present: int = 0
    absent: int = 0
    excluded: int = 0
    attendance_rate: float = 0.0


# ==================== MAIN RESPONSE SCHEMAS ====================

class TeacherResponse(TeacherBase):
    """Schema for teacher response"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: Optional[UserResponse] = None
    assigned_modules: Optional[List[Dict[str, Any]]] = None
    assigned_specialties: Optional[List[Dict[str, Any]]] = None
    
    model_config = ConfigDict(from_attributes=True)


class TeacherProfileResponse(BaseModel):
    """Complete teacher profile response"""
    success: bool = True
    teacher_id: int
    user_id: int
    full_name: str
    email: str
    department: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime] = None
    modules_count: int = 0
    sessions_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class TeacherModuleResponse(BaseModel):
    """Response for a single teacher module with details"""
    teacher_module_id: int
    module: ModuleInfo
    enrolled_students_count: int = 0
    enrolled_students: List[EnrollmentInfo] = []
    
    model_config = ConfigDict(from_attributes=True)


class TeacherModulesListResponse(BaseModel):
    """Response for list of teacher modules"""
    success: bool = True
    teacher_id: int
    total_modules: int
    modules: List[TeacherModuleResponse]


class SessionInfo(BaseModel):
    """Session information for responses"""
    session_id: int
    session_code: str
    date_time: datetime
    duration_minutes: int
    room: Optional[str] = None
    is_active: bool
    module: ModuleInfo
    statistics: SessionStatistics
    attendance_records: List[AttendanceRecordInfo] = []
    
    model_config = ConfigDict(from_attributes=True)


class TeacherSessionsListResponse(BaseModel):
    """Response for list of teacher sessions"""
    success: bool = True
    teacher_id: int
    total_sessions: int
    active_sessions: int
    sessions: List[SessionInfo]


class SessionDetailResponse(BaseModel):
    """Detailed response for a single session"""
    success: bool = True
    session: SessionInfo


class CreateSessionResponse(BaseModel):
    """Response after creating a session"""
    success: bool = True
    message: str
    session_id: int
    module_id: int
    module_name: str
    teacher_id: int
    share_code: str
    date_time: datetime
    duration_minutes: int
    room: Optional[str] = None
    is_active: bool = True
    students_enrolled: int
    attendance_records: List[Dict[str, Any]]


class CloseSessionResponse(BaseModel):
    """Response after closing a session"""
    success: bool = True
    message: str
    session_id: int
    is_active: bool = False
    closed_at: datetime


class SimpleModuleResponse(BaseModel):
    """Simple module response for my-modules endpoint"""
    teacher_module_id: int
    module_id: int
    module_name: str
    module_code: str
    module_room: Optional[str] = None
    level_id: Optional[int] = None
    enrolled_students: int
    
    model_config = ConfigDict(from_attributes=True)


class MyModulesResponse(BaseModel):
    """Response for get my modules"""
    success: bool = True
    teacher_id: int
    total_modules: int
    modules: List[SimpleModuleResponse]


class SessionWithAttendance(BaseModel):
    """Session with full attendance records (like get_session_by_code response)"""
    session_id: int
    session_code: str
    date_time: datetime
    duration_minutes: int
    room: Optional[str] = None
    is_active: bool
    statistics: SessionStatistics
    attendance_records: List[AttendanceRecordInfo] = []
    
    model_config = ConfigDict(from_attributes=True)


class ModuleWithSessionsResponse(BaseModel):
    """Response for get module with all sessions"""
    success: bool = True
    teacher_id: int
    teacher_module_id: int
    module: ModuleInfo
    enrolled_students_count: int = 0
    enrolled_students: List[EnrollmentInfo] = []
    total_sessions: int = 0
    active_sessions: int = 0
    sessions: List[SessionWithAttendance] = []


# ==================== JUSTIFICATION SCHEMAS ====================

class JustificationDetails(BaseModel):
    """Justification details for responses"""
    id: int
    comment: Optional[str] = None
    file_url: Optional[str] = None
    status: str
    created_at: datetime
    teacher_notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class SimpleSessionInfo(BaseModel):
    """Simple session info for justification responses"""
    session_id: int
    session_code: str
    date_time: datetime
    room: Optional[str] = None
    is_active: bool = True
    
    model_config = ConfigDict(from_attributes=True)


class SimpleAttendanceInfo(BaseModel):
    """Simple attendance record info"""
    attendance_id: int
    status: str
    marked_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class JustificationWithContext(BaseModel):
    """Justification with full context (student, module, session)"""
    justification_id: int
    comment: Optional[str] = None
    file_url: Optional[str] = None
    status: str
    created_at: datetime
    attendance_record: SimpleAttendanceInfo
    student: Optional[StudentInfo] = None
    enrollment: Optional[EnrollmentInfo] = None
    module: Optional[ModuleInfo] = None
    session: Optional[SimpleSessionInfo] = None
    
    model_config = ConfigDict(from_attributes=True)


class TeacherJustificationsListResponse(BaseModel):
    """Response for list of teacher's justifications"""
    success: bool = True
    teacher_id: int
    total_justifications: int
    justifications: List[JustificationWithContext]


class ValidateJustificationRequest(BaseModel):
    """Request schema for validating (approve/reject) a justification"""
    decision: str = Field(
        ..., 
        description="Decision to approve or reject the justification",
        pattern="^(approve|reject)$"
    )
    teacher_notes: Optional[str] = Field(
        default=None, 
        max_length=500,
        description="Optional notes from the teacher about the decision"
    )
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "decision": "approve",
            "teacher_notes": "Document verified - medical certificate accepted"
        }
    })


class ValidateJustificationResponse(BaseModel):
    """Response after validating a justification"""
    success: bool = True
    message: str
    justification: JustificationDetails
    attendance_record: SimpleAttendanceInfo
    student: Optional[StudentInfo] = None
    module: Optional[ModuleInfo] = None
    session: Optional[SimpleSessionInfo] = None