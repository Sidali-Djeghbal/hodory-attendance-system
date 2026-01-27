from typing import List, Optional, Dict, Any
from sqlmodel import Session, select, and_
from fastapi import HTTPException, status
from datetime import datetime, timezone

from ..models.notification import Notification
from ..models.user import User
from ..models.enums import NotificationType


class NotificationController:
    """
    Notification Controller - Handles notification-related operations
    
    Methods:
        - mark_as_read(): Mark a notification as read
        - get_unread(): Get all unread notifications for a user
        - create_notification(): Create a new notification
    """
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_notification_by_id(self, notification_id: int) -> Notification:
        """Get notification by ID"""
        notification = self.session.get(Notification, notification_id)
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notification with ID {notification_id} not found"
            )
        return notification
    
    def mark_as_read(self, notification_id: int, user_id: int) -> Notification:
        """
        Mark a notification as read.
        
        Args:
            notification_id: ID of the notification
            user_id: ID of the user (to verify ownership)
            
        Returns:
            Notification: Updated notification
        """
        notification = self.get_notification_by_id(notification_id)
        
        # Verify ownership
        if notification.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only mark your own notifications as read"
            )
        
        if notification.is_read:
            return notification  # Already read
        
        notification.is_read = True

        self.session.add(notification)
        self.session.commit()
        self.session.refresh(notification)
        
        return notification
    
    def mark_all_as_read(self, user_id: int) -> Dict[str, Any]:
        """
        Mark all notifications as read for a user.
        
        Args:
            user_id: ID of the user
            
        Returns:
            dict: Summary of updated notifications
        """
        notifications = self.session.exec(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        ).all()
        
        count = 0
        for notification in notifications:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc)
            self.session.add(notification)
            count += 1
        
        self.session.commit()
        
        return {
            "message": f"Marked {count} notifications as read",
            "count": count
        }
    
    def get_unread(self, user_id: int) -> List[Notification]:
        """
        Get all unread notifications for a user.
        
        Args:
            user_id: ID of the user
            
        Returns:
            List of unread notifications
        """
        notifications = self.session.exec(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.is_read == False
            ).order_by(Notification.created_at.desc())
        ).all()
        
        return notifications
    
    def get_all_notifications(
        self, 
        user_id: int, 
        limit: int = 50,
    ) -> List[Notification]:
        """
        Get all notifications for a user.
        
        Args:
            user_id: ID of the user
            limit: Maximum number of notifications to return
            include_read: Include read notifications
            
        Returns:
            List of notifications
        """
        query = select(Notification).where(Notification.user_id == user_id)
        
        query = query.order_by(Notification.created_at.desc()).limit(limit)
        
        notifications = self.session.exec(query).all()
        return notifications
    
    def create_notification(
        self,
        user_id: int,
        title: str,
        message: str,
        notification_type: Optional[NotificationType] 
    ) -> Notification:
        """
        Create a new notification.
        
        Args:
            user_id: ID of the user
            title: Title of the notification
            message: Message content
            notification_type: Type of notification (INFO, WARNING, ALERT, etc.)
            
        Returns:
            Notification: Created notification
        """
        # Verify user exists
        user = self.session.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            is_read=False,
            created_at=datetime.now(timezone.utc)
        )
        
        self.session.add(notification)
        self.session.commit()
        self.session.refresh(notification)
        
        return notification
    
    # def create_bulk_notifications(
    #     self,
    #     user_ids: List[int],
    #     title: str,
    #     message: str,
    #     notification_type: Optional[str] = "INFO"
    # ) -> Dict[str, Any]:
    #     """
    #     Create notifications for multiple users.
    #     
    #     Args:
    #         user_ids: List of user IDs
    #         title: Title of the notification
    #         message: Message content
    #         notification_type: Type of notification
    #         
    #     Returns:
    #         dict: Summary of created notifications
    #     """
    #     created = 0
    #     failed = []
    #     
    #     for user_id in user_ids:
    #         try:
    #             notification = Notification(
    #                 user_id=user_id,
    #                 title=title,
    #                 message=message,
    #                 type=notification_type,
    #                 is_read=False,
    #                 created_at=datetime.utcnow()
    #             )
    #             self.session.add(notification)
    #             created += 1
    #         except Exception as e:
    #             failed.append({"user_id": user_id, "error": str(e)})
    #     
    #     self.session.commit()
    #     
    #     return {
    #         "created": created,
    #         "failed": len(failed),
    #         "failures": failed
    #     }
    
    # def delete_notification(
    #     self, 
    #     notification_id: int, 
    #     user_id: int
    # ) -> Dict[str, Any]:
    #     """
    #     Delete a notification.
    #     
    #     Args:
    #         notification_id: ID of the notification
    #         user_id: ID of the user (to verify ownership)
    #         
    #     Returns:
    #         dict: Success message
    #     """
    #     notification = self.get_notification_by_id(notification_id)
    #     
    #     # Verify ownership
    #     if notification.user_id != user_id:
    #         raise HTTPException(
    #             status_code=status.HTTP_403_FORBIDDEN,
    #             detail="You can only delete your own notifications"
    #         )
    #     
    #     self.session.delete(notification)
    #     self.session.commit()
    #     
    #     return {"message": "Notification deleted successfully"}
    
    # def get_unread_count(self, user_id: int) -> int:
    #     """
    #     Get the count of unread notifications for a user.
    #     
    #     Args:
    #         user_id: ID of the user
    #         
    #     Returns:
    #         int: Count of unread notifications
    #     """
    #     notifications = self.session.exec(
    #         select(Notification).where(
    #             Notification.user_id == user_id,
    #             Notification.is_read == False
    #         )
    #     ).all()
    #     
    #     return len(notifications)
