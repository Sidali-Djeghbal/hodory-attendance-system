from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from .enums import ScheduleDays

if TYPE_CHECKING:
    from .schedule import Schedule
    from .module import Module


class SDay(SQLModel, table=True):
    __tablename__ = "s_day"
    __table_args__ = {"schema": "public"}

    id: Optional[int] = Field(default=None, primary_key=True)
    day: ScheduleDays
    time: str

    schedule_id: int = Field(foreign_key="public.schedule.id")
    module_id: int = Field(foreign_key="public.module.id")

    # Relationships - use forward references with quotes
    schedule: "Schedule" = Relationship(back_populates="s_days")
    module: "Module" = Relationship(back_populates="s_days")
