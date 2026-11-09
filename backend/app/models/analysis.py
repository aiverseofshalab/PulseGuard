import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    machine_id = Column(String(36), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    anomaly_score = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    status = Column(String(50), nullable=False)  # normal, warning, critical, insufficient_quality, model_unavailable
    audio_quality = Column(String(50), default="valid", nullable=False)  # valid, clipped, low_snr, silent
    model_version = Column(String(100), default="cae-v1.0.0", nullable=False)
    recording_duration = Column(Float, default=0.0, nullable=False)
    recommendation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    machine = relationship("Machine", back_populates="analyses")
    user = relationship("User", back_populates="analyses")
    metrics = relationship("AnalysisMetric", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    operator_notes = relationship("OperatorNote", back_populates="analysis", cascade="all, delete-orphan")

class AnalysisMetric(Base):
    __tablename__ = "analysis_metrics"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), unique=True, nullable=False)
    reconstruction_error = Column(Float, nullable=False)
    knn_distance = Column(Float, nullable=True)
    inference_time_ms = Column(Float, nullable=False)
    feature_metadata = Column(JSON, nullable=True)

    analysis = relationship("Analysis", back_populates="metrics")

class OperatorNote(Base):
    __tablename__ = "operator_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    analysis = relationship("Analysis", back_populates="operator_notes")
    user = relationship("User", back_populates="operator_notes")
