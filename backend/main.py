import os
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uuid

import models
import schemas
from database import engine, get_db
from utils import extract_text_from_pdf
from ai_service import generate_tailored_resume
from fastapi.responses import StreamingResponse
from formatters import generate_pdf_from_markdown, generate_docx_from_markdown

# Create all tables in the database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Resumizer API")

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = "temp_resumes"
os.makedirs(TEMP_DIR, exist_ok=True)


@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Very simple mock, no real hashing
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Using fixed user logic for simplicity in local environments
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=user.password # no real hashing for this prototype
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/api/resumes/upload", response_model=schemas.ResumeContextResponse)
async def upload_resume(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Uploads a PDF resume, parses its text, and stores the context."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    temp_file_path = f"{TEMP_DIR}/{uuid.uuid4()}_{file.filename}"
    with open(temp_file_path, "wb") as buffer:
        buffer.write(await file.read())
        
    extracted_text = extract_text_from_pdf(temp_file_path)
    if not extracted_text:
        raise HTTPException(status_code=400, detail="Could not extract text from document.")
        
    # Save the base context
    resume_context = models.ResumeContext(
        user_id=user_id,
        filename=file.filename,
        extracted_text=extracted_text
    )
    db.add(resume_context)
    db.commit()
    db.refresh(resume_context)
    
    # Optionally delete temp pdf file
    # os.remove(temp_file_path)
    
    return resume_context


@app.get("/api/resumes", response_model=schemas.ResumeListResponse)
def get_resumes(user_id: int, q: str = None, db: Session = Depends(get_db)):
    """Lists all base contexts and generated resumes, with optional search."""
    from sqlalchemy import or_
    
    db_contexts = db.query(models.ResumeContext).filter(models.ResumeContext.user_id == user_id).all()
    if not db_contexts:
        return {"resumes": [], "generated": []}
        
    ctx_ids = [c.id for c in db_contexts]
    
    if q:
        q_filter = f"%{q}%"
        contexts = db.query(models.ResumeContext).filter(
            models.ResumeContext.user_id == user_id,
            or_(
                models.ResumeContext.filename.ilike(q_filter),
                models.ResumeContext.extracted_text.ilike(q_filter)
            )
        ).all()
        
        generated = db.query(models.GeneratedResume).filter(
            models.GeneratedResume.base_context_id.in_(ctx_ids),
            or_(
                models.GeneratedResume.title.ilike(q_filter),
                models.GeneratedResume.generated_markdown.ilike(q_filter),
                models.GeneratedResume.job_description.ilike(q_filter)
            )
        ).all()
    else:
        contexts = db_contexts
        generated = db.query(models.GeneratedResume).filter(
            models.GeneratedResume.base_context_id.in_(ctx_ids)
        ).all()
        
    return {"resumes": contexts, "generated": generated}


def _generate_task(gen_id: int, base_text: str, jd: str, instructions: str, template_type: str, db_session: Session):
    """Background task to call LLM and update generated resume status."""
    result = generate_tailored_resume(base_text, jd, instructions, template_type)
    
    resume = db_session.query(models.GeneratedResume).filter(models.GeneratedResume.id == gen_id).first()
    if resume:
        if result == "Error generating resume.":
            resume.generated_markdown = result
            resume.status = "failed"
        else:
            import re
            
            title = resume.title  # Fallback to requested title
            markdown_content = result
            
            # Extract TITLE
            title_match = re.search(r"TITLE:\s*(.+)", result, re.IGNORECASE)
            if title_match:
                title = title_match.group(1).strip()
                
            # Split by ---
            parts = re.split(r"^---+\s*$", result, maxsplit=1, flags=re.MULTILINE)
            if len(parts) > 1:
                markdown_content = parts[1].strip()
            else:
                # If separator not found, just remove the title line
                markdown_content = re.sub(r"TITLE:\s*.+", "", result, flags=re.IGNORECASE).strip()
            
            resume.title = title
            resume.generated_markdown = markdown_content
            resume.status = "completed"
            
        db_session.commit()
    db_session.close()

@app.post("/api/resumes/generate", response_model=schemas.GeneratedResumeResponse)
def generate_resume(
    request: schemas.GeneratedResumeCreate, 
    base_context_id: int, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    """Initiates an asynchronous resume generation based on JD."""
    ctx = db.query(models.ResumeContext).filter(models.ResumeContext.id == base_context_id).first()
    if not ctx:
        raise HTTPException(status_code=404, detail="Base resume context not found")
        
    new_gen = models.GeneratedResume(
        base_context_id=base_context_id,
        job_description=request.job_description,
        custom_instructions=request.custom_instructions or "",
        title=request.title,
        template_type=request.template_type,
        status="generating"
    )
    db.add(new_gen)
    db.commit()
    db.refresh(new_gen)
    
    # Use a fresh session for the background task
    bg_db = next(get_db())
    background_tasks.add_task(
        _generate_task, 
        new_gen.id, 
        ctx.extracted_text, 
        request.job_description, 
        request.custom_instructions or "", 
        request.template_type,
        bg_db
    )

    return new_gen


@app.delete("/api/resumes/generated/{generated_id}")
def delete_generated_resume(generated_id: int, db: Session = Depends(get_db)):
    """Deletes a generated resume."""
    resume = db.query(models.GeneratedResume).filter(models.GeneratedResume.id == generated_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    db.delete(resume)
    db.commit()
    return {"message": "Resume deleted successfully"}


@app.get("/api/resumes/base/{base_id}/download")
def download_base_resume(base_id: int, db: Session = Depends(get_db)):
    """Downloads a base resume's extracted text."""
    resume = db.query(models.ResumeContext).filter(models.ResumeContext.id == base_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Base resume not found")
        
    return StreamingResponse(
        iter([resume.extracted_text]), 
        media_type="text/plain", 
        headers={"Content-Disposition": f"attachment; filename={resume.filename}_extracted.txt"}
    )


@app.get("/api/resumes/{generated_id}/download")
def download_resume(generated_id: int, format: str = "pdf", db: Session = Depends(get_db)):
    """Downloads a generated resume in the requested format (pdf, docx, md)."""
    resume = db.query(models.GeneratedResume).filter(models.GeneratedResume.id == generated_id).first()
    
    if not resume or not resume.generated_markdown:
        raise HTTPException(status_code=404, detail="Resume not found or not yet generated")
        
    content = resume.generated_markdown
    
    if format == "md":
        return StreamingResponse(
            iter([content]), 
            media_type="text/markdown", 
            headers={"Content-Disposition": f"attachment; filename={resume.title}.md"}
        )
    elif format == "pdf":
        buffer = generate_pdf_from_markdown(content, getattr(resume, "template_type", "standard"))
        return StreamingResponse(
            buffer, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"attachment; filename={resume.title}.pdf"}
        )
    elif format == "docx":
        buffer = generate_docx_from_markdown(content)
        return StreamingResponse(
            buffer, 
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
            headers={"Content-Disposition": f"attachment; filename={resume.title}.docx"}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format requested. Try 'pdf', 'docx', or 'md'.")
