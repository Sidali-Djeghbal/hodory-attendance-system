from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PaginationParams(BaseModel):
    """Schema for pagination parameters"""
    skip: int = 0
    limit: int = 100

class DateRangeFilter(BaseModel):
    """Schema for date range filtering"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class AttendanceFilter(DateRangeFilter):
    """Schema for attendance filtering"""
    student_id: Optional[int] = None
    teacher_id: Optional[int] = None
    module_id: Optional[int] = None
    level_id: Optional[int] = None
    status: Optional[str] = None

class UserFilter(BaseModel):
    """Schema for user filtering"""
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None
    search_query: Optional[str] = None

class JustificationFilter(DateRangeFilter):
    """Schema for justification filtering"""
    student_id: Optional[int] = None
    teacher_id: Optional[int] = None
    status: Optional[str] = None