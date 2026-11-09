import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON
from backend.app.database.session import Base

class SecurityAuditLog(Base):
    __tablename__ = "security_audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)  # auth_login_success, auth_login_failed, auth_registered, iot_api_key_invalid, unauthorized_access, machine_created, scenario_injected, report_generated, admin_action
    severity = Column(String(20), default="info", nullable=False, index=True)  # info, warning, critical
    actor_type = Column(String(50), default="user", nullable=False)  # user, iot_device, system, anonymous
    actor_id = Column(String(255), nullable=True, index=True)  # user email/id or device identifier
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    resource = Column(String(255), nullable=True)
    status = Column(String(50), default="success", nullable=False)  # success, failure
    details = Column(JSON, nullable=True)  # Contextual sanitized details (never secrets or passwords)
