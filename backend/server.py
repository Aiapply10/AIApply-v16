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
import asyncio

# Scheduler imports
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

# Job Scraper
from utils.job_scraper import job_scraper

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

# Initialize the scheduler
scheduler = AsyncIOScheduler()

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
    technologies: List[str] = []
    company_name: Optional[str] = ""
    custom_prompt: Optional[str] = None  # Custom AI command/prompt
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

# Auto-Apply Models
class AutoApplySettings(BaseModel):
    enabled: bool = False
    resume_id: str = ""
    job_keywords: List[str] = []
    locations: List[str] = ["United States"]
    employment_types: List[str] = ["FULL_TIME"]
    min_salary: Optional[int] = None
    max_applications_per_day: int = 10
    auto_tailor_resume: bool = True

class AutoApplySettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    resume_id: Optional[str] = None
    job_keywords: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    employment_types: Optional[List[str]] = None
    min_salary: Optional[int] = None
    max_applications_per_day: Optional[int] = None
    auto_tailor_resume: Optional[bool] = None

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


@api_router.post("/auth/profile-photo")
async def upload_profile_photo(request: Request, file: UploadFile = File(...)):
    """Upload and update user profile photo."""
    user = await get_current_user(request)
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image."
        )
    
    # Validate file size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")
    
    # Convert to base64 data URL for storage
    import base64
    file_extension = file.content_type.split('/')[-1]
    base64_data = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_data}"
    
    # Update user profile with the photo
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "profile_picture": data_url,
                "picture": data_url,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Fetch updated user
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password": 0})
    
    return {
        "message": "Profile photo updated successfully",
        "profile_picture": data_url,
        "user": updated_user
    }


