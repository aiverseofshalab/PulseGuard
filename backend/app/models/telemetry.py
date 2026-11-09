import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class MachineTelemetry(Base):
    __tablename__ = "machine_telemetry"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    machine_id = Column(String(36), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False, index=True)
    rpm = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    vibration_indicator = Column(Float, nullable=False)
    operating_status = Column(String(50), default="running", nullable=False)
    is_simulated = Column(Boolean, default=True, nullable=False)
    source = Column(String(50), default="software_simulator", nullable=False)  # software_simulator, tinkercad_bridge
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    machine = relationship("Machine", back_populates="telemetry_logs")

