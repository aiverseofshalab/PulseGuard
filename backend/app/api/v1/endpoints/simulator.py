from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.machine import Machine
from backend.app.models.telemetry import MachineTelemetry
from backend.app.schemas.telemetry import (
    SimulatorControlRequest,
    TelemetryResponse,
)
from backend.app.api.deps import get_current_user
from backend.app.api.v1.endpoints.telemetry import ws_manager
from iot.bridge.virtual_sensor_bridge import SCENARIOS, generate_telemetry_reading

router = APIRouter()

@router.get("/scenarios")
def get_available_scenarios():
    return {
        "scenarios": [
            {
                "id": k,
                "name": k.replace("_", " ").title(),
                "base_rpm": v["rpm_base"],
                "base_temperature": v["temp_base"],
                "base_vibration": v["vib_base"],
                "expected_status": v["status"],
            }
            for k, v in SCENARIOS.items()
        ]
    }

@router.post("/machines/{machine_id}/trigger", response_model=TelemetryResponse)
async def trigger_machine_scenario(
    machine_id: str,
    req: SimulatorControlRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    machine = db.query(Machine).filter(
        Machine.id == machine_id,
        Machine.user_id == current_user.id,
    ).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found.")

    scenario = req.scenario.lower()
    if scenario not in SCENARIOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown scenario '{scenario}'. Available: {list(SCENARIOS.keys())}",
        )

    reading = generate_telemetry_reading(machine.machine_identifier, scenario)

    # Allow custom manual overrides from request if provided
    if req.base_rpm is not None:
        reading["rpm"] = req.base_rpm
    if req.base_temperature is not None:
        reading["temperature"] = req.base_temperature
    if req.base_vibration is not None:
        reading["vibration_indicator"] = req.base_vibration

    telemetry = MachineTelemetry(
        machine_id=machine.id,
        rpm=reading["rpm"],
        temperature=reading["temperature"],
        vibration_indicator=reading["vibration_indicator"],
        operating_status=reading["operating_status"],
        is_simulated=True,
        source="software_simulator",
        timestamp=datetime.utcnow(),
    )
    db.add(telemetry)
    db.commit()
    db.refresh(telemetry)

    # Push to live WebSocket
    broadcast_payload = {
        "id": telemetry.id,
        "machine_id": machine.id,
        "machine_identifier": machine.machine_identifier,
        "rpm": telemetry.rpm,
        "temperature": telemetry.temperature,
        "vibration_indicator": telemetry.vibration_indicator,
        "operating_status": telemetry.operating_status,
        "is_simulated": True,
        "source": "software_simulator",
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

