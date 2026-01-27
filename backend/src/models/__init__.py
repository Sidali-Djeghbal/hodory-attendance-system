"""Models package.

Avoid importing submodules here to prevent circular import problems during
module initialization. Import specific models directly, e.g.:

    from src.models.user import User

Only export enums at package level to keep a safe, lightweight import.
"""

from .enums import AttendanceStatus, JustificationStatus, NotificationType

__all__ = [
    "AttendanceStatus",
    "JustificationStatus",
    "NotificationType",
]