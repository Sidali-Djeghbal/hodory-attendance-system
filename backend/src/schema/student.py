from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any
from datetime import datetime
from .user import UserResponse

class StudentBase(BaseModel):
    """Base student schema"""
    level_id: Optional[int] = None

class StudentCreate(StudentBase):
    """Schema for creating a student"""
    user: Dict[str, Any]  # UserCreate dict

class StudentUpdate(BaseModel):
    """Schema for updating a student"""
    level_id: Optional[str] = None

class StudentResponse(StudentBase):
    """Schema for student response"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: Optional[UserResponse] = None
    
    model_config = ConfigDict(from_attributes=True)

class StudentWithUser(StudentResponse):
    """Student with complete user information"""
    user_details: Optional[Dict[str, Any]] = None