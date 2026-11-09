import os
from datetime import datetime
from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.ml.inference.infer import inference_service
from backend.app.schemas.model_info import ModelInfoResponse

router = APIRouter()

@router.get("/info", response_model=ModelInfoResponse)
def get_model_info():
    return ModelInfoResponse(
        model_name="PulseGuard Acoustic Convolutional Autoencoder",
        model_version=inference_service.model_version,
        model_architecture="4-Layer 2D ConvAutoencoder (Latent Dim: 64) with kNN Distance Baseline",
        is_ready=inference_service.is_model_ready,
        weights_path=settings.MODEL_PATH,
        supported_machine_categories=["fan", "pump", "valve", "slide_rail"],
        preprocessing_spec={
            "sample_rate": settings.SAMPLE_RATE,
            "n_fft": settings.N_FFT,
            "hop_length": settings.HOP_LENGTH,
            "n_mels": settings.N_MELS,
            "f_min": settings.F_MIN,
            "f_max": settings.F_MAX,
            "window": "hann",
            "scale": "log_mel_normalized",
        },
        calibrated_thresholds=inference_service.calibrated_thresholds,
        knn_baseline_ready=inference_service.is_knn_ready,
        last_calibrated_at=datetime.utcnow() if inference_service.is_model_ready else None,
    )

@router.get("/health")
def get_model_health():
    return {
        "status": "healthy" if inference_service.is_model_ready else "degraded",
        "model_loaded": inference_service.is_model_ready,
        "knn_loaded": inference_service.is_knn_ready,
        "thresholds_loaded": bool(inference_service.calibrated_thresholds),
        "device": str(inference_service.device),
    }

