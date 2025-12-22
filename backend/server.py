from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends, Response, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from io import BytesIO
import aiofiles
import base64

# Document processing
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from PyPDF2 import PdfReader

# AI Integration
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'default-secret-key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION = int(os.environ.get('JWT_EXPIRATION_HOURS', '24'))

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI(title="AI Resume Tailor API")
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    primary_technology: str
    sub_technologies: List[str] = []
    phone: Optional[str] = None
    location: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    primary_technology: str
    sub_technologies: List[str]
    phone: Optional[str]
    location: Optional[str]
    role: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ResumeCreate(BaseModel):
    original_content: str
    file_name: str

class ResumeUpdate(BaseModel):
    tailored_content: Optional[str] = None
    target_job_title: Optional[str] = None
    target_job_description: Optional[str] = None

class JobPortalCreate(BaseModel):
    name: str
    url: str
    technology: str
    description: Optional[str] = None

class JobApplicationCreate(BaseModel):
    job_portal_id: str
    job_title: str
    job_description: str
    company_name: str
    resume_id: str
    cover_letter: Optional[str] = None

class EmailCreate(BaseModel):
    application_id: str
    subject: str
    content: str
    email_type: str  # sent, received, scheduled

class TailorResumeRequest(BaseModel):
    resume_id: str
    job_title: str
    job_description: str
    technologies: List[str]

class GenerateCoverLetterRequest(BaseModel):
    resume_id: str
    job_title: str
    company_name: str
    job_description: str

class EmailReplyRequest(BaseModel):
    original_email: str
    context: str
    tone: str = "professional"

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    # Check cookie first
    token = request.cookies.get("session_token")
    
    # Then check Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a session token (from Google OAuth)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    
    # Otherwise, decode JWT
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "name": user_data.name,
        "primary_technology": user_data.primary_technology,
        "sub_technologies": user_data.sub_technologies,
        "phone": user_data.phone,
        "location": user_data.location,
        "role": "candidate",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"user_id": user_id, "email": user_data.email})
    
    user_response = UserResponse(
        user_id=user_id,
        email=user_data.email,
        name=user_data.name,
        primary_technology=user_data.primary_technology,
        sub_technologies=user_data.sub_technologies,
        phone=user_data.phone,
        location=user_data.location,
        role="candidate",
        created_at=datetime.now(timezone.utc)
    )
    
    return TokenResponse(access_token=token, token_type="bearer", user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, response: Response):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"user_id": user["user_id"], "email": user["email"]})
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION * 3600
    )
    
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    user_response = UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        name=user["name"],
        primary_technology=user.get("primary_technology", ""),
        sub_technologies=user.get("sub_technologies", []),
        phone=user.get("phone"),
        location=user.get("location"),
        role=user.get("role", "candidate"),
        created_at=created_at
    )
    
    return TokenResponse(access_token=token, token_type="bearer", user=user_response)

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "primary_technology": user.get("primary_technology", ""),
        "sub_technologies": user.get("sub_technologies", []),
        "phone": user.get("phone"),
        "location": user.get("location"),
        "role": user.get("role", "candidate"),
        "picture": user.get("picture"),
        "created_at": created_at.isoformat() if created_at else None
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# Google OAuth Session endpoint
@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Fetch user data from Emergent Auth
    import httpx
    async with httpx.AsyncClient() as http_client:
        auth_response = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        auth_data = auth_response.json()
    
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Check if user exists
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "primary_technology": "",
            "sub_technologies": [],
            "role": "candidate",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    else:
        user_id = user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 3600
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture,
        "role": user.get("role", "candidate")
    }

# ============ RESUME ROUTES ============

