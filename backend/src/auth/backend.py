# JWT Authentication backend - simplified version without fastapi_users
from datetime import datetime, timedelta
from typing import Optional
import jwt

from ..core.config import settings

def get_jwt_strategy():
    """Return JWT configuration settings"""
    return {
        "secret": settings.SECRET_KEY,
        "lifetime_seconds": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "algorithm": settings.ALGORITHM
    }

def create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    """Decode a JWT token"""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])