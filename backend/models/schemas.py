"""
Pydantic models/schemas for the CareerQuest API
"""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime


# ============ USER MODELS ============

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


# ============ RESUME MODELS ============

class ResumeCreate(BaseModel):
    original_content: str
    file_name: str


class ResumeUpdate(BaseModel):
    tailored_content: Optional[str] = None
    target_job_title: Optional[str] = None
    target_job_description: Optional[str] = None


class TailorResumeRequest(BaseModel):
    resume_id: str
    job_title: str
    job_description: str
    company_name: Optional[str] = ""
    focus_areas: List[str] = []


class OptimizeResumeRequest(BaseModel):
    target_role: Optional[str] = ""
    generate_versions: bool = False


class GenerateCoverLetterRequest(BaseModel):
    resume_id: str
    job_title: str
    job_description: str
    company_name: str


# ============ JOB PORTAL MODELS ============

class JobPortalCreate(BaseModel):
    name: str
    url: str
    technology: str
    description: Optional[str] = None


# ============ APPLICATION MODELS ============

class JobApplicationCreate(BaseModel):
    job_portal_id: str
    job_title: str
    job_description: str
    company_name: str
    resume_id: str
    cover_letter: Optional[str] = None


# ============ EMAIL MODELS ============

class EmailCreate(BaseModel):
    application_id: str
    subject: str
    content: str
    email_type: str  # sent, received, scheduled


class EmailReplyRequest(BaseModel):
    application_id: str
    original_email: str
    tone: str = "professional"
    key_points: List[str] = []


# ============ AUTO-APPLY MODELS ============

class AutoApplySettings(BaseModel):
    resume_id: str
    job_keywords: List[str] = []
    locations: List[str] = []
    max_applications_per_day: int = 10
    auto_tailor_resume: bool = True
    enabled: bool = False


class AutoApplySettingsUpdate(BaseModel):
    resume_id: Optional[str] = None
    job_keywords: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    max_applications_per_day: Optional[int] = None
    auto_tailor_resume: Optional[bool] = None
    enabled: Optional[bool] = None


# ============ LIVE JOB SEARCH MODELS ============

class LiveJobSearchRequest(BaseModel):
    query: str
    location: Optional[str] = "United States"
    page: int = 1
    num_pages: int = 1
    employment_types: Optional[str] = None
