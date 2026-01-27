from sqlmodel import Session, select
from typing import List
from fastapi import HTTPException, status

from ..models.level import Level
from ..models.module import Module
from ..models.student import Student
from ..models.user import User


class LevelController:
    """
    Level Controller - Handles level-related operations
    
    Methods:
        - get_modules_of_level(): Get all modules for a level
        - get_students_of_level(): Get all students in a level
    """
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_modules_of_level(self, level_id: int) -> List[dict]:
        """
        Get all modules associated with a level.
        
        Args:
            level_id: ID of the level
            
        Returns:
            List[dict]: List of modules with their details
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
        
        return [
            {
                "id": module.id,
                "name": module.name,
                "code": module.code,
                "room": module.room,
                "level_id": module.level_id
            }
            for module in modules
        ]
    
    def get_students_of_level(self, level_id: int) -> List[dict]:
        """
        Get all students associated with a level.
        
        Args:
            level_id: ID of the level
            
        Returns:
            List[dict]: List of students with their details
        """
        level = self.session.get(Level, level_id)
        if not level:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Level with ID {level_id} not found"
            )
        
        students = self.session.exec(
            select(Student).where(Student.level_id == level_id)
        ).all()
        
        result = []
        for student in students:
            user = self.session.get(User, student.user_id)
            result.append({
                "id": student.id,
                "user_id": student.user_id,
                "full_name": user.full_name if user else None,
                "email": user.email if user else None,
                "department": user.department if user else None,
                "level_id": student.level_id
            })
        
        return result
    
    def create_level(self, name: str, year_level: str) -> Level:
        """
        Create a new level.
        
        Args:
            name: Level name
            year_level: Year level (e.g., "1st Year", "2nd Year")
            
        Returns:
            Level: The created level
        """
        level = Level(
            name=name,
            year_level=year_level
        )
        self.session.add(level)
        self.session.commit()
        self.session.refresh(level)
        
        return level
    
    def get_all_levels(self) -> List[dict]:
        """
        Get all levels.
        
        Returns:
            List[dict]: List of all levels
        """
        levels = self.session.exec(select(Level)).all()
        
        return [
            {
                "id": level.id,
                "name": level.name,
                "year_level": level.year_level,
                "created_at": level.created_at
            }
            for level in levels
        ]
