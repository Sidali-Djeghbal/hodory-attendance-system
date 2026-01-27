from typing import List, Optional, Dict, Any
from sqlmodel import Session, select, and_
from fastapi import HTTPException, status
from datetime import datetime

from ..models.justification import Justification
from ..models.attendance import AttendanceRecord
from ..models.enrollement import Enrollment
from ..models.student import Student
from ..models.enums import JustificationStatus, AttendanceStatus, NotificationType
from .notification_controller import NotificationController


class JustificationController:
    """
    Justification Controller - Handles justification-related operations
    
    Methods:
        - approve(): Approve a justification request
        - reject(): Reject a justification request
        - get_pending(): Get all pending justifications
    """
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_justification_by_id(self, justification_id: int) -> Justification:
        """Get justification by ID"""
        justification = self.session.get(Justification, justification_id)
        if not justification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Justification with ID {justification_id} not found"
            )
        return justification
    
    def approve(
        self, 
        justification_id: int, 
    ) -> Justification:
        """
        Approve a justification request.
        Updates the related attendance record to JUSTIFIED status.
        
        Args:
            justification_id: ID of the justification
            
        Returns:
            Justification: Updated justification
        """
        justification = self.get_justification_by_id(justification_id)
        
        if justification.status != JustificationStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Justification has already been {justification.status.value.lower()}"
            )
        
        # Update justification
        justification.status = JustificationStatus.APPROVED
        
        self.session.add(justification)
        self.session.commit()
        self.session.refresh(justification)
        
        # Create notification for justification approved
        # Get user_id: justification -> attendance_record -> enrollment -> student -> user_id
        attendance_record = self.session.get(AttendanceRecord, justification.attendance_record_id)
        if attendance_record:
            enrollment = self.session.get(Enrollment, attendance_record.enrollement_id)
            if enrollment:
                student = self.session.get(Student, enrollment.student_id)
                if student:
                    notification_ctrl = NotificationController(self.session)
                    notification_ctrl.create_notification(
                        user_id=student.user_id,
                        title="Justification Approved",
                        message=f"Your justification for attendance record #{justification.attendance_record_id} has been approved.",
                        notification_type=NotificationType.JUSTIFICATION_APPROVED
                    )
        
        return justification
    
    def reject(
        self, 
        justification_id: int, 
    ) -> Justification:
        """
        Reject a justification request.
        Keeps the related attendance record as ABSENT.
        
        Args:
            justification_id: ID of the justification
            
        Returns:
            Justification: Updated justification
        """
        justification = self.get_justification_by_id(justification_id)
        
        if justification.status != JustificationStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Justification has already been {justification.status.value.lower()}"
            )
        
        # Update justification
        justification.status = JustificationStatus.REJECTED
        self.session.add(justification)
        
        self.session.commit()
        self.session.refresh(justification)
                
        # Create notification for justification rejected
        # Get user_id: justification -> attendance_record -> enrollment -> student -> user_id
        attendance_record = self.session.get(AttendanceRecord, justification.attendance_record_id)
        if attendance_record:
            enrollment = self.session.get(Enrollment, attendance_record.enrollement_id)
            if enrollment:
                student = self.session.get(Student, enrollment.student_id)
                if student:
                    notification_ctrl = NotificationController(self.session)
                    notification_ctrl.create_notification(
                        user_id=student.user_id,
                        title="Justification Rejected",
                        message=f"Your justification for attendance record #{justification.attendance_record_id} has been rejected.",
                        notification_type=NotificationType.JUSTIFICATION_REJECTED
                    )
        
        return justification
    
    def get_pending(self) -> List[Justification]:
        """Get all pending justification requests"""
        justifications = self.session.exec(
            select(Justification).where(
                Justification.status == JustificationStatus.PENDING
            )
        ).all()
        return justifications
    
    def get_justifications_by_status(
        self, 
        status_filter: JustificationStatus
    ) -> List[Justification]:
        """Get justifications by status"""
        justifications = self.session.exec(
            select(Justification).where(Justification.status == status_filter)
        ).all()
        return justifications
    
    def get_student_justifications(
        self, 
        student_id: int
    ) -> List[Dict[str, Any]]:
        """
        Get all justifications for a student.
        
        Args:
            student_id: ID of the student
            
        Returns:
            List of justifications with details
        """
        # Get student's enrollments
        enrollments = self.session.exec(
            select(Enrollment).where(Enrollment.student_id == student_id)
        ).all()
        
        enrollment_ids = [e.id for e in enrollments]
        
        # Get attendance records
        attendance_records = self.session.exec(
            select(AttendanceRecord).where(
                AttendanceRecord.enrollement_id.in_(enrollment_ids)
            )
        ).all()
        
        attendance_ids = [a.id for a in attendance_records]
        
        # Get justifications
        justifications = self.session.exec(
            select(Justification).where(
                Justification.attendance_id.in_(attendance_ids)
            )
        ).all()
        
        results = []
        for justification in justifications:
            attendance = self.session.get(AttendanceRecord, justification.attendance_id)
            
            results.append({
                "justification_id": justification.id,
                "attendance_id": justification.attendance_id,
                "reason": justification.reason,
                "status": justification.status.value,
                "submitted_at": justification.submitted_at,
                "teacher_notes": justification.teacher_notes,
                "document_url": justification.document_url
            })
        
        return results
    