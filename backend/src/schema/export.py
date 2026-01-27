from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ExportData(BaseModel):
    """Base schema for export data"""
    format: str = "csv"  # csv, json, pdf, excel
    filename: str
    data: List[Dict[str, Any]]

class AttendanceExportData(BaseModel):
    """Schema for attendance export data"""
    student_name: str
    student_email: str
    module_name: str
    module_code: str
    session_code: str
    session_date: str
    attendance_status: str
    justification_status: Optional[str] = None
    timestamp: str

class JustificationExportData(BaseModel):
    """Schema for justification export data"""
    student_name: str
    student_email: str
    module_name: str
    session_date: str
    justification_type: str
    comment: str
    status: str
    validation_date: Optional[str] = None
    validator_name: Optional[str] = None

class StudentExportData(BaseModel):
    """Schema for student export data"""
    full_name: str
    email: str
    department: str
    level_name: str
    enrollment_date: str
    total_modules: int
    attendance_rate: float
    status: str
    