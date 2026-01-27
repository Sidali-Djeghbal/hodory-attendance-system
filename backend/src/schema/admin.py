from pydantic import BaseModel, ConfigDict
from typing import Optional , Dict, Any
from datetime import datetime
from .user import UserResponse

class AdminBase(BaseModel):
    """Base admin schema"""
    pass

class AdminCreate(AdminBase):
    """Schema for creating an admin"""
    user: Dict[str, Any]  # UserCreate dict

class AdminUpdate(BaseModel):
    """Schema for updating an admin"""
    pass

class AdminResponse(AdminBase):
    """Schema for admin response"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: Optional[UserResponse] = None
    
    model_config = ConfigDict(from_attributes=True)