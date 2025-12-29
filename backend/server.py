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
import httpx

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
load_dotenv(ROOT_DIR / '.env', override=True)

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

# RapidAPI Configuration for JSearch
RAPIDAPI_KEY = os.environ.get('RAPIDAPI_KEY')
RAPIDAPI_HOST = os.environ.get('RAPIDAPI_HOST', 'jsearch.p.rapidapi.com')

# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID = os.environ.get('LINKEDIN_CLIENT_ID')
LINKEDIN_CLIENT_SECRET = os.environ.get('LINKEDIN_CLIENT_SECRET')

app = FastAPI(title="AI Resume Tailor API")
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    primary_technology: Optional[str] = ""
    sub_technologies: List[str] = []
    phone: Optional[str] = None
    location: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    primary_technology: Optional[str] = None
    sub_technologies: Optional[List[str]] = None
    profile_picture: Optional[str] = None
    linkedin_profile: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_type: Optional[str] = None  # hourly, annual
    tax_type: Optional[str] = None  # W2, 1099, C2C
    relocation_preference: Optional[str] = None  # yes, no, maybe
    location_preferences: Optional[List[str]] = None
    job_type_preferences: Optional[List[str]] = None  # remote, hybrid, onsite

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
    profile_picture: Optional[str] = None
    linkedin_profile: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_type: Optional[str] = None
    tax_type: Optional[str] = None
    relocation_preference: Optional[str] = None
    location_preferences: Optional[List[str]] = None
    job_type_preferences: Optional[List[str]] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class LinkedInCallbackRequest(BaseModel):
    code: str
    redirect_uri: str

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
    generate_versions: bool = False  # Optional: generate 2-3 ATS versions
    ats_optimize: bool = True  # ATS-friendly optimization

class OptimizeResumeRequest(BaseModel):
    target_role: str = ""  # Optional target role for optimization
    generate_versions: bool = False  # Generate 2-3 versions

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
        "profile_picture": user.get("profile_picture"),
        "linkedin_profile": user.get("linkedin_profile"),
        "salary_min": user.get("salary_min"),
        "salary_max": user.get("salary_max"),
        "salary_type": user.get("salary_type"),
        "tax_type": user.get("tax_type"),
        "relocation_preference": user.get("relocation_preference"),
        "location_preferences": user.get("location_preferences", []),
        "job_type_preferences": user.get("job_type_preferences", []),
        "created_at": created_at.isoformat() if created_at else None
    }

@api_router.put("/auth/profile")
async def update_profile(data: UserProfileUpdate, request: Request):
    user = await get_current_user(request)
    
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.phone is not None:
        update_data["phone"] = data.phone
    if data.location is not None:
        update_data["location"] = data.location
    if data.primary_technology is not None:
        update_data["primary_technology"] = data.primary_technology
    if data.sub_technologies is not None:
        update_data["sub_technologies"] = data.sub_technologies
    if data.profile_picture is not None:
        update_data["profile_picture"] = data.profile_picture
    if data.linkedin_profile is not None:
        update_data["linkedin_profile"] = data.linkedin_profile
    if data.salary_min is not None:
        update_data["salary_min"] = data.salary_min
    if data.salary_max is not None:
        update_data["salary_max"] = data.salary_max
    if data.salary_type is not None:
        update_data["salary_type"] = data.salary_type
    if data.tax_type is not None:
        update_data["tax_type"] = data.tax_type
    if data.relocation_preference is not None:
        update_data["relocation_preference"] = data.relocation_preference
    if data.location_preferences is not None:
        update_data["location_preferences"] = data.location_preferences
    if data.job_type_preferences is not None:
        update_data["job_type_preferences"] = data.job_type_preferences
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": update_data}
    )
    
    # Fetch updated user
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    
    return {"message": "Profile updated successfully", "user": updated_user}

