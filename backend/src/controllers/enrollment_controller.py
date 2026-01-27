from typing import List, Optional, Dict, Any
from sqlmodel import Session, select, and_
from fastapi import HTTPException, status
from datetime import datetime

from ..models.enrollement import Enrollment
from ..models.student import Student
from ..models.module import Module
from ..models.attendance import AttendanceRecord
from ..models.enums import AttendanceStatus


class EnrollmentController:
    """
    Enrollment Controller - Handles enrollment-related operations
    
    Methods:
        - make_excluded_from_module(): Exclude a student from a module
        - enroll_student(): Enroll a student in a module
        - get_enrollment_details(): Get enrollment details
    """
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_enrollment_by_id(self, enrollment_id: int) -> Enrollment:
        """Get enrollment by ID"""
        enrollment = self.session.get(Enrollment, enrollment_id)
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Enrollment with ID {enrollment_id} not found"
            )
        return enrollment
    
    def make_excluded_from_module(
        self, 
        enrollment_id: int, 
    ) -> Enrollment:
        """
        Exclude a student from a module.
        Updates all future attendance records to EXCLUDED status.
        
        Args:
            enrollment_id: ID of the enrollment
            reason: Optional reason for exclusion
            
        Returns:
            Enrollment: Updated enrollment
        """
        enrollment = self.get_enrollment_by_id(enrollment_id)
        
        if enrollment.is_excluded:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student is already excluded from this module"
            )
        
        # Mark as excluded
        enrollment.is_excluded = True
        self.session.add(enrollment)
        
        # Update all ABSENT attendance records to EXCLUDED
        attendance_records = self.session.exec(
            select(AttendanceRecord).where(
                AttendanceRecord.enrollement_id == enrollment_id,
                AttendanceRecord.status == AttendanceStatus.ABSENT
            )
        ).all()
        
        for record in attendance_records:
            record.status = AttendanceStatus.EXCLUDED
            self.session.add(record)
        
        self.session.commit()
        self.session.refresh(enrollment)
        
        return enrollment
    
    def reinstate_student(self, enrollment_id: int) -> Enrollment:
        """
        Reinstate a previously excluded student.
        
        Args:
            enrollment_id: ID of the enrollment
            
        Returns:
            Enrollment: Updated enrollment
        """
        enrollment = self.get_enrollment_by_id(enrollment_id)
        
        if not enrollment.is_excluded:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student is not excluded from this module"
            )
        
        enrollment.is_excluded = False
        self.session.add(enrollment)
        self.session.commit()
        self.session.refresh(enrollment)
        
        return enrollment
    
    def enroll_student(
        self, 
        student_id: int, 
        module_id: int
    ) -> Enrollment:
        """
        Enroll a student in a module.
        
        Args:
            student_id: ID of the student
            module_id: ID of the module
            
        Returns:
            Enrollment: Created enrollment
        """
        # Verify student exists
        student = self.session.get(Student, student_id)
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with ID {student_id} not found"
            )
        
        # Verify module exists
        module = self.session.get(Module, module_id)
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {module_id} not found"
            )
        
        # Check if already enrolled
        existing = self.session.exec(
            select(Enrollment).where(
                Enrollment.student_id == student_id,
                Enrollment.module_id == module_id
            )
        ).first()
        
        if existing:
            if existing.is_excluded:
                # Reinstate
                existing.is_excluded = False
                self.session.add(existing)
                self.session.commit()
                self.session.refresh(existing)
                return existing
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Student is already enrolled in this module"
                )
        
        # Create enrollment
        enrollment = Enrollment(
            student_id=student_id,
            module_id=module_id,
            is_excluded=False
        )
        
        self.session.add(enrollment)
        self.session.commit()
        self.session.refresh(enrollment)
        
        return enrollment
    
    def unenroll_student(
        self, 
        student_id: int, 
        module_id: int
    ) -> Dict[str, Any]:
        """
        Remove a student's enrollment from a module.
        
        Args:
            student_id: ID of the student
            module_id: ID of the module
            
        Returns:
            dict: Success message
        """
        enrollment = self.session.exec(
            select(Enrollment).where(
                Enrollment.student_id == student_id,
                Enrollment.module_id == module_id
            )
        ).first()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Enrollment not found"
            )
        
        # Delete associated attendance records
        attendance_records = self.session.exec(
            select(AttendanceRecord).where(
                AttendanceRecord.enrollement_id == enrollment.id
            )
        ).all()
        
        for record in attendance_records:
            self.session.delete(record)
        
        self.session.delete(enrollment)
        self.session.commit()
        
        return {"message": "Student unenrolled successfully"}
    
    def get_module_enrollments(
        self, 
        module_id: int, 
        include_excluded: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get all enrollments for a module.
        
        Args:
            module_id: ID of the module
            include_excluded: Include excluded students
            
        Returns:
            List of enrollments with student info
        """
        module = self.session.get(Module, module_id)
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {module_id} not found"
            )
        
        query = select(Enrollment).where(Enrollment.module_id == module_id)
        
        if not include_excluded:
            query = query.where(Enrollment.is_excluded == False)
        
        enrollments = self.session.exec(query).all()
        
        results = []
        for enrollment in enrollments:
            student = self.session.get(Student, enrollment.student_id)
            results.append({
                "enrollment_id": enrollment.id,
                "student_id": enrollment.student_id,
                "student_name": f"{student.user.first_name} {student.user.last_name}" if student and student.user else "Unknown",
                "is_excluded": enrollment.is_excluded
            })
        
        return results
    
    def get_student_enrollments(
        self, 
        student_id: int
    ) -> List[Dict[str, Any]]:
        """
        Get all enrollments for a student.
        
        Args:
            student_id: ID of the student
            
        Returns:
            List of enrollments with module info
        """
        student = self.session.get(Student, student_id)
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with ID {student_id} not found"
            )
        
        enrollments = self.session.exec(
            select(Enrollment).where(Enrollment.student_id == student_id)
        ).all()
        
        results = []
        for enrollment in enrollments:
            module = self.session.get(Module, enrollment.module_id)
            results.append({
                "enrollment_id": enrollment.id,
                "module_id": enrollment.module_id,
                "module_name": module.name if module else "Unknown",
                "is_excluded": enrollment.is_excluded
            })
        
        return results
    
    def bulk_enroll_students(
        self, 
        student_ids: List[int], 
        module_id: int
    ) -> Dict[str, Any]:
        """
        Bulk enroll multiple students in a module.
        
        Args:
            student_ids: List of student IDs
            module_id: ID of the module
            
        Returns:
            dict: Summary of enrollments
        """
        # Verify module exists
        module = self.session.get(Module, module_id)
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {module_id} not found"
            )
        
        success = []
        failed = []
        
        for student_id in student_ids:
            try:
                enrollment = self.enroll_student(student_id, module_id)
                success.append(student_id)
            except HTTPException as e:
                failed.append({
                    "student_id": student_id,
                    "reason": str(e.detail)
                })
        
        return {
            "module_id": module_id,
            "successful_enrollments": len(success),
            "failed_enrollments": len(failed),
            "enrolled_students": success,
            "failures": failed
        }
