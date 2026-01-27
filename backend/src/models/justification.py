from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from .enums import JustificationStatus


class Justification(SQLModel, table=True):
    __tablename__ = "justifications"
    __table_args__ = {"schema": "public"}

    id: Optional[int] = Field(default=None, primary_key=True)
    attendance_record_id: int = Field(
        foreign_key="public.attendance_records.id",
        unique=True
    )

    comment: Optional[str]
    file_url: Optional[str]
    status: JustificationStatus = Field(default=JustificationStatus.PENDING, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