@api_router.get("/auth/profile-completeness")
async def get_profile_completeness(request: Request):
    user = await get_current_user(request)
    
    # Define required fields and their weights
    fields = {
        "name": 10,
        "email": 10,
        "primary_technology": 15,
        "sub_technologies": 10,
        "location": 10,
        "phone": 5,
        "linkedin_profile": 10,
        "salary_min": 5,
        "salary_max": 5,
        "tax_type": 5,
        "relocation_preference": 5,
        "location_preferences": 5,
        "job_type_preferences": 5,
    }
    
    total_weight = sum(fields.values())
    completed_weight = 0
    missing_fields = []
    
    for field, weight in fields.items():
        value = user.get(field)
        if value and (not isinstance(value, list) or len(value) > 0):
            completed_weight += weight
        else:
            missing_fields.append(field)
    
    # Check if user has uploaded a resume
    resume_count = await db.resumes.count_documents({"user_id": user["user_id"]})
    if resume_count > 0:
        completed_weight += 10  # Resume adds 10%
    else:
        missing_fields.append("resume")
    
    total_weight += 10  # Add resume weight to total
    
    percentage = int((completed_weight / total_weight) * 100)
    
    return {
        "percentage": percentage,
        "completed_weight": completed_weight,
        "total_weight": total_weight,
        "missing_fields": missing_fields
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

# LinkedIn OAuth endpoint
@api_router.post("/auth/linkedin/callback", response_model=TokenResponse)
async def linkedin_callback(data: LinkedInCallbackRequest):
    """
    Handle LinkedIn OAuth callback - exchange code for access token and get user profile.
    """
    if not LINKEDIN_CLIENT_ID or not LINKEDIN_CLIENT_SECRET:
        raise HTTPException(
            status_code=500, 
            detail="LinkedIn OAuth is not configured. Please add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to your environment."
        )
    
    try:
        async with httpx.AsyncClient() as http_client:
            # Step 1: Exchange authorization code for access token
            token_response = await http_client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "authorization_code",
                    "code": data.code,
                    "redirect_uri": data.redirect_uri,
                    "client_id": LINKEDIN_CLIENT_ID,
                    "client_secret": LINKEDIN_CLIENT_SECRET,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=15.0
            )
            
            if token_response.status_code != 200:
                error_data = token_response.json()
                logger.error(f"LinkedIn token exchange failed: {error_data}")
                raise HTTPException(status_code=400, detail=f"LinkedIn authentication failed: {error_data.get('error_description', 'Unknown error')}")
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            # Step 2: Get user profile using OpenID Connect userinfo endpoint
            profile_response = await http_client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0
            )
            
            if profile_response.status_code != 200:
                logger.error(f"LinkedIn profile fetch failed: {profile_response.text}")
                raise HTTPException(status_code=400, detail="Failed to fetch LinkedIn profile")
            
            profile_data = profile_response.json()
            
            # Extract user information
            linkedin_id = profile_data.get("sub")
            email = profile_data.get("email")
            name = profile_data.get("name")
            picture = profile_data.get("picture")
            
            if not email:
                raise HTTPException(status_code=400, detail="LinkedIn account does not have an email address")
            
            # Check if user exists by LinkedIn ID or email
            user = await db.users.find_one(
                {"$or": [{"linkedin_id": linkedin_id}, {"email": email}]},
                {"_id": 0}
            )
            
            if user:
                # Update existing user with LinkedIn info
                await db.users.update_one(
                    {"user_id": user["user_id"]},
                    {"$set": {
                        "linkedin_id": linkedin_id,
                        "picture": picture or user.get("picture"),
                        "profile_picture": picture or user.get("profile_picture"),
                        "last_login": datetime.now(timezone.utc).isoformat()
                    }}
                )
                user_id = user["user_id"]
            else:
                # Create new user
                user_id = f"user_{uuid.uuid4().hex[:12]}"
                user = {
                    "user_id": user_id,
                    "email": email,
                    "name": name,
                    "linkedin_id": linkedin_id,
                    "picture": picture,
                    "profile_picture": picture,
                    "primary_technology": "",
                    "sub_technologies": [],
                    "role": "candidate",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "last_login": datetime.now(timezone.utc).isoformat()
                }
                await db.users.insert_one(user)
            
            # Fetch updated user
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
            
            # Generate JWT token
            token_payload = {
                "user_id": user_id,
                "email": email,
                "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION)
            }
            access_token_jwt = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            return TokenResponse(
                access_token=access_token_jwt,
                token_type="bearer",
                user=UserResponse(
                    user_id=user["user_id"],
                    email=user["email"],
                    name=user["name"],
                    primary_technology=user.get("primary_technology", ""),
                    sub_technologies=user.get("sub_technologies", []),
                    phone=user.get("phone"),
                    location=user.get("location"),
                    role=user.get("role", "candidate"),
                    created_at=datetime.fromisoformat(user["created_at"]) if isinstance(user.get("created_at"), str) else user.get("created_at"),
                    profile_picture=user.get("profile_picture") or user.get("picture"),
                    linkedin_profile=user.get("linkedin_profile"),
                    salary_min=user.get("salary_min"),
                    salary_max=user.get("salary_max"),
                    salary_type=user.get("salary_type"),
                    tax_type=user.get("tax_type"),
                    relocation_preference=user.get("relocation_preference"),
                    location_preferences=user.get("location_preferences", []),
                    job_type_preferences=user.get("job_type_preferences", [])
                )
            )
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="LinkedIn authentication timed out")
    except Exception as e:
        logger.error(f"LinkedIn authentication error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LinkedIn authentication failed: {str(e)}")

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

