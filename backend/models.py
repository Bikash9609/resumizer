from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    resumes = relationship("ResumeContext", back_populates="user")

class ResumeContext(Base):
    __tablename__ = "resume_contexts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String)
    extracted_text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="resumes")
    generated_resumes = relationship("GeneratedResume", back_populates="base_context")

class GeneratedResume(Base):
    __tablename__ = "generated_resumes"

    id = Column(Integer, primary_key=True, index=True)
    base_context_id = Column(Integer, ForeignKey("resume_contexts.id"))
    job_description = Column(Text)
    custom_instructions = Column(String, nullable=True)
    title = Column(String)
    template_type = Column(String, default="standard")
    
    # Store standard markdown directly
    generated_markdown = Column(Text, nullable=True)
    
    status = Column(String, default="generating")  # generating, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    base_context = relationship("ResumeContext", back_populates="generated_resumes")
    versions = relationship("ResumeVersion", back_populates="generated_resume", cascade="all, delete-orphan")

class ResumeVersion(Base):
    __tablename__ = "resume_versions"

    id = Column(Integer, primary_key=True, index=True)
    generated_resume_id = Column(Integer, ForeignKey("generated_resumes.id"))
    markdown_content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    generated_resume = relationship("GeneratedResume", back_populates="versions")
