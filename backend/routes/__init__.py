"""
Routes Package
Contains modular route handlers for the CareerQuest API
"""

from .auth import (
    auth_router,
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    UserRegister,
    UserLogin,
    TokenResponse,
    ProfileUpdate
)

__all__ = [
    'auth_router',
    'hash_password',
    'verify_password', 
    'create_access_token',
    'get_current_user',
    'UserRegister',
    'UserLogin',
    'TokenResponse',
    'ProfileUpdate'
]
