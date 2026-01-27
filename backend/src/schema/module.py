from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ModuleBase(BaseModel):
    """Base module schema"""
    module_name: str
    module_code: str
    description: Optional[str] = None
    credits: Optional[int] = None

class ModuleCreate(ModuleBase):
    """Schema for creating a module"""
    level_id: Optional[int] = None

class ModuleUpdate(BaseModel):
    """Schema for updating a module"""
    module_name: Optional[str] = None
    module_code: Optional[str] = None
    description: Optional[str] = None
    credits: Optional[int] = None
    level_id: Optional[int] = None

class ModuleResponse(ModuleBase):
    """Schema for module response"""
    id: int
    level_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    level: Optional[Dict[str, Any]] = None
    teachers: Optional[List[Dict[str, Any]]] = None
    sessions: Optional[List[Dict[str, Any]]] = None
    
    model_config = ConfigDict(from_attributes=True)