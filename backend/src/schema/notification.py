from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from .enums import NotificationType

class NotificationBase(BaseModel):
    """Base notification schema"""
    title: str
    message: str
    type: NotificationType

class NotificationCreate(NotificationBase):
    """Schema for creating a notification"""
    user_id: int

class NotificationUpdate(BaseModel):
    """Schema for updating a notification"""
    is_read: Optional[bool] = None

class NotificationResponse(NotificationBase):
    """Schema for notification response"""
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    user: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(from_attributes=True)

class NotificationBulkCreate(BaseModel):
    """Schema for bulk notification creation"""
    user_ids: list[int]
    title: str
    message: str
    type: NotificationType = NotificationType.SYSTEM_NOTIFICATION
