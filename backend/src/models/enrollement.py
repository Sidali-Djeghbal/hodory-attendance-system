from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .student import Student
    from .module import Module
    from .attendance import AttendanceRecord

class Enrollment(SQLModel, table=True):
    __tablename__ = "enrollments"
    __table_args__ = {"schema": "public"}

    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="public.students.id", index=True)
    module_id: int = Field(foreign_key="public.module.id", index=True)

    number_of_absences: int = Field(default=0)
    number_of_absences_justified: int = Field(default=0)
    is_excluded: bool = Field(default=False)
    
    # Denormalized student info for quick access
    student_name: Optional[str] = Field(default=None)
    student_email: Optional[str] = Field(default=None)

    student: "Student" = Relationship(back_populates="enrollments")
    module: "Module" = Relationship(back_populates="enrollments")
    attendance_records: List["AttendanceRecord"] = Relationship(back_populates="enrollement")
