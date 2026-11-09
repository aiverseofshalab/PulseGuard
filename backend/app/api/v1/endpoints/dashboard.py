from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.machine import Machine
from backend.app.models.analysis import Analysis
from backend.app.schemas.model_info import DashboardSummaryResponse
from backend.app.api.deps import get_current_user

router = APIRouter()

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total_machines = db.query(Machine).filter(Machine.user_id == current_user.id).count()

    analyses_query = db.query(Analysis).filter(Analysis.user_id == current_user.id)
    total_analyses = analyses_query.count()

    normal_count = analyses_query.filter(Analysis.status == "normal").count()
    warning_count = analyses_query.filter(Analysis.status == "warning").count()
    critical_count = analyses_query.filter(Analysis.status == "critical").count()

    recent = (
        db.query(Analysis, Machine)
        .join(Machine, Analysis.machine_id == Machine.id)
        .filter(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
        .limit(6)
        .all()
    )

    recent_items = [
        {
            "id": an.id,
            "machine_id": an.machine_id,
            "machine_name": mach.machine_name,
            "machine_identifier": mach.machine_identifier,
            "machine_type": mach.machine_type,
            "anomaly_score": an.anomaly_score,
            "status": an.status,
            "created_at": an.created_at.isoformat(),
        }
        for an, mach in recent
    ]

    # Machine status breakdown
    status_counts = (
        db.query(Machine.status, func.count(Machine.id))
        .filter(Machine.user_id == current_user.id)
        .group_by(Machine.status)
        .all()
    )
    breakdown = {status_name: count for status_name, count in status_counts}
    if not breakdown:
        breakdown = {"normal": 0, "warning": 0, "critical": 0}

    # Overall system health
    if critical_count > 0:
        health = "critical_alert"
    elif warning_count > 0:
        health = "warning"
    elif total_analyses > 0:
        health = "optimal"
    else:
        health = "ready_for_monitoring"

    return DashboardSummaryResponse(
        total_machines=total_machines,
        total_recordings_analyzed=total_analyses,
        normal_count=normal_count,
        warning_count=warning_count,
        critical_count=critical_count,
        recent_analyses=recent_items,
        machine_status_breakdown=breakdown,
        system_health_status=health,
    )

