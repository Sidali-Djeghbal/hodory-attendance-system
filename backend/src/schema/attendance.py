from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from .enums import AttendanceStatus

class AttendanceRecordBase(BaseModel):
    """Base attendance record schema"""
    status: AttendanceStatus = AttendanceStatus.ABSENT

class AttendanceRecordCreate(AttendanceRecordBase):
    """Schema for creating an attendance record"""
    session_id: int
    student_id: int

class AttendanceRecordUpdate(BaseModel):
    """Schema for updating an attendance record"""
    status: Optional[AttendanceStatus] = None

class AttendanceRecordResponse(AttendanceRecordBase):
    """Schema for attendance record response"""
    id: int
    session_id: int
    student_id: int
    timestamp: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    session: Optional[Dict[str, Any]] = None
    student: Optional[Dict[str, Any]] = None
    justification: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(from_attributes=True)

class AttendanceBulkCreate(BaseModel):
    """Schema for bulk attendance marking"""
    session_id: int
    student_ids: list[int]
    status: AttendanceStatus = AttendanceStatus.PRESENT

class AttendanceSummary(BaseModel):
    """Schema for attendance summary"""
    total_records: int
    present: int
    absent: int
    excluded: int
    attendance_rate: float
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None