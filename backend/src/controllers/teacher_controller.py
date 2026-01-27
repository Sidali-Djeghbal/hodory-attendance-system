from typing import List, Dict, Any, Optional
from sqlmodel import Session, select
from fastapi import HTTPException, status
from datetime import datetime, timezone, timedelta
from sqlalchemy import func, or_

from ..models.session import Session as ClassSession
from ..models.attendance import AttendanceRecord
from ..models.teacher import Teacher
from ..models.teacher_modules import TeacherModules
from ..models.enrollement import Enrollment
from ..models.module import Module
from ..models.level import Level
from ..models.student import Student
from ..models.user import User
from ..models.justification import Justification
from ..models.enums import AttendanceStatus, JustificationStatus
from .session_controller import SessionController
from .justification_controller import JustificationController


class TeacherController:
    """
    Teacher Controller - Handles teacher operations
    
    Workflow:
        1. Teacher creates session → SessionController generates code
        2. Creates attendance records for ALL enrolled students (status=ABSENT)
        3. Student scans QR or enters code → mark_attendance → status=PRESENT
        4. Teacher closes session → no more attendance marking
    
    Methods:
        - get_teacher_profile(): Get teacher's full profile
        - get_teacher_modules_detailed(): Get modules with enrolled students
        - get_teacher_sessions_detailed(): Get sessions with attendance records
        - get_session_by_code(): Get specific session details
        - create_session(): Create session with attendance records
        - close_session(): Close session
        - get_my_modules(): Get teacher's assigned modules (simple)
        - get_session_info(): Get session info with attendance details
    """
    
    def __init__(self, session: Session):
        self.session = session
        self.session_ctrl = SessionController(session)

    def _coerce_int(self, value: Any) -> int:
        if value is None:
            return 0
        # SQLAlchemy may return a Row/tuple-like object for .one().
        if isinstance(value, tuple):
            value = value[0] if value else 0
        elif hasattr(value, "__getitem__") and not isinstance(value, (str, bytes, int, float)):
            try:
                value = value[0]
            except Exception:
                pass
        if value is None:
            return 0
        return int(value)
    
    def _get_teacher_by_user_id(self, user_id: int) -> Teacher:
        """Get Teacher record by user_id"""
        teacher = self.session.exec(
            select(Teacher).where(Teacher.user_id == user_id)
        ).first()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found"
            )
        return teacher
    
    def _verify_teacher_owns_session(self, session_obj: ClassSession, teacher_id: int) -> bool:
        """Verify teacher owns the session via teacher_module"""
        teacher_module = self.session.get(TeacherModules, session_obj.teacher_module_id)
        if not teacher_module or teacher_module.teacher_id != teacher_id:
            return False
        return True
    
    def _get_student_info(self, student: Student) -> Dict[str, Any]:
        """Get student info with user details"""
        user = self.session.get(User, student.user_id)
        return {
            "student_id": student.id,
            "user_id": student.user_id,
            "full_name": user.full_name if user else "Unknown",
            "email": user.email if user else "N/A",
            "department": user.department if user else None,
            "level_id": student.level_id
        }
    
    def _get_enrollment_info(self, enrollment: Enrollment) -> Dict[str, Any]:
        """Get enrollment info with student details"""
        student_info = None
        if enrollment.student:
            student_info = self._get_student_info(enrollment.student)
        
        return {
            "enrollment_id": enrollment.id,
            "student_id": enrollment.student_id,
            "student_name": enrollment.student_name,
            "student_email": enrollment.student_email,
            "number_of_absences": enrollment.number_of_absences,
            "number_of_absences_justified": enrollment.number_of_absences_justified,
            "is_excluded": enrollment.is_excluded,
            "student": student_info
        }
    
    def _get_justification_info(self, justification_id: Optional[int]) -> Optional[Dict[str, Any]]:
        """Get justification details if exists"""
        if not justification_id:
            return None
        
        justification = self.session.get(Justification, justification_id)
        if not justification:
            return None
        
        return {
            "id": justification.id,
            "comment": justification.comment,
            "file_url": justification.file_url,
            "status": justification.status.value,
            "created_at": justification.created_at
        }
    
    def _get_module_info(self, module: Module) -> Dict[str, Any]:
        """Get module info with level details"""
        level_info = None
        if module.level_id:
            level = self.session.get(Level, module.level_id)
            if level:
                level_info = {
                    "id": level.id,
                    "name": level.name,
                    "year_level": level.year_level
                }
        
        return {
            "module_id": module.id,
            "name": module.name,
            "code": module.code,
            "room": module.room,
            "level_id": module.level_id,
            "level": level_info
        }
    
    def get_teacher_profile(self, user_id: int) -> Dict[str, Any]:
        """
        Get teacher's complete profile including user info and statistics.
        
        Args:
            user_id: The user ID of the teacher
            
        Returns:
            dict: Complete teacher profile with stats
        """
        user = self.session.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        teacher = self._get_teacher_by_user_id(user_id)
        
        # Count modules
        modules_count = len(self.session.exec(
            select(TeacherModules).where(TeacherModules.teacher_id == teacher.id)
        ).all())
        
        # Count sessions
        teacher_modules = self.session.exec(
            select(TeacherModules).where(TeacherModules.teacher_id == teacher.id)
        ).all()
        
        sessions_count = 0
        for tm in teacher_modules:
            sessions_count += len(self.session.exec(
                select(ClassSession).where(ClassSession.teacher_module_id == tm.id)
            ).all())
        
        return {
            "success": True,
            "teacher_id": teacher.id,
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "department": user.department,
            "role": user.role,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "created_at": user.created_at,
            "modules_count": modules_count,
            "sessions_count": sessions_count
        }
    
    def get_teacher_modules_detailed(self, user_id: int) -> Dict[str, Any]:
        """
        Get all modules assigned to teacher with level info and enrolled students.
        
        Args:
            user_id: The user ID of the teacher
            
        Returns:
            dict: Modules with enrolled students and level info
        """
        teacher = self._get_teacher_by_user_id(user_id)
        
        teacher_modules = self.session.exec(
            select(TeacherModules).where(TeacherModules.teacher_id == teacher.id)
        ).all()
        
        modules_list = []
        for tm in teacher_modules:
            module = self.session.get(Module, tm.module_id)
            if not module:
                continue
            
            module_info = self._get_module_info(module)
            
            # Get enrollments for this module
            enrollments = self.session.exec(
                select(Enrollment).where(Enrollment.module_id == module.id)
            ).all()
            
            enrolled_students = [self._get_enrollment_info(e) for e in enrollments]
            
            modules_list.append({
                "teacher_module_id": tm.id,
                "module": module_info,
                "enrolled_students_count": len(enrollments),
                "enrolled_students": enrolled_students
            })
        
        return {
            "success": True,
            "teacher_id": teacher.id,
            "total_modules": len(modules_list),
            "modules": modules_list
        }
    
    def get_teacher_sessions_detailed(self, user_id: int) -> Dict[str, Any]:
        """
        Get all sessions for teacher with module info and attendance records.
        
        Args:
            user_id: The user ID of the teacher
            
        Returns:
            dict: Sessions with attendance records and module info
        """
        return self.get_teacher_sessions(user_id=user_id, include_records=True)

    def get_teacher_sessions(
        self,
        user_id: int,
        include_records: bool = False,
        limit: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get all sessions for teacher.

        When `include_records=False`, this endpoint is optimized for dashboards:
        it returns session/module info + statistics, but does NOT expand attendance records.
        """
        teacher = self._get_teacher_by_user_id(user_id)

        teacher_modules = self.session.exec(
            select(TeacherModules).where(TeacherModules.teacher_id == teacher.id)
        ).all()
        if not teacher_modules:
            return {
                "success": True,
                "teacher_id": teacher.id,
                "total_sessions": 0,
                "active_sessions": 0,
                "sessions": []
            }

        tm_by_id = {tm.id: tm for tm in teacher_modules}
        tm_ids = list(tm_by_id.keys())

        modules = self.session.exec(
            select(Module).where(Module.id.in_([tm.module_id for tm in teacher_modules]))
        ).all()
        module_by_id = {m.id: m for m in modules}

        level_ids = [m.level_id for m in modules if m.level_id]
        levels = (
            self.session.exec(select(Level).where(Level.id.in_(level_ids))).all()
            if level_ids
            else []
        )
        level_by_id = {l.id: l for l in levels}

        sessions_query = (
            select(ClassSession)
            .where(ClassSession.teacher_module_id.in_(tm_ids))
            .order_by(ClassSession.date_time.desc())
        )
        if limit is not None:
            sessions_query = sessions_query.limit(int(limit))
        sessions = self.session.exec(sessions_query).all()

        if not sessions:
            return {
                "success": True,
                "teacher_id": teacher.id,
                "total_sessions": 0,
                "active_sessions": 0,
                "sessions": []
            }

        session_ids = [s.id for s in sessions if s.id is not None]

        stats_rows = self.session.exec(
            select(
                AttendanceRecord.session_id,
                AttendanceRecord.status,
                func.count(AttendanceRecord.id)
            )
            .where(AttendanceRecord.session_id.in_(session_ids))
            .group_by(AttendanceRecord.session_id, AttendanceRecord.status)
        ).all()

        counts_by_session: Dict[int, Dict[AttendanceStatus, int]] = {}
        for session_id, status_value, count_value in stats_rows:
            status_enum = (
                status_value
                if isinstance(status_value, AttendanceStatus)
                else AttendanceStatus(str(status_value))
            )
            counts_by_session.setdefault(int(session_id), {})[status_enum] = int(count_value)

        def build_module_info(module: Module) -> Dict[str, Any]:
            level_info = None
            if module.level_id:
                level = level_by_id.get(module.level_id)
                if level:
                    level_info = {
                        "id": level.id,
                        "name": level.name,
                        "year_level": level.year_level
                    }
            return {
                "module_id": module.id,
                "name": module.name,
                "code": module.code,
                "room": module.room,
                "level_id": module.level_id,
                "level": level_info
            }

        sessions_list: List[Dict[str, Any]] = []
        active_count = 0

        for sess in sessions:
            if sess.is_active:
                active_count += 1

            tm = tm_by_id.get(sess.teacher_module_id)
            module = module_by_id.get(tm.module_id) if tm else None
            if not module:
                continue

            module_info = build_module_info(module)

            counts = counts_by_session.get(int(sess.id), {})
            present = counts.get(AttendanceStatus.PRESENT, 0)
            absent = counts.get(AttendanceStatus.ABSENT, 0)
            excluded = counts.get(AttendanceStatus.EXCLUDED, 0)
            total = present + absent + excluded
            rate = round((present / total * 100), 2) if total > 0 else 0.0

            session_entry: Dict[str, Any] = {
                "session_id": sess.id,
                "session_code": sess.session_code,
                "date_time": sess.date_time,
                "duration_minutes": sess.duration_minutes,
                "room": sess.room,
                "is_active": sess.is_active,
                "module": module_info,
                "statistics": {
                    "total": total,
                    "present": present,
                    "absent": absent,
                    "excluded": excluded,
                    "attendance_rate": rate
                },
                "attendance_records": []
            }

            if include_records:
                records = self.session.exec(
                    select(AttendanceRecord).where(AttendanceRecord.session_id == sess.id)
                ).all()

                attendance_records = []
                for record in records:
                    enrollment = self.session.get(Enrollment, record.enrollement_id)
                    enrollment_info = self._get_enrollment_info(enrollment) if enrollment else None
                    student_info = None
                    if enrollment and enrollment.student:
                        student_info = self._get_student_info(enrollment.student)

                    attendance_records.append({
                        "attendance_id": record.id,
                        "status": record.status.value,
                        "marked_at": record.created_at,
                        "student": student_info,
                        "enrollment": enrollment_info
                    })

                session_entry["attendance_records"] = attendance_records

            sessions_list.append(session_entry)

        return {
            "success": True,
            "teacher_id": teacher.id,
            "total_sessions": len(sessions_list),
            "active_sessions": active_count,
            "sessions": sessions_list
        }

    def get_teacher_overview(self, user_id: int, sessions_limit: int = 50) -> Dict[str, Any]:
        """
        Lightweight dashboard payload.

        - Returns assigned modules
        - Returns a limited list of most-recent sessions (stats only, no attendance records)
        - Returns counts for today/upcoming/excluded/pending
        """
        teacher = self._get_teacher_by_user_id(user_id)

        modules = self.get_my_modules(teacher.id)

        sessions_payload = self.get_teacher_sessions(
            user_id=user_id,
            include_records=False,
            limit=max(1, min(int(sessions_limit), 200))
        )

        teacher_modules = self.session.exec(
            select(TeacherModules).where(TeacherModules.teacher_id == teacher.id)
        ).all()
        tm_ids = [tm.id for tm in teacher_modules]

        total_sessions = 0
        excluded_records = 0
        today_sessions = 0
        next_session = None
        pending_justifications = 0

        if tm_ids:
            total_sessions = self._coerce_int(
                self.session.exec(
                    select(func.count(ClassSession.id)).where(
                        ClassSession.teacher_module_id.in_(tm_ids)
                    )
                ).one()
            )

            excluded_records = self._coerce_int(
                self.session.exec(
                    select(func.count(AttendanceRecord.id))
                    .join(ClassSession, AttendanceRecord.session_id == ClassSession.id)
                    .where(
                        ClassSession.teacher_module_id.in_(tm_ids),
                        AttendanceRecord.status == AttendanceStatus.EXCLUDED
                    )
                ).one()
            )

            # Sessions are stored with naive UTC timestamps (default_factory=datetime.utcnow).
            # Use naive UTC for consistent day boundaries and "upcoming" calculations.
            now = datetime.utcnow()
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)

            today_sessions = self._coerce_int(
                self.session.exec(
                    select(func.count(ClassSession.id)).where(
                        ClassSession.teacher_module_id.in_(tm_ids),
                        ClassSession.date_time >= start,
                        ClassSession.date_time < end
                    )
                ).one()
            )

            upcoming = self.session.exec(
                select(ClassSession)
                .where(
                    ClassSession.teacher_module_id.in_(tm_ids),
                    ClassSession.date_time > now
                )
                .order_by(ClassSession.date_time.asc())
                .limit(1)
            ).first()

            if upcoming:
                module_info = None
                tm = self.session.get(TeacherModules, upcoming.teacher_module_id)
                if tm:
                    module = self.session.get(Module, tm.module_id)
                    if module:
                        module_info = self._get_module_info(module)
                next_session = {
                    "session_id": upcoming.id,
                    "session_code": upcoming.session_code,
                    "date_time": upcoming.date_time,
                    "room": upcoming.room,
                    "is_active": upcoming.is_active,
                    "module": module_info
                }

            pending = self.get_teacher_justifications_count(teacher.id, "pending")
            pending_justifications = int(pending.get("total_justifications") or 0)

        return {
            "success": True,
            "teacher_id": teacher.id,
            "modules": modules,
            "sessions": sessions_payload.get("sessions", []),
            "total_sessions": total_sessions,
            "today_sessions": today_sessions,
            "next_session": next_session,
            "excluded_records": excluded_records,
            "pending_justifications": pending_justifications
        }
    
    def get_session_by_code(self, user_id: int, session_code: str) -> Dict[str, Any]:
        """
        Get session details by session code (verify teacher ownership).
        
        Args:
            user_id: The user ID of the teacher
            session_code: The session code to look up
            
        Returns:
            dict: Session details with attendance records
        """
        teacher = self._get_teacher_by_user_id(user_id)
        
        session_obj = self.session.exec(
            select(ClassSession).where(ClassSession.session_code == session_code)
        ).first()
        
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with code '{session_code}' not found"
            )
        
        # Verify ownership
        if not self._verify_teacher_owns_session(session_obj, teacher.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Get module info
        teacher_module = self.session.get(TeacherModules, session_obj.teacher_module_id)
        module = self.session.get(Module, teacher_module.module_id) if teacher_module else None
        module_info = self._get_module_info(module) if module else None
        
        # Get attendance records
        records = self.session.exec(
            select(AttendanceRecord).where(AttendanceRecord.session_id == session_obj.id)
        ).all()
        
        attendance_records = []
        present = absent = excluded = 0
        
        for record in records:
            enrollment = self.session.get(Enrollment, record.enrollement_id)
            enrollment_info = self._get_enrollment_info(enrollment) if enrollment else None
            student_info = None
            if enrollment and enrollment.student:
                student_info = self._get_student_info(enrollment.student)
            
            if record.status == AttendanceStatus.PRESENT:
                present += 1
            elif record.status == AttendanceStatus.ABSENT:
                absent += 1
            elif record.status == AttendanceStatus.EXCLUDED:
                excluded += 1
            
            # Include justification details for ABSENT records with justification_id
            justification_info = None
            if record.status == AttendanceStatus.ABSENT and record.justification_id:
                justification_info = self._get_justification_info(record.justification_id)
            
            attendance_records.append({
                "attendance_id": record.id,
                "status": record.status.value,
                "marked_at": record.created_at,
                "justification_id": record.justification_id,
                "justification": justification_info,
                "student": student_info,
                "enrollment": enrollment_info
            })
        
        total = len(records)
        rate = round((present / total * 100), 2) if total > 0 else 0.0
        
        return {
            "success": True,
            "session": {
                "session_id": session_obj.id,
                "session_code": session_obj.session_code,
                "date_time": session_obj.date_time,
                "duration_minutes": session_obj.duration_minutes,
                "room": session_obj.room,
                "is_active": session_obj.is_active,
                "module": module_info,
                "statistics": {
                    "total": total,
                    "present": present,
                    "absent": absent,
                    "excluded": excluded,
                    "attendance_rate": rate
                },
                "attendance_records": attendance_records
            }
        }
    
    def get_session_info(self, session_id: int, teacher_id: int) -> Dict[str, Any]:
        """
        Get session info with full attendance details (verify teacher ownership).
        
        Args:
            session_id: ID of the session
            teacher_id: ID of the teacher (from Teacher model)
            
        Returns:
            dict: Session details with attendance records
        """
        session_obj = self.session.get(ClassSession, session_id)
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID {session_id} not found"
            )
        
        # Verify ownership
        if not self._verify_teacher_owns_session(session_obj, teacher_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        # Get module info
        teacher_module = self.session.get(TeacherModules, session_obj.teacher_module_id)
        module = self.session.get(Module, teacher_module.module_id) if teacher_module else None
        module_info = self._get_module_info(module) if module else None
        
        # Get attendance records
        records = self.session.exec(
            select(AttendanceRecord).where(AttendanceRecord.session_id == session_id)
        ).all()
        
        attendance_records = []
        present = absent = excluded = 0
        
        for record in records:
            enrollment = self.session.get(Enrollment, record.enrollement_id)
            enrollment_info = self._get_enrollment_info(enrollment) if enrollment else None
            student_info = None
            if enrollment and enrollment.student:
                student_info = self._get_student_info(enrollment.student)
            
            if record.status == AttendanceStatus.PRESENT:
                present += 1
            elif record.status == AttendanceStatus.ABSENT:
                absent += 1
            elif record.status == AttendanceStatus.EXCLUDED:
                excluded += 1
            
            # Include justification details for ABSENT records with justification_id
            justification_info = None
            if record.status == AttendanceStatus.ABSENT and record.justification_id:
                justification_info = self._get_justification_info(record.justification_id)
            
            attendance_records.append({
                "attendance_id": record.id,
                "status": record.status.value,
                "marked_at": record.created_at,
                "justification_id": record.justification_id,
                "justification": justification_info,
                "student": student_info,
                "enrollment": enrollment_info
            })
        
        total = len(records)
        rate = round((present / total * 100), 2) if total > 0 else 0.0
        
        return {
            "success": True,
            "session": {
                "session_id": session_obj.id,
                "session_code": session_obj.session_code,
                "date_time": session_obj.date_time,
                "duration_minutes": session_obj.duration_minutes,
                "room": session_obj.room,
                "is_active": session_obj.is_active,
                "module": module_info,
                "statistics": {
                    "total": total,
                    "present": present,
                    "absent": absent,
                    "excluded": excluded,
                    "attendance_rate": rate
                },
                "attendance_records": attendance_records
            }
        }
    
    def create_session(
        self,
        teacher_id: int,
        module_id: int,
        duration_minutes: int = 90,
        room: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new session with attendance records.
        
        Workflow:
            1. Verify teacher is assigned to module
            2. Create session with share_code
            3. Create attendance records for ALL enrolled students (ABSENT)
        
        Args:
            teacher_id: ID of the teacher (from Teacher model)
            module_id: ID of the module
            duration_minutes: Session duration (default 90)
            room: Optional room/location
            
        Returns:
            dict: Session info with share code
        """
        # Verify teacher exists
        teacher = self.session.get(Teacher, teacher_id)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {teacher_id} not found"
            )
        
        # Verify module exists
        module = self.session.get(Module, module_id)
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {module_id} not found"
            )
        
        # Verify teacher is assigned to this module
        teacher_module = self.session.exec(
            select(TeacherModules).where(
                TeacherModules.teacher_id == teacher_id,
                TeacherModules.module_id == module_id
            )
        ).first()
        
        if not teacher_module:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher is not assigned to this module"
            )
        
        # Use module room if not provided
        session_room = room if room else module.room
        
        # Generate share code using SessionController
        share_code = self.session_ctrl.generate_share_code()
        
        # Create session
        new_session = ClassSession(
            teacher_module_id=teacher_module.id,
            date_time=datetime.now(timezone.utc),
            duration_minutes=duration_minutes,
            session_code=share_code,
            room=session_room,
            is_active=True
        )
        self.session.add(new_session)
        self.session.commit()
        self.session.refresh(new_session)
        
        # Get all enrollments for this module (not excluded)
        enrollments = self.session.exec(
            select(Enrollment).where(
                Enrollment.module_id == module_id,
                Enrollment.is_excluded == False
            )
        ).all()
        
        # Create attendance records for ALL enrolled students (ABSENT by default)
        attendance_records = []
        for enrollment in enrollments:
            attendance = AttendanceRecord(
                session_id=new_session.id,
                module_id=module_id,
                enrollement_id=enrollment.id,
                status=AttendanceStatus.ABSENT
            )
            self.session.add(attendance)
            self.session.commit()
            self.session.refresh(attendance)
            
            attendance_records.append({
                "attendance_id": attendance.id,
                "student_id": enrollment.student_id,
                "student_name": enrollment.student_name or "Unknown",
                "student_email": enrollment.student_email or "N/A",
                "enrollment_id": enrollment.id,
                "number_of_absences": enrollment.number_of_absences,
                "number_of_absences_justified": enrollment.number_of_absences_justified,
                "is_excluded": enrollment.is_excluded,
                "status": AttendanceStatus.ABSENT.value
            })
        
        return {
            "success": True,
            "message": f"Session created. {len(attendance_records)} attendance records created.",
            "session_id": new_session.id,
            "module_id": module_id,
            "module_name": module.name,
            "teacher_id": teacher_id,
            "share_code": share_code,
            "date_time": new_session.date_time,
            "duration_minutes": duration_minutes,
            "room": session_room,
            "is_active": True,
            "students_enrolled": len(attendance_records),
            "attendance_records": attendance_records
        }
    
    def close_session(self, session_id: int, teacher_id: int) -> Dict[str, Any]:
        """
        Close session (verify teacher ownership first).
        
        Args:
            session_id: ID of the session to close
            teacher_id: ID of the teacher (from Teacher model)
            
        Returns:
            dict: Confirmation of session closure
        """
        session_obj = self.session.get(ClassSession, session_id)
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID {session_id} not found"
            )
        
        # Verify ownership
        if not self._verify_teacher_owns_session(session_obj, teacher_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to close this session"
            )
        
        if not session_obj.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session is already closed"
            )
        
        # Close the session
        session_obj.is_active = False
        self.session.add(session_obj)
        self.session.commit()
        self.session.refresh(session_obj)
        
        return {
            "success": True,
            "message": "Session closed successfully",
            "session_id": session_id,
            "is_active": False,
            "closed_at": datetime.now(timezone.utc)
        }
    
    def get_my_modules(self, teacher_id: int) -> List[Dict[str, Any]]:
        """
        Get all modules assigned to teacher (simple format).
        
        Args:
            teacher_id: ID of the teacher (from Teacher model)
            
        Returns:
            list: List of modules with basic info
        """
        teacher = self.session.get(Teacher, teacher_id)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {teacher_id} not found"
            )
        
        teacher_modules = self.session.exec(
            select(TeacherModules).where(TeacherModules.teacher_id == teacher_id)
        ).all()

        if not teacher_modules:
            return []

        module_ids = [tm.module_id for tm in teacher_modules]
        modules = self.session.exec(select(Module).where(Module.id.in_(module_ids))).all()
        module_by_id = {m.id: m for m in modules}

        enroll_counts_rows = self.session.exec(
            select(Enrollment.module_id, func.count(Enrollment.id))
            .where(
                Enrollment.module_id.in_(module_ids),
                Enrollment.is_excluded == False
            )
            .group_by(Enrollment.module_id)
        ).all()
        enrolled_by_module_id = {int(mid): int(cnt) for mid, cnt in enroll_counts_rows}

        result: List[Dict[str, Any]] = []
        for tm in teacher_modules:
            module = module_by_id.get(tm.module_id)
            if not module:
                continue

            result.append({
                "teacher_module_id": tm.id,
                "module_id": module.id,
                "module_name": module.name,
                "module_code": module.code,
                "module_room": module.room,
                "level_id": module.level_id,
                "enrolled_students": enrolled_by_module_id.get(int(module.id), 0)
            })

        return result
    
    def get_my_sessions(self, teacher_id: int) -> List[Dict[str, Any]]:
        """
        Get all sessions created by teacher (simple format).
        
        Args:
            teacher_id: ID of the teacher (from Teacher model)
            
        Returns:
            list: List of sessions with basic info and stats
        """
        teacher = self.session.get(Teacher, teacher_id)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {teacher_id} not found"
            )
        
        teacher_modules = self.session.exec(
            select(TeacherModules).where(TeacherModules.teacher_id == teacher_id)
        ).all()
        
        sessions = []
        for tm in teacher_modules:
            module = self.session.get(Module, tm.module_id)
            tm_sessions = self.session.exec(
                select(ClassSession)
                .where(ClassSession.teacher_module_id == tm.id)
                .order_by(ClassSession.date_time.desc())
            ).all()
            
            for sess in tm_sessions:
                # Get attendance stats
                records = self.session.exec(
                    select(AttendanceRecord).where(AttendanceRecord.session_id == sess.id)
                ).all()
                present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
                
                sessions.append({
                    "session_id": sess.id,
                    "module_name": module.name if module else "Unknown",
                    "module_code": module.code if module else "N/A",
                    "share_code": sess.session_code,
                    "date_time": sess.date_time,
                    "duration_minutes": sess.duration_minutes,
                    "room": sess.room,
                    "is_active": sess.is_active,
                    "total_students": len(records),
                    "present": present
                })
        
        return sessions
    
    def validate_attendance_records(self, session_id: int, teacher_id: int) -> Dict[str, Any]:
        """
        Get detailed attendance for a session (verify teacher ownership).
        
        Args:
            session_id: ID of the session
            teacher_id: ID of the teacher (from Teacher model)
            
        Returns:
            dict: Session with attendance records
        """
        session_obj = self.session.get(ClassSession, session_id)
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID {session_id} not found"
            )
        
        # Verify ownership
        if not self._verify_teacher_owns_session(session_obj, teacher_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this session"
            )
        
        records = self.session.exec(
            select(AttendanceRecord).where(AttendanceRecord.session_id == session_id)
        ).all()

        if not records:
            return {
                "success": True,
                "session_id": session_id,
                "share_code": session_obj.session_code,
                "room": session_obj.room,
                "is_active": session_obj.is_active,
                "date_time": session_obj.date_time,
                "statistics": {
                    "total": 0,
                    "present": 0,
                    "absent": 0,
                    "excluded": 0,
                    "attendance_rate": 0
                },
                "students": []
            }

        enrollment_ids = list({r.enrollement_id for r in records})
        enrollments = self.session.exec(
            select(Enrollment).where(Enrollment.id.in_(enrollment_ids))
        ).all()
        enrollment_by_id = {e.id: e for e in enrollments if e.id is not None}

        student_ids = list({e.student_id for e in enrollments})
        students = self.session.exec(
            select(Student).where(Student.id.in_(student_ids))
        ).all() if student_ids else []
        student_by_id = {s.id: s for s in students if s.id is not None}

        user_ids = list({s.user_id for s in students})
        users = self.session.exec(
            select(User).where(User.id.in_(user_ids))
        ).all() if user_ids else []
        user_by_id = {u.id: u for u in users if u.id is not None}

        def build_student_info(enrollment: Enrollment) -> Optional[Dict[str, Any]]:
            student = student_by_id.get(enrollment.student_id)
            if not student:
                return None
            user = user_by_id.get(student.user_id)
            return {
                "student_id": student.id,
                "user_id": student.user_id,
                "full_name": user.full_name if user else (enrollment.student_name or "Unknown"),
                "email": user.email if user else (enrollment.student_email or "N/A"),
                "department": user.department if user else None,
                "level_id": student.level_id
            }

        result_students: List[Dict[str, Any]] = []
        present = absent = excluded = 0

        for record in records:
            if record.status == AttendanceStatus.PRESENT:
                present += 1
            elif record.status == AttendanceStatus.ABSENT:
                absent += 1
            elif record.status == AttendanceStatus.EXCLUDED:
                excluded += 1

            enrollment = enrollment_by_id.get(record.enrollement_id)
            enrollment_info = None
            student_info = None

            if enrollment:
                student_info = build_student_info(enrollment)
                enrollment_info = {
                    "enrollment_id": enrollment.id,
                    "student_id": enrollment.student_id,
                    "student_name": enrollment.student_name,
                    "student_email": enrollment.student_email,
                    "number_of_absences": enrollment.number_of_absences,
                    "number_of_absences_justified": enrollment.number_of_absences_justified,
                    "is_excluded": enrollment.is_excluded,
                    "student": student_info
                }

            result_students.append({
                "attendance_id": record.id,
                "status": record.status.value,
                "marked_at": record.created_at,
                "student": student_info,
                "enrollment": enrollment_info
            })

        total = len(records)
        
        return {
            "success": True,
            "session_id": session_id,
            "share_code": session_obj.session_code,
            "room": session_obj.room,
            "is_active": session_obj.is_active,
            "date_time": session_obj.date_time,
            "statistics": {
                "total": total,
                "present": present,
                "absent": absent,
                "excluded": excluded,
                "attendance_rate": round((present / total * 100), 2) if total > 0 else 0
            },
            "students": result_students
        }
    
    def get_teacher_justifications(self, teacher_id: int, status_filter: Optional[str] = None) -> Dict[str, Any]:
        """
        Get all justifications for sessions belonging to the teacher's assigned modules.
        
        Flow:
            Teacher → TeacherModules → Sessions → AttendanceRecords (with justification_id) → Justifications
        
        Args:
            teacher_id: ID of the teacher (from Teacher model)
            status_filter: Optional filter by justification status (pending, approved, rejected)
            
        Returns:
            dict: List of justifications with attendance, student, module, and session info
        """
        teacher = self.session.get(Teacher, teacher_id)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {teacher_id} not found"
            )
        
        # Validate and normalize filter early (so we can push it into the DB query)
        filter_status: Optional[JustificationStatus] = None
        if status_filter:
            try:
                filter_status = JustificationStatus(status_filter.lower())
            except ValueError:
                filter_status = None

        teacher_modules = self.session.exec(
            select(TeacherModules).where(TeacherModules.teacher_id == teacher_id)
        ).all()
        if not teacher_modules:
            return {
                "success": True,
                "teacher_id": teacher_id,
                "total_justifications": 0,
                "justifications": []
            }

        tm_by_id = {tm.id: tm for tm in teacher_modules}
        teacher_module_ids = list(tm_by_id.keys())

        sessions = self.session.exec(
            select(ClassSession).where(ClassSession.teacher_module_id.in_(teacher_module_ids))
        ).all()
        if not sessions:
            return {
                "success": True,
                "teacher_id": teacher_id,
                "total_justifications": 0,
                "justifications": []
            }

        session_by_id = {s.id: s for s in sessions if s.id is not None}
        session_ids = list(session_by_id.keys())

        # Fetch attendance records + justifications in one query and filter by status in SQL.
        # Justification can be linked via AttendanceRecord.justification_id (newer) or
        # via Justification.attendance_record_id (canonical). Support both.
        query = (
            select(AttendanceRecord, Justification)
            .join(
                Justification,
                or_(
                    AttendanceRecord.justification_id == Justification.id,
                    Justification.attendance_record_id == AttendanceRecord.id,
                ),
            )
            .where(AttendanceRecord.session_id.in_(session_ids))
        )
        if filter_status:
            query = query.where(Justification.status == filter_status)

        joined_rows = self.session.exec(query).all()
        if not joined_rows:
            return {
                "success": True,
                "teacher_id": teacher_id,
                "total_justifications": 0,
                "justifications": []
            }

        enrollement_ids = list({record.enrollement_id for record, _ in joined_rows})
        enrollments = (
            self.session.exec(select(Enrollment).where(Enrollment.id.in_(enrollement_ids))).all()
            if enrollement_ids
            else []
        )
        enrollment_by_id = {e.id: e for e in enrollments if e.id is not None}

        student_ids = list({e.student_id for e in enrollments})
        students = (
            self.session.exec(select(Student).where(Student.id.in_(student_ids))).all()
            if student_ids
            else []
        )
        student_by_id = {s.id: s for s in students if s.id is not None}

        user_ids = list({s.user_id for s in students})
        users = (
            self.session.exec(select(User).where(User.id.in_(user_ids))).all()
            if user_ids
            else []
        )
        user_by_id = {u.id: u for u in users if u.id is not None}

        module_ids = list({tm.module_id for tm in teacher_modules})
        modules = (
            self.session.exec(select(Module).where(Module.id.in_(module_ids))).all()
            if module_ids
            else []
        )
        module_by_id = {m.id: m for m in modules if m.id is not None}

        level_ids = list({m.level_id for m in modules if m.level_id})
        levels = (
            self.session.exec(select(Level).where(Level.id.in_(level_ids))).all()
            if level_ids
            else []
        )
        level_by_id = {l.id: l for l in levels if l.id is not None}

        def build_module_info_for_tm(teacher_module_id: int) -> Optional[Dict[str, Any]]:
            tm = tm_by_id.get(teacher_module_id)
            if not tm:
                return None
            module = module_by_id.get(tm.module_id)
            if not module:
                return None
            level_info = None
            if module.level_id:
                level = level_by_id.get(module.level_id)
                if level:
                    level_info = {"id": level.id, "name": level.name, "year_level": level.year_level}
            return {
                "module_id": module.id,
                "name": module.name,
                "code": module.code,
                "room": module.room,
                "level_id": module.level_id,
                "level": level_info
            }

        def build_student_info(enrollment: Enrollment) -> Optional[Dict[str, Any]]:
            student = student_by_id.get(enrollment.student_id)
            if not student:
                return None
            user = user_by_id.get(student.user_id)
            return {
                "student_id": student.id,
                "user_id": student.user_id,
                "full_name": user.full_name if user else (enrollment.student_name or "Unknown"),
                "email": user.email if user else (enrollment.student_email or "N/A"),
                "department": user.department if user else None,
                "level_id": student.level_id
            }

        justifications_list: List[Dict[str, Any]] = []

        for record, justification in joined_rows:
            session_obj = session_by_id.get(record.session_id)
            session_info = None
            module_info = None
            if session_obj:
                session_info = {
                    "session_id": session_obj.id,
                    "session_code": session_obj.session_code,
                    "date_time": session_obj.date_time,
                    "room": session_obj.room,
                    "is_active": session_obj.is_active
                }
                module_info = build_module_info_for_tm(session_obj.teacher_module_id)

            enrollment = enrollment_by_id.get(record.enrollement_id)
            student_info = build_student_info(enrollment) if enrollment else None
            enrollment_info = (
                {
                    "enrollment_id": enrollment.id,
                    "student_id": enrollment.student_id,
                    "student_name": enrollment.student_name,
                    "student_email": enrollment.student_email,
                    "number_of_absences": enrollment.number_of_absences,
                    "number_of_absences_justified": enrollment.number_of_absences_justified,
                    "is_excluded": enrollment.is_excluded,
                    "student": student_info
                }
                if enrollment
                else None
            )

            justifications_list.append({
                "justification_id": justification.id,
                "comment": justification.comment,
                "file_url": justification.file_url,
                "status": justification.status.value,
                "created_at": justification.created_at,
                "attendance_record": {
                    "attendance_id": record.id,
                    "status": record.status.value,
                    "marked_at": record.created_at
                },
                "student": student_info,
                "enrollment": enrollment_info,
                "module": module_info,
                "session": session_info
            })

        justifications_list.sort(key=lambda x: x["created_at"], reverse=True)

        return {
            "success": True,
            "teacher_id": teacher_id,
            "total_justifications": len(justifications_list),
            "justifications": justifications_list
        }

    def get_teacher_justifications_count(
        self,
        teacher_id: int,
        status_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fast count for badge/overview usage.
        """
        teacher = self.session.get(Teacher, teacher_id)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {teacher_id} not found"
            )

        filter_status: Optional[JustificationStatus] = None
        if status_filter:
            try:
                filter_status = JustificationStatus(status_filter.lower())
            except ValueError:
                filter_status = None

        query = (
            select(func.count(Justification.id))
            .select_from(Justification)
            .join(
                AttendanceRecord,
                or_(
                    AttendanceRecord.justification_id == Justification.id,
                    Justification.attendance_record_id == AttendanceRecord.id,
                ),
            )
            .join(ClassSession, AttendanceRecord.session_id == ClassSession.id)
            .join(TeacherModules, ClassSession.teacher_module_id == TeacherModules.id)
            .where(TeacherModules.teacher_id == teacher_id)
        )
        if filter_status:
            query = query.where(Justification.status == filter_status)

        total = int(self.session.exec(query).one() or 0)
        return {
            "success": True,
            "teacher_id": teacher_id,
            "status_filter": status_filter,
            "total_justifications": total
        }
    
    def validate_justification(
        self,
        justification_id: int,
        teacher_id: int,
        decision: str,
        teacher_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate (approve or reject) a justification request.
        
        Ownership check:
            Justification → AttendanceRecord → Session → TeacherModule → teacher_id must match
        
        Args:
            justification_id: ID of the justification to validate
            teacher_id: ID of the teacher (from Teacher model)
            decision: "approve" or "reject"
            teacher_notes: Optional notes from the teacher
            
        Returns:
            dict: Updated justification with related info
        """
        # Validate decision
        decision_lower = decision.lower()
        if decision_lower not in ["approve", "reject"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Decision must be 'approve' or 'reject'"
            )
        
        # Get justification
        justification = self.session.get(Justification, justification_id)
        if not justification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Justification with ID {justification_id} not found"
            )
        
        # Check if already processed
        if justification.status != JustificationStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Justification has already been {justification.status.value}"
            )
        
        # Get attendance record
        attendance_record = self.session.get(AttendanceRecord, justification.attendance_record_id)
        if not attendance_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found for this justification"
            )
        
        # Get session
        session_obj = self.session.get(ClassSession, attendance_record.session_id)
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found for this attendance record"
            )
        
        # Verify teacher ownership
        if not self._verify_teacher_owns_session(session_obj, teacher_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to validate this justification"
            )
        
        # Use JustificationController to process the decision
        justification_ctrl = JustificationController(self.session)
        
        if decision_lower == "approve":
            updated_justification = justification_ctrl.approve(justification_id)
            # Update attendance record status to JUSTIFIED (if not already handled)
            # Note: We mark as PRESENT since the absence is now justified
            attendance_record.status = AttendanceStatus.PRESENT
            self.session.add(attendance_record)
            self.session.commit()
            self.session.refresh(attendance_record)
        else:
            updated_justification = justification_ctrl.reject(justification_id)
        
        # Get related info for response
        enrollment = self.session.get(Enrollment, attendance_record.enrollement_id)
        student_info = None
        if enrollment and enrollment.student:
            student_info = self._get_student_info(enrollment.student)
        
        # Get module info
        teacher_module = self.session.get(TeacherModules, session_obj.teacher_module_id)
        module = self.session.get(Module, teacher_module.module_id) if teacher_module else None
        module_info = self._get_module_info(module) if module else None
        
        return {
            "success": True,
            "message": f"Justification has been {decision_lower}d successfully",
            "justification": {
                "id": updated_justification.id,
                "comment": updated_justification.comment,
                "file_url": updated_justification.file_url,
                "status": updated_justification.status.value,
                "created_at": updated_justification.created_at,
                "teacher_notes": teacher_notes
            },
            "attendance_record": {
                "attendance_id": attendance_record.id,
                "status": attendance_record.status.value,
                "marked_at": attendance_record.created_at
            },
            "student": student_info,
            "module": module_info,
            "session": {
                "session_id": session_obj.id,
                "session_code": session_obj.session_code,
                "date_time": session_obj.date_time,
                "room": session_obj.room
            }
        }

    def restore_justification(
        self,
        justification_id: int,
        teacher_id: int,
    ) -> Dict[str, Any]:
        """
        Restore a mistakenly rejected justification back to PENDING.

        Allowed transitions:
            REJECTED -> PENDING
        """
        teacher = self.session.get(Teacher, teacher_id)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {teacher_id} not found"
            )

        justification = self.session.get(Justification, justification_id)
        if not justification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Justification with ID {justification_id} not found"
            )

        if justification.status != JustificationStatus.REJECTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only rejected justifications can be restored"
            )

        attendance_record = self.session.get(AttendanceRecord, justification.attendance_record_id)
        if not attendance_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found for this justification"
            )

        session_obj = self.session.get(ClassSession, attendance_record.session_id)
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found for this attendance record"
            )

        if not self._verify_teacher_owns_session(session_obj, teacher_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to restore this justification"
            )

        justification.status = JustificationStatus.PENDING
        self.session.add(justification)

        # Defensive: restored justifications should correspond to an absence.
        if attendance_record.status != AttendanceStatus.ABSENT:
            attendance_record.status = AttendanceStatus.ABSENT
            self.session.add(attendance_record)

        self.session.commit()
        self.session.refresh(justification)

        return {
            "success": True,
            "message": "Justification restored to pending",
            "justification_id": justification.id,
            "status": justification.status.value,
            "attendance_record_id": attendance_record.id,
        }
    
    def get_module_with_sessions(self, teacher_id: int, module_id: int) -> Dict[str, Any]:
        """
        Get a specific module with all its sessions and full attendance details.
        
        Verifies that the module belongs to the teacher.
        Each session includes attendance records similar to get_session_by_code response.
        
        Args:
            teacher_id: ID of the teacher (from Teacher model)
            module_id: ID of the module to retrieve
            
        Returns:
            dict: Module info with all sessions and their attendance records
        """
        teacher = self.session.get(Teacher, teacher_id)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {teacher_id} not found"
            )
        
        # Get module
        module = self.session.get(Module, module_id)
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {module_id} not found"
            )
        
        # Verify teacher is assigned to this module
        teacher_module = self.session.exec(
            select(TeacherModules).where(
                TeacherModules.teacher_id == teacher_id,
                TeacherModules.module_id == module_id
            )
        ).first()
        
        if not teacher_module:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this module"
            )
        
        # Get module info
        module_info = self._get_module_info(module)
        
        # Get enrollments for this module
        enrollments = self.session.exec(
            select(Enrollment).where(Enrollment.module_id == module_id)
        ).all()
        enrolled_students = [self._get_enrollment_info(e) for e in enrollments]
        
        # Get all sessions for this module (via teacher_module)
        sessions = self.session.exec(
            select(ClassSession)
            .where(ClassSession.teacher_module_id == teacher_module.id)
            .order_by(ClassSession.date_time.desc())
        ).all()
        
        sessions_list = []
        active_count = 0
        
        for session_obj in sessions:
            if session_obj.is_active:
                active_count += 1
            
            # Get attendance records for this session
            records = self.session.exec(
                select(AttendanceRecord).where(AttendanceRecord.session_id == session_obj.id)
            ).all()
            
            attendance_records = []
            present = absent = excluded = 0
            
            for record in records:
                enrollment = self.session.get(Enrollment, record.enrollement_id)
                enrollment_info = self._get_enrollment_info(enrollment) if enrollment else None
                student_info = None
                if enrollment and enrollment.student:
                    student_info = self._get_student_info(enrollment.student)
                
                if record.status == AttendanceStatus.PRESENT:
                    present += 1
                elif record.status == AttendanceStatus.ABSENT:
                    absent += 1
                elif record.status == AttendanceStatus.EXCLUDED:
                    excluded += 1
                
                # Include justification details for ABSENT records
                justification_info = None
                if record.status == AttendanceStatus.ABSENT and record.justification_id:
                    justification_info = self._get_justification_info(record.justification_id)
                
                attendance_records.append({
                    "attendance_id": record.id,
                    "status": record.status.value,
                    "marked_at": record.created_at,
                    "justification_id": record.justification_id,
                    "justification": justification_info,
                    "student": student_info,
                    "enrollment": enrollment_info
                })
            
            total = len(records)
            rate = round((present / total * 100), 2) if total > 0 else 0.0
            
            sessions_list.append({
                "session_id": session_obj.id,
                "session_code": session_obj.session_code,
                "date_time": session_obj.date_time,
                "duration_minutes": session_obj.duration_minutes,
                "room": session_obj.room,
                "is_active": session_obj.is_active,
                "statistics": {
                    "total": total,
                    "present": present,
                    "absent": absent,
                    "excluded": excluded,
                    "attendance_rate": rate
                },
                "attendance_records": attendance_records
            })
        
        return {
            "success": True,
            "teacher_id": teacher_id,
            "teacher_module_id": teacher_module.id,
            "module": module_info,
            "enrolled_students_count": len(enrollments),
            "enrolled_students": enrolled_students,
            "total_sessions": len(sessions_list),
            "active_sessions": active_count,
            "sessions": sessions_list
        }
