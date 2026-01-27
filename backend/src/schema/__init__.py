# Import all schemas for easy access
from .user import *
from .student import *
from .teacher import *
from .admin import *
from .level import *
from .module import *
from .schedule import *
from .session import *
from .attendance import *
from .justification import *
from .notification import *
from .report import *
from .enums import *
from .bulk import *
from .filter import *
from .stats import *
from .export import *
from .websocket import *

__all__ = [
    # User
    "UserBase", "UserCreate", "UserUpdate", "UserResponse", "UserWithProfile",
    
    # Student
    "StudentBase", "StudentCreate", "StudentUpdate", "StudentResponse", "StudentWithUser",
    
    # Teacher
    "TeacherBase", "TeacherCreate", "TeacherUpdate", "TeacherResponse", "TeacherAssignment",
    
    # Admin
    "AdminBase", "AdminCreate", "AdminUpdate", "AdminResponse",
    
    # Level
    "LevelBase", "LevelCreate", "LevelUpdate", "LevelResponse",
    
    # Module
    "ModuleBase", "ModuleCreate", "ModuleUpdate", "ModuleResponse",
    
    # Schedule
    "ScheduleBase", "ScheduleCreate", "ScheduleUpdate", "ScheduleResponse", "SessionSchedule",
    
    # Session
    "SessionBase", "SessionCreate", "SessionUpdate", "SessionResponse", "SessionWithQR",
    
    # Attendance
    "AttendanceRecordBase", "AttendanceRecordCreate", "AttendanceRecordUpdate", 
    "AttendanceRecordResponse", "AttendanceBulkCreate", "AttendanceSummary",
    
    # Justification
    "JustificationBase", "JustificationCreate", "JustificationUpdate", 
    "JustificationResponse", "JustificationValidation",
    
    # Notification
    "NotificationBase", "NotificationCreate", "NotificationUpdate", 
    "NotificationResponse", "NotificationBulkCreate",
    
    # Report
    "ReportBase", "ReportCreate", "ReportUpdate", "ReportResponse", "ReportExport",
    
    # Auth
    "LoginRequest", "LoginResponse", "TokenData", "PasswordResetRequest", 
    "PasswordResetConfirm", "ChangePasswordRequest",
    
    # Bulk Operations
    "BulkStudentImport", "BulkTeacherImport", "BulkAssignment", "ImportResult",
    
    # Filtering
    "PaginationParams", "DateRangeFilter", "AttendanceFilter", "UserFilter", "JustificationFilter",
    
    # Statistics
    "SystemStatistics", "AttendanceStatistics", "StudentStatistics", "TeacherStatistics",
    
    # Export
    "ExportData", "AttendanceExportData", "JustificationExportData", "StudentExportData",
    
    # WebSocket
    "WebSocketMessage", "SessionUpdateMessage", "AttendanceUpdateMessage", "NotificationMessage",
    
    # Enums
    "AttendanceStatus", "JustificationStatus", "NotificationType"
]