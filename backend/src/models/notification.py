from sqlmodel import Relationship, SQLModel, Field
from typing import TYPE_CHECKING, Optional
from datetime import datetime

from .enums import NotificationType

if TYPE_CHECKING:
    from .user import User


class NotificationBase(SQLModel):
    title: str
    message: str
    type: NotificationType

class Notification(NotificationBase, table=True):
    __tablename__ = "notifications"  # ✅ Add explicit table name
    
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    message: str
    type: NotificationType
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_read: bool = Field(default=False)
    
    
    
    user_id: int = Field(foreign_key="public.users.id")
    user: "User" = Relationship(back_populates="notifications")
    
    __table_args__ = {'schema': 'public'}
