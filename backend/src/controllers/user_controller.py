from sqlmodel import Session, select
from typing import Optional, Union
from fastapi import HTTPException, status

from ..models.user import User
from ..models.student import Student
from ..models.teacher import Teacher
from ..models.admin import Admin


class UserController:
    """
    User Controller - Handles user authentication status and profile management
    
    Methods:
        - is_logged_in(): Check if user is active (logged in)
        - logout(): Allow user to exit the system
        - view_profile(): Display user profile based on role (student/teacher/admin)
    """
    
    def __init__(self, session: Session):
        self.session = session
    
    def is_logged_in(self, user_id: int) -> bool:
        """
        Check if the user is active (logged in) or not.
        
        Args:
            user_id: The ID of the user to check
            
        Returns:
            bool: True if user is active, False otherwise
        """
        user = self.session.get(User, user_id)
        if not user:
            return False
        return user.is_active
    
    def logout(self, user_id: int) -> dict:
        """
        Allow the user to exit the system by setting is_active to False.
        
        Args:
            user_id: The ID of the user to logout
            
        Returns:
            dict: Success message
        """
        user = self.session.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.is_active = False
        self.session.add(user)
        self.session.commit()
        
        return {"message": "User logged out successfully"}
    
    def view_profile(self, user_id: int) -> dict:
        """
        Display the user's profile according to their role.
        Only works if the user is logged in.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            dict: User profile with role-specific information
        """
        user = self.session.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User is not logged in"
            )
        
        # Base profile info
        profile = {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "department": user.department,
            "role": user.role,
            "is_verified": user.is_verified,
            "created_at": user.created_at
        }
        
        # Add role-specific information
        if user.role == "student":
            student = self.session.exec(
                select(Student).where(Student.user_id == user_id)
            ).first()
            if student:
                profile["student_id"] = student.id
                profile["level_id"] = student.level_id
                
        elif user.role == "teacher":
            teacher = self.session.exec(
                select(Teacher).where(Teacher.user_id == user_id)
            ).first()
            if teacher:
                profile["teacher_id"] = teacher.id
                
        elif user.role == "admin":
            admin = self.session.exec(
                select(Admin).where(Admin.user_id == user_id)
            ).first()
            if admin:
                profile["admin_id"] = admin.id
                profile["is_superuser"] = user.is_superuser
        
        return profile
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email address.
        
        Args:
            email: The email address to search for
            
        Returns:
            User or None
        """
        return self.session.exec(
            select(User).where(User.email == email)
        ).first()
    
    def get_user_role_profile(self, user_id: int) -> Optional[Union[Student, Teacher, Admin]]:
        """
        Get the role-specific profile for a user.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            Student, Teacher, or Admin profile
        """
        user = self.session.get(User, user_id)
        if not user:
            return None
        
        if user.role == "student":
            return self.session.exec(
                select(Student).where(Student.user_id == user_id)
            ).first()
        elif user.role == "teacher":
            return self.session.exec(
                select(Teacher).where(Teacher.user_id == user_id)
            ).first()
        elif user.role == "admin":
            return self.session.exec(
                select(Admin).where(Admin.user_id == user_id)
            ).first()
        
        return None
