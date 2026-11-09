import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "PulseGuard Industrial Acoustic AI"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "pulseguard-super-secret-key-change-in-production-min-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ALGORITHM: str = "HS256"
    
    # CORS
    ALLOWED_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://[::1]:5173,"
        "http://localhost:3000,http://127.0.0.1:3000,http://[::1]:3000,"
        "http://localhost:8000,http://127.0.0.1:8000,http://[::1]:8000"
    )
    
    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    # Database
    DATABASE_URL: str = "sqlite:///./pulseguard.db"

    # File uploads
    MAX_UPLOAD_SIZE_MB: int = 15
    
    # ML & Audio
    SAMPLE_RATE: int = 16000
    N_FFT: int = 1024
    HOP_LENGTH: int = 512
    N_MELS: int = 128
    F_MIN: float = 0.0
    F_MAX: float = 8000.0
    
    # Model Artifact Paths
    MODEL_PATH: str = "backend/app/ml/artifacts/cae_fan_model.pt"
    KNN_INDEX_PATH: str = "backend/app/ml/artifacts/knn_reference_bank.pkl"
    THRESHOLDS_CONFIG_PATH: str = "backend/app/ml/artifacts/calibrated_thresholds.json"

    # IoT Telemetry Security
    IOT_API_KEY: str = "pulseguard-iot-device-secret-key-demo-2026"

settings = Settings()

