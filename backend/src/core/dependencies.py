from typing import Optional, Type, Union
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from pydantic import BaseModel
from jose import JWTError, jwt

from .config import settings
from .database import get_session
from ..models.user import User
from ..models.student import Student
from ..models.teacher import Teacher
from ..models.admin import Admin
from ..schema.auth import TokenData

# Security
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_session)
) -> User:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.get(User, user_id)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return user

async def get_current_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
) -> dict:
    """Get current user with their role-specific profile"""
    profile = None
    
    if current_user.role == "student":
        profile = db.exec(
            select(Student).where(Student.user_id == current_user.id)
        ).first()
    elif current_user.role == "teacher":
        profile = db.exec(
            select(Teacher).where(Teacher.user_id == current_user.id)
        ).first()
    elif current_user.role == "admin":
        profile = db.exec(
            select(Admin).where(Admin.user_id == current_user.id)
        ).first()
    
    return {
        "user": current_user,
        "profile": profile,
        "role": current_user.role
    }

async def get_current_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
) -> Admin:
    """Get current admin user"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    admin = db.exec(
        select(Admin).where(Admin.user_id == current_user.id)
    ).first()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin profile not found"
        )
    
    return admin

async def get_current_teacher(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
) -> Teacher:
    """Get current teacher user"""
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher access required"
        )
    
    teacher = db.exec(
        select(Teacher).where(Teacher.user_id == current_user.id)
    ).first()
    
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher profile not found"
        )
    
    return teacher

async def get_current_student(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
) -> Student:
    """Get current student user"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required"
        )
    
    student = db.exec(
        select(Student).where(Student.user_id == current_user.id)
    ).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found"
        )
    
    return student

async def get_user_with_complete_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session)
) -> dict:
    """Get user with complete profile information"""
    profile_data = await get_current_profile(current_user, db)
    return profile_data