@api_router.post("/resumes/upload")
async def upload_resume(
    request: Request,
    file: UploadFile = File(...)
):
    user = await get_current_user(request)
    
    content = await file.read()
    file_extension = file.filename.split('.')[-1].lower()
    
    # Extract text from file
    text_content = ""
    if file_extension == 'pdf':
        try:
            pdf_reader = PdfReader(BytesIO(content))
            for page in pdf_reader.pages:
                text_content += page.extract_text() or ""
        except Exception as e:
            text_content = f"Error extracting PDF: {str(e)}"
    elif file_extension in ['doc', 'docx']:
        try:
            doc = Document(BytesIO(content))
            text_content = "\n".join([para.text for para in doc.paragraphs])
        except Exception as e:
            text_content = f"Error extracting Word doc: {str(e)}"
    else:
        text_content = content.decode('utf-8', errors='ignore')
    
    resume_id = f"resume_{uuid.uuid4().hex[:12]}"
    
    resume_doc = {
        "resume_id": resume_id,
        "user_id": user["user_id"],
        "file_name": file.filename,
        "file_type": file_extension,
        "original_content": text_content,
        "file_data": base64.b64encode(content).decode('utf-8'),
        "tailored_content": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.resumes.insert_one(resume_doc)
    
    return {
        "resume_id": resume_id,
        "file_name": file.filename,
        "content_preview": text_content[:500] + "..." if len(text_content) > 500 else text_content,
        "message": "Resume uploaded successfully"
    }

@api_router.get("/resumes")
async def get_resumes(request: Request):
    user = await get_current_user(request)
    resumes = await db.resumes.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "file_data": 0}
    ).to_list(100)
    return resumes

