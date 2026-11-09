import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, JSON
from backend.app.database.session import Base

class DiagnosticSnapshot(Base):
    __tablename__ = "diagnostic_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    overall_status = Column(String(50), nullable=False)  # Operational, Degraded, Unavailable
    execution_time_ms = Column(Float, nullable=False, default=0.0)
    results = Column(JSON, nullable=False)  # Detailed dictionary of service checks
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
