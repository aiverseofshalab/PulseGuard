from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.machine import Machine
from backend.app.models.analysis import Analysis
from backend.app.schemas.machine import (
    MachineCreateRequest,
    MachineUpdateRequest,
    MachineResponse,
    MachineListResponse,
)
from backend.app.api.deps import get_current_user
from backend.app.services.audit_logger import log_security_event

router = APIRouter()

@router.get("", response_model=MachineListResponse)
def list_machines(
    machine_type: Optional[str] = Query(None, description="Filter by type: fan, pump, valve, slide_rail"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Machine).filter(Machine.user_id == current_user.id)
    if machine_type:
        query = query.filter(Machine.machine_type == machine_type.lower())

    machines = query.order_by(Machine.created_at.desc()).all()
    items = []
    for m in machines:
        latest_analysis = (
            db.query(Analysis)
            .filter(Analysis.machine_id == m.id)
            .order_by(Analysis.created_at.desc())
            .first()
        )
        total_count = db.query(Analysis).filter(Analysis.machine_id == m.id).count()

        items.append(
            MachineResponse(
                id=m.id,
                user_id=m.user_id,
                machine_identifier=m.machine_identifier,
                machine_name=m.machine_name,
                machine_type=m.machine_type,
                description=m.description,
                status=m.status,
                created_at=m.created_at,
                updated_at=m.updated_at,
                total_analyses=total_count,
                latest_score=latest_analysis.anomaly_score if latest_analysis else None,
            )
        )

    return MachineListResponse(items=items, total=len(items))

@router.post("", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def create_machine(
    req: MachineCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    norm_id = req.machine_identifier.strip().upper()
    existing = db.query(Machine).filter(Machine.machine_identifier == norm_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Machine with identifier '{norm_id}' is already registered.",
        )

    machine = Machine(
        user_id=current_user.id,
        machine_identifier=norm_id,
        machine_name=req.machine_name.strip(),
        machine_type=req.machine_type.lower().strip(),
        description=req.description,
        status="normal",
    )
    db.add(machine)
    db.commit()
    db.refresh(machine)

    log_security_event(
        event_type="machine_created",
        severity="info",
        actor_type="user",
        actor_id=current_user.email,
        resource=f"/machines/{machine.id}",
        status="success",
        details={
            "machine_identifier": machine.machine_identifier,
            "machine_type": machine.machine_type,
        },
        db=db,
    )

    return MachineResponse(
        id=machine.id,
        user_id=machine.user_id,
        machine_identifier=machine.machine_identifier,
        machine_name=machine.machine_name,
        machine_type=machine.machine_type,
        description=machine.description,
        status=machine.status,
        created_at=machine.created_at,
        updated_at=machine.updated_at,
        total_analyses=0,
        latest_score=None,
    )

@router.get("/{machine_id}", response_model=MachineResponse)
def get_machine(
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

    latest_analysis = (
        db.query(Analysis)
        .filter(Analysis.machine_id == machine.id)
        .order_by(Analysis.created_at.desc())
        .first()
    )
    total_count = db.query(Analysis).filter(Analysis.machine_id == machine.id).count()

    return MachineResponse(
        id=machine.id,
        user_id=machine.user_id,
        machine_identifier=machine.machine_identifier,
        machine_name=machine.machine_name,
        machine_type=machine.machine_type,
        description=machine.description,
        status=machine.status,
        created_at=machine.created_at,
        updated_at=machine.updated_at,
        total_analyses=total_count,
        latest_score=latest_analysis.anomaly_score if latest_analysis else None,
    )

@router.patch("/{machine_id}", response_model=MachineResponse)
def update_machine(
    machine_id: str,
    req: MachineUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    machine = db.query(Machine).filter(
        Machine.id == machine_id,
        Machine.user_id == current_user.id,
    ).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found.")

    if req.machine_name is not None:
        machine.machine_name = req.machine_name.strip()
    if req.machine_type is not None:
        machine.machine_type = req.machine_type.lower().strip()
    if req.description is not None:
        machine.description = req.description
    if req.status is not None:
        machine.status = req.status

    db.commit()
    db.refresh(machine)

    total_count = db.query(Analysis).filter(Analysis.machine_id == machine.id).count()
    latest_analysis = (
        db.query(Analysis)
        .filter(Analysis.machine_id == machine.id)
        .order_by(Analysis.created_at.desc())
        .first()
    )

    return MachineResponse(
        id=machine.id,
        user_id=machine.user_id,
        machine_identifier=machine.machine_identifier,
        machine_name=machine.machine_name,
        machine_type=machine.machine_type,
        description=machine.description,
        status=machine.status,
        created_at=machine.created_at,
        updated_at=machine.updated_at,
        total_analyses=total_count,
        latest_score=latest_analysis.anomaly_score if latest_analysis else None,
    )

@router.delete("/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_machine(
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

    mach_identifier = machine.machine_identifier
    db.delete(machine)
    db.commit()

    log_security_event(
        event_type="machine_deleted",
        severity="warning",
        actor_type="user",
        actor_id=current_user.email,
        resource=f"/machines/{machine_id}",
        status="success",
        details={"machine_identifier": mach_identifier},
        db=db,
    )
    return None

