from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

class ScheduleBase(BaseModel):
    """Base schedule schema"""
    timetable: Optional[Dict[str, Any]] = None  # JSON structure for timetable

class ScheduleCreate(ScheduleBase):
    """Schema for creating a schedule"""
    level_id: int

class ScheduleUpdate(BaseModel):
    """Schema for updating a schedule"""
    timetable: Optional[Dict[str, Any]] = None

class ScheduleResponse(ScheduleBase):
    """Schema for schedule response"""
    id: int
    level_id: int
    last_updated: datetime
    created_at: datetime
    level: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(from_attributes=True)

class SessionSchedule(BaseModel):
    """Schema for session scheduling"""
    day: str  # Monday, Tuesday, etc.
    start_time: str  # HH:MM format
    end_time: str    # HH:MM format
    module_id: int
    teacher_id: int
    room: Optional[str] = None