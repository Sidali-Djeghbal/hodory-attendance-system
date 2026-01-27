from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    """Schema for login request"""
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    """Schema for login response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict

class TokenData(BaseModel):
    """Schema for token data"""
    user_id: int
    email: str
    role: str


class PasswordResetRequest(BaseModel):
    """Schema for password reset request"""
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation"""
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    """Schema for changing password"""
    current_password: str
    new_password: str