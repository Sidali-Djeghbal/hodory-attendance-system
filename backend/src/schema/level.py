from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class LevelBase(BaseModel):
    """Base level schema"""
    name: str
    year_level: str

class LevelCreate(LevelBase):
    """Schema for creating a level"""
    pass

class LevelUpdate(BaseModel):
    """Schema for updating a level"""
    name: Optional[str] = None
    year_level: Optional[str] = None

class LevelResponse(LevelBase):
    """Schema for level response"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    modules: Optional[List[Dict[str, Any]]] = None
    students: Optional[List[Dict[str, Any]]] = None
    teachers: Optional[List[Dict[str, Any]]] = None
    schedule: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(from_attributes=True)