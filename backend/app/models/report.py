import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class MaintenanceReport(Base):
    __tablename__ = "maintenance_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_identifier = Column(String(100), unique=True, index=True, nullable=False)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    machine_id = Column(String(36), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)  # normal, warning, critical
    summary = Column(Text, nullable=True)
    report_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    analysis = relationship("Analysis")
    machine = relationship("Machine")
    user = relationship("User")
