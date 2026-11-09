from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserProfileResponse,
)
from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
)
from backend.app.api.deps import get_current_user
from backend.app.services.audit_logger import log_security_event

router = APIRouter()

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegisterRequest, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        log_security_event(
            event_type="auth_register_failed",
            severity="warning",
            actor_type="anonymous",
            actor_id=req.email.lower(),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            resource="/auth/register",
            status="failure",
            details={"reason": "Email already registered"},
            db=db,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )
    
    user = User(
        email=req.email.lower(),
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name or req.email.split("@")[0].capitalize(),
        role=req.role or "operator",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_security_event(
        event_type="auth_registered",
        severity="info",
        actor_type="user",
        actor_id=user.email,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        resource="/auth/register",
        status="success",
        details={"role": user.role},
        db=db,
    )

    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )

@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        log_security_event(
            event_type="auth_login_failed",
            severity="warning",
            actor_type="anonymous",
            actor_id=req.email.lower(),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            resource="/auth/login",
            status="failure",
            details={"attempted_email": req.email.lower()},
            db=db,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    log_security_event(
        event_type="auth_login_success",
        severity="info",
        actor_type="user",
        actor_id=user.email,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        resource="/auth/login",
        status="success",
        details={"role": user.role},
        db=db,
    )

    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )

@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

