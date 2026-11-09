import asyncio
from typing import List, Dict, Set
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.machine import Machine
from backend.app.models.telemetry import MachineTelemetry
from backend.app.models.analysis import Analysis
from backend.app.schemas.telemetry import (
    TelemetryIngestRequest,
    TelemetryResponse,
    HealthFusionAssessment,
)
from backend.app.api.deps import verify_iot_api_key, get_current_user

router = APIRouter()

# WebSocket active connection manager per machine_id
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, machine_id: str, websocket: WebSocket):
        await websocket.accept()
        if machine_id not in self.active_connections:
            self.active_connections[machine_id] = set()
        self.active_connections[machine_id].add(websocket)

    def disconnect(self, machine_id: str, websocket: WebSocket):
        if machine_id in self.active_connections:
            self.active_connections[machine_id].discard(websocket)
            if not self.active_connections[machine_id]:
                del self.active_connections[machine_id]

    async def broadcast_to_machine(self, machine_id: str, data: dict):
        if machine_id in self.active_connections:
            dead_sockets = set()
            for ws in self.active_connections[machine_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead_sockets.add(ws)
            for dead in dead_sockets:
                self.active_connections[machine_id].discard(dead)

ws_manager = ConnectionManager()

@router.post("/ingest", response_model=TelemetryResponse, status_code=status.HTTP_201_CREATED)
async def ingest_telemetry(
    req: TelemetryIngestRequest,
    authenticated: bool = Depends(verify_iot_api_key),
    db: Session = Depends(get_db),
):
    """
    Ingestion endpoint for Autodesk Tinkercad Arduino Uno bridge and virtual sensor bridge.
    Requires X-API-KEY header for device verification.
    """
    machine = db.query(Machine).filter(Machine.machine_identifier == req.machine_identifier.upper()).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with identifier '{req.machine_identifier}' is not registered.",
        )

    telemetry = MachineTelemetry(
        machine_id=machine.id,
        rpm=req.rpm,
        temperature=req.temperature,
        vibration_indicator=req.vibration_indicator,
        operating_status=req.operating_status or "running",
        is_simulated=True,
        source=req.source or "tinkercad_bridge",
        timestamp=datetime.utcnow(),
    )
    db.add(telemetry)
    db.commit()
    db.refresh(telemetry)

    # Broadcast to connected WebSockets in real time
    broadcast_payload = {
        "id": telemetry.id,
        "machine_id": machine.id,
        "machine_identifier": machine.machine_identifier,
        "rpm": telemetry.rpm,
        "temperature": telemetry.temperature,
        "vibration_indicator": telemetry.vibration_indicator,
        "operating_status": telemetry.operating_status,
        "is_simulated": True,
        "source": telemetry.source,
        "timestamp": telemetry.timestamp.isoformat(),
    }
    await ws_manager.broadcast_to_machine(machine.id, broadcast_payload)

    return TelemetryResponse(
        id=telemetry.id,
        machine_id=telemetry.machine_id,
        machine_identifier=machine.machine_identifier,
        rpm=telemetry.rpm,
        temperature=telemetry.temperature,
        vibration_indicator=telemetry.vibration_indicator,
        operating_status=telemetry.operating_status,
        is_simulated=telemetry.is_simulated,
        source=telemetry.source,
        timestamp=telemetry.timestamp,
    )

