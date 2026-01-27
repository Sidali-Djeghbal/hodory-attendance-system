from pydantic import BaseModel
from typing import Generic, TypeVar, Optional
from datetime import datetime

T = TypeVar('T')

class BaseResponse(BaseModel):
    """Base response schema"""
    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None
    timestamp: datetime = datetime.utcnow()

class PaginatedResponse(BaseResponse, Generic[T]):
    """Paginated response schema"""
    total: int = 0
    page: int = 1
    pages: int = 1
    has_next: bool = False
    has_prev: bool = False