from typing import Optional, Dict, Any
from uuid import UUID
import uuid

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, UUIDIDMixin, exceptions, models, schemas
from sqlmodel import Session, select

from ..core.database import get_session
from ..models.user import User
from ..core.config import settings

class UserManager(UUIDIDMixin, BaseUserManager[User, str]):
    reset_password_token_secret = settings.SECRET_KEY
    verification_token_secret = settings.SECRET_KEY
    
    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")
    
    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"User {user.id} has forgot their password. Reset token: {token}")
    
    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"Verification requested for user {user.id}. Verification token: {token}")
    
    async def create(
        self,
        user_create: schemas.UC,
        safe: bool = False,
        request: Optional[Request] = None,
    ) -> models.UP:
        """
        Create a user in database and create the role-specific profile.
        """
        # Get database session
        db = next(get_session())
        
        await self.validate_password(user_create.password, user_create)
        
        existing_user = await self.get_by_email(user_create.email)
        if existing_user is not None:
            raise exceptions.UserAlreadyExists()
        
        user_dict = (
            user_create.create_update_dict()
            if safe
            else user_create.create_update_dict_superuser()
        )
        password = user_dict.pop("password")
        user_dict["hashed_password"] = self.password_helper.hash(password)
        
        # Create the user
        user = User(**user_dict)
        
        # Save user to database
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create role-specific profile if role is specified
        if user.role == "student":
            from models.student import Student
            student = Student(user_id=user.id)
            db.add(student)
        elif user.role == "teacher":
            from models.teacher import Teacher
            teacher = Teacher(user_id=user.id)
            db.add(teacher)
        elif user.role == "admin":
            from models.admin import Admin
            admin = Admin(user_id=user.id)
            db.add(admin)
        
        db.commit()
        
        await self.on_after_register(user, request)
        
        return user
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        db = next(get_session())
        statement = select(User).where(User.email == email)
        result = db.exec(statement)
        return result.first()

async def get_user_manager(session: Session = Depends(get_session)):
    yield UserManager(session)