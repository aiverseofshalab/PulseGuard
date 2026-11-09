import io
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_maintenance_pdf(
    report_identifier: str,
    machine_identifier: str,
    machine_name: str,
    machine_type: str,
    analysis_date: datetime,
    anomaly_score: float,
    threshold: float,
    status_str: str,
    audio_quality: str,
    model_version: str,
    reconstruction_error: float,
    knn_distance: float,
    inference_time_ms: float,
    telemetry_rpm: float,
    telemetry_temp: float,
    telemetry_vib: float,
    recommendation: str,
    operator_notes: list,
    operator_name: str = "Industrial Maintenance Lead",
) -> bytes:
    """
    Renders an official PulseGuard Automated Acoustic Condition & Maintenance Report as PDF bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    DARK_BLUE = colors.HexColor("#0f172a")
    SLATE_GRAY = colors.HexColor("#475569")
    CYAN_ACCENT = colors.HexColor("#0284c7")
    LIGHT_BG = colors.HexColor("#f8fafc")
    BORDER_COLOR = colors.HexColor("#cbd5e1")

    # Status Color
    if status_str.lower() == "critical":
        STATUS_COLOR = colors.HexColor("#dc2626")
        STATUS_BG = colors.HexColor("#fee2e2")
    elif status_str.lower() == "warning":
        STATUS_COLOR = colors.HexColor("#d97706")
        STATUS_BG = colors.HexColor("#fef3c7")
    else:
        STATUS_COLOR = colors.HexColor("#16a34a")
        STATUS_BG = colors.HexColor("#dcfce7")

    # Typography Styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=DARK_BLUE,
    )

    subtitle_style = ParagraphStyle(
        "DocSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=CYAN_ACCENT,
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=DARK_BLUE,
        spaceBefore=10,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=DARK_BLUE,
    )

    body_muted = ParagraphStyle(
        "BodyMuted",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=SLATE_GRAY,
    )

    code_style = ParagraphStyle(
        "CodeText",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=10,
        textColor=DARK_BLUE,
    )

    story = []

    # 1. Header Banner Table
    header_data = [
        [
            Paragraph("<b>PULSEGUARD INDUSTRIAL AI</b><br/><font color='#0284c7' size='8'>ACOUSTIC PREDICTIVE MAINTENANCE PLATFORM</font>", title_style),
            Paragraph(f"<b>REPORT ID:</b> {report_identifier}<br/><b>GENERATED:</b> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}<br/><b>CLASSIFICATION:</b> CONFIDENTIAL / INTERNAL", code_style),
        ]
    ]
    header_table = Table(header_data, colWidths=[4.0 * inch, 3.2 * inch])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=CYAN_ACCENT, spaceBefore=4, spaceAfter=12))

    # 2. Executive Machine & Status Summary Card
    status_badge_text = f"<font color='{STATUS_COLOR.hexval()}'><b>● {status_str.upper()} CONDITION</b></font>"
    exec_data = [
        [
            Paragraph(f"<b>Target Machine Asset:</b> {machine_name} ({machine_identifier})", body_style),
            Paragraph(f"<b>Acoustic Anomaly Score:</b> <b>{anomaly_score:.1f} / 100</b>", body_style),
        ],
        [
            Paragraph(f"<b>Machine Category:</b> {machine_type.upper()}", body_style),
            Paragraph(f"<b>Evaluation Status:</b> {status_badge_text}", body_style),
        ],
        [
            Paragraph(f"<b>Analysis Timestamp:</b> {analysis_date.strftime('%Y-%m-%d %H:%M:%S UTC')}", body_style),
            Paragraph(f"<b>Calibrated Threshold:</b> {threshold:.6f} MSE", body_style),
        ],
        [
            Paragraph(f"<b>Inspecting Engineer:</b> {operator_name}", body_style),
            Paragraph(f"<b>Audio Quality Check:</b> {audio_quality.upper()}", body_style),
        ],
    ]
    exec_table = Table(exec_data, colWidths=[3.6 * inch, 3.6 * inch])
    exec_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
        ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(exec_table)
    story.append(Spacer(1, 12))

    # 3. Deep Learning Acoustic Inference Breakdown
    story.append(Paragraph("1. Unsupervised Acoustic Anomaly Detection Breakdown", section_heading))
    ml_data = [
        ["Model Architecture", "4-Stage 2D Convolutional Autoencoder (64-D Latent Bottleneck)"],
        ["Model Version", model_version],
        ["Log-Mel Spectrogram Spec", "16,000 Hz, 1024 n_fft, 512 hop, 128 Mel bands (0–8,000 Hz)"],
        ["Reconstruction Error (MSE)", f"{reconstruction_error:.6f}"],
        ["kNN Latent Distance", f"{knn_distance:.4f}" if knn_distance else "N/A"],
        ["Inference Execution Latency", f"{inference_time_ms:.2f} ms"],
        ["Validation Threshold (P90 Warning / P99 Critical)", f"{threshold:.6f} MSE"],
    ]
    ml_table = Table(ml_data, colWidths=[2.6 * inch, 4.6 * inch])
    ml_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ("TEXTCOLOR", (0, 0), (-1, -1), DARK_BLUE),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Courier"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(ml_table)
    story.append(Spacer(1, 12))

    # 4. Multi-Modal Condition Monitoring Telemetry (Software IoT)
    story.append(Paragraph("2. Condition Monitoring Telemetry (Software-Simulated IoT)", section_heading))
    sim_notice = "<font color='#64748b'><i>Note: In accordance with project architecture, telemetry is generated via software simulation (Autodesk Tinkercad Circuits reference design) and does not represent physical hardware sensor readings.</i></font>"
    story.append(Paragraph(sim_notice, body_muted))
    story.append(Spacer(1, 4))

    telem_data = [
        ["Telemetry Sensor", "Simulated Measurement", "Nominal Range", "Status"],
        ["Rotational Speed (Tachometer)", f"{telemetry_rpm:.1f} RPM", "2200 – 2600 RPM", "Normal" if (2000 <= telemetry_rpm <= 2800) else "Elevated"],
        ["Temperature (TMP36 Proxy)", f"{telemetry_temp:.1f} °C", "35.0 – 60.0 °C", "Normal" if telemetry_temp < 65 else "Overheat Warning"],
        ["Vibration Intensity (Potentiometer Proxy)", f"{telemetry_vib:.1f} %", "0.0 – 35.0 %", "Normal" if telemetry_vib < 45 else "High Vibration Alert"],
    ]
    telem_table = Table(telem_data, colWidths=[2.2 * inch, 1.8 * inch, 1.6 * inch, 1.6 * inch])
    telem_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
    ]))
    story.append(telem_table)
    story.append(Spacer(1, 12))

    # 5. Diagnostic Findings & Actionable Maintenance Suggestions
    story.append(Paragraph("3. Diagnostic Explanation & Recommended Actions", section_heading))
    rec_text = recommendation or "Acoustic signal exhibits nominal operational harmonics. Continue regular continuous monitoring schedule."
    story.append(Paragraph(f"<b>Automated Assessment:</b> {rec_text}", body_style))
    story.append(Spacer(1, 6))

    if operator_notes:
        story.append(Paragraph("<b>Operator Logged Notes:</b>", body_style))
        for note in operator_notes:
            story.append(Paragraph(f"• {note}", body_muted))
        story.append(Spacer(1, 6))

    actions = [
        "Inspect rotating fan blades or pump impellers for particulate fouling or mechanical unbalance.",
        "Verify bearing sleeve lubrication levels and check for high-frequency acoustic friction spikes.",
        "Perform electrical impedance and motor winding insulation resistance verification.",
        "Schedule secondary acoustic recording following standard 48-hour continuous runtime interval.",
    ]
    story.append(Paragraph("<b>Standard Maintenance Procedure:</b>", body_style))
    for act in actions:
        story.append(Paragraph(f"  [  ] {act}", code_style))

    story.append(Spacer(1, 16))

    # 6. Safety & Non-Certification Legal Disclaimer
    disclaimer_box = [
        [
            Paragraph(
                "<b>SYSTEM LIMITATION & SAFETY NOTICE:</b><br/>"
                "PulseGuard is a deep learning-based research and predictive maintenance decision-support prototype. "
                "Anomaly scores represent mathematical spectrogram reconstruction residual magnitudes and embedding distances from calibrated baseline healthy data; "
                "they do NOT certify machinery safety or constitute certified industrial fault diagnosis. "
                "All maintenance interventions must be validated by certified plant engineers following applicable OSHA and ISO safety standards.",
                body_muted,
            )
        ]
    ]
    disc_table = Table(disclaimer_box, colWidths=[7.2 * inch])
    disc_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(KeepTogether(disc_table))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

