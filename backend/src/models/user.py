from sqlmodel import Relationship, SQLModel, Field
from typing import TYPE_CHECKING, Optional, List
from datetime import datetime

from .enums import *

if TYPE_CHECKING:
    from .notification import Notification

# Base User model
class UserBase(SQLModel):
    full_name: str = Field(index=True)
    email: str = Field(unique=True, index=True)
    department: str

class User(UserBase, table=True):
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    
    # Auth fields
    is_active: bool = True
    is_superuser: bool = False
    is_verified: bool = False
    
    # Role field to distinguish user types
    role: Optional[str] = Field(default=None, index=True)  # "student", "teacher", "admin"
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    
    # Relationship - use same pattern as other models
    notifications: List["Notification"] = Relationship(back_populates="user")
    
    __table_args__ = {'schema': 'public'}
    