@api_router.delete("/resumes/{resume_id}")
async def delete_resume(resume_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.resumes.delete_one(
        {"resume_id": resume_id, "user_id": user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"message": "Resume deleted successfully"}

@api_router.post("/resumes/tailor")
async def tailor_resume(data: TailorResumeRequest, request: Request):
    user = await get_current_user(request)
    
    resume = await db.resumes.find_one(
        {"resume_id": data.resume_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Enhanced ATS-optimized system message
    system_message = """You are an expert resume writer, ATS optimization specialist, and career consultant.
Your expertise includes:
- Making resumes ATS (Applicant Tracking System) friendly
- Identifying and incorporating relevant keywords from job descriptions
- Formatting content for both human readers and automated parsing systems
- Highlighting quantifiable achievements and metrics
- Using industry-standard section headers (SUMMARY, EXPERIENCE, SKILLS, EDUCATION)

ATS Optimization Rules:
1. Use standard section headers that ATS systems recognize
2. Include relevant keywords naturally throughout the resume
3. Avoid tables, graphics, headers/footers that ATS cannot parse
4. Use standard fonts and formatting
5. Include both spelled-out terms and acronyms (e.g., "Artificial Intelligence (AI)")
6. Place most important keywords in the top third of the resume
7. Use reverse chronological order for experience
8. Include job titles that match the target position terminology"""

    # Use AI to tailor resume with ATS optimization
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"tailor_{data.resume_id}_{uuid.uuid4().hex[:8]}",
        system_message=system_message
    ).with_model("openai", "gpt-5.2")
    
    # Extract keywords from job description
    keywords_prompt = f"""Analyze this job description and extract the top 15-20 most important keywords and phrases that an ATS would look for:

Job Title: {data.job_title}
Technologies: {', '.join(data.technologies)}

Job Description:
{data.job_description}

Return ONLY a comma-separated list of keywords, nothing else."""

    keywords_message = UserMessage(text=keywords_prompt)
    extracted_keywords = await chat.send_message(keywords_message)
    
    # Main tailoring prompt
    prompt = f"""Tailor the following resume for the position of {data.job_title}.

TARGET KEYWORDS TO INCORPORATE (from job description):
{extracted_keywords}

REQUIRED TECHNOLOGIES TO HIGHLIGHT:
{', '.join(data.technologies)}

JOB DESCRIPTION:
{data.job_description}

ORIGINAL RESUME:
{resume['original_content']}

CREATE AN ATS-OPTIMIZED RESUME that:
1. Uses standard ATS-friendly section headers: PROFESSIONAL SUMMARY, SKILLS, EXPERIENCE, EDUCATION, CERTIFICATIONS
2. Incorporates the target keywords naturally (aim for 70%+ keyword match)
3. Starts with a powerful PROFESSIONAL SUMMARY (3-4 lines) with key skills
4. Lists a SKILLS section with relevant technical and soft skills
5. Uses bullet points for achievements, starting with strong action verbs
6. Includes quantifiable metrics where possible (percentages, numbers, dollar amounts)
7. Maintains reverse chronological order
8. Uses clear, ATS-parseable formatting

Return ONLY the tailored resume content, formatted as plain text with clear section headers."""

    message = UserMessage(text=prompt)
    tailored_content = await chat.send_message(message)
    
    versions = []
    
    # Generate additional versions if requested
    if data.generate_versions:
        # Version 2: More technical focus
        version2_prompt = f"""Create an alternative version of this tailored resume with MORE TECHNICAL FOCUS.
        
Original tailored resume:
{tailored_content}

For this version:
1. Lead with technical skills and certifications
2. Emphasize technical projects and implementations
3. Include more technical keywords and acronyms
4. Focus on tools, technologies, and methodologies used
5. Highlight technical problem-solving achievements

Keep it ATS-friendly. Return ONLY the resume content."""

        version2_message = UserMessage(text=version2_prompt)
        version2_content = await chat.send_message(version2_message)
        
        # Version 3: Leadership/Impact focus
        version3_prompt = f"""Create an alternative version of this tailored resume with LEADERSHIP & IMPACT FOCUS.
        
Original tailored resume:
{tailored_content}

For this version:
1. Emphasize leadership roles and team management
2. Highlight business impact and ROI of projects
3. Focus on stakeholder management and communication
4. Include mentoring and cross-functional collaboration
5. Emphasize strategic thinking and decision-making

Keep it ATS-friendly. Return ONLY the resume content."""

        version3_message = UserMessage(text=version3_prompt)
        version3_content = await chat.send_message(version3_message)
        
        versions = [
            {"name": "Standard ATS-Optimized", "content": tailored_content},
            {"name": "Technical Focus", "content": version2_content},
            {"name": "Leadership Focus", "content": version3_content}
        ]
    
    # Update resume with tailored content
    update_data = {
        "tailored_content": tailored_content,
        "target_job_title": data.job_title,
        "target_job_description": data.job_description,
        "target_technologies": data.technologies,
        "extracted_keywords": extracted_keywords,
        "ats_optimized": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if versions:
        update_data["versions"] = versions
    
    await db.resumes.update_one(
        {"resume_id": data.resume_id},
        {"$set": update_data}
    )
    
    response_data = {
        "resume_id": data.resume_id,
        "tailored_content": tailored_content,
        "keywords": extracted_keywords,
        "ats_optimized": True,
        "message": "Resume tailored successfully with ATS optimization"
    }
    
    if versions:
        response_data["versions"] = versions
    
    return response_data

@api_router.post("/resumes/{resume_id}/optimize")
async def optimize_resume_ats(resume_id: str, data: OptimizeResumeRequest, request: Request):
    """Make an uploaded resume ATS-friendly with keyword extraction and optional version generation"""
    user = await get_current_user(request)
    
    resume = await db.resumes.find_one(
        {"resume_id": resume_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    original_content = resume.get('original_content', '')
    if not original_content:
        raise HTTPException(status_code=400, detail="Resume has no content to optimize")
    
    # System message for ATS optimization
    system_message = """You are an expert ATS (Applicant Tracking System) optimization specialist and professional resume writer.
Your task is to transform resumes to be ATS-friendly while maintaining authenticity and readability.

ATS Optimization Guidelines:
1. Use standard, recognizable section headers: PROFESSIONAL SUMMARY, SKILLS, EXPERIENCE, EDUCATION, CERTIFICATIONS
2. Remove fancy formatting, tables, columns, graphics that ATS cannot parse
3. Use standard bullet points (•) for lists
4. Include both acronyms and full terms (e.g., "Artificial Intelligence (AI)")
5. Place most important skills and keywords in the top third
6. Use reverse chronological order for experience
7. Include quantifiable achievements with metrics (%, $, numbers)
8. Use industry-standard job titles
9. Ensure consistent date formatting (Month Year - Month Year)
10. Remove headers/footers that might confuse ATS"""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"optimize_{resume_id}_{uuid.uuid4().hex[:8]}",
        system_message=system_message
    ).with_model("openai", "gpt-5.2")
    
    # Extract keywords from the resume
    keywords_prompt = f"""Analyze this resume and extract the top 20 most important professional keywords that should be highlighted for ATS systems. Include:
- Technical skills and tools
- Industry-specific terms
- Certifications and qualifications
- Soft skills mentioned
- Action verbs used

Resume:
{original_content}

Return ONLY a comma-separated list of keywords, nothing else."""

    keywords_message = UserMessage(text=keywords_prompt)
    extracted_keywords = await chat.send_message(keywords_message)
    
    # Determine target role
    target_role = data.target_role if data.target_role else "a professional role matching their experience"
    
    # Main ATS optimization prompt
    optimize_prompt = f"""Transform this resume to be fully ATS-optimized for {target_role}.

CURRENT RESUME:
{original_content}

EXTRACTED KEYWORDS TO EMPHASIZE:
{extracted_keywords}

CREATE AN ATS-OPTIMIZED VERSION that:
1. Starts with a powerful PROFESSIONAL SUMMARY (3-4 lines) highlighting key qualifications
2. Includes a comprehensive SKILLS section organized by category (Technical Skills, Tools, Soft Skills)
3. Reformats EXPERIENCE section with:
   - Clear job titles and company names
   - Date ranges in consistent format
   - Bullet points starting with strong action verbs
   - Quantifiable achievements where possible
4. Includes EDUCATION with degrees, institutions, and graduation dates
5. Adds CERTIFICATIONS section if applicable
6. Uses clean, ATS-parseable formatting throughout
7. Naturally incorporates the extracted keywords

Return ONLY the optimized resume content in plain text format with clear section headers."""

    optimize_message = UserMessage(text=optimize_prompt)
    optimized_content = await chat.send_message(optimize_message)
    
    versions = []
    
    # Generate additional versions if requested
    if data.generate_versions:
        # Version 2: Technical/Skills-focused
        version2_prompt = f"""Create an alternative TECHNICAL FOCUS version of this resume.

Optimized resume:
{optimized_content}

For this version:
1. Lead with a TECHNICAL SKILLS section at the top (after contact info)
2. Emphasize technical projects, implementations, and tools
3. Include more technical acronyms and certifications
4. Highlight problem-solving and technical achievements
5. Focus on technologies, frameworks, and methodologies

Keep it ATS-friendly. Return ONLY the resume content."""

        version2_message = UserMessage(text=version2_prompt)
        version2_content = await chat.send_message(version2_message)
        
        # Version 3: Experience/Leadership-focused
        version3_prompt = f"""Create an alternative LEADERSHIP & EXPERIENCE FOCUS version of this resume.

Optimized resume:
{optimized_content}

For this version:
1. Lead with the PROFESSIONAL SUMMARY emphasizing leadership
2. Highlight team management and mentoring experience
3. Emphasize business impact, ROI, and cost savings
4. Focus on stakeholder management and communication
5. Include project management and strategic initiatives

Keep it ATS-friendly. Return ONLY the resume content."""

        version3_message = UserMessage(text=version3_prompt)
        version3_content = await chat.send_message(version3_message)
        
        versions = [
            {"name": "Standard ATS-Optimized", "content": optimized_content},
            {"name": "Technical Focus", "content": version2_content},
            {"name": "Leadership Focus", "content": version3_content}
        ]
    
    # Update resume in database
    update_data = {
        "ats_optimized": True,
        "ats_optimized_content": optimized_content,
        "extracted_keywords": extracted_keywords,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if versions:
        update_data["versions"] = versions
    
    await db.resumes.update_one(
        {"resume_id": resume_id},
        {"$set": update_data}
    )
    
    response_data = {
        "resume_id": resume_id,
        "optimized_content": optimized_content,
        "keywords": extracted_keywords,
        "ats_optimized": True,
        "message": "Resume optimized for ATS successfully"
    }
    
    if versions:
        response_data["versions"] = versions
    
    return response_data

@api_router.post("/resumes/{resume_id}/generate-word")
async def generate_word_resume(resume_id: str, request: Request, version: str = "default"):
    """Generate a Word document from the tailored resume"""
    user = await get_current_user(request)
    
    resume = await db.resumes.find_one(
        {"resume_id": resume_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Get content based on version
    if version != "default" and resume.get("versions"):
        content = None
        for v in resume["versions"]:
            if v["name"] == version:
                content = v["content"]
                break
        if not content:
            content = resume.get("tailored_content") or resume.get("original_content", "")
    else:
        content = resume.get("tailored_content") or resume.get("original_content", "")
    
    # Create Word document
    doc = Document()
    
    # Set narrow margins for more content
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.5)
        section.bottom_margin = Inches(0.5)
        section.left_margin = Inches(0.6)
        section.right_margin = Inches(0.6)
    
    # Add name as title
    name = user.get("name", "Candidate")
    title = doc.add_heading(name, 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for run in title.runs:
        run.font.size = Pt(18)
        run.font.bold = True
    
    # Add contact info
    contact_parts = []
    if user.get('email'):
        contact_parts.append(user['email'])
    if user.get('phone'):
        contact_parts.append(user['phone'])
    if user.get('location'):
        contact_parts.append(user['location'])
    if user.get('linkedin_profile'):
        contact_parts.append(user['linkedin_profile'])
    
    if contact_parts:
        contact = doc.add_paragraph()
        contact.alignment = WD_ALIGN_PARAGRAPH.CENTER
        contact_run = contact.add_run(" | ".join(contact_parts))
        contact_run.font.size = Pt(10)
    
    # Add horizontal line
    doc.add_paragraph("_" * 80)
    
    # Parse and add content with proper formatting
    lines = content.split('\n')
    current_section = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check if it's a section header (ALL CAPS or common headers)
        section_headers = ['PROFESSIONAL SUMMARY', 'SUMMARY', 'SKILLS', 'TECHNICAL SKILLS', 
                         'EXPERIENCE', 'WORK EXPERIENCE', 'EDUCATION', 'CERTIFICATIONS',
                         'PROJECTS', 'ACHIEVEMENTS', 'AWARDS', 'LANGUAGES']
        
        is_header = line.upper() in section_headers or (line.isupper() and len(line) < 50)
        
        if is_header:
            # Add section header
            heading = doc.add_heading(line.title(), level=1)
            heading.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in heading.runs:
                run.font.size = Pt(12)
                run.font.bold = True
            current_section = line.upper()
        elif line.startswith(('•', '-', '*', '○')):
            # Bullet point
            para = doc.add_paragraph(style='List Bullet')
            run = para.add_run(line.lstrip('•-*○ '))
            run.font.size = Pt(10)
        elif line.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.')):
            # Numbered list
            para = doc.add_paragraph(style='List Number')
            run = para.add_run(line[2:].strip())
            run.font.size = Pt(10)
        else:
            # Regular paragraph
            para = doc.add_paragraph()
            run = para.add_run(line)
            run.font.size = Pt(10)
    
    # Save to BytesIO
    doc_io = BytesIO()
    doc.save(doc_io)
    doc_io.seek(0)
    
    # Generate filename
    job_title = resume.get("target_job_title", "").replace(" ", "_")[:30]
    filename = f"{name.replace(' ', '_')}_Resume_{job_title}.docx"
    
    return StreamingResponse(
        doc_io,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

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

# ============ LIVE JOB SEARCH (JSearch API) ============

class LiveJobSearchRequest(BaseModel):
    query: Optional[str] = None
    location: Optional[str] = "United States"
    employment_type: Optional[str] = None
    page: int = 1
    num_pages: int = 1

@api_router.get("/live-jobs/search")
async def search_live_jobs(
    request: Request,
    query: Optional[str] = None,
    location: Optional[str] = "United States",
    employment_type: Optional[str] = None,
    page: int = 1
):
    """
    Search for live job listings from LinkedIn, Indeed, Glassdoor, ZipRecruiter.
    If no query provided, uses user's primary and sub technologies.
    """
    user = await get_current_user(request)
    
    # Get API keys at request time
    rapidapi_key = os.environ.get('RAPIDAPI_KEY')
    rapidapi_host = os.environ.get('RAPIDAPI_HOST', 'jsearch.p.rapidapi.com')
    
    if not rapidapi_key:
        raise HTTPException(status_code=500, detail="JSearch API key not configured")
    
    # Build search query from user's technologies if not provided
    if not query:
        technologies = []
        if user.get("primary_technology"):
            technologies.append(user["primary_technology"])
        if user.get("sub_technologies"):
            technologies.extend(user["sub_technologies"][:2])  # Add up to 2 sub-technologies
        
        if technologies:
            query = " OR ".join(technologies) + " developer"
        else:
            query = "software developer"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            params = {
                "query": f"{query} in {location}",
                "page": str(page),
                "num_pages": "1"
            }
            
            if employment_type:
                params["employment_types"] = employment_type
            
            response = await http_client.get(
                "https://jsearch.p.rapidapi.com/search",
                params=params,
                headers={
                    "X-RapidAPI-Key": rapidapi_key,
                    "X-RapidAPI-Host": rapidapi_host
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch jobs from JSearch API")
            
            data = response.json()
            jobs = data.get("data", [])
            
            # Transform jobs to a consistent format
            formatted_jobs = []
            for job in jobs:
                # Handle location safely
                city = job.get("job_city") or ""
                state = job.get("job_state") or ""
                location = city + (", " + state if state and city else state)
                
                formatted_jobs.append({
                    "job_id": job.get("job_id"),
                    "title": job.get("job_title"),
                    "company": job.get("employer_name"),
                    "company_logo": job.get("employer_logo"),
                    "location": location,
                    "country": job.get("job_country"),
                    "description": job.get("job_description", "")[:500] + "..." if job.get("job_description") and len(job.get("job_description", "")) > 500 else job.get("job_description"),
                    "full_description": job.get("job_description"),
                    "employment_type": job.get("job_employment_type"),
                    "is_remote": job.get("job_is_remote", False),
                    "apply_link": job.get("job_apply_link"),
                    "posted_at": job.get("job_posted_at_datetime_utc"),
                    "salary_min": job.get("job_min_salary"),
                    "salary_max": job.get("job_max_salary"),
                    "salary_currency": job.get("job_salary_currency"),
                    "salary_period": job.get("job_salary_period"),
                    "source": job.get("job_publisher"),
                    "highlights": job.get("job_highlights", {}),
                    "required_skills": job.get("job_required_skills", []),
                })
            
            return {
                "jobs": formatted_jobs,
                "total": len(formatted_jobs),
                "page": page,
                "query_used": query,
                "location": location
            }
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Job search request timed out")
    except Exception as e:
        logger.error(f"Error searching jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search jobs: {str(e)}")

@api_router.get("/live-jobs/recommendations")
async def get_job_recommendations(request: Request):
    """
    Get personalized job recommendations based on user's primary and sub technologies.
    """
    user = await get_current_user(request)
    
    # Get API keys at request time
    rapidapi_key = os.environ.get('RAPIDAPI_KEY')
    rapidapi_host = os.environ.get('RAPIDAPI_HOST', 'jsearch.p.rapidapi.com')
    
    if not rapidapi_key:
        raise HTTPException(status_code=500, detail="JSearch API key not configured")
    
    # Build search queries based on user's technology stack
    recommendations = []
    
    primary_tech = user.get("primary_technology", "")
    sub_techs = user.get("sub_technologies", [])
    
    # Search based on primary technology
    search_queries = []
    if primary_tech:
        search_queries.append(f"{primary_tech} developer")
    
    # Add sub-technology searches
    for sub_tech in sub_techs[:2]:
        search_queries.append(f"{sub_tech} developer")
    
    if not search_queries:
        search_queries = ["software developer"]
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            all_jobs = []
            
            for search_query in search_queries[:2]:  # Limit to 2 searches to save API calls
                params = {
                    "query": f"{search_query} in United States",
                    "page": "1",
                    "num_pages": "1"
                }
                
                response = await http_client.get(
                    "https://jsearch.p.rapidapi.com/search",
                    params=params,
                    headers={
                        "X-RapidAPI-Key": rapidapi_key,
                        "X-RapidAPI-Host": rapidapi_host
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    jobs = data.get("data", [])[:5]  # Get top 5 from each search
                    
                    for job in jobs:
                        # Handle location safely
                        city = job.get("job_city") or ""
                        state = job.get("job_state") or ""
                        location = city + (", " + state if state and city else state)
                        
                        all_jobs.append({
                            "job_id": job.get("job_id"),
                            "title": job.get("job_title"),
                            "company": job.get("employer_name"),
                            "company_logo": job.get("employer_logo"),
                            "location": location,
                            "country": job.get("job_country"),
                            "description": job.get("job_description", "")[:300] + "..." if job.get("job_description") and len(job.get("job_description", "")) > 300 else job.get("job_description"),
                            "employment_type": job.get("job_employment_type"),
                            "is_remote": job.get("job_is_remote", False),
                            "apply_link": job.get("job_apply_link"),
                            "posted_at": job.get("job_posted_at_datetime_utc"),
                            "salary_min": job.get("job_min_salary"),
                            "salary_max": job.get("job_max_salary"),
                            "source": job.get("job_publisher"),
                            "matched_technology": search_query.replace(" developer", "")
                        })
            
            # Remove duplicates by job_id
            seen_ids = set()
            unique_jobs = []
            for job in all_jobs:
                if job["job_id"] not in seen_ids:
                    seen_ids.add(job["job_id"])
                    unique_jobs.append(job)
            
            return {
                "recommendations": unique_jobs,
                "total": len(unique_jobs),
                "based_on": {
                    "primary_technology": primary_tech,
                    "sub_technologies": sub_techs
                }
            }
            
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")

@api_router.get("/live-jobs/{job_id}")
async def get_live_job_details(job_id: str, request: Request):
    """
    Get detailed information about a specific job.
    """
    await get_current_user(request)
    
    # Get API keys at request time
    rapidapi_key = os.environ.get('RAPIDAPI_KEY')
    rapidapi_host = os.environ.get('RAPIDAPI_HOST', 'jsearch.p.rapidapi.com')
    
    if not rapidapi_key:
        raise HTTPException(status_code=500, detail="JSearch API key not configured")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.get(
                "https://jsearch.p.rapidapi.com/job-details",
                params={"job_id": job_id},
                headers={
                    "X-RapidAPI-Key": rapidapi_key,
                    "X-RapidAPI-Host": rapidapi_host
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch job details")
            
            data = response.json()
            jobs = data.get("data", [])
            
            if not jobs:
                raise HTTPException(status_code=404, detail="Job not found")
            
            job = jobs[0]
            
            return {
                "job_id": job.get("job_id"),
                "title": job.get("job_title"),
                "company": job.get("employer_name"),
                "company_logo": job.get("employer_logo"),
                "company_website": job.get("employer_website"),
                "location": job.get("job_city", "") + (", " + job.get("job_state", "") if job.get("job_state") else ""),
                "country": job.get("job_country"),
                "description": job.get("job_description"),
                "employment_type": job.get("job_employment_type"),
                "is_remote": job.get("job_is_remote", False),
                "apply_link": job.get("job_apply_link"),
                "posted_at": job.get("job_posted_at_datetime_utc"),
                "expires_at": job.get("job_offer_expiration_datetime_utc"),
                "salary_min": job.get("job_min_salary"),
                "salary_max": job.get("job_max_salary"),
                "salary_currency": job.get("job_salary_currency"),
                "salary_period": job.get("job_salary_period"),
                "source": job.get("job_publisher"),
                "highlights": job.get("job_highlights", {}),
                "required_skills": job.get("job_required_skills", []),
                "benefits": job.get("job_benefits", []),
                "qualifications": job.get("job_highlights", {}).get("Qualifications", []),
                "responsibilities": job.get("job_highlights", {}).get("Responsibilities", []),
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get job details: {str(e)}")

# ============ LIVE JOBS 2 (Alternative Job Source) ============

# Configuration for Live Jobs 2 API (will use a different API key)
LIVEJOBS2_API_KEY = os.environ.get('LIVEJOBS2_API_KEY', '')
LIVEJOBS2_API_HOST = os.environ.get('LIVEJOBS2_API_HOST', '')

@api_router.get("/live-jobs-2/search")
async def search_live_jobs_2(
    request: Request,
    query: Optional[str] = None,
    location: str = "United States",
    employment_type: Optional[str] = None,
    page: int = 1
):
    """
    Search jobs from alternative job source (Live Jobs 2).
    Configure LIVEJOBS2_API_KEY and LIVEJOBS2_API_HOST in .env to enable.
    """
    user = await get_current_user(request)
    
    # Get API keys at request time
    api_key = os.environ.get('LIVEJOBS2_API_KEY')
    api_host = os.environ.get('LIVEJOBS2_API_HOST')
    
    if not api_key or not api_host:
        # Return placeholder data when API not configured
        return {
            "jobs": [],
            "total": 0,
            "page": page,
            "message": "Live Jobs 2 API not configured. Please provide LIVEJOBS2_API_KEY and LIVEJOBS2_API_HOST in backend/.env"
        }
    
    search_query = query or user.get('primary_technology', 'Software Developer')
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            # This is a placeholder - adjust the API call based on your actual API provider
            response = await http_client.get(
                f"https://{api_host}/search",
                params={
                    "query": search_query,
                    "location": location,
                    "employment_type": employment_type,
                    "page": page
                },
                headers={
                    "X-RapidAPI-Key": api_key,
                    "X-RapidAPI-Host": api_host
                }
            )
            
            if response.status_code != 200:
                logger.warning(f"Live Jobs 2 API returned status {response.status_code}")
                return {"jobs": [], "total": 0, "page": page}
            
            data = response.json()
            jobs_data = data.get("data", [])
            
            jobs = []
            for job in jobs_data:
                jobs.append({
                    "job_id": job.get("job_id", str(uuid.uuid4())),
                    "title": job.get("job_title", job.get("title", "")),
                    "company": job.get("employer_name", job.get("company", "")),
                    "company_logo": job.get("employer_logo", job.get("logo", "")),
                    "location": job.get("job_city", job.get("location", "")) + (", " + job.get("job_state", "") if job.get("job_state") else ""),
                    "country": job.get("job_country", job.get("country", "")),
                    "description": job.get("job_description", job.get("description", ""))[:500] + "..." if len(job.get("job_description", job.get("description", ""))) > 500 else job.get("job_description", job.get("description", "")),
                    "full_description": job.get("job_description", job.get("description", "")),
                    "employment_type": job.get("job_employment_type", job.get("employment_type", "")),
                    "is_remote": job.get("job_is_remote", job.get("is_remote", False)),
                    "apply_link": job.get("job_apply_link", job.get("apply_link", "")),
                    "posted_at": job.get("job_posted_at_datetime_utc", job.get("posted_at", "")),
                    "salary_min": job.get("job_min_salary", job.get("salary_min")),
                    "salary_max": job.get("job_max_salary", job.get("salary_max")),
                    "salary_currency": job.get("job_salary_currency", job.get("salary_currency", "USD")),
                    "salary_period": job.get("job_salary_period", job.get("salary_period", "")),
                    "source": job.get("job_publisher", job.get("source", "Live Jobs 2")),
                    "required_skills": job.get("job_required_skills", job.get("skills", [])),
                })
            
            return {
                "jobs": jobs,
                "total": len(jobs),
                "page": page
            }
            
    except Exception as e:
        logger.error(f"Error searching Live Jobs 2: {str(e)}")
        return {"jobs": [], "total": 0, "page": page, "error": str(e)}

@api_router.get("/live-jobs-2/recommendations")
async def get_live_jobs_2_recommendations(request: Request):
    """
    Get job recommendations from Live Jobs 2 based on user's profile.
    """
    user = await get_current_user(request)
    
    api_key = os.environ.get('LIVEJOBS2_API_KEY')
    api_host = os.environ.get('LIVEJOBS2_API_HOST')
    
    if not api_key or not api_host:
        return {
            "recommendations": [],
            "message": "Live Jobs 2 API not configured. Please provide LIVEJOBS2_API_KEY and LIVEJOBS2_API_HOST in backend/.env"
        }
    
    # Get user's technologies
    user_technologies = [user.get('primary_technology', 'Software Developer')]
    if user.get('sub_technologies'):
        user_technologies.extend(user['sub_technologies'][:3])
    
    all_recommendations = []
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            for tech in user_technologies[:2]:  # Limit to 2 searches
                response = await http_client.get(
                    f"https://{api_host}/search",
                    params={
                        "query": f"{tech} Developer",
                        "location": "United States",
                        "page": 1
                    },
                    headers={
                        "X-RapidAPI-Key": api_key,
                        "X-RapidAPI-Host": api_host
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    jobs_data = data.get("data", [])[:5]
                    
                    for job in jobs_data:
                        all_recommendations.append({
                            "job_id": job.get("job_id", str(uuid.uuid4())),
                            "title": job.get("job_title", job.get("title", "")),
                            "company": job.get("employer_name", job.get("company", "")),
                            "company_logo": job.get("employer_logo", job.get("logo", "")),
                            "location": job.get("job_city", job.get("location", "")) + (", " + job.get("job_state", "") if job.get("job_state") else ""),
                            "country": job.get("job_country", job.get("country", "")),
                            "description": job.get("job_description", job.get("description", ""))[:500] + "..." if len(job.get("job_description", job.get("description", ""))) > 500 else job.get("job_description", job.get("description", "")),
                            "full_description": job.get("job_description", job.get("description", "")),
                            "employment_type": job.get("job_employment_type", job.get("employment_type", "")),
                            "is_remote": job.get("job_is_remote", job.get("is_remote", False)),
                            "apply_link": job.get("job_apply_link", job.get("apply_link", "")),
                            "posted_at": job.get("job_posted_at_datetime_utc", job.get("posted_at", "")),
                            "salary_min": job.get("job_min_salary", job.get("salary_min")),
                            "salary_max": job.get("job_max_salary", job.get("salary_max")),
                            "salary_currency": job.get("job_salary_currency", job.get("salary_currency", "USD")),
                            "salary_period": job.get("job_salary_period", job.get("salary_period", "")),
                            "source": job.get("job_publisher", job.get("source", "Live Jobs 2")),
                            "required_skills": job.get("job_required_skills", job.get("skills", [])),
                            "matched_technology": tech,
                        })
        
        return {"recommendations": all_recommendations[:10]}
        
    except Exception as e:
        logger.error(f"Error getting Live Jobs 2 recommendations: {str(e)}")
        return {"recommendations": [], "error": str(e)}

@api_router.get("/live-jobs-2/{job_id}")
async def get_live_job_2_details(job_id: str, request: Request):
    """
    Get detailed information about a specific job from Live Jobs 2.
    """
    await get_current_user(request)
    
    api_key = os.environ.get('LIVEJOBS2_API_KEY')
    api_host = os.environ.get('LIVEJOBS2_API_HOST')
    
    if not api_key or not api_host:
        raise HTTPException(status_code=500, detail="Live Jobs 2 API not configured")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.get(
                f"https://{api_host}/job-details",
                params={"job_id": job_id},
                headers={
                    "X-RapidAPI-Key": api_key,
                    "X-RapidAPI-Host": api_host
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch job details")
            
            data = response.json()
            jobs = data.get("data", [])
            
            if not jobs:
                raise HTTPException(status_code=404, detail="Job not found")
            
            job = jobs[0]
            
            return {
                "job_id": job.get("job_id"),
                "title": job.get("job_title", job.get("title", "")),
                "company": job.get("employer_name", job.get("company", "")),
                "company_logo": job.get("employer_logo", job.get("logo", "")),
                "company_website": job.get("employer_website", job.get("website", "")),
                "location": job.get("job_city", job.get("location", "")) + (", " + job.get("job_state", "") if job.get("job_state") else ""),
                "country": job.get("job_country", job.get("country", "")),
                "description": job.get("job_description", job.get("description", "")),
                "employment_type": job.get("job_employment_type", job.get("employment_type", "")),
                "is_remote": job.get("job_is_remote", job.get("is_remote", False)),
                "apply_link": job.get("job_apply_link", job.get("apply_link", "")),
                "posted_at": job.get("job_posted_at_datetime_utc", job.get("posted_at", "")),
                "expires_at": job.get("job_offer_expiration_datetime_utc", job.get("expires_at", "")),
                "salary_min": job.get("job_min_salary", job.get("salary_min")),
                "salary_max": job.get("job_max_salary", job.get("salary_max")),
                "salary_currency": job.get("job_salary_currency", job.get("salary_currency", "USD")),
                "salary_period": job.get("job_salary_period", job.get("salary_period", "")),
                "source": job.get("job_publisher", job.get("source", "Live Jobs 2")),
                "highlights": job.get("job_highlights", {}),
                "required_skills": job.get("job_required_skills", job.get("skills", [])),
                "benefits": job.get("job_benefits", job.get("benefits", [])),
                "qualifications": job.get("job_highlights", {}).get("Qualifications", []),
                "responsibilities": job.get("job_highlights", {}).get("Responsibilities", []),
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Live Job 2 details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get job details: {str(e)}")

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
