from enum import Enum

class AttendanceStatus(str, Enum):
    """Attendance status enum"""
    PRESENT = "present"
    ABSENT = "absent"
    EXCLUDED = "excluded"

class JustificationStatus(str, Enum):
    """Justification status enum"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class NotificationType(str, Enum):
    """Notification type enum"""
    JUSTIFICATION_SUBMITTED = "justification_submitted"
    JUSTIFICATION_REJECTED = "justification_rejected"
    JUSTIFICATION_APPROVED = "justification_approved"
    SYSTEM_NOTIFICATION = "system_notification"
    ATTENDANCE_REMINDER = "attendance_reminder"