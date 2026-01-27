from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from .schedule import Schedule
    from .student import Student
    from .module import Module

class Level(SQLModel, table=True):
    __tablename__ = "level"
    __table_args__ = {"schema": "public"}

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    year_level: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    schedule: Optional["Schedule"] = Relationship(back_populates="level")
    students: List["Student"] = Relationship(back_populates="level")
    modules: List["Module"] = Relationship(back_populates="level")
