from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token

def register_user(db: Session, user_in: UserCreate) -> User:
    normalized_email = user_in.email.strip().lower()
    normalized_username = user_in.username.strip()

    if len(user_in.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    db_user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )

    db_username = db.query(User).filter(func.lower(User.username) == normalized_username.lower()).first()
    if db_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken. Please choose another."
        )

    allowed_roles = ["student", "teacher", "admin"]
    raw_role = user_in.role.strip().lower() if user_in.role else "student"
    role = raw_role if raw_role in allowed_roles else "student"
    
    user = User(
        email=normalized_email,
        username=normalized_username,
        full_name=user_in.full_name.strip(),
        hashed_password=get_password_hash(user_in.password),
        role=role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, login_in: UserLogin):
    normalized_input = login_in.email.strip()
    user = db.query(User).filter(
        (func.lower(User.email) == normalized_input.lower()) |
        (User.username == normalized_input)
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated. Please contact support."
        )
    if not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    
    access_token = create_access_token(user.id, role=user.role)
    refresh_token = create_refresh_token(user.id, role=user.role)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

