from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Header, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.core.config import settings
from backend.app.core.security import decode_access_token
from backend.app.models.user import User

security_bearer = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
        )
    
    return user

from backend.app.services.audit_logger import log_security_event

def verify_iot_api_key(x_api_key: Optional[str] = Header(None)) -> bool:
    """
    Validates IoT hardware/bridge API key for telemetry ingestion.
    Supports secure programmatic communication from Virtual Sensor Bridge and Tinkercad streams.
    """
    if not x_api_key:
        log_security_event(
            event_type="iot_api_key_invalid",
            severity="warning",
            actor_type="iot_device",
            actor_id="anonymous_bridge",
            resource="/telemetry/ingest",
            status="failure",
            details={"reason": "Missing X-API-KEY header"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-KEY header for IoT telemetry stream",
        )
    if x_api_key != settings.IOT_API_KEY:
        log_security_event(
            event_type="iot_api_key_invalid",
            severity="critical",
            actor_type="iot_device",
            actor_id="unauthorized_bridge",
            resource="/telemetry/ingest",
            status="failure",
            details={"reason": "Key mismatch"},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid IoT device API key",
        )
    return True

