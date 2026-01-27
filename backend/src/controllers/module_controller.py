from typing import List, Optional, Dict, Any
from sqlmodel import Session, select, and_
from fastapi import HTTPException, status

from ..models.module import Module
from ..models.level import Level
from ..models.teacher import Teacher
from ..models.teacher_modules import TeacherModules
from ..models.enrollement import Enrollment
from ..models.student import Student


class ModuleController:
    """
    Module Controller - Handles module queries and read operations
    
    CRUD operations (create, update, delete) are handled by AdminController
    
    Methods:
        - get_module_teachers(): Get all teachers assigned to a module
        - get_module_students(): Get all students enrolled in a module
        - get_modules_by_level(): Get all modules for a level
        - get_all_modules(): Get all modules
    """
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_module_teachers(self, module_id: int) -> List[Dict[str, Any]]:
        """
        Get all teachers assigned to a module.
        
        Args:
            module_id: ID of the module
            
        Returns:
            List of teachers with info
        """
        module = self.get_module_by_id(module_id)
        
        assignments = self.session.exec(
            select(TeacherModules).where(TeacherModules.module_id == module_id)
        ).all()
        
        teachers = []
        for assignment in assignments:
            teacher = self.session.get(Teacher, assignment.teacher_id)
            if teacher:
                teachers.append({
                    "teacher_id": teacher.id,
                    "teacher_name": f"{teacher.user.first_name} {teacher.user.last_name}" if teacher.user else "Unknown",
                    "assignment_id": assignment.id
                })
        
        return teachers
    
    def get_module_students(
        self, 
        module_id: int, 
        include_excluded: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get all students enrolled in a module.
        
        Args:
            module_id: ID of the module
            include_excluded: Include excluded students
            
        Returns:
            List of students with enrollment info
        """
        module = self.get_module_by_id(module_id)
        
        query = select(Enrollment).where(Enrollment.module_id == module_id)
        
        if not include_excluded:
            query = query.where(Enrollment.is_excluded == False)
        
        enrollments = self.session.exec(query).all()
        
        students = []
        for enrollment in enrollments:
            student = self.session.get(Student, enrollment.student_id)
            if student:
                students.append({
                    "student_id": student.id,
                    "student_name": f"{student.user.first_name} {student.user.last_name}" if student.user else "Unknown",
                    "enrollment_id": enrollment.id,
                    "is_excluded": enrollment.is_excluded
                })
        
        return students
    
    def get_modules_by_level(self, level_id: int) -> List[Module]:
        """
        Get all modules for a level.
        
        Args:
            level_id: ID of the level
            
        Returns:
            List of modules
        """
        level = self.session.get(Level, level_id)
        if not level:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Level with ID {level_id} not found"
            )
        
        modules = self.session.exec(
            select(Module).where(Module.level_id == level_id)
        ).all()
        
        return modules
    
    def get_all_modules(self) -> List[Module]:
        """Get all modules"""
        modules = self.session.exec(select(Module)).all()
        return modules
