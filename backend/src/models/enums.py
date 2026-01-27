from enum import Enum
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    EXCLUDED = "excluded"

class JustificationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class NotificationType(str, Enum):
    JUSTIFICATION_SUBMITTED = "justification_submitted"
    JUSTIFICATION_REJECTED = "justification_rejected"
    JUSTIFICATION_APPROVED = "justification_approved"
    
class ScheduleDays(str, Enum):
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"