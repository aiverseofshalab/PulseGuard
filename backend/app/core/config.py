import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    APP_NAME: str = "PulseGuard Industrial Acoustic AI"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = Field(default="development", env="APP_ENV")
    API_V1_PREFIX: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = Field(
        default="pulseguard-super-secret-key-change-in-production-min-32-chars",
        env="SECRET_KEY"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ALGORITHM: str = "HS256"
    
    # CORS
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
        env="ALLOWED_ORIGINS"
    )
    
    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    # Database
    DATABASE_URL: str = Field(
        default="sqlite:///./pulseguard.db",
        env="DATABASE_URL"
    )

    # File uploads
    MAX_UPLOAD_SIZE_MB: int = Field(default=15, env="MAX_UPLOAD_SIZE_MB")
    
    # ML & Audio
    SAMPLE_RATE: int = 16000
    N_FFT: int = 1024
    HOP_LENGTH: int = 512
    N_MELS: int = 128
    F_MIN: float = 0.0
    F_MAX: float = 8000.0
    
    # Model Artifact Paths
    MODEL_PATH: str = Field(
        default="backend/app/ml/artifacts/cae_fan_model.pt",
        env="MODEL_PATH"
    )
    KNN_INDEX_PATH: str = Field(
        default="backend/app/ml/artifacts/knn_reference_bank.pkl",
        env="KNN_INDEX_PATH"
    )
    THRESHOLDS_CONFIG_PATH: str = Field(
        default="backend/app/ml/artifacts/calibrated_thresholds.json",
        env="THRESHOLDS_CONFIG_PATH"
    )

    # IoT Telemetry Security
    IOT_API_KEY: str = Field(
        default="pulseguard-iot-device-secret-key-demo-2026",
        env="IOT_API_KEY"
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

