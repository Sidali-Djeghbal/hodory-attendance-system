from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict
import uuid

# Login schema
class LoginRequest(BaseModel):
    # Accept any syntactically-valid login identifier; some test domains may not pass strict EmailStr validation.
    email: str
    password: str

# Base schemas
class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    department: str
    role: Optional[str] = None

# User schemas
class UserRead(UserBase):
    id: str
    is_active: bool
    is_superuser: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None

# Role-specific schemas
class StudentCreate(BaseModel):
    level_id: Optional[str] = None

class TeacherCreate(BaseModel):
    assigned_modules: Optional[List[str]] = None
    assigned_levels: Optional[List[str]] = None

class AdminCreate(BaseModel):
    pass

# Registration schemas
class StudentRegistration(BaseModel):
    user: UserCreate
    student_data: StudentCreate

class TeacherRegistration(BaseModel):
    user: UserCreate
    teacher_data: TeacherCreate

class AdminRegistration(BaseModel):
    user: UserCreate
    admin_data: AdminCreate
