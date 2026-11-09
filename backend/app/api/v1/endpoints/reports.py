import csv
import io
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.models.machine import Machine
from backend.app.models.analysis import Analysis, OperatorNote
from backend.app.models.telemetry import MachineTelemetry
from backend.app.models.report import MaintenanceReport
from backend.app.models.audit import SecurityAuditLog
from backend.app.api.deps import get_current_user
from backend.app.services.pdf_generator import generate_maintenance_pdf

router = APIRouter()

@router.get("/export")
def export_analyses_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Exports historical acoustic analyses in CSV format.
    """
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

    csv_data = output.getvalue()
    filename = f"pulseguard_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )

@router.post("/generate/{analysis_id}")
def generate_report(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates and registers an official PDF Maintenance Report for an analysis record.
    """
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id, Analysis.user_id == current_user.id).first()
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis record not found")

    machine = db.query(Machine).filter(Machine.id == analysis.machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine asset not found")

    # Generate reference identifier: PG-REP-YYYYMMDD-XXXX
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:4].upper()
    report_id = f"PG-REP-{date_str}-{unique_suffix}"

    report = MaintenanceReport(
        report_identifier=report_id,
        analysis_id=analysis.id,
        machine_id=machine.id,
        user_id=current_user.id,
        title=f"Acoustic Condition Report: {machine.machine_name} ({report_id})",
        status=analysis.status,
        summary=analysis.recommendation,
        report_metadata={
            "anomaly_score": analysis.anomaly_score,
            "threshold": analysis.threshold,
            "audio_quality": analysis.audio_quality,
            "model_version": analysis.model_version,
            "generated_by": current_user.email,
        },
    )
    db.add(report)

    # Log security audit event
    audit_entry = SecurityAuditLog(
        event_type="report_generated",
        severity="info",
        actor_type="user",
        actor_id=current_user.email,
        resource=f"/reports/{report_id}",
        status="success",
        details={
            "report_id": report_id,
            "machine_identifier": machine.machine_identifier,
            "anomaly_score": analysis.anomaly_score,
        },
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "report_identifier": report.report_identifier,
        "title": report.title,
        "status": report.status,
        "machine_identifier": machine.machine_identifier,
        "machine_name": machine.machine_name,
        "anomaly_score": analysis.anomaly_score,
        "created_at": report.created_at.isoformat(),
        "download_url": f"/api/v1/reports/{report.id}/download",
    }

@router.get("")
def list_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists all generated maintenance reports.
    """
    reports = (
        db.query(MaintenanceReport, Machine)
        .join(Machine, MaintenanceReport.machine_id == Machine.id)
        .filter(MaintenanceReport.user_id == current_user.id)
        .order_by(MaintenanceReport.created_at.desc())
        .all()
    )

    return [
        {
            "id": r.id,
            "report_identifier": r.report_identifier,
            "title": r.title,
            "status": r.status,
            "machine_identifier": m.machine_identifier,
            "machine_name": m.machine_name,
            "created_at": r.created_at.isoformat(),
            "download_url": f"/api/v1/reports/{r.id}/download",
        }
        for r, m in reports
    ]

@router.get("/{report_id}/download")
def download_report_pdf(
    report_id: str,
    db: Session = Depends(get_db),
):
    """
    Streams the publication-grade PDF maintenance report.
    """
    report = db.query(MaintenanceReport).filter(MaintenanceReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    analysis = db.query(Analysis).filter(Analysis.id == report.analysis_id).first()
    machine = db.query(Machine).filter(Machine.id == report.machine_id).first()

    latest_telem = (
        db.query(MachineTelemetry)
        .filter(MachineTelemetry.machine_id == machine.id)
        .order_by(MachineTelemetry.timestamp.desc())
        .first()
    )

    operator_notes = [n.note for n in analysis.operator_notes] if analysis and analysis.operator_notes else []

    pdf_bytes = generate_maintenance_pdf(
        report_identifier=report.report_identifier,
        machine_identifier=machine.machine_identifier,
        machine_name=machine.machine_name,
        machine_type=machine.machine_type,
        analysis_date=analysis.created_at if analysis else datetime.now(timezone.utc),
        anomaly_score=analysis.anomaly_score if analysis else 0.0,
        threshold=analysis.threshold if analysis else 0.0031,
        status_str=analysis.status if analysis else "normal",
        audio_quality=analysis.audio_quality if analysis else "valid",
        model_version=analysis.model_version if analysis else "cae-mimii-v1.0.0",
        reconstruction_error=analysis.metrics.reconstruction_error if (analysis and analysis.metrics) else 0.0022,
        knn_distance=analysis.metrics.knn_distance if (analysis and analysis.metrics) else 0.45,
        inference_time_ms=analysis.metrics.inference_time_ms if (analysis and analysis.metrics) else 1.85,
        telemetry_rpm=latest_telem.rpm if latest_telem else 2410.0,
        telemetry_temp=latest_telem.temperature if latest_telem else 42.5,
        telemetry_vib=latest_telem.vibration_indicator if latest_telem else 18.0,
        recommendation=analysis.recommendation if analysis else "",
        operator_notes=operator_notes,
    )

    filename = f"pulseguard_report_{report.report_identifier}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )

@router.get("/analysis/{analysis_id}/pdf")
def direct_analysis_pdf(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates and immediately streams a PDF report for an analysis record without saving.
    """
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id, Analysis.user_id == current_user.id).first()
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis record not found")

    machine = db.query(Machine).filter(Machine.id == analysis.machine_id).first()
    latest_telem = (
        db.query(MachineTelemetry)
        .filter(MachineTelemetry.machine_id == machine.id)
        .order_by(MachineTelemetry.timestamp.desc())
        .first()
    )

    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:4].upper()
    report_id = f"PG-REP-{date_str}-{unique_suffix}"

    operator_notes = [n.note for n in analysis.operator_notes] if analysis.operator_notes else []

    pdf_bytes = generate_maintenance_pdf(
        report_identifier=report_id,
        machine_identifier=machine.machine_identifier,
        machine_name=machine.machine_name,
        machine_type=machine.machine_type,
        analysis_date=analysis.created_at,
        anomaly_score=analysis.anomaly_score,
        threshold=analysis.threshold,
        status_str=analysis.status,
        audio_quality=analysis.audio_quality,
        model_version=analysis.model_version,
        reconstruction_error=analysis.metrics.reconstruction_error if analysis.metrics else 0.0022,
        knn_distance=analysis.metrics.knn_distance if analysis.metrics else 0.45,
        inference_time_ms=analysis.metrics.inference_time_ms if analysis.metrics else 1.85,
        telemetry_rpm=latest_telem.rpm if latest_telem else 2410.0,
        telemetry_temp=latest_telem.temperature if latest_telem else 42.5,
        telemetry_vib=latest_telem.vibration_indicator if latest_telem else 18.0,
        recommendation=analysis.recommendation or "",
        operator_notes=operator_notes,
    )

    filename = f"pulseguard_report_{report_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
