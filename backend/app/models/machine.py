import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class Machine(Base):
    __tablename__ = "machines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    machine_identifier = Column(String(100), unique=True, index=True, nullable=False)
    machine_name = Column(String(255), nullable=False)
    machine_type = Column(String(100), nullable=False)  # fan, pump, valve, slide_rail
    description = Column(Text, nullable=True)
    status = Column(String(50), default="normal", nullable=False)  # normal, warning, critical, offline
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="machines")
    analyses = relationship("Analysis", back_populates="machine", cascade="all, delete-orphan", order_by="desc(Analysis.created_at)")
    telemetry_logs = relationship("MachineTelemetry", back_populates="machine", cascade="all, delete-orphan", order_by="desc(MachineTelemetry.timestamp)")

