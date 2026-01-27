from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class WebSocketMessage(BaseModel):
    """Base schema for WebSocket messages"""
    type: str  # notification, session_update, attendance_update, etc.
    data: Dict[str, Any]
    timestamp: datetime

class SessionUpdateMessage(BaseModel):
    """Schema for session update messages"""
    session_id: int
    session_code: str
    is_active: bool
    remaining_time: Optional[int] = None  # seconds

class AttendanceUpdateMessage(BaseModel):
    """Schema for attendance update messages"""
    session_id: int
    student_id: int
    status: str
    timestamp: datetime

class NotificationMessage(BaseModel):
    """Schema for notification messages"""
    notification_id: int
    title: str
    message: str
    type: str
    created_at: datetime