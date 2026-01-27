from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class ReportBase(BaseModel):
    """Base report schema"""
    report_type: str  # attendance, justification, system, etc.
    period_start: datetime
    period_end: datetime
    filters: Optional[Dict[str, Any]] = None

class ReportCreate(ReportBase):
    """Schema for creating a report"""
    pass

class ReportUpdate(BaseModel):
    """Schema for updating a report"""
    pdf_url: Optional[str] = None
    excel_url: Optional[str] = None
    content: Optional[str] = None

class ReportResponse(ReportBase):
    """Schema for report response"""
    id: int
    content: Optional[str] = None
    pdf_url: Optional[str] = None
    excel_url: Optional[str] = None
    generated_date: datetime
    generated_by: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class ReportExport(BaseModel):
    """Schema for report export request"""
    format: str = "csv"  # csv, pdf, excel
    include_details: bool = False
    filters: Optional[Dict[str, Any]] = None