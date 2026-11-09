from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class TelemetryIngestRequest(BaseModel):
    machine_identifier: str = Field(..., description="Machine identifier (e.g. FAN-BAY-01)")
    rpm: float = Field(..., ge=0, le=20000, description="Rotational speed in RPM")
    temperature: float = Field(..., ge=-50, le=250, description="Temperature in Celsius")
    vibration_indicator: float = Field(..., ge=0, le=100, description="Vibration intensity proxy [0-100]")
    operating_status: Optional[str] = Field(default="running", description="Status: running, stopped, warning, critical")
    source: Optional[str] = Field(default="tinkercad_bridge", description="Source: tinkercad_bridge, software_simulator, manual_import")

class TelemetryResponse(BaseModel):
    id: str
    machine_id: str
    machine_identifier: Optional[str] = None
    rpm: float
    temperature: float
    vibration_indicator: float
    operating_status: str
    is_simulated: bool
    source: str
    timestamp: datetime

    class Config:
        from_attributes = True

class SimulatorControlRequest(BaseModel):
    scenario: str = Field(..., description="Scenario: normal, warning, overheat, high_vibration, speed_surge, stopped")
    base_rpm: Optional[float] = None
    base_temperature: Optional[float] = None
    base_vibration: Optional[float] = None

class HealthFusionAssessment(BaseModel):
    machine_id: str
    machine_identifier: str
    acoustic_anomaly_score: float
    acoustic_status: str
    telemetry_temperature: float
    telemetry_vibration: float
    telemetry_rpm: float
    combined_health_state: str  # optimal, degraded, warning, critical
    diagnostic_explanation: str
    evidence_breakdown: List[str]
    timestamp: datetime