@api_router.get("/resumes/{resume_id}")
async def get_resume(resume_id: str, request: Request):
    user = await get_current_user(request)
    resume = await db.resumes.find_one(
        {"resume_id": resume_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume

@api_router.post("/resumes/tailor")
async def tailor_resume(data: TailorResumeRequest, request: Request):
    user = await get_current_user(request)
    
    resume = await db.resumes.find_one(
        {"resume_id": data.resume_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Use AI to tailor resume
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"tailor_{data.resume_id}_{uuid.uuid4().hex[:8]}",
        system_message="""You are an expert resume writer and career consultant. 
        Your task is to tailor resumes to match specific job descriptions while maintaining authenticity.
        Focus on highlighting relevant skills, experiences, and achievements that match the target position.
        Use action verbs and quantifiable achievements where possible.
        Keep the resume professional and ATS-friendly."""
    ).with_model("openai", "gpt-5.2")
    
    prompt = f"""Please tailor the following resume for the position of {data.job_title}.

Technologies to highlight: {', '.join(data.technologies)}

Job Description:
{data.job_description}

Original Resume:
{resume['original_content']}

Please provide a tailored version of the resume that:
1. Highlights relevant experience and skills for this position
2. Uses keywords from the job description
3. Maintains accuracy and authenticity
4. Is formatted in a clear, professional manner
5. Optimizes for ATS (Applicant Tracking Systems)

Return the tailored resume content only, without any additional commentary."""

    message = UserMessage(text=prompt)
    tailored_content = await chat.send_message(message)
    
    # Update resume with tailored content
    await db.resumes.update_one(
        {"resume_id": data.resume_id},
        {
            "$set": {
                "tailored_content": tailored_content,
                "target_job_title": data.job_title,
                "target_job_description": data.job_description,
                "target_technologies": data.technologies,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "resume_id": data.resume_id,
        "tailored_content": tailored_content,
        "message": "Resume tailored successfully"
    }

@api_router.get("/resumes/{resume_id}/download/{format}")
async def download_resume(resume_id: str, format: str, request: Request):
    user = await get_current_user(request)
    
    resume = await db.resumes.find_one(
        {"resume_id": resume_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    content = resume.get("tailored_content") or resume.get("original_content", "")
    
    if format == "docx":
        # Create Word document
        doc = Document()
        
        # Add title
        title = doc.add_heading(user.get("name", "Resume"), 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Add contact info
        contact = doc.add_paragraph()
        contact.alignment = WD_ALIGN_PARAGRAPH.CENTER
        contact.add_run(f"{user.get('email', '')} | {user.get('phone', '')} | {user.get('location', '')}")
        
        # Add content
        for paragraph in content.split('\n'):
            if paragraph.strip():
                doc.add_paragraph(paragraph)
        
        # Save to bytes
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=resume_{resume_id}.docx"}
        )
    
    elif format == "pdf":
        # Create PDF
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Add content
        y = height - inch
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(width/2, y, user.get("name", "Resume"))
        
        y -= 30
        c.setFont("Helvetica", 10)
        c.drawCentredString(width/2, y, f"{user.get('email', '')} | {user.get('phone', '')} | {user.get('location', '')}")
        
        y -= 40
        c.setFont("Helvetica", 11)
        
        for line in content.split('\n'):
            if y < inch:
                c.showPage()
                y = height - inch
                c.setFont("Helvetica", 11)
            
            if line.strip():
                # Handle long lines
                words = line.split()
                current_line = ""
                for word in words:
                    test_line = current_line + " " + word if current_line else word
                    if c.stringWidth(test_line, "Helvetica", 11) < width - 2*inch:
                        current_line = test_line
                    else:
                        c.drawString(inch, y, current_line)
                        y -= 15
                        current_line = word
                if current_line:
                    c.drawString(inch, y, current_line)
                    y -= 15
            else:
                y -= 10
        
        c.save()
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=resume_{resume_id}.pdf"}
        )
    
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'docx' or 'pdf'")

# ============ COVER LETTER ============

@api_router.post("/cover-letter/generate")
async def generate_cover_letter(data: GenerateCoverLetterRequest, request: Request):
    user = await get_current_user(request)
    
    resume = await db.resumes.find_one(
        {"resume_id": data.resume_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"cover_{data.resume_id}_{uuid.uuid4().hex[:8]}",
        system_message="""You are an expert at writing compelling cover letters.
        Create personalized, professional cover letters that highlight relevant experience
        and show enthusiasm for the role and company."""
    ).with_model("openai", "gpt-5.2")
    
    prompt = f"""Write a professional cover letter for the following position:

Position: {data.job_title}
Company: {data.company_name}
Job Description: {data.job_description}

Candidate Name: {user.get('name', 'Candidate')}
Candidate Email: {user.get('email', '')}

Resume Content:
{resume.get('tailored_content') or resume.get('original_content', '')}

Please write a compelling cover letter that:
1. Opens with a strong hook
2. Highlights 2-3 most relevant experiences
3. Shows knowledge of the company (if mentioned in job description)
4. Expresses genuine interest in the role
5. Ends with a clear call to action

Keep it to one page (about 300-400 words)."""

    message = UserMessage(text=prompt)
    cover_letter = await chat.send_message(message)
    
    return {
        "cover_letter": cover_letter,
        "job_title": data.job_title,
        "company_name": data.company_name
    }

# ============ JOB PORTALS ============

@api_router.post("/job-portals")
async def create_job_portal(data: JobPortalCreate, request: Request):
    await get_admin_user(request)
    
    portal_id = f"portal_{uuid.uuid4().hex[:12]}"
    portal_doc = {
        "portal_id": portal_id,
        "name": data.name,
        "url": data.url,
        "technology": data.technology,
        "description": data.description,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.job_portals.insert_one(portal_doc)
    return {"portal_id": portal_id, "message": "Job portal created successfully"}

@api_router.get("/job-portals")
async def get_job_portals(request: Request, technology: Optional[str] = None):
    await get_current_user(request)
    
    query = {"is_active": True}
    if technology:
        query["technology"] = technology
    
    portals = await db.job_portals.find(query, {"_id": 0}).to_list(100)
    return portals

@api_router.put("/job-portals/{portal_id}")
async def update_job_portal(portal_id: str, data: JobPortalCreate, request: Request):
    await get_admin_user(request)
    
    result = await db.job_portals.update_one(
        {"portal_id": portal_id},
        {"$set": {
            "name": data.name,
            "url": data.url,
            "technology": data.technology,
            "description": data.description,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Portal not found")
    
    return {"message": "Portal updated successfully"}

@api_router.delete("/job-portals/{portal_id}")
async def delete_job_portal(portal_id: str, request: Request):
    await get_admin_user(request)
    
    result = await db.job_portals.update_one(
        {"portal_id": portal_id},
        {"$set": {"is_active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Portal not found")
    
    return {"message": "Portal deleted successfully"}

# ============ JOB APPLICATIONS ============

@api_router.post("/applications")
async def create_application(data: JobApplicationCreate, request: Request):
    user = await get_current_user(request)
    
    application_id = f"app_{uuid.uuid4().hex[:12]}"
    application_doc = {
        "application_id": application_id,
        "user_id": user["user_id"],
        "job_portal_id": data.job_portal_id,
        "job_title": data.job_title,
        "job_description": data.job_description,
        "company_name": data.company_name,
        "resume_id": data.resume_id,
        "cover_letter": data.cover_letter,
        "status": "applied",
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.applications.insert_one(application_doc)
    
    return {"application_id": application_id, "message": "Application submitted successfully"}

@api_router.get("/applications")
async def get_applications(request: Request, status: Optional[str] = None):
    user = await get_current_user(request)
    
    query = {"user_id": user["user_id"]}
    if status:
        query["status"] = status
    
    applications = await db.applications.find(query, {"_id": 0}).to_list(100)
    return applications

@api_router.put("/applications/{application_id}/status")
async def update_application_status(
    application_id: str,
    status: str,
    request: Request
):
    user = await get_current_user(request)
    
    valid_statuses = ["applied", "screening", "interview_scheduled", "interviewed", "offer", "rejected", "withdrawn"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.applications.update_one(
        {"application_id": application_id, "user_id": user["user_id"]},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {"message": "Application status updated"}

# ============ EMAIL COMMUNICATION ============

@api_router.post("/emails")
async def create_email(data: EmailCreate, request: Request):
    user = await get_current_user(request)
    
    email_id = f"email_{uuid.uuid4().hex[:12]}"
    email_doc = {
        "email_id": email_id,
        "user_id": user["user_id"],
        "application_id": data.application_id,
        "subject": data.subject,
        "content": data.content,
        "email_type": data.email_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.emails.insert_one(email_doc)
    return {"email_id": email_id, "message": "Email recorded successfully"}

@api_router.get("/emails")
async def get_emails(request: Request, application_id: Optional[str] = None):
    user = await get_current_user(request)
    
    query = {"user_id": user["user_id"]}
    if application_id:
        query["application_id"] = application_id
    
    emails = await db.emails.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return emails

@api_router.post("/emails/generate-reply")
async def generate_email_reply(data: EmailReplyRequest, request: Request):
    await get_current_user(request)
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"email_{uuid.uuid4().hex[:8]}",
        system_message=f"""You are a professional email assistant.
        Write {data.tone} email replies that are clear, concise, and appropriate for job applications."""
    ).with_model("openai", "gpt-5.2")
    
    prompt = f"""Generate a professional reply to the following email:

Original Email:
{data.original_email}

Context/Instructions:
{data.context}

Please write a {data.tone} response that:
1. Addresses all points in the original email
2. Is professional and appropriate for job application correspondence
3. Is concise but complete
4. Includes appropriate greeting and sign-off"""

    message = UserMessage(text=prompt)
    reply = await chat.send_message(message)
    
    return {"generated_reply": reply}

# ============ REPORTS ============

@api_router.get("/reports/candidate")
async def get_candidate_report(request: Request):
    user = await get_current_user(request)
    user_id = user["user_id"]
    
    # Get application stats
    total_applications = await db.applications.count_documents({"user_id": user_id})
    
    # Status breakdown
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_breakdown = await db.applications.aggregate(pipeline).to_list(100)
    
    # Recent applications
    recent = await db.applications.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("applied_at", -1).limit(5).to_list(5)
    
    # Resume count
    resume_count = await db.resumes.count_documents({"user_id": user_id})
    
    # Email count
    email_count = await db.emails.count_documents({"user_id": user_id})
    
    return {
        "total_applications": total_applications,
        "status_breakdown": {item["_id"]: item["count"] for item in status_breakdown},
        "recent_applications": recent,
        "resume_count": resume_count,
        "email_count": email_count,
        "interviews_scheduled": sum(1 for item in status_breakdown if item["_id"] in ["interview_scheduled", "interviewed"]),
        "offers_received": sum(1 for item in status_breakdown if item["_id"] == "offer")
    }

@api_router.get("/reports/admin")
async def get_admin_report(request: Request):
    await get_admin_user(request)
    
    # Total candidates
    total_candidates = await db.users.count_documents({"role": "candidate"})
    
    # Total applications
    total_applications = await db.applications.count_documents({})
    
    # Applications by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_breakdown = await db.applications.aggregate(pipeline).to_list(100)
    
    # Applications by technology
    tech_pipeline = [
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "user"
        }},
        {"$unwind": "$user"},
        {"$group": {"_id": "$user.primary_technology", "count": {"$sum": 1}}}
    ]
    tech_breakdown = await db.applications.aggregate(tech_pipeline).to_list(100)
    
    # Recent registrations
    recent_users = await db.users.find(
        {"role": "candidate"},
        {"_id": 0, "password": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Active job portals
    active_portals = await db.job_portals.count_documents({"is_active": True})
    
    return {
        "total_candidates": total_candidates,
        "total_applications": total_applications,
        "status_breakdown": {item["_id"]: item["count"] for item in status_breakdown},
        "technology_breakdown": {item["_id"]: item["count"] for item in tech_breakdown if item["_id"]},
        "recent_registrations": recent_users,
        "active_portals": active_portals,
        "total_interviews": sum(item["count"] for item in status_breakdown if item["_id"] in ["interview_scheduled", "interviewed"]),
        "total_offers": sum(item["count"] for item in status_breakdown if item["_id"] == "offer")
    }

@api_router.get("/reports/admin/candidates")
async def get_all_candidates(request: Request, skip: int = 0, limit: int = 20):
    await get_admin_user(request)
    
    candidates = await db.users.find(
        {"role": "candidate"},
        {"_id": 0, "password": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with application stats
    for candidate in candidates:
        app_count = await db.applications.count_documents({"user_id": candidate["user_id"]})
        interview_count = await db.applications.count_documents({
            "user_id": candidate["user_id"],
            "status": {"$in": ["interview_scheduled", "interviewed"]}
        })
        candidate["total_applications"] = app_count
        candidate["total_interviews"] = interview_count
    
    total = await db.users.count_documents({"role": "candidate"})
    
    return {
        "candidates": candidates,
        "total": total,
        "skip": skip,
        "limit": limit
    }

# ============ ADMIN USER MANAGEMENT ============

@api_router.post("/admin/create")
async def create_admin(user_data: UserCreate, admin_secret: str):
    # Simple secret check - in production use proper admin creation flow
    if admin_secret != "admin-secret-key-2024":
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "name": user_data.name,
        "primary_technology": user_data.primary_technology,
        "sub_technologies": user_data.sub_technologies,
        "phone": user_data.phone,
        "location": user_data.location,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    return {"user_id": user_id, "message": "Admin user created successfully"}

# ============ TECHNOLOGY OPTIONS ============

@api_router.get("/technologies")
async def get_technologies():
    return {
        "primary": ["Java", "Python", "PHP", "AI", "React"],
        "sub_technologies": {
            "Java": ["Spring Boot", "Hibernate", "Maven", "Gradle", "JUnit", "Microservices"],
            "Python": ["Django", "Flask", "FastAPI", "NumPy", "Pandas", "TensorFlow"],
            "PHP": ["Laravel", "Symfony", "CodeIgniter", "WordPress", "Drupal"],
            "AI": ["Machine Learning", "Deep Learning", "NLP", "Computer Vision", "PyTorch", "Keras"],
            "React": ["Next.js", "Redux", "TypeScript", "GraphQL", "Tailwind CSS", "Material UI"]
        }
    }

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "AI Resume Tailor API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
