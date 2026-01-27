from typing import List, Optional, Dict, Any
from sqlmodel import Session, select, and_
from fastapi import HTTPException, status
from datetime import datetime

from ..models.attendance import AttendanceRecord
from ..models.enrollement import Enrollment
from ..models.session import Session as ClassSession
from ..models.module import Module
from ..models.student import Student
from ..models.enums import AttendanceStatus


class AttendanceController:
    """
    Attendance Controller - Handles attendance-related operations
    
    Methods:
        - update_attendance_status(): Update attendance status for a record
        - verify_enrollment_to_record(): Verify student is enrolled before recording
        - get_attendance_statistics(): Get attendance statistics
    """
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_attendance_by_id(self, attendance_id: int) -> AttendanceRecord:
        """Get attendance record by ID"""
        attendance = self.session.get(AttendanceRecord, attendance_id)
        if not attendance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attendance record with ID {attendance_id} not found"
            )
        return attendance
    
    def update_attendance_status(
        self, 
        attendance_id: int, 
        new_status: AttendanceStatus
    ) -> AttendanceRecord:
        """
        Update the attendance status for a record.
        
        Args:
            attendance_id: ID of the attendance record
            new_status: New status to set
            
        Returns:
            AttendanceRecord: Updated attendance record
        """
        attendance = self.get_attendance_by_id(attendance_id)
        
        # Validate status transition
        valid_transitions = {
            AttendanceStatus.ABSENT: [AttendanceStatus.PRESENT, AttendanceStatus.EXCLUDED],
            AttendanceStatus.PRESENT: [AttendanceStatus.ABSENT],  # Can undo mark
            AttendanceStatus.EXCLUDED: [AttendanceStatus.ABSENT]  # Can reinstate
        }
        
        if new_status not in valid_transitions.get(attendance.status, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot change status from {attendance.status.value} to {new_status.value}"
            )
        
        attendance.status = new_status
        self.session.add(attendance)
        self.session.commit()
        self.session.refresh(attendance)
        
        return attendance
    
    def verify_enrollment_to_record(
        self, 
        student_id: int, 
        module_id: int
    ) -> Dict[str, Any]:
        """
        Verify that a student is enrolled in a module before creating attendance record.
        
        Args:
            student_id: ID of the student
            module_id: ID of the module
            
        Returns:
            dict: Enrollment verification result
        """
        # Check if student exists
        student = self.session.get(Student, student_id)
        if not student:
            return {
                "is_enrolled": False,
                "reason": f"Student with ID {student_id} not found"
            }
        
        # Check if module exists
        module = self.session.get(Module, module_id)
        if not module:
            return {
                "is_enrolled": False,
                "reason": f"Module with ID {module_id} not found"
            }
        
        # Check enrollment
        enrollment = self.session.exec(
            select(Enrollment).where(
                Enrollment.student_id == student_id,
                Enrollment.module_id == module_id
            )
        ).first()
        
        if not enrollment:
            return {
                "is_enrolled": False,
                "reason": "Student is not enrolled in this module"
            }
        
        if enrollment.is_excluded:
            return {
                "is_enrolled": False,
                "is_excluded": True,
                "reason": "Student is excluded from this module"
            }
        
        return {
            "is_enrolled": True,
            "enrollment_id": enrollment.id,
            "student_id": student_id,
            "module_id": module_id
        }
    
    def create_attendance_record(
        self,
        session_id: int,
        enrollment_id: int,
        module_id: int,
        initial_status: AttendanceStatus = AttendanceStatus.ABSENT
    ) -> AttendanceRecord:
        """
        Create a new attendance record.
        
        Args:
            session_id: ID of the class session
            enrollment_id: ID of the enrollment
            module_id: ID of the module
            initial_status: Initial attendance status (default ABSENT)
            
        Returns:
            AttendanceRecord: Created attendance record
        """
        # Verify session exists
        session_obj = self.session.get(ClassSession, session_id)
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID {session_id} not found"
            )
        
        # Verify enrollment exists
        enrollment = self.session.get(Enrollment, enrollment_id)
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrollment with ID {enrollment_id} not found"
            )
        
        # Check if record already exists
        existing = self.session.exec(
            select(AttendanceRecord).where(
                AttendanceRecord.session_id == session_id,
                AttendanceRecord.enrollement_id == enrollment_id
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance record already exists for this session and student"
            )
        
        # Create record
        attendance = AttendanceRecord(
            session_id=session_id,
            enrollement_id=enrollment_id,
            module_id=module_id,
            status=initial_status
        )
        
        self.session.add(attendance)
        self.session.commit()
        self.session.refresh(attendance)
        
        return attendance
    
    def get_attendance_by_session(
        self, 
        session_id: int
    ) -> List[Dict[str, Any]]:
        """Get all attendance records for a session"""
        session_obj = self.session.get(ClassSession, session_id)
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID {session_id} not found"
            )
        
        records = self.session.exec(
            select(AttendanceRecord).where(AttendanceRecord.session_id == session_id)
        ).all()
        
        results = []
        for record in records:
            enrollment = self.session.get(Enrollment, record.enrollement_id)
            student = self.session.get(Student, enrollment.student_id) if enrollment else None
            
            results.append({
                "attendance_id": record.id,
                "student_id": student.id if student else None,
                "student_name": f"{student.user.first_name} {student.user.last_name}" if student and student.user else "Unknown",
                "status": record.status.value if record.status else "ABSENT"
            })
        
        return results
    
    def get_attendance_by_enrollment(
        self, 
        enrollment_id: int
    ) -> List[AttendanceRecord]:
        """Get all attendance records for an enrollment"""
        enrollment = self.session.get(Enrollment, enrollment_id)
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrollment with ID {enrollment_id} not found"
            )
        
        records = self.session.exec(
            select(AttendanceRecord).where(
                AttendanceRecord.enrollement_id == enrollment_id
            )
        ).all()
        
        return records
    
    def get_attendance_statistics(
        self, 
        module_id: Optional[int] = None,
        session_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get attendance statistics.
        
        Args:
            module_id: Optional - filter by module
            session_id: Optional - filter by session
            
        Returns:
            dict: Attendance statistics
        """
        query = select(AttendanceRecord)
        
        if module_id:
            query = query.where(AttendanceRecord.module_id == module_id)
        if session_id:
            query = query.where(AttendanceRecord.session_id == session_id)
        
        records = self.session.exec(query).all()
        
        total = len(records)
        if total == 0:
            return {
                "total_records": 0,
                "present": 0,
                "absent": 0,
                "excluded": 0,
                "attendance_rate": 0
            }
        
        present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
        absent = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
        excluded = sum(1 for r in records if r.status == AttendanceStatus.EXCLUDED)
        
        return {
            "total_records": total,
            "present": present,
            "absent": absent,
            "excluded": excluded,
            "attendance_rate": round((present / total * 100), 2)
        }
    
    def bulk_update_status(
        self, 
        attendance_ids: List[int], 
        new_status: AttendanceStatus
    ) -> List[AttendanceRecord]:
        """
        Bulk update attendance status.
        
        Args:
            attendance_ids: List of attendance record IDs
            new_status: New status to set
            
        Returns:
            List of updated attendance records
        """
        updated_records = []
        
        for attendance_id in attendance_ids:
            try:
                record = self.update_attendance_status(attendance_id, new_status)
                updated_records.append(record)
            except HTTPException:
                continue  # Skip invalid updates
        
        return updated_records