@api_router.delete("/auth/profile-photo")
async def delete_profile_photo(request: Request):
    """Remove user profile photo."""
    user = await get_current_user(request)
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {
                "profile_picture": None,
                "picture": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Profile photo removed successfully"}


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
Company: {data.company_name or 'Not specified'}
Technologies: {', '.join(data.technologies) if data.technologies else 'Not specified'}

Job Description:
{data.job_description}

Return ONLY a comma-separated list of keywords, nothing else."""

    keywords_message = UserMessage(text=keywords_prompt)
    extracted_keywords = await chat.send_message(keywords_message)
    
    # Use custom prompt if provided, otherwise use default
    if data.custom_prompt:
        prompt = f"""{data.custom_prompt}

ORIGINAL RESUME:
{resume['original_content']}

TARGET KEYWORDS (incorporate these naturally):
{extracted_keywords}

Return ONLY the tailored resume content, formatted as plain text with clear section headers."""
    else:
        # Main tailoring prompt
        prompt = f"""Tailor the following resume for the position of {data.job_title} at {data.company_name or 'the company'}.

TARGET KEYWORDS TO INCORPORATE (from job description):
{extracted_keywords}

REQUIRED TECHNOLOGIES TO HIGHLIGHT:
{', '.join(data.technologies) if data.technologies else 'As mentioned in the job description'}

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
async def generate_word_resume(resume_id: str, request: Request):
    """Generate a Word document from the tailored resume"""
    user = await get_current_user(request)
    
    # Try to get custom content from request body
    body = {}
    try:
        body = await request.json()
    except:
        pass
    
    custom_content = body.get("content")
    version = body.get("version", "default")
    
    resume = await db.resumes.find_one(
        {"resume_id": resume_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Get content - priority: custom_content > version > tailored > original
    if custom_content:
        content = custom_content
    elif version != "default" and resume.get("versions"):
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
    Requires user to have primary_technology set.
    """
    user = await get_current_user(request)
    
    # Check if user has required profile fields
    if not user.get('primary_technology'):
        return {
            "recommendations": [],
            "message": "Please update your profile with Primary Technology to get personalized job recommendations.",
            "requires_profile_update": True,
            "missing_fields": ["primary_technology"]
        }
    
    primary_tech = user.get("primary_technology", "")
    sub_techs = user.get("sub_technologies", [])
    user_location = user.get("location", "United States")
    
    try:
        # Use web scraper to fetch real jobs from multiple sources
        logger.info(f"Scraping jobs for: {primary_tech} in {user_location}")
        
        # Scrape from all sources
        scraped_jobs = await job_scraper.scrape_all_sources(
            query=primary_tech,
            location=user_location,
            limit_per_source=10
        )
        
        if scraped_jobs:
            logger.info(f"Found {len(scraped_jobs)} jobs from web scraping")
            return {
                "recommendations": scraped_jobs[:20],  # Limit to 20 jobs
                "total": len(scraped_jobs),
                "based_on": {
                    "primary_technology": primary_tech,
                    "sub_technologies": sub_techs
                },
                "sources": ["Indeed", "Dice", "RemoteOK", "Arbeitnow"],
                "data_source": "live_scraping"
            }
        
        # If scraping returned nothing, try sub-technologies
        if sub_techs:
            for sub_tech in sub_techs[:2]:
                more_jobs = await job_scraper.scrape_all_sources(
                    query=sub_tech,
                    location=user_location,
                    limit_per_source=5
                )
                scraped_jobs.extend(more_jobs)
        
        if scraped_jobs:
            # Remove duplicates
            seen_ids = set()
            unique_jobs = []
            for job in scraped_jobs:
                if job['job_id'] not in seen_ids:
                    seen_ids.add(job['job_id'])
                    unique_jobs.append(job)
            
            return {
                "recommendations": unique_jobs[:20],
                "total": len(unique_jobs),
                "based_on": {
                    "primary_technology": primary_tech,
                    "sub_technologies": sub_techs
                },
                "sources": ["Indeed", "Dice", "RemoteOK", "Arbeitnow"],
                "data_source": "live_scraping"
            }
    
    except Exception as e:
        logger.error(f"Error scraping jobs: {str(e)}")
    
    # Fallback to sample jobs if scraping fails
    def get_sample_jobs(tech):
        sample_jobs = [
            {
                "job_id": f"sample_1_{tech.lower()}",
                "title": f"Senior {tech} Developer",
                "company": "TechCorp Inc.",
                "company_logo": "https://ui-avatars.com/api/?name=TC&background=6366f1&color=fff",
                "location": "San Francisco, CA",
                "employment_type": "Full-time",
                "salary_min": 150000,
                "salary_max": 200000,
                "description": f"We are looking for an experienced {tech} developer to join our team. You will be working on cutting-edge projects with modern technologies.",
                "apply_link": "https://example.com/apply",
                "posted_date": datetime.now(timezone.utc).isoformat(),
                "is_remote": True,
                "matched_technology": tech,
                "source": "Sample"
            },
            {
                "job_id": f"sample_2_{tech.lower()}",
                "title": f"{tech} Software Engineer",
                "company": "Innovation Labs",
                "company_logo": "https://ui-avatars.com/api/?name=IL&background=8b5cf6&color=fff",
                "location": "New York, NY",
                "employment_type": "Full-time",
                "salary_min": 130000,
                "salary_max": 180000,
                "description": f"Join our dynamic team as a {tech} Software Engineer. Work on scalable solutions and collaborate with talented engineers.",
                "apply_link": "https://example.com/apply",
                "posted_date": datetime.now(timezone.utc).isoformat(),
                "is_remote": False,
                "matched_technology": tech,
                "source": "Sample"
            },
            {
                "job_id": f"sample_3_{tech.lower()}",
                "title": f"Lead {tech} Engineer",
                "company": "StartupX",
                "company_logo": "https://ui-avatars.com/api/?name=SX&background=ec4899&color=fff",
                "location": "Austin, TX",
                "employment_type": "Full-time",
                "salary_min": 160000,
                "salary_max": 220000,
                "description": f"Looking for a Lead {tech} Engineer to drive technical decisions and mentor junior developers. Remote-friendly position.",
                "apply_link": "https://example.com/apply",
                "posted_date": datetime.now(timezone.utc).isoformat(),
                "is_remote": True,
                "matched_technology": tech,
                "source": "Sample"
            },
            {
                "job_id": f"sample_4_{tech.lower()}",
                "title": f"{tech} Backend Developer",
                "company": "CloudScale Systems",
                "company_logo": "https://ui-avatars.com/api/?name=CS&background=14b8a6&color=fff",
                "location": "Seattle, WA",
                "employment_type": "Full-time",
                "salary_min": 140000,
                "salary_max": 190000,
                "description": f"Build robust backend services using {tech}. Experience with cloud platforms and microservices architecture preferred.",
                "apply_link": "https://example.com/apply",
                "posted_date": datetime.now(timezone.utc).isoformat(),
                "is_remote": True,
                "matched_technology": tech,
                "source": "Sample"
            },
            {
                "job_id": f"sample_5_{tech.lower()}",
                "title": f"Full Stack {tech} Developer",
                "company": "Digital Solutions Co",
                "company_logo": "https://ui-avatars.com/api/?name=DS&background=f59e0b&color=fff",
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_min": 120000,
                "salary_max": 170000,
                "description": f"Full stack role focusing on {tech} for backend with React frontend. Great benefits and flexible work schedule.",
                "apply_link": "https://example.com/apply",
                "posted_date": datetime.now(timezone.utc).isoformat(),
                "is_remote": True,
                "matched_technology": tech,
                "source": "Sample"
            }
        ]
        return sample_jobs
    
    return {
        "recommendations": get_sample_jobs(primary_tech),
        "total": 5,
        "based_on": {
            "primary_technology": primary_tech,
            "sub_technologies": sub_techs
        },
        "data_source": "sample_fallback",
        "message": "Showing sample jobs. Live job scraping temporarily unavailable."
    }
    if primary_tech:
        search_queries.append(f"{primary_tech} developer")
    
    # Add sub-technology searches
    for sub_tech in sub_techs[:2]:
        search_queries.append(f"{sub_tech} developer")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            all_jobs = []
            api_error = None
            
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
                    
                    # Check for API quota exceeded
                    if data.get("status") == "error" or "exceeded" in str(data.get("message", "")).lower():
                        api_error = data.get("message", "API quota exceeded")
                        break
                    
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
            
            # If API failed or returned no jobs, use sample data
            if api_error or not all_jobs:
                return {
                    "recommendations": get_sample_jobs(primary_tech),
                    "total": 5,
                    "based_on": {
                        "primary_technology": primary_tech,
                        "sub_technologies": sub_techs
                    },
                    "api_status": f"Using sample data - {api_error or 'No jobs found'}"
                }
            
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
        # Return sample jobs on any error
        return {
            "recommendations": get_sample_jobs(primary_tech),
            "total": 5,
            "based_on": {
                "primary_technology": primary_tech,
                "sub_technologies": sub_techs
            },
            "api_status": f"Using sample data - API error: {str(e)}"
        }

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

# ============ LIVE JOBS 2 (LinkedIn Job Search API) ============

# Configuration for Live Jobs 2 API
LIVEJOBS2_API_KEY = os.environ.get('LIVEJOBS2_API_KEY', '')
LIVEJOBS2_API_HOST = os.environ.get('LIVEJOBS2_API_HOST', 'linkedin-job-search-api.p.rapidapi.com')

@api_router.get("/live-jobs-2/search")
async def search_live_jobs_2(
    request: Request,
    query: Optional[str] = None,
    location: str = "United States",
    employment_type: Optional[str] = None,
    page: int = 1
):
    """
    Search jobs from LinkedIn Job Search API.
    """
    user = await get_current_user(request)
    
    # Get API keys at request time
    api_key = os.environ.get('LIVEJOBS2_API_KEY')
    api_host = os.environ.get('LIVEJOBS2_API_HOST', 'linkedin-job-search-api.p.rapidapi.com')
    
    if not api_key:
        return {
            "jobs": [],
            "total": 0,
            "page": page,
            "message": "Live Jobs 2 API not configured. Please provide LIVEJOBS2_API_KEY in backend/.env"
        }
    
    search_query = query or user.get('primary_technology', 'Software Developer')
    offset = (page - 1) * 10
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            # LinkedIn Job Search API endpoint
            response = await http_client.get(
                f"https://{api_host}/active-jb-24h",
                params={
                    "limit": 10,
                    "offset": offset,
                    "title_filter": f'"{search_query}"',
                    "location_filter": f'"{location}"',
                    "description_type": "text"
                },
                headers={
                    "X-RapidAPI-Key": api_key,
                    "X-RapidAPI-Host": api_host
                }
            )
            
            if response.status_code != 200:
                logger.warning(f"Live Jobs 2 API returned status {response.status_code}")
                return {"jobs": [], "total": 0, "page": page}
            
            jobs_data = response.json()
            if not isinstance(jobs_data, list):
                jobs_data = jobs_data.get("data", [])
            
            jobs = []
            for job in jobs_data:
                # Parse location from locations_derived
                location_str = ""
                if job.get("locations_derived"):
                    location_str = job["locations_derived"][0] if job["locations_derived"] else ""
                elif job.get("cities_derived"):
                    location_str = job["cities_derived"][0]
                    if job.get("regions_derived"):
                        location_str += f", {job['regions_derived'][0]}"
                
                # Parse salary
                salary_min = None
                salary_max = None
                salary_currency = "USD"
                salary_period = ""
                if job.get("salary_raw") and job["salary_raw"].get("value"):
                    salary_value = job["salary_raw"]["value"]
                    salary_min = salary_value.get("minValue")
                    salary_max = salary_value.get("maxValue")
                    salary_currency = job["salary_raw"].get("currency", "USD")
                    salary_period = salary_value.get("unitText", "")
                
                # Parse employment type
                emp_type = ""
                if job.get("employment_type"):
                    emp_type = job["employment_type"][0] if isinstance(job["employment_type"], list) else job["employment_type"]
                
                description = job.get("description_text", "")
                
                jobs.append({
                    "job_id": job.get("id", str(uuid.uuid4())),
                    "title": job.get("title", ""),
                    "company": job.get("organization", ""),
                    "company_logo": job.get("organization_logo", ""),
                    "location": location_str,
                    "country": job["countries_derived"][0] if job.get("countries_derived") else "",
                    "description": description[:500] + "..." if len(description) > 500 else description,
                    "full_description": description,
                    "employment_type": emp_type,
                    "is_remote": job.get("remote_derived", False),
                    "apply_link": job.get("url") or job.get("external_apply_url", ""),
                    "posted_at": job.get("date_posted", ""),
                    "salary_min": salary_min,
                    "salary_max": salary_max,
                    "salary_currency": salary_currency,
                    "salary_period": salary_period,
                    "source": "LinkedIn",
                    "required_skills": [],
                    "industry": job.get("linkedin_org_industry", ""),
                    "company_size": job.get("linkedin_org_size", ""),
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
    Get job recommendations from LinkedIn Job Search API based on user's profile.
    Requires user to have primary_technology set.
    """
    user = await get_current_user(request)
    
    # Check if user has required profile fields
    if not user.get('primary_technology'):
        return {
            "recommendations": [],
            "message": "Please update your profile with Primary Technology to get personalized job recommendations.",
            "requires_profile_update": True,
            "missing_fields": ["primary_technology"]
        }
    
    primary_tech = user.get('primary_technology')
    sub_techs = user.get('sub_technologies', [])
    
    # Sample jobs fallback when API is unavailable
    def get_sample_jobs_linkedin(tech):
        sample_jobs = [
            {
                "job_id": f"linkedin_sample_1_{tech.lower()}",
                "title": f"Senior {tech} Engineer",
                "company": "Meta Platforms",
                "company_logo": "https://ui-avatars.com/api/?name=MP&background=0866ff&color=fff",
                "location": "Menlo Park, CA",
                "employment_type": "Full-time",
                "salary_min": 180000,
                "salary_max": 250000,
                "description": f"Join Meta as a Senior {tech} Engineer. Work on products that connect billions of people worldwide.",
                "apply_link": "https://careers.meta.com",
                "posted_date": datetime.now(timezone.utc).isoformat(),
                "is_remote": True,
                "matched_technology": tech,
                "source": "LinkedIn (Sample)",
                "industry": "Technology"
            },
            {
                "job_id": f"linkedin_sample_2_{tech.lower()}",
                "title": f"{tech} Developer - Remote",
                "company": "Google LLC",
                "company_logo": "https://ui-avatars.com/api/?name=G&background=4285f4&color=fff",
                "location": "Mountain View, CA",
                "employment_type": "Full-time",
                "salary_min": 170000,
                "salary_max": 240000,
                "description": f"Google is hiring {tech} Developers to build next-generation products. Remote-friendly position with excellent benefits.",
                "apply_link": "https://careers.google.com",
                "posted_date": datetime.now(timezone.utc).isoformat(),
                "is_remote": True,
                "matched_technology": tech,
                "source": "LinkedIn (Sample)",
                "industry": "Technology"
            },
            {
                "job_id": f"linkedin_sample_3_{tech.lower()}",
                "title": f"Staff {tech} Engineer",
                "company": "Amazon",
                "company_logo": "https://ui-avatars.com/api/?name=A&background=ff9900&color=fff",
                "location": "Seattle, WA",
                "employment_type": "Full-time",
                "salary_min": 200000,
                "salary_max": 300000,
                "description": f"Amazon Web Services is looking for a Staff {tech} Engineer to drive technical initiatives and mentor teams.",
                "apply_link": "https://amazon.jobs",
                "posted_date": datetime.now(timezone.utc).isoformat(),
                "is_remote": False,
                "matched_technology": tech,
                "source": "LinkedIn (Sample)",
                "industry": "Cloud Computing"
            },
            {
                "job_id": f"linkedin_sample_4_{tech.lower()}",
                "title": f"{tech} Software Architect",
                "company": "Microsoft",
                "company_logo": "https://ui-avatars.com/api/?name=MS&background=00a4ef&color=fff",
                "location": "Redmond, WA",
                "employment_type": "Full-time",
                "salary_min": 190000,
                "salary_max": 280000,
                "description": f"Design and implement {tech} solutions at scale. Lead architectural decisions for cloud-native applications.",
                "apply_link": "https://careers.microsoft.com",
                "posted_date": datetime.now(timezone.utc).isoformat(),
                "is_remote": True,
                "matched_technology": tech,
                "source": "LinkedIn (Sample)",
                "industry": "Technology"
            },
            {
                "job_id": f"linkedin_sample_5_{tech.lower()}",
                "title": f"Principal {tech} Engineer",
                "company": "Netflix",
                "company_logo": "https://ui-avatars.com/api/?name=N&background=e50914&color=fff",
                "location": "Los Gatos, CA",
                "employment_type": "Full-time",
                "salary_min": 220000,
                "salary_max": 350000,
                "description": f"Netflix is seeking a Principal {tech} Engineer to lead streaming infrastructure development.",
                "apply_link": "https://jobs.netflix.com",
                "posted_date": datetime.now(timezone.utc).isoformat(),
                "is_remote": True,
                "matched_technology": tech,
                "source": "LinkedIn (Sample)",
                "industry": "Entertainment"
            }
        ]
        return sample_jobs
    
    api_key = os.environ.get('LIVEJOBS2_API_KEY')
    api_host = os.environ.get('LIVEJOBS2_API_HOST', 'linkedin-job-search-api.p.rapidapi.com')
    
    if not api_key:
        return {
            "recommendations": get_sample_jobs_linkedin(primary_tech),
            "user_technology": primary_tech,
            "api_status": "Sample data - API not configured"
        }
    
    # Get user's technologies
    user_technologies = [primary_tech]
    if sub_techs:
        user_technologies.extend(sub_techs[:2])
    
    all_recommendations = []
    api_error = None
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            for tech in user_technologies[:2]:  # Limit to 2 searches
                response = await http_client.get(
                    f"https://{api_host}/active-jb-24h",
                    params={
                        "limit": 5,
                        "offset": 0,
                        "title_filter": f'"{tech}"',
                        "location_filter": '"United States"',
                        "description_type": "text"
                    },
                    headers={
                        "X-RapidAPI-Key": api_key,
                        "X-RapidAPI-Host": api_host
                    }
                )
                
                if response.status_code == 200:
                    jobs_data = response.json()
                    
                    # Check for quota exceeded error
                    if isinstance(jobs_data, dict) and 'message' in jobs_data:
                        api_error = jobs_data.get('message', 'API error')
                        break
                    
                    if not isinstance(jobs_data, list):
                        jobs_data = jobs_data.get("data", [])
                    
                    for job in jobs_data[:5]:
                        # Parse location
                        location_str = ""
                        if job.get("locations_derived"):
                            location_str = job["locations_derived"][0] if job["locations_derived"] else ""
                        elif job.get("cities_derived"):
                            location_str = job["cities_derived"][0]
                            if job.get("regions_derived"):
                                location_str += f", {job['regions_derived'][0]}"
                        
                        # Parse salary
                        salary_min = None
                        salary_max = None
                        salary_currency = "USD"
                        salary_period = ""
                        if job.get("salary_raw") and job["salary_raw"].get("value"):
                            salary_value = job["salary_raw"]["value"]
                            salary_min = salary_value.get("minValue")
                            salary_max = salary_value.get("maxValue")
                            salary_currency = job["salary_raw"].get("currency", "USD")
                            salary_period = salary_value.get("unitText", "")
                        
                        # Parse employment type
                        emp_type = ""
                        if job.get("employment_type"):
                            emp_type = job["employment_type"][0] if isinstance(job["employment_type"], list) else job["employment_type"]
                        
                        description = job.get("description_text", "")
                        
                        all_recommendations.append({
                            "job_id": job.get("id", str(uuid.uuid4())),
                            "title": job.get("title", ""),
                            "company": job.get("organization", ""),
                            "company_logo": job.get("organization_logo", ""),
                            "location": location_str,
                            "country": job["countries_derived"][0] if job.get("countries_derived") else "",
                            "description": description[:500] + "..." if len(description) > 500 else description,
                            "full_description": description,
                            "employment_type": emp_type,
                            "is_remote": job.get("remote_derived", False),
                            "apply_link": job.get("url") or job.get("external_apply_url", ""),
                            "posted_at": job.get("date_posted", ""),
                            "salary_min": salary_min,
                            "salary_max": salary_max,
                            "salary_currency": salary_currency,
                            "salary_period": salary_period,
                            "source": "LinkedIn",
                            "required_skills": [],
                            "matched_technology": tech,
                            "industry": job.get("linkedin_org_industry", ""),
                            "company_size": job.get("linkedin_org_size", ""),
                        })
        
        # Check if we got API error or no results - fall back to sample data
        if api_error or not all_recommendations:
            return {
                "recommendations": get_sample_jobs_linkedin(primary_tech),
                "user_technology": primary_tech,
                "api_status": f"Using sample data - {api_error or 'No jobs found from API'}"
            }
        
        return {
            "recommendations": all_recommendations[:10],
            "user_technology": primary_tech
        }
        
    except Exception as e:
        logger.error(f"Error getting Live Jobs 2 recommendations: {str(e)}")
        return {
            "recommendations": get_sample_jobs_linkedin(primary_tech),
            "user_technology": primary_tech,
            "api_status": f"Using sample data - API error: {str(e)}"
        }

@api_router.get("/live-jobs-2/{job_id}")
async def get_live_job_2_details(job_id: str, request: Request):
    """
    Get detailed information about a specific job from LinkedIn Job Search API.
    """
    await get_current_user(request)
    
    # For LinkedIn Job Search API, job details are typically included in search results
    # This endpoint can be extended if the API provides a dedicated details endpoint
    return {
        "job_id": job_id,
        "message": "Job details are included in search results. Use the search or recommendations endpoint."
    }

# ============ AUTO-APPLY FEATURE ============

@api_router.get("/auto-apply/settings")
async def get_auto_apply_settings(request: Request):
    """Get user's auto-apply settings"""
    user = await get_current_user(request)
    
    settings = await db.auto_apply_settings.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not settings:
        # Return default settings
        return {
            "user_id": user["user_id"],
            "enabled": False,
            "resume_id": "",
            "job_keywords": [user.get("primary_technology", "Software Developer")],
            "locations": ["United States"],
            "employment_types": ["FULL_TIME"],
            "min_salary": None,
            "max_applications_per_day": 10,
            "auto_tailor_resume": True,
            "last_run": None,
            "total_applications": 0
        }
    
    return settings

@api_router.post("/auto-apply/settings")
async def update_auto_apply_settings(data: AutoApplySettingsUpdate, request: Request):
    """Update user's auto-apply settings"""
    user = await get_current_user(request)
    
    # Get existing settings or create new
    existing = await db.auto_apply_settings.find_one({"user_id": user["user_id"]})
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["user_id"] = user["user_id"]
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if existing:
        await db.auto_apply_settings.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_data}
        )
    else:
        update_data["created_at"] = datetime.now(timezone.utc).isoformat()
        update_data["last_run"] = None
        update_data["total_applications"] = 0
        await db.auto_apply_settings.insert_one(update_data)
    
    return {"message": "Settings updated successfully", "settings": update_data}

@api_router.post("/auto-apply/toggle")
async def toggle_auto_apply(request: Request):
    """Toggle auto-apply on/off"""
    user = await get_current_user(request)
    
    settings = await db.auto_apply_settings.find_one({"user_id": user["user_id"]})
    
    if settings:
        new_status = not settings.get("enabled", False)
        await db.auto_apply_settings.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"enabled": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        new_status = True
        await db.auto_apply_settings.insert_one({
            "user_id": user["user_id"],
            "enabled": True,
            "resume_id": "",
            "job_keywords": [user.get("primary_technology", "Software Developer")],
            "locations": ["United States"],
            "employment_types": ["FULL_TIME"],
            "min_salary": None,
            "max_applications_per_day": 10,
            "auto_tailor_resume": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_run": None,
            "total_applications": 0
        })
    
    return {"enabled": new_status, "message": f"Auto-apply {'enabled' if new_status else 'disabled'}"}

@api_router.get("/auto-apply/history")
async def get_auto_apply_history(request: Request, limit: int = 50):
    """Get user's auto-apply history"""
    user = await get_current_user(request)
    
    history = await db.auto_applications.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("applied_at", -1).limit(limit).to_list(limit)
    
    return {"history": history, "total": len(history)}

@api_router.post("/auto-apply/run")
async def run_auto_apply(request: Request):
    """
    Manually trigger auto-apply process.
    Fetches jobs based on user settings, tailors resume, and records applications.
    """
    user = await get_current_user(request)
    user_id = user["user_id"]
    
    # Get user's auto-apply settings
    settings = await db.auto_apply_settings.find_one({"user_id": user_id})
    
    if not settings:
        raise HTTPException(status_code=400, detail="Please configure auto-apply settings first")
    
    if not settings.get("resume_id"):
        raise HTTPException(status_code=400, detail="Please select a resume for auto-apply")
    
    # Check if auto-apply is enabled
    if not settings.get("enabled", False):
        raise HTTPException(status_code=400, detail="Auto-apply is disabled. Please enable it first.")
    
    # Get the user's resume
    resume = await db.resumes.find_one(
        {"resume_id": settings["resume_id"], "user_id": user_id},
        {"_id": 0}
    )
    
    if not resume:
        raise HTTPException(status_code=404, detail="Selected resume not found")
    
    # Check daily limit
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_applications = await db.auto_applications.count_documents({
        "user_id": user_id,
        "applied_at": {"$gte": today_start.isoformat()}
    })
    
    max_daily = settings.get("max_applications_per_day", 10)
    remaining = max_daily - today_applications
    
    if remaining <= 0:
        return {
            "message": f"Daily limit of {max_daily} applications reached",
            "applied_count": 0,
            "applications": []
        }
    
    # Fetch jobs from LinkedIn API or fallback to JSearch
    api_key = os.environ.get('LIVEJOBS2_API_KEY')
    api_host = os.environ.get('LIVEJOBS2_API_HOST', 'linkedin-job-search-api.p.rapidapi.com')
    jsearch_api_key = os.environ.get('RAPIDAPI_KEY')
    
    job_keywords = settings.get("job_keywords", ["Software Developer"])
    locations = settings.get("locations", ["United States"])
    
    all_jobs = []
    api_source = "LinkedIn"
    
    # Try LinkedIn API first
    if api_key:
        try:
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                for keyword in job_keywords[:2]:
                    for location in locations[:2]:
                        response = await http_client.get(
                            f"https://{api_host}/active-jb-24h",
                            params={
                                "limit": 10,
                                "offset": 0,
                                "title_filter": f'"{keyword}"',
                                "location_filter": f'"{location}"',
                                "description_type": "text"
                            },
                            headers={
                                "X-RapidAPI-Key": api_key,
                                "X-RapidAPI-Host": api_host
                            }
                        )
                        
                        if response.status_code == 200:
                            jobs_data = response.json()
                            # Check for quota exceeded error
                            if isinstance(jobs_data, dict) and 'message' in jobs_data:
                                logger.warning(f"LinkedIn API error: {jobs_data.get('message')}")
                                break
                            if isinstance(jobs_data, list):
                                all_jobs.extend(jobs_data)
        except Exception as e:
            logger.error(f"Error fetching from LinkedIn API: {str(e)}")
    
    # Fallback to JSearch API if LinkedIn fails or returns no jobs
    if not all_jobs and jsearch_api_key:
        api_source = "JSearch"
        try:
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                for keyword in job_keywords[:2]:
                    response = await http_client.get(
                        "https://jsearch.p.rapidapi.com/search",
                        params={
                            "query": f"{keyword} in {locations[0] if locations else 'United States'}",
                            "page": "1",
                            "num_pages": "1"
                        },
                        headers={
                            "X-RapidAPI-Key": jsearch_api_key,
                            "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
                        }
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        jobs_from_jsearch = data.get("data", [])[:10]
                        # Transform JSearch format to match our processing
                        for job in jobs_from_jsearch:
                            all_jobs.append({
                                "id": job.get("job_id"),
                                "title": job.get("job_title"),
                                "organization": job.get("employer_name"),
                                "description_text": job.get("job_description", ""),
                                "locations_derived": [f"{job.get('job_city', '')}, {job.get('job_state', '')}"],
                                "url": job.get("job_apply_link"),
                                "external_apply_url": job.get("job_apply_link"),
                                "salary_raw": {
                                    "value": {
                                        "minValue": job.get("job_min_salary"),
                                        "maxValue": job.get("job_max_salary")
                                    }
                                } if job.get("job_min_salary") else None
                            })
        except Exception as e:
            logger.error(f"Error fetching from JSearch API: {str(e)}")
    
    if not all_jobs:
        return {
            "message": "No jobs found. Both LinkedIn and JSearch APIs returned no results.",
            "applied_count": 0,
            "applications": []
        }
    
    # Filter out already applied jobs
    applied_job_ids = await db.auto_applications.distinct(
        "job_id",
        {"user_id": user_id}
    )
    
    new_jobs = [j for j in all_jobs if j.get("id") not in applied_job_ids][:remaining]
    
    if not new_jobs:
        return {
            "message": "No new jobs found matching your criteria",
            "applied_count": 0,
            "applications": []
        }
    
    applications = []
    original_content = resume.get('original_content', '')
    
    # Process each job
    for job in new_jobs:
        try:
            job_id = job.get("id", str(uuid.uuid4()))
            job_title = job.get("title", "")
            company = job.get("organization", "")
            description = job.get("description_text", "")[:2000]  # Limit description length
            
            # Parse location
            location_str = ""
            if job.get("locations_derived"):
                location_str = job["locations_derived"][0]
            elif job.get("cities_derived"):
                location_str = job["cities_derived"][0]
            
            # Parse salary
            salary_info = ""
            if job.get("salary_raw") and job["salary_raw"].get("value"):
                salary_value = job["salary_raw"]["value"]
                if salary_value.get("minValue") and salary_value.get("maxValue"):
                    salary_info = f"${salary_value['minValue']:,} - ${salary_value['maxValue']:,}"
            
            tailored_content = original_content
            keywords_extracted = ""
            
            # Auto-tailor resume if enabled
            if settings.get("auto_tailor_resume", True) and description:
                try:
                    system_message = """You are an expert ATS resume optimizer. Transform resumes to match job requirements while maintaining authenticity. Focus on:
1. Matching keywords from the job description
2. Highlighting relevant experience
3. Using industry-standard formatting
4. Quantifying achievements where possible"""
                    
                    chat = LlmChat(
                        api_key=EMERGENT_LLM_KEY,
                        session_id=f"auto_tailor_{job_id}_{uuid.uuid4().hex[:8]}",
                        system_message=system_message
                    ).with_model("openai", "gpt-5.2")
                    
                    # Extract keywords
                    keywords_prompt = f"""Extract the top 15 most important keywords from this job posting for ATS optimization:

Job Title: {job_title}
Company: {company}
Description: {description[:1500]}

Return ONLY a comma-separated list of keywords."""
                    
                    keywords_message = UserMessage(text=keywords_prompt)
                    keywords_extracted = await chat.send_message(keywords_message)
                    
                    # Tailor resume
                    tailor_prompt = f"""Tailor this resume for the following job. Make it ATS-friendly and incorporate relevant keywords.

JOB DETAILS:
Title: {job_title}
Company: {company}
Key Requirements: {description[:1000]}

KEYWORDS TO INCORPORATE: {keywords_extracted}

ORIGINAL RESUME:
{original_content}

Return ONLY the tailored resume content."""
                    
                    tailor_message = UserMessage(text=tailor_prompt)
                    tailored_content = await chat.send_message(tailor_message)
                    
                except Exception as e:
                    logger.error(f"Error tailoring resume for job {job_id}: {str(e)}")
                    tailored_content = original_content
            
            # Create auto-application record
            application_record = {
                "application_id": f"auto_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "job_id": job_id,
                "job_title": job_title,
                "company": company,
                "location": location_str,
                "salary_info": salary_info,
                "job_description": description[:500],
                "apply_link": job.get("url") or job.get("external_apply_url", ""),
                "resume_id": settings["resume_id"],
                "tailored_content": tailored_content,
                "keywords_extracted": keywords_extracted,
                "status": "ready_to_apply",
                "applied_at": datetime.now(timezone.utc).isoformat(),
                "source": api_source,
                "auto_applied": True,
                "ats_optimized": True if tailored_content != original_content else False
            }
            
            await db.auto_applications.insert_one(application_record)
            
            # Also record in main applications collection
            await db.applications.insert_one({
                "application_id": application_record["application_id"],
                "user_id": user_id,
                "job_portal_id": "linkedin_auto",
                "job_title": job_title,
                "company_name": company,
                "job_description": description[:500],
                "resume_id": settings["resume_id"],
                "cover_letter": "",
                "status": "ready_to_apply",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "auto_applied": True,
                "apply_link": application_record["apply_link"]
            })
            
            applications.append({
                "application_id": application_record["application_id"],
                "job_id": job_id,
                "job_title": job_title,
                "company": company,
                "location": location_str,
                "apply_link": application_record["apply_link"],
                "status": "ready_to_apply"
            })
            
        except Exception as e:
            logger.error(f"Error processing job {job.get('id')}: {str(e)}")
            continue
    
    # Update settings with last run info
    await db.auto_apply_settings.update_one(
        {"user_id": user_id},
        {
            "$set": {"last_run": datetime.now(timezone.utc).isoformat()},
            "$inc": {"total_applications": len(applications)}
        }
    )
    
    return {
        "message": f"Successfully processed {len(applications)} job applications",
        "applied_count": len(applications),
        "applications": applications,
        "remaining_today": remaining - len(applications)
    }

@api_router.get("/auto-apply/status")
async def get_auto_apply_status(request: Request):
    """Get current auto-apply status including today's progress"""
    user = await get_current_user(request)
    user_id = user["user_id"]
    
    settings = await db.auto_apply_settings.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if not settings:
        return {
            "enabled": False,
            "configured": False,
            "today_applications": 0,
            "max_daily": 10,
            "remaining": 10,
            "last_run": None,
            "total_applications": 0
        }
    
    # Count today's applications
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_applications = await db.auto_applications.count_documents({
        "user_id": user_id,
        "applied_at": {"$gte": today_start.isoformat()}
    })
    
    max_daily = settings.get("max_applications_per_day", 10)
    
    return {
        "enabled": settings.get("enabled", False),
        "configured": bool(settings.get("resume_id")),
        "today_applications": today_applications,
        "max_daily": max_daily,
        "remaining": max(0, max_daily - today_applications),
        "last_run": settings.get("last_run"),
        "total_applications": settings.get("total_applications", 0),
        "resume_id": settings.get("resume_id", ""),
        "job_keywords": settings.get("job_keywords", []),
        "locations": settings.get("locations", [])
    }


# ============ SCHEDULER MANAGEMENT ENDPOINTS ============

@api_router.get("/scheduler/status")
async def get_scheduler_status():
    """Get the current status of the auto-apply scheduler."""
    jobs = scheduler.get_jobs()
    
    job_info = []
    for job in jobs:
        job_info.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger)
        })
    
    return {
        "scheduler_running": scheduler.running,
        "jobs": job_info,
        "timezone": "UTC"
    }


