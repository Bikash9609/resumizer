from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class ResumeContextBase(BaseModel):
    filename: str

class ResumeContextResponse(ResumeContextBase):
    id: int
    user_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class GeneratedResumeCreate(BaseModel):
    job_description: str
    custom_instructions: Optional[str] = None
    title: str
    template_type: str = "standard"

class GeneratedResumeResponse(GeneratedResumeCreate):
    id: int
    base_context_id: int
    generated_markdown: Optional[str] = None
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    class Config:
        from_attributes = True

class ResumeListResponse(BaseModel):
    resumes: List[ResumeContextResponse]
    generated: List[GeneratedResumeResponse]