@router.get("/machines/{machine_id}/latest", response_model=TelemetryResponse)
def get_latest_telemetry(
    machine_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    machine = db.query(Machine).filter(
        Machine.id == machine_id,
        Machine.user_id == current_user.id,
    ).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found.")

    latest = (
        db.query(MachineTelemetry)
        .filter(MachineTelemetry.machine_id == machine.id)
        .order_by(MachineTelemetry.timestamp.desc())
        .first()
    )

    if not latest:
        # Default nominal simulated state if no records exist
        return TelemetryResponse(
            id="sim-default",
            machine_id=machine.id,
            machine_identifier=machine.machine_identifier,
            rpm=2400.0,
            temperature=42.0,
            vibration_indicator=18.0,
            operating_status="running",
            is_simulated=True,
            source="software_simulator",
            timestamp=datetime.utcnow(),
        )

    return TelemetryResponse(
        id=latest.id,
        machine_id=latest.machine_id,
        machine_identifier=machine.machine_identifier,
        rpm=latest.rpm,
        temperature=latest.temperature,
        vibration_indicator=latest.vibration_indicator,
        operating_status=latest.operating_status,
        is_simulated=latest.is_simulated,
        source=latest.source,
        timestamp=latest.timestamp,
    )

@router.get("/machines/{machine_id}/history", response_model=List[TelemetryResponse])
def get_telemetry_history(
    machine_id: str,
    limit: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    machine = db.query(Machine).filter(
        Machine.id == machine_id,
        Machine.user_id == current_user.id,
    ).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found.")

    records = (
        db.query(MachineTelemetry)
        .filter(MachineTelemetry.machine_id == machine.id)
        .order_by(MachineTelemetry.timestamp.desc())
        .limit(limit)
        .all()
    )

    return [
        TelemetryResponse(
            id=r.id,
            machine_id=r.machine_id,
            machine_identifier=machine.machine_identifier,
            rpm=r.rpm,
            temperature=r.temperature,
            vibration_indicator=r.vibration_indicator,
            operating_status=r.operating_status,
            is_simulated=r.is_simulated,
            source=r.source,
            timestamp=r.timestamp,
        )
        for r in reversed(records)
    ]

@router.get("/machines/{machine_id}/health-fusion", response_model=HealthFusionAssessment)
def get_health_fusion_assessment(
    machine_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Explainable Multi-Sensor Health Fusion Engine.
    Combines primary acoustic deep learning score with IoT telemetry evidence
    (thermal surge, vibration proxy, and RPM deviation).
    """
    machine = db.query(Machine).filter(
        Machine.id == machine_id,
        Machine.user_id == current_user.id,
    ).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found.")

    latest_analysis = (
        db.query(Analysis)
        .filter(Analysis.machine_id == machine.id)
        .order_by(Analysis.created_at.desc())
        .first()
    )

    latest_telem = (
        db.query(MachineTelemetry)
        .filter(MachineTelemetry.machine_id == machine.id)
        .order_by(MachineTelemetry.timestamp.desc())
        .first()
    )

    acoustic_score = latest_analysis.anomaly_score if latest_analysis else 0.0
    acoustic_status = latest_analysis.status if latest_analysis else "normal"

    temp = latest_telem.temperature if latest_telem else 42.0
    vib = latest_telem.vibration_indicator if latest_telem else 18.0
    rpm = latest_telem.rpm if latest_telem else 2400.0

    evidence = []
    # Primary acoustic evaluation
    if acoustic_score >= 80.0 or acoustic_status == "critical":
        evidence.append(f"Primary acoustic CAE detected high reconstruction error (Score: {acoustic_score:.1f}/100)")
    elif acoustic_score >= 50.0 or acoustic_status == "warning":
        evidence.append(f"Primary acoustic CAE detected atypical harmonic spectral energy (Score: {acoustic_score:.1f}/100)")
    else:
        evidence.append(f"Acoustic emissions conform to normal operating envelope (Score: {acoustic_score:.1f}/100)")

    # Secondary IoT evidence
    if temp >= 75.0:
        evidence.append(f"Severe thermal surge ({temp:.1f}°C > 75.0°C limit)")
    elif temp >= 60.0:
        evidence.append(f"Elevated bearing temperature ({temp:.1f}°C > 60.0°C limit)")

    if vib >= 70.0:
        evidence.append(f"High mechanical vibration intensity ({vib:.1f}% proxy intensity)")
    elif vib >= 45.0:
        evidence.append(f"Moderate mechanical vibration detected ({vib:.1f}% proxy intensity)")

    if rpm > 3200.0:
        evidence.append(f"Over-speed condition ({rpm:.0f} RPM exceeds 3200 RPM limit)")

    # Combined state synthesis
    if acoustic_status == "critical" or temp >= 75.0 or vib >= 70.0:
        combined_state = "critical"
        explanation = (
            "CRITICAL MACHINE CONDITION: Multi-sensor fusion indicates high risk of impending mechanical degradation. "
            "Acoustic spectral distortion and/or secondary thermal/vibration thresholds are critically breached. "
            "Immediate shutdown and inspection recommended."
        )
    elif acoustic_status == "warning" or temp >= 60.0 or vib >= 45.0:
        combined_state = "warning"
        explanation = (
            "MAINTENANCE WARNING: Early-stage acoustic or operational deviations observed. "
            "Cross-sensor telemetry corroborates atypical operating stress. "
            "Schedule preventive bearing lubrication and airflow inspection."
        )
    else:
        combined_state = "optimal"
        explanation = (
            "OPTIMAL OPERATION: Both deep-learning acoustic anomaly scores and simulated IoT telemetry "
            "reside comfortably within normal engineering tolerances."
        )

    return HealthFusionAssessment(
        machine_id=machine.id,
        machine_identifier=machine.machine_identifier,
        acoustic_anomaly_score=acoustic_score,
        acoustic_status=acoustic_status,
        telemetry_temperature=temp,
        telemetry_vibration=vib,
        telemetry_rpm=rpm,
        combined_health_state=combined_state,
        diagnostic_explanation=explanation,
        evidence_breakdown=evidence,
        timestamp=datetime.utcnow(),
    )

@router.websocket("/ws/{machine_id}")
async def websocket_telemetry_stream(websocket: WebSocket, machine_id: str):
    await ws_manager.connect(machine_id, websocket)
    try:
        while True:
            # Keep socket alive and listen for client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(machine_id, websocket)
    except Exception:
        ws_manager.disconnect(machine_id, websocket)
