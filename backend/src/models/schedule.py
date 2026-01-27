from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from .level import Level
    from .sday import SDay

class Schedule(SQLModel, table=True):
    __tablename__ = "schedule"
    __table_args__ = {"schema": "public"}

    id: Optional[int] = Field(default=None, primary_key=True)
    level_id: int = Field(foreign_key="public.level.id", unique=True)
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    level: "Level" = Relationship(back_populates="schedule")
    s_days: List["SDay"] = Relationship(back_populates="schedule")
