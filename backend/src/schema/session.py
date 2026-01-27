from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class SessionBase(BaseModel):
    """Base session schema"""
    session_code: str
    datetime: datetime
    duration_minutes: int = Field(default=60, ge=1, le=240)  # 1 minute to 4 hours

class SessionCreate(SessionBase):
    """Schema for creating a session"""
    module_id: int
    teacher_id: int

class SessionUpdate(BaseModel):
    """Schema for updating a session"""
    session_code: Optional[str] = None
    datetime: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    is_active: Optional[bool] = None

class SessionResponse(SessionBase):
    """Schema for session response"""
    id: int
    module_id: int
    teacher_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    module: Optional[Dict[str, Any]] = None
    teacher: Optional[Dict[str, Any]] = None
    attendance_records: Optional[List[Dict[str, Any]]] = None
    
    model_config = ConfigDict(from_attributes=True)

class SessionWithQR(SessionResponse):
    """Session response with QR code data"""
    qr_data: Optional[Dict[str, Any]] = None
    expiration_time: Optional[datetime] = None