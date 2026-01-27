from typing import Dict, Any
from sqlmodel import Session, select
from fastapi import HTTPException, status
import uuid
import qrcode
import os

from ..models.session import Session as ClassSession
from ..models.attendance import AttendanceRecord
from ..models.enrollement import Enrollment
from ..models.enums import AttendanceStatus

# Directory for saving QR codes
QRCODE_DIR = "uploads/qrcodes"


class SessionController:
    """
    Session Controller - Handles session codes and student attendance
    
    Methods:
        - generate_share_code(): Generate 6-character code
        - generate_qrcode(): Generate QR code image and save to uploads/qrcodes/
        - mark_attendance(): Student marks attendance with code
    """
    
    def __init__(self, session: Session):
        self.session = session
        os.makedirs(QRCODE_DIR, exist_ok=True)
    
    def generate_share_code(self) -> str:
        """Generate 6-character share code"""
        return uuid.uuid4().hex[:6].upper()
    
    def generate_qrcode(self, session_id: int, share_code: str) -> str:
        """
        Generate QR code image and save to uploads/qrcodes/
        
        Args:
            session_id: ID of the session
            share_code: The 6-character code to encode
            
        Returns:
            str: URL path to QR code image
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(share_code)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        filename = f"session_{session_id}_{share_code}.png"
        filepath = os.path.join(QRCODE_DIR, filename)
        img.save(filepath)
        
        return filepath
    
    def mark_attendance(self, share_code: str, student_id: int) -> Dict[str, Any]:
        """
        Mark student attendance when they scan QR or enter share code.
        
        Args:
            share_code: The 6-character code from QR or entered manually
            student_id: ID of the student
            
        Returns:
            dict: Attendance confirmation
        """
        # Find session by share code
        session_obj = self.session.exec(
            select(ClassSession).where(ClassSession.session_code == share_code)
        ).first()
        
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid code. Session not found."
            )
        
        if not session_obj.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session is closed. Cannot mark attendance."
            )
        
        # Find student's enrollment for this module
        from ..models.teacher_modules import TeacherModules
        teacher_module = self.session.get(TeacherModules, session_obj.teacher_module_id)
        if not teacher_module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session module not found"
            )
        
        enrollment = self.session.exec(
            select(Enrollment).where(
                Enrollment.student_id == student_id,
                Enrollment.module_id == teacher_module.module_id
            )
        ).first()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="You are not enrolled in this module"
            )
        
        if enrollment.is_excluded:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are excluded from this module"
            )
        
        # Find attendance record
        attendance = self.session.exec(
            select(AttendanceRecord).where(
                AttendanceRecord.session_id == session_obj.id,
                AttendanceRecord.enrollement_id == enrollment.id
            )
        ).first()
        
        if not attendance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found"
            )
        
        if attendance.status == AttendanceStatus.PRESENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance already marked as present"
            )
        
        # Mark as PRESENT
        attendance.status = AttendanceStatus.PRESENT
        self.session.add(attendance)
        self.session.commit()
        self.session.refresh(attendance)
        
        return {
            "message": "Attendance marked successfully",
            "student_id": student_id,
            "session_id": session_obj.id,
            "status": "PRESENT",
            "marked_at": attendance.created_at
        }
    
    def get_session_info(self, share_code: str) -> Dict[str, Any]:
        """Get session info by share code (for student to verify)"""
        session_obj = self.session.exec(
            select(ClassSession).where(ClassSession.session_code == share_code)
        ).first()
        
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid code"
            )
        
        from ..models.teacher_modules import TeacherModules
        from ..models.module import Module
        
        teacher_module = self.session.get(TeacherModules, session_obj.teacher_module_id)
        module = self.session.get(Module, teacher_module.module_id) if teacher_module else None
        
        return {
            "session_id": session_obj.id,
            "module_name": module.name if module else "Unknown",
            "date_time": session_obj.date_time,
            "duration_minutes": session_obj.duration_minutes,
            "room": session_obj.room,
            "is_active": session_obj.is_active
        }
    
    def close_session(self, session_id: int, teacher_id: int) -> Dict[str, Any]:
        """
        Close session - no more attendance marking allowed.
        Updates enrollment absence counts for absent students.
        
        Args:
            session_id: ID of the session
            teacher_id: ID of the teacher (for verification)
            
        Returns:
            dict: Session summary with attendance stats
        """
        session_obj = self.session.get(ClassSession, session_id)
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID {session_id} not found"
            )
        
        if not session_obj.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session is already closed"
            )
        
        # Verify teacher owns this session
        from ..models.teacher_modules import TeacherModules
        teacher_module = self.session.get(TeacherModules, session_obj.teacher_module_id)
        if teacher_module.teacher_id != teacher_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to close this session"
            )
        
        # Close session
        session_obj.is_active = False
        self.session.add(session_obj)
        self.session.commit()
        
        # Get attendance stats
        records = self.session.exec(
            select(AttendanceRecord).where(AttendanceRecord.session_id == session_id)
        ).all()
        
        # Check each record - if ABSENT, increment number_of_absences in Enrollment
        for record in records:
            if record.status == AttendanceStatus.ABSENT:
                # Get the enrollment associated with this attendance record
                enrollment = self.session.get(Enrollment, record.enrollement_id)
                if enrollment:
                    # Increment the absence count
                    enrollment.number_of_absences += 1
                    self.session.add(enrollment)
        
        self.session.commit()
        
        present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
        absent = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
        total = len(records)
        
        return {
            "session_id": session_id,
            "is_active": False,
            "message": "Session closed",
            "statistics": {
                "total_students": total,
                "present": present,
                "absent": absent,
                "attendance_rate": round((present / total * 100), 2) if total > 0 else 0
            }
        }
