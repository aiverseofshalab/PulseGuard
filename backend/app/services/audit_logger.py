from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.audit import SecurityAuditLog
from backend.app.database.session import SessionLocal

def log_security_event(
    event_type: str,
    severity: str = "info",
    actor_type: str = "user",
    actor_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    resource: Optional[str] = None,
    status: str = "success",
    details: Optional[Dict[str, Any]] = None,
    db: Optional[Session] = None,
):
    """
    Persists a sanitized security audit event to the security_audit_logs table.
    Ensures passwords, tokens, API keys, or sensitive payloads are never stored.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        # Sanitize details
        safe_details = {}
        if details:
            for k, v in details.items():
                if any(secret in k.lower() for secret in ["password", "token", "secret", "key", "authorization"]):
                    safe_details[k] = "[REDACTED]"
                else:
                    safe_details[k] = v

        entry = SecurityAuditLog(
            event_type=event_type,
            severity=severity,
            actor_type=actor_type,
            actor_id=actor_id,
            ip_address=ip_address,
            user_agent=user_agent,
            resource=resource,
            status=status,
            details=safe_details if safe_details else None,
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        print(f"[AUDIT LOG ERROR] Failed to record security event: {e}")
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        if should_close:
            db.close()
