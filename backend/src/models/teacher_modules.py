from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING, List

if TYPE_CHECKING:
    from .teacher import Teacher
    from .module import Module
    from .session import Session

class TeacherModules(SQLModel, table=True):
    __tablename__ = "teacher_modules"
    __table_args__ = {"schema": "public"}

    id: Optional[int] = Field(default=None, primary_key=True)
    teacher_id: int = Field(foreign_key="public.teacher.id", index=True)
    module_id: int = Field(foreign_key="public.module.id", index=True)

    teacher: "Teacher" = Relationship(back_populates="teacher_modules")
    module: "Module" = Relationship(back_populates="teacher_modules")
    sessions: List["Session"] = Relationship(back_populates="teacher_module")
