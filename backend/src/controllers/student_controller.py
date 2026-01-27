from typing import List, Optional, Dict, Any
from sqlmodel import Session, select, and_
from fastapi import HTTPException, status, UploadFile
from datetime import datetime, timezone
import os
import uuid
from sqlalchemy import func
from sqlalchemy import or_

from ..models.student import Student
from ..models.attendance import AttendanceRecord
from ..models.justification import Justification
from ..models.enrollement import Enrollment
from ..models.session import Session as ClassSession
from ..models.module import Module
from ..models.level import Level
from ..models.schedule import Schedule
from ..models.sday import SDay
from ..models.user import User
from ..models.enums import AttendanceStatus, JustificationStatus, NotificationType
from .notification_controller import NotificationController


class StudentController:
    """
    Student Controller - Handles student-related operations
    
    Methods:
        - mark_attendance(): Mark attendance using session code
        - view_attendance_records(): View all attendance records
        - justify_absence(): Submit justification for an absence
    """
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_student_by_id(self, student_id: int) -> Student:
        """Get student by ID"""
        student = self.session.get(Student, student_id)
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with ID {student_id} not found"
            )
        return student
    
    def get_student_by_user_id(self, user_id: int) -> Student:
        """Get student by user ID"""
        student = self.session.exec(
            select(Student).where(Student.user_id == user_id)
        ).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with user ID {user_id} not found"
            )
        return student
    
    def get_student_enrollments(self, student_id: int) -> List[Enrollment]:
        """Get all enrollments for a student"""
        student = self.get_student_by_id(student_id)
        
        enrollments = self.session.exec(
            select(Enrollment).where(Enrollment.student_id == student_id)
        ).all()
        
        return enrollments
    
    def mark_attendance(self, student_id: int, session_code: str) -> AttendanceRecord:
        """
        Mark student attendance using the session code.
        
        Args:
            student_id: ID of the student
            session_code: The session code to mark attendance
            
        Returns:
            AttendanceRecord: Updated attendance record
        """
        student = self.get_student_by_id(student_id)
        
        # Find session by code + module info in one go (fast path for QR scans).
        from ..models.teacher_modules import TeacherModules
        row = self.session.exec(
            select(ClassSession, TeacherModules.module_id, Module.name)
            .join(TeacherModules, TeacherModules.id == ClassSession.teacher_module_id)
            .join(Module, Module.id == TeacherModules.module_id)
            .where(ClassSession.session_code == session_code)
        ).first()

        session_obj = row[0] if row else None
        module_id = int(row[1]) if row else None
        module_name = str(row[2]) if row else None
        
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid session code"
            )
        
        if not session_obj.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session is closed. Cannot mark attendance."
            )
        
        if not module_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found for this session"
            )
        
        # Find student's enrollment in this module
        enrollment = self.session.exec(
            select(Enrollment).where(
                Enrollment.student_id == student_id,
                Enrollment.module_id == module_id
            )
        ).first()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not enrolled in this module"
            )
        
        if enrollment.is_excluded:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are excluded from this module"
            )
        
        # Find attendance record for this session and enrollment
        attendance = self.session.exec(
            select(AttendanceRecord).where(
                AttendanceRecord.session_id == session_obj.id,
                AttendanceRecord.enrollement_id == enrollment.id
            )
        ).first()

        if not attendance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No attendance record found for this session"
            )
        
        if attendance.status == AttendanceStatus.PRESENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance already marked as present"
            )
        
        # Mark as present
        attendance.status = AttendanceStatus.PRESENT
        self.session.add(attendance)
        self.session.commit()
        self.session.refresh(attendance)
        
        result = {
            "attendance_id": attendance.id,
            "status": attendance.status.value,
            "created_at": attendance.created_at,
            "module_id": int(module_id),
            "module_name": module_name or "Unknown",
            "session_id": session_obj.id,
            "session_code": session_obj.session_code,
            "session_date": session_obj.date_time,
            "enrollment_id": enrollment.id,
            "number_of_absences": enrollment.number_of_absences,
            "number_of_absences_justified": enrollment.number_of_absences_justified,
            }
        return result 
    
    def view_attendance_records(
        self, 
        student_id: int, 
        module_id: Optional[int] = None,
        status_filter: Optional[AttendanceStatus] = None
    ) -> List[Dict[str, Any]]:
        """
        View all attendance records for a student.
        
        Args:
            student_id: ID of the student
            module_id: Optional - filter by module
            status_filter: Optional - filter by status
            
        Returns:
            List of attendance records with details
        """
        student = self.get_student_by_id(student_id)
        
        # Get student's enrollment ids (optionally filtered by module)
        enrollments_query = select(Enrollment.id).where(Enrollment.student_id == student_id)
        if module_id:
            enrollments_query = enrollments_query.where(Enrollment.module_id == module_id)
        enrollment_ids = [int(eid) for eid in self.session.exec(enrollments_query).all() if eid is not None]
        if not enrollment_ids:
            return []

        # Optimized join query: attendance + session + module + optional justification.
        # Note: Justification is linked redundantly via both:
        # - Justification.attendance_record_id (unique)
        # - AttendanceRecord.justification_id (nullable)
        # Join with OR to support older data where only one side is populated.
        query = (
            select(
                AttendanceRecord.id,
                AttendanceRecord.status,
                AttendanceRecord.created_at,
                AttendanceRecord.module_id,
                AttendanceRecord.session_id,
                Module.name,
                Module.code,
                Module.room,
                ClassSession.session_code,
                ClassSession.date_time,
                ClassSession.duration_minutes,
                Justification.id,
                Justification.status,
            )
            .join(Module, Module.id == AttendanceRecord.module_id)
            .join(ClassSession, ClassSession.id == AttendanceRecord.session_id)
            .outerjoin(
                Justification,
                or_(
                    Justification.attendance_record_id == AttendanceRecord.id,
                    Justification.id == AttendanceRecord.justification_id,
                ),
            )
            .where(AttendanceRecord.enrollement_id.in_(enrollment_ids))
        )

        if status_filter:
            query = query.where(AttendanceRecord.status == status_filter)

        rows = self.session.exec(query).all()
        results: List[Dict[str, Any]] = []
        for (
            attendance_id,
            status_value,
            created_at,
            module_id_value,
            session_id_value,
            module_name,
            module_code,
            module_room,
            session_code,
            session_date,
            duration_minutes,
            justification_id,
            justification_status,
        ) in rows:
            status_str = status_value.value if hasattr(status_value, "value") else str(status_value)
            justification_status_str = (
                justification_status.value
                if hasattr(justification_status, "value")
                else (str(justification_status) if justification_status is not None else None)
            )

            results.append({
                "attendance_id": int(attendance_id),
                "module_id": int(module_id_value),
                "module_name": module_name or "Unknown",
                "module_code": module_code,
                "room": module_room,
                "session_id": int(session_id_value),
                "session_code": session_code,
                "session_date": session_date,
                "duration_minutes": int(duration_minutes) if duration_minutes is not None else None,
                "status": status_str,
                "has_justification": justification_id is not None,
                "justification_id": int(justification_id) if justification_id is not None else None,
                "justification_status": justification_status_str,
            })

        # Newest first for consistency
        results.sort(key=lambda r: (r.get("session_date") or datetime.min), reverse=True)
        return results
    
    def get_attendance_summary(self, student_id: int) -> Dict[str, Any]:
        """Get attendance summary for a student"""
        student = self.get_student_by_id(student_id)
        
        # Get all enrollments
        enrollments = self.session.exec(
            select(Enrollment).where(Enrollment.student_id == student_id)
        ).all()
        
        enrollment_ids = [e.id for e in enrollments]
        
        if not enrollment_ids:
            return {
               
                "absent": 0,
                }
        
        # Get all attendance records
        attendance_records = self.session.exec(
            select(AttendanceRecord).where(
                AttendanceRecord.enrollement_id.in_(enrollment_ids)
            )
        ).all()
        
        absent = sum(1 for r in attendance_records if r.status == AttendanceStatus.ABSENT)
        
        return {
            "absent": absent,
        }
    
    def justify_absence(
        self, 
        student_id: int, 
        attendance_record_id: int,
        comment: str,
        file_url: Optional[str] = None
    ) -> Justification:
        """
        Submit a justification for an absence.
        
        Args:
            student_id: ID of the student
            attendance_id: ID of the attendance record
            reason: Reason for the absence
            document_url: Optional URL to supporting document
            
        Returns:
            Justification: The created justification
        """
        student = self.get_student_by_id(student_id)
        
        # Get attendance record
        attendance = self.session.get(AttendanceRecord, attendance_record_id)
        if not attendance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attendance record with ID {attendance_record_id} not found"
            )
        
        # Verify attendance belongs to student
        enrollment = self.session.get(Enrollment, attendance.enrollement_id)
        if not enrollment or enrollment.student_id != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This attendance record does not belong to you"
            )
        
        # Check if attendance is ABSENT
        if attendance.status != AttendanceStatus.ABSENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only justify absences"
            )
        
        # Check if justification already exists
        existing = self.session.exec(
            select(Justification).where(Justification.attendance_record_id == attendance_record_id)
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A justification already exists for this absence"
            )
        
        # Create justification
        justification = Justification(
            attendance_record_id=attendance_record_id,
            comment=comment,
            file_url=file_url,
            status=JustificationStatus.PENDING,
        )

        self.session.add(justification)
        self.session.flush()

        # Keep both sides of the relationship in sync so teacher queries that
        # rely on AttendanceRecord.justification_id work.
        attendance.justification_id = justification.id
        self.session.add(attendance)
        self.session.commit()
        self.session.refresh(justification)
        
        # Create notification for justification submitted
        notification_ctrl = NotificationController(self.session)
        notification_ctrl.create_notification(
            user_id=student.user_id,
            title="Justification Submitted",
            message=f"Your justification for attendance record #{attendance_record_id} has been submitted and is pending review.",
            notification_type=NotificationType.JUSTIFICATION_SUBMITTED
        )
        
        return justification
    
    def get_justifications(self, student_id: int) -> List[Justification]:
        """Get all justifications submitted by a student"""
        student = self.get_student_by_id(student_id)
        
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
        
        return justifications
    
    def get_modules(self, student_id: int) -> List[Module]:
        """Get all modules a student is enrolled in"""
        student = self.get_student_by_id(student_id)
        
        enrollments = self.session.exec(
            select(Enrollment).where(
                Enrollment.student_id == student_id,
                Enrollment.is_excluded == False
            )
        ).all()
        
        modules = []
        for enrollment in enrollments:
            module = self.session.get(Module, enrollment.module_id)
            if module:
                modules.append(module)
        
        return modules
    
    def get_my_enrollement(self, student_id: int) -> Enrollment:
        """Get enrollment details for the student"""        
        enrollment = self.session.exec(
            select(Enrollment).where(
                Enrollment.student_id == student_id
            )
        ).first()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Enrollment not found for the student"
            )
        
        return enrollment
    
    def get_profile(self, user_id: int) -> Dict[str, Any]:
        """
        Get complete student profile with user info, level, schedule, and sdays.
        
        Args:
            user_id: The user ID of the student
            
        Returns:
            dict: Complete student profile with all related information
        """
        # Get user
        user = self.session.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get student
        student = self.get_student_by_user_id(user_id)
        
        # Get level info
        level_info = None
        schedule_info = None
        sdays_info = []
        
        if student.level_id:
            level = self.session.get(Level, student.level_id)
            if level:
                level_info = {
                    "id": level.id,
                    "name": level.name,
                    "year_level": level.year_level,
                    "created_at": level.created_at
                }
                
                # Get schedule for this level
                schedule = self.session.exec(
                    select(Schedule).where(Schedule.level_id == level.id)
                ).first()
                
                if schedule:
                    schedule_info = {
                        "id": schedule.id,
                        "level_id": schedule.level_id,
                        "last_updated": schedule.last_updated
                    }
                    
                    # Get sdays for this schedule (fetch modules in bulk)
                    sdays = self.session.exec(
                        select(SDay).where(SDay.schedule_id == schedule.id)
                    ).all()

                    module_ids = {int(s.module_id) for s in sdays if s.module_id is not None}
                    modules = (
                        self.session.exec(select(Module).where(Module.id.in_(module_ids))).all()
                        if module_ids
                        else []
                    )
                    module_by_id = {int(m.id): m for m in modules if m.id is not None}

                    for sday in sdays:
                        module = module_by_id.get(int(sday.module_id))
                        sdays_info.append({
                            "id": sday.id,
                            "day": sday.day.value if sday.day else None,
                            "time": sday.time,
                            "module_id": sday.module_id,
                            "module_name": module.name if module else None,
                            "module_code": module.code if module else None,
                            "room": module.room if module else None
                        })
        
        # Enrollments + attendance summary (aggregated)
        enrollment_ids = self.session.exec(
            select(Enrollment.id).where(Enrollment.student_id == student.id)
        ).all()
        enrollment_ids = [int(eid) for eid in enrollment_ids if eid is not None]

        present_count = 0
        absent_count = 0
        total_count = 0

        if enrollment_ids:
            rows = self.session.exec(
                select(AttendanceRecord.status, func.count(AttendanceRecord.id))
                .where(AttendanceRecord.enrollement_id.in_(enrollment_ids))
                .group_by(AttendanceRecord.status)
            ).all()
            counts = {status: int(count) for status, count in rows}
            present_count = counts.get(AttendanceStatus.PRESENT, 0)
            absent_count = counts.get(AttendanceStatus.ABSENT, 0)
            total_count = sum(counts.values())
        
        return {
            "success": True,
            "student": {
                "id": student.id,
                "user_id": user.id,
                "level_id": student.level_id
            },
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "department": user.department,
                "role": user.role,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "created_at": user.created_at
            },
            "level": level_info,
            "schedule": schedule_info,
            "sdays": sdays_info,
            "statistics": {
                "modules_enrolled": len(enrollment_ids),
                "total_sessions": total_count,
                "present": present_count,
                "absent": absent_count,
                "attendance_rate": round((present_count / total_count * 100), 2) if total_count > 0 else 0.0
            }
        }
    
    def get_all_enrollments_detailed(self, student_id: int) -> Dict[str, Any]:
        """
        Get all enrollments for a student with module details.
        
        Args:
            student_id: ID of the student
            
        Returns:
            dict: List of enrollments with module and attendance info
        """
        student = self.get_student_by_id(student_id)
        
        enrollments = self.session.exec(
            select(Enrollment).where(Enrollment.student_id == student_id)
        ).all()
        
        enrollments_list = []
        for enrollment in enrollments:
            module = self.session.get(Module, enrollment.module_id)
            
            # Get attendance for this enrollment
            attendance_records = self.session.exec(
                select(AttendanceRecord).where(
                    AttendanceRecord.enrollement_id == enrollment.id
                )
            ).all()
            
            present = sum(1 for r in attendance_records if r.status == AttendanceStatus.PRESENT)
            absent = sum(1 for r in attendance_records if r.status == AttendanceStatus.ABSENT)
            total = len(attendance_records)
            
            enrollments_list.append({
                "enrollment_id": enrollment.id,
                "module_id": enrollment.module_id,
                "module_name": module.name if module else "Unknown",
                "module_code": module.code if module else None,
                "room": module.room if module else None,
                "student_name": enrollment.student_name,
                "student_email": enrollment.student_email,
                "number_of_absences": enrollment.number_of_absences,
                "number_of_absences_justified": enrollment.number_of_absences_justified,
                "is_excluded": enrollment.is_excluded,
                "statistics": {
                    "total_sessions": total,
                    "present": present,
                    "absent": absent,
                    "attendance_rate": round((present / total * 100), 2) if total > 0 else 0.0
                }
            })
        
        return {
            "success": True,
            "student_id": student_id,
            "total_enrollments": len(enrollments_list),
            "enrollments": enrollments_list
        }
    
    def get_justifications_detailed(self, student_id: int) -> Dict[str, Any]:
        """
        Get all justifications with detailed information.
        
        Args:
            student_id: ID of the student
            
        Returns:
            dict: List of justifications with attendance and module info
        """
        student = self.get_student_by_id(student_id)
        
        # Get student's enrollments
        enrollments = self.session.exec(
            select(Enrollment).where(Enrollment.student_id == student_id)
        ).all()
        
        enrollment_ids = [e.id for e in enrollments]
        
        if not enrollment_ids:
            return {
                "success": True,
                "student_id": student_id,
                "total_justifications": 0,
                "justifications": []
            }
        
        # Fetch justifications for student's attendance records.
        # Support both linkage styles:
        # - Justification.attendance_record_id (canonical)
        # - AttendanceRecord.justification_id (legacy / denormalized)
        rows = self.session.exec(
            select(Justification, AttendanceRecord, ClassSession, Module)
            .join(
                AttendanceRecord,
                or_(
                    Justification.attendance_record_id == AttendanceRecord.id,
                    AttendanceRecord.justification_id == Justification.id,
                ),
            )
            .join(ClassSession, AttendanceRecord.session_id == ClassSession.id)
            .join(Module, AttendanceRecord.module_id == Module.id)
            .where(AttendanceRecord.enrollement_id.in_(enrollment_ids))
        ).all()

        justifications_list = []
        for justification, record, session_obj, module in rows:
            justifications_list.append({
                "justification_id": justification.id,
                "comment": justification.comment,
                "file_url": justification.file_url,
                "status": justification.status.value,
                "created_at": justification.created_at,
                "attendance_record": {
                    "id": record.id,
                    "status": record.status.value,
                    "marked_at": record.created_at
                },
                "session": {
                    "id": session_obj.id if session_obj else None,
                    "session_code": session_obj.session_code if session_obj else None,
                    "date_time": session_obj.date_time if session_obj else None,
                    "room": session_obj.room if session_obj else None
                },
                "module": {
                    "id": module.id if module else None,
                    "name": module.name if module else None,
                    "code": module.code if module else None
                }
            })
        
        # Sort by created_at descending
        justifications_list.sort(key=lambda x: x["created_at"] or datetime.min, reverse=True)
        
        return {
            "success": True,
            "student_id": student_id,
            "total_justifications": len(justifications_list),
            "justifications": justifications_list
        }
