import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, JSON
from backend.app.database.session import Base

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_name = Column(String(100), nullable=False)
    version = Column(String(50), unique=True, index=True, nullable=False)
    model_type = Column(String(50), nullable=False)  # conv_autoencoder, knn_embedding
    preprocessing_config = Column(JSON, nullable=False)
    threshold_config = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