@api_router.post("/scheduler/trigger")
async def trigger_scheduled_auto_apply(request: Request):
    """Manually trigger the scheduled auto-apply for testing (admin only)."""
    user = await get_current_user(request)
    
    # For now, allow any authenticated user to trigger their own
    # In production, you might want to add admin check
    
    # Run for just this user
    settings = await db.auto_apply_settings.find_one(
        {"user_id": user["user_id"], "enabled": True},
        {"_id": 0}
    )
    
    if not settings:
        raise HTTPException(status_code=400, detail="Auto-apply is not enabled for your account")
    
    # Process in background
    asyncio.create_task(process_auto_apply_for_user(user["user_id"], settings))
    
    return {
        "message": "Scheduled auto-apply triggered successfully",
        "note": "Processing will continue in the background"
    }


@api_router.get("/scheduler/logs")
async def get_scheduler_logs(request: Request, limit: int = 20):
    """Get scheduler run logs for the current user."""
    user = await get_current_user(request)
    
    logs = await db.scheduler_logs.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("run_at", -1).limit(limit).to_list(limit)
    
    return {"logs": logs}


@api_router.post("/auto-apply/schedule-settings")
async def update_schedule_settings(request: Request):
    """Update the user's preferred schedule time for auto-apply."""
    user = await get_current_user(request)
    data = await request.json()
    
    preferred_hour = data.get("preferred_hour", 6)  # Default 6 AM UTC
    
    if not 0 <= preferred_hour <= 23:
        raise HTTPException(status_code=400, detail="Hour must be between 0 and 23")
    
    await db.auto_apply_settings.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"preferred_schedule_hour": preferred_hour}},
        upsert=True
    )
    
    return {
        "message": f"Schedule preference updated to {preferred_hour}:00 UTC",
        "preferred_hour": preferred_hour
    }


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

