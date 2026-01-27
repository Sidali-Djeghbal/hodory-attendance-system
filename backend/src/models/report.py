from sqlmodel import Relationship, SQLModel, Field
from typing import TYPE_CHECKING, Optional
from datetime import datetime

if TYPE_CHECKING:
    from .admin import Admin

class Report(SQLModel, table=True):
    __tablename__ = "report"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str = Field(default="")  # Summary text
    period_start: datetime
    period_end: datetime
    generated_date: datetime = Field(default_factory=datetime.utcnow)
    pdf_url: Optional[str] = None  # Path to PDF file in uploads/reports/
    excel_url: Optional[str] = None  # Path to Excel file in uploads/reports/
    
    admin_id: int = Field(foreign_key="public.admins.id")
    admin: "Admin" = Relationship(back_populates="reports")
    
    __table_args__ = {'schema': 'public'}