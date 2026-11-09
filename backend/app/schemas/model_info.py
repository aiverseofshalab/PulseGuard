from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class ModelInfoResponse(BaseModel):
    model_name: str
    model_version: str
    model_architecture: str
    is_ready: bool
    weights_path: str
    supported_machine_categories: List[str]
    preprocessing_spec: Dict[str, Any]
    calibrated_thresholds: Dict[str, Any]
    knn_baseline_ready: bool
    last_calibrated_at: Optional[datetime] = None

class DashboardSummaryResponse(BaseModel):
    total_machines: int
    total_recordings_analyzed: int
    normal_count: int
    warning_count: int
    critical_count: int
    recent_analyses: List[Dict[str, Any]]
    machine_status_breakdown: Dict[str, int]
    system_health_status: str