# ============ SCHEDULER FUNCTIONS ============

async def scheduled_auto_apply_for_all_users():
    """
    Scheduled task that runs daily to auto-apply for all users with enabled auto-apply.
    This function processes each user who has auto-apply enabled.
    """
    logger.info("Starting scheduled auto-apply job for all users...")
    
    try:
        # Find all users with auto-apply enabled
        enabled_settings = await db.auto_apply_settings.find(
            {"enabled": True},
            {"_id": 0}
        ).to_list(1000)
        
        if not enabled_settings:
            logger.info("No users have auto-apply enabled. Skipping.")
            return
        
        logger.info(f"Found {len(enabled_settings)} users with auto-apply enabled")
        
        for settings in enabled_settings:
            user_id = settings.get("user_id")
            if not user_id:
                continue
                
            try:
                await process_auto_apply_for_user(user_id, settings)
            except Exception as e:
                logger.error(f"Error processing auto-apply for user {user_id}: {str(e)}")
                continue
                
        logger.info("Scheduled auto-apply job completed")
        
    except Exception as e:
        logger.error(f"Error in scheduled auto-apply job: {str(e)}")


async def process_auto_apply_for_user(user_id: str, settings: dict):
    """
    Process auto-apply for a single user.
    """
    logger.info(f"Processing auto-apply for user: {user_id}")
    
    if not settings.get("resume_id"):
        logger.warning(f"User {user_id} has no resume selected. Skipping.")
        return
    
    # Get the user's resume
    resume = await db.resumes.find_one(
        {"resume_id": settings["resume_id"], "user_id": user_id},
        {"_id": 0}
    )
    
    if not resume:
        logger.warning(f"Resume not found for user {user_id}. Skipping.")
        return
    
    # Check daily limit
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_applications = await db.auto_applications.count_documents({
        "user_id": user_id,
        "applied_at": {"$gte": today_start.isoformat()}
    })
    
    max_daily = settings.get("max_applications_per_day", 10)
    remaining = max_daily - today_applications
    
    if remaining <= 0:
        logger.info(f"User {user_id} has reached daily limit of {max_daily}. Skipping.")
        return
    
    # Fetch jobs from LinkedIn API
    api_key = os.environ.get('LIVEJOBS2_API_KEY')
    api_host = os.environ.get('LIVEJOBS2_API_HOST', 'linkedin-job-search-api.p.rapidapi.com')
    
    if not api_key:
        logger.error("Job search API not configured")
        return
    
    job_keywords = settings.get("job_keywords", ["Software Developer"])
    locations = settings.get("locations", ["United States"])
    
    all_jobs = []
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            for keyword in job_keywords[:2]:
                for location in locations[:2]:
                    response = await http_client.get(
                        f"https://{api_host}/active-jb-24h",
                        params={
                            "limit": 10,
                            "offset": 0,
                            "title_filter": f'"{keyword}"',
                            "location_filter": f'"{location}"',
                            "description_type": "text"
                        },
                        headers={
                            "X-RapidAPI-Key": api_key,
                            "X-RapidAPI-Host": api_host
                        }
                    )
                    
                    if response.status_code == 200:
                        jobs_data = response.json()
                        if isinstance(jobs_data, list):
                            all_jobs.extend(jobs_data)
    except Exception as e:
        logger.error(f"Error fetching jobs for user {user_id}: {str(e)}")
        return
    
    # Filter out already applied jobs
    applied_job_ids = await db.auto_applications.distinct(
        "job_id",
        {"user_id": user_id}
    )
    
    new_jobs = [j for j in all_jobs if j.get("id") not in applied_job_ids][:remaining]
    
    if not new_jobs:
        logger.info(f"No new jobs found for user {user_id}")
        return
    
    applications_count = 0
    original_content = resume.get('original_content', '')
    
    # Process each job
    for job in new_jobs:
        try:
            job_id = job.get("id", str(uuid.uuid4()))
            job_title = job.get("title", "")
            company = job.get("organization", "")
            description = job.get("description_text", "")[:2000]
            
            location_str = ""
            if job.get("locations_derived"):
                location_str = job["locations_derived"][0]
            elif job.get("cities_derived"):
                location_str = job["cities_derived"][0]
            
            salary_info = ""
            if job.get("salary_raw") and job["salary_raw"].get("value"):
                salary_value = job["salary_raw"]["value"]
                if salary_value.get("minValue") and salary_value.get("maxValue"):
                    salary_info = f"${salary_value['minValue']:,} - ${salary_value['maxValue']:,}"
            
            tailored_content = original_content
            keywords_extracted = ""
            
            # Auto-tailor resume if enabled
            if settings.get("auto_tailor_resume", True) and description:
                try:
                    system_message = """You are an expert ATS resume optimizer. Transform resumes to match job requirements while maintaining authenticity."""
                    
                    chat = LlmChat(
                        api_key=EMERGENT_LLM_KEY,
                        session_id=f"scheduled_auto_{job_id}_{uuid.uuid4().hex[:8]}",
                        system_message=system_message
                    ).with_model("openai", "gpt-5.2")
                    
                    keywords_prompt = f"""Extract the top 15 most important keywords from this job posting:

Job Title: {job_title}
Company: {company}
Description: {description[:1500]}

Return ONLY a comma-separated list of keywords."""
                    
                    keywords_message = UserMessage(text=keywords_prompt)
                    keywords_extracted = await chat.send_message(keywords_message)
                    
                    tailor_prompt = f"""Tailor this resume for the following job. Make it ATS-friendly.

JOB: {job_title} at {company}
Key Requirements: {description[:1000]}

KEYWORDS: {keywords_extracted}

RESUME:
{original_content}

Return ONLY the tailored resume content."""
                    
                    tailor_message = UserMessage(text=tailor_prompt)
                    tailored_content = await chat.send_message(tailor_message)
                    
                except Exception as e:
                    logger.error(f"Error tailoring resume for job {job_id}: {str(e)}")
                    tailored_content = original_content
            
            # Create auto-application record
            application_record = {
                "application_id": f"scheduled_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "job_id": job_id,
                "job_title": job_title,
                "company": company,
                "location": location_str,
                "salary_info": salary_info,
                "job_description": description[:500],
                "apply_link": job.get("url") or job.get("external_apply_url", ""),
                "resume_id": settings["resume_id"],
                "tailored_content": tailored_content,
                "keywords_extracted": keywords_extracted,
                "status": "ready_to_apply",
                "applied_at": datetime.now(timezone.utc).isoformat(),
                "source": "LinkedIn_Scheduled",
                "auto_applied": True,
                "scheduled": True
            }
            
            await db.auto_applications.insert_one(application_record)
            
            await db.applications.insert_one({
                "application_id": application_record["application_id"],
                "user_id": user_id,
                "job_portal_id": "linkedin_scheduled",
                "job_title": job_title,
                "company_name": company,
                "job_description": description[:500],
                "resume_id": settings["resume_id"],
                "cover_letter": "",
                "status": "ready_to_apply",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "auto_applied": True,
                "scheduled": True,
                "apply_link": application_record["apply_link"]
            })
            
            applications_count += 1
            
        except Exception as e:
            logger.error(f"Error processing job {job.get('id')} for user {user_id}: {str(e)}")
            continue
    
    # Update settings with last run info
    await db.auto_apply_settings.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "last_scheduled_run": datetime.now(timezone.utc).isoformat(),
                "last_run": datetime.now(timezone.utc).isoformat()
            },
            "$inc": {"total_applications": applications_count}
        }
    )
    
    # Log the scheduled run
    await db.scheduler_logs.insert_one({
        "log_id": str(uuid.uuid4()),
        "user_id": user_id,
        "run_type": "scheduled_auto_apply",
        "applications_count": applications_count,
        "run_at": datetime.now(timezone.utc).isoformat(),
        "status": "completed"
    })
    
    logger.info(f"Completed auto-apply for user {user_id}: {applications_count} applications")


@app.on_event("startup")
async def startup_event():
    """Start the scheduler when the app starts."""
    logger.info("Starting application and scheduler...")
    
    # Schedule the auto-apply job to run daily at 6:00 AM UTC
    scheduler.add_job(
        scheduled_auto_apply_for_all_users,
        CronTrigger(hour=6, minute=0),  # Run at 6:00 AM UTC daily
        id="daily_auto_apply",
        name="Daily Auto-Apply Job",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started. Daily auto-apply job scheduled for 6:00 AM UTC")


@app.on_event("shutdown")
async def shutdown_db_client():
    """Shutdown the scheduler and close DB connection."""
    logger.info("Shutting down scheduler...")
    scheduler.shutdown(wait=False)
    client.close()
