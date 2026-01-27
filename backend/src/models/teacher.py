from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .teacher_modules import TeacherModules

class Teacher(SQLModel, table=True):
    __tablename__ = "teacher"
    __table_args__ = {"schema": "public"}

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="public.users.id", unique=True)

    # Relationships
    teacher_modules: List["TeacherModules"] = Relationship(back_populates="teacher")
    