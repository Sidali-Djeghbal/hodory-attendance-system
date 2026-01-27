from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from .enums import JustificationStatus

class JustificationBase(BaseModel):
    """Base justification schema"""
    comment: str
    justification_type: str = "other"  # medical, administrative, personal, other

class JustificationCreate(JustificationBase):
    """Schema for creating a justification"""
    attendance_record_id: int
    file_url: Optional[str] = None

class JustificationUpdate(BaseModel):
    """Schema for updating a justification"""
    status: Optional[JustificationStatus] = None
    validation_date: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    validator_id: Optional[int] = None

class JustificationResponse(JustificationBase):
    """Schema for justification response"""
    id: int
    attendance_record_id: int
    student_id: int
    status: JustificationStatus
    file_url: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    validation_date: Optional[datetime] = None
    validator_id: Optional[int] = None
    attendance_record: Optional[Dict[str, Any]] = None
    student: Optional[Dict[str, Any]] = None
    validator: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(from_attributes=True)

class JustificationValidation(BaseModel):
    """Schema for justification validation"""
    decision: str  # "approve" or "reject"
    reason: Optional[str] = None  # Required if rejecting
