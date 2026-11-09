import csv
import io
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.machine import Machine
from backend.app.models.analysis import Analysis
from backend.app.api.deps import get_current_user

router = APIRouter()

@router.get("/export")
def export_analyses_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    analyses = (
        db.query(Analysis, Machine)
        .join(Machine, Analysis.machine_id == Machine.id)
        .filter(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Analysis_ID",
        "Machine_ID",
        "Machine_Identifier",
        "Machine_Name",
        "Machine_Type",
        "Anomaly_Score",
        "Calibrated_Threshold",
        "Status",
        "Audio_Quality",
        "Duration_Seconds",
        "Reconstruction_Error",
        "KNN_Distance",
        "Inference_Time_MS",
        "Timestamp_UTC",
        "Recommendation",
    ])

    for an, mach in analyses:
        recon_err = an.metrics.reconstruction_error if an.metrics else ""
        knn_dist = an.metrics.knn_distance if an.metrics else ""
        inf_time = an.metrics.inference_time_ms if an.metrics else ""

        writer.writerow([
            an.id,
            mach.id,
            mach.machine_identifier,
            mach.machine_name,
            mach.machine_type,
            an.anomaly_score,
            an.threshold,
            an.status,
            an.audio_quality,
            an.recording_duration,
            recon_err,
            knn_dist,
            inf_time,
            an.created_at.isoformat(),
            an.recommendation or "",
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pulseguard_analysis_export.csv"},
    )

