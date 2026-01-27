from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING


if TYPE_CHECKING:
    from .level import Level
    from .enrollement import Enrollment


class Student(SQLModel, table=True):
    __tablename__ = "students"
    __table_args__ = {"schema": "public"}

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="public.users.id", unique=True)
    level_id: int = Field(foreign_key="public.level.id" , nullable=False)
    
    # Relationships
    # - Notifications are accessed via User model
    # - Attendance records are accessed via Enrollment model
    level: "Level" = Relationship(back_populates="students")
    enrollments: List["Enrollment"] = Relationship(back_populates="student")
