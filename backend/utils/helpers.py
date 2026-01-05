"""
Utility/Helper functions for CareerQuest API
"""
import bcrypt
import jwt
import os
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'default-secret-key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION = int(os.environ.get('JWT_EXPIRATION_HOURS', '24'))


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_access_token(data: dict) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request, db) -> dict:
    """
    Get the current authenticated user from request.
    Supports both JWT tokens and session tokens (from Google OAuth).
    """
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


async def get_admin_user(request: Request, db) -> dict:
    """Get the current user and verify they have admin role."""
    user = await get_current_user(request, db)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def calculate_profile_completeness(user: dict) -> dict:
    """Calculate profile completeness percentage and return missing fields."""
    required_fields = {
        'name': 'Name',
        'email': 'Email',
        'phone': 'Phone Number',
        'location': 'Location',
        'primary_technology': 'Primary Technology',
        'sub_technologies': 'Sub Technologies',
        'salary_min': 'Minimum Salary',
        'salary_max': 'Maximum Salary',
        'tax_type': 'Tax Type (W2/1099/C2C)',
        'job_type_preferences': 'Job Type Preferences'
    }
    
    filled_count = 0
    missing_fields = []
    
    for field, label in required_fields.items():
        value = user.get(field)
        if value:
            if isinstance(value, list) and len(value) > 0:
                filled_count += 1
            elif not isinstance(value, list):
                filled_count += 1
            else:
                missing_fields.append(label)
        else:
            missing_fields.append(label)
    
    percentage = int((filled_count / len(required_fields)) * 100)
    
    return {
        "percentage": percentage,
        "missing_fields": missing_fields,
        "is_complete": percentage >= 80
    }
