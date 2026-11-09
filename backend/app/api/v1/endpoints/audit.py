from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.audit import SecurityAuditLog
from backend.app.api.deps import get_current_user

router = APIRouter()

@router.get("/logs")
def get_security_audit_logs(
    severity: Optional[str] = Query(None, description="Filter by severity: info, warning, critical"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    search: Optional[str] = Query(None, description="Search actor or resource"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves structured security audit logs.
    Restricted to authenticated engineers or administrators.
    """
    if current_user.role not in ["engineer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to engineering or administrative personnel.",
        )

    query = db.query(SecurityAuditLog)

    if severity and severity != "all":
        query = query.filter(SecurityAuditLog.severity == severity)
    if event_type and event_type != "all":
        query = query.filter(SecurityAuditLog.event_type == event_type)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (SecurityAuditLog.actor_id.ilike(search_pattern))
            | (SecurityAuditLog.resource.ilike(search_pattern))
            | (SecurityAuditLog.event_type.ilike(search_pattern))
        )

    total_count = query.count()
    logs = query.order_by(SecurityAuditLog.timestamp.desc()).offset(offset).limit(limit).all()

    return {
        "total": total_count,
        "offset": offset,
        "limit": limit,
        "items": [
            {
                "id": log.id,
                "timestamp": log.timestamp.isoformat(),
                "event_type": log.event_type,
                "severity": log.severity,
                "actor_type": log.actor_type,
                "actor_id": log.actor_id,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "resource": log.resource,
                "status": log.status,
                "details": log.details,
            }
            for log in logs
        ],
    }

@router.get("/summary")
def get_audit_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns security posture summary and metrics for the Security Audit Dashboard.
    """
    if current_user.role not in ["engineer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to engineering or administrative personnel.",
        )

    total_events = db.query(SecurityAuditLog).count()
    critical_events = db.query(SecurityAuditLog).filter(SecurityAuditLog.severity == "critical").count()
    warning_events = db.query(SecurityAuditLog).filter(SecurityAuditLog.severity == "warning").count()
    info_events = db.query(SecurityAuditLog).filter(SecurityAuditLog.severity == "info").count()

    failed_logins = (
        db.query(SecurityAuditLog)
        .filter(SecurityAuditLog.event_type == "auth_login_failed")
        .count()
    )
    successful_logins = (
        db.query(SecurityAuditLog)
        .filter(SecurityAuditLog.event_type == "auth_login_success")
        .count()
    )
    unauthorized_requests = (
        db.query(SecurityAuditLog)
        .filter(SecurityAuditLog.event_type.in_(["unauthorized_access", "iot_api_key_invalid"]))
        .count()
    )

    # Calculate overall security posture rating
    if critical_events > 5 or failed_logins > 15:
        posture = "ELEVATED_RISK"
    elif warning_events > 10 or failed_logins > 5:
        posture = "MODERATE_OBSERVATION"
    else:
        posture = "SECURE_NOMINAL"

    return {
        "total_events": total_events,
        "critical_events": critical_events,
        "warning_events": warning_events,
        "info_events": info_events,
        "failed_logins": failed_logins,
        "successful_logins": successful_logins,
        "unauthorized_requests": unauthorized_requests,
        "security_posture": posture,
        "retention_policy": "90 Days Encrypted Read-Only Audit Retention",
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }
