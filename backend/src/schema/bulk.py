from pydantic import BaseModel
from typing import List, Dict, Any

class BulkStudentImport(BaseModel):
    """Schema for bulk student import"""
    students: List[Dict[str, Any]]
    send_welcome_emails: bool = True

class BulkTeacherImport(BaseModel):
    """Schema for bulk teacher import"""
    teachers: List[Dict[str, Any]]
    send_welcome_emails: bool = True

class BulkAssignment(BaseModel):
    """Schema for bulk assignments"""
    assignments: List[Dict[str, Any]]  # List of teacher-module or teacher-level assignments

class ImportResult(BaseModel):
    """Schema for import results"""
    total_processed: int
    successful: int
    failed: int
    errors: List[str]