from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class AnalysisMetricResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    reconstruction_error: float
    knn_distance: Optional[float]
    inference_time_ms: float
    feature_metadata: Optional[Dict[str, Any]] = None

class OperatorNoteCreate(BaseModel):
    note: str = Field(..., min_length=1, max_length=2000)

class OperatorNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    analysis_id: str
    user_id: str
    note: str
    created_at: datetime

class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    machine_id: str
    machine_name: Optional[str] = None
    machine_identifier: Optional[str] = None
    machine_type: Optional[str] = None
    user_id: str
    anomaly_score: float
    threshold: float
    status: str
    audio_quality: str
    model_version: str
    recording_duration: float
    recommendation: Optional[str]
    created_at: datetime
    metrics: Optional[AnalysisMetricResponse] = None
    operator_notes: Optional[List[OperatorNoteResponse]] = []

class AnalysisVisualizationResponse(BaseModel):
    analysis_id: str
    sample_rate: int
    duration_seconds: float
    waveform: List[float]  # Downsampled for fast browser visualization
    spectrogram_shape: List[int]
    mel_spectrogram_preview: List[List[float]]  # Downsampled 2D grid for client rendering
    reconstructed_preview: Optional[List[List[float]]] = None
    error_residual_preview: Optional[List[List[float]]] = None

class AnalysisListResponse(BaseModel):
    items: List[AnalysisResponse]
    total: int

