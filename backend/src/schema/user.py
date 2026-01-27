from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from .enums import *

class UserBase(BaseModel):
    """Base user schema"""
    full_name: str
    email: EmailStr
    department: str
    role: Optional[str] = None

class UserCreate(UserBase):
    """Schema for creating a user"""
    password: str

class UserUpdate(BaseModel):
    """Schema for updating a user"""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None

class UserResponse(UserBase):
    """Schema for user response"""
    id: int
    is_active: bool
    is_superuser: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class UserWithProfile(UserResponse):
    """User response with profile information"""
    student_profile: Optional[Dict[str, Any]] = None
    teacher_profile: Optional[Dict[str, Any]] = None
    admin_profile: Optional[Dict[str, Any]] = None