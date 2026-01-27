from pydantic import BaseModel
from typing import Dict, Any, List
from datetime import datetime

class SystemStatistics(BaseModel):
    """Schema for system statistics"""
    total_users: int
    total_students: int
    total_teachers: int
    total_admins: int
    total_modules: int
    total_levels: int
    total_sessions: int
    total_attendance_records: int
    total_pending_justifications: int

class AttendanceStatistics(BaseModel):
    """Schema for attendance statistics"""
    period_start: datetime
    period_end: datetime
    total_sessions: int
    total_attendance_records: int
    present_count: int
    absent_count: int
    excluded_count: int
    overall_attendance_rate: float
    module_breakdown: Dict[int, float]  # module_id -> attendance_rate
    level_breakdown: Dict[int, float]  # level_id -> attendance_rate

class StudentStatistics(BaseModel):
    """Schema for student statistics"""
    student_id: int
    total_modules: int
    total_sessions: int
    attendance_rate: float
    justified_absences: int
    unjustified_absences: int
    exclusion_status: Dict[int, bool]  # module_id -> is_excluded

class TeacherStatistics(BaseModel):
    """Schema for teacher statistics"""
    teacher_id: int
    assigned_modules: int
    conducted_sessions: int
    total_students: int
    average_attendance_rate: float
    pending_justifications: int