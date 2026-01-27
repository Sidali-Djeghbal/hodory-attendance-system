from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING


if TYPE_CHECKING:
    from .level import Level
    from .teacher_modules import TeacherModules
    from .enrollement import Enrollment
    from .sday import SDay
    from .attendance import AttendanceRecord


class Module(SQLModel, table=True):
    __tablename__ = "module"
    __table_args__ = {"schema": "public"}

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    code: str = Field(unique=True, index=True)
    room: Optional[str] = None

    level_id: int = Field(foreign_key="public.level.id", nullable=False)

    level: "Level" = Relationship(back_populates="modules")
    teacher_modules: List["TeacherModules"] = Relationship(back_populates="module")
    enrollments: List["Enrollment"] = Relationship(back_populates="module")
    s_days: List["SDay"] = Relationship(back_populates="module")
    attendance_records: List["AttendanceRecord"] = Relationship(back_populates="module")
