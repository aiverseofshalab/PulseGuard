from datetime import datetime, timedelta, timezone
import random
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.models.machine import Machine
from backend.app.models.analysis import Analysis, AnalysisMetric, OperatorNote
from backend.app.models.telemetry import MachineTelemetry
from backend.app.models.audit import SecurityAuditLog
from backend.app.models.diagnostic import DiagnosticSnapshot
from backend.app.core.security import get_password_hash

DEMO_USER_EMAIL = "demo@pulseguard.ai"
DEMO_USER_PASSWORD = "IndustrialDemo2026!"

def seed_demo_data_if_empty(db: Session):
    existing_user = db.query(User).filter(User.email == DEMO_USER_EMAIL).first()
    if existing_user:
        now = datetime.now(timezone.utc)
        if db.query(SecurityAuditLog).count() == 0:
            db.add_all([
                SecurityAuditLog(
                    timestamp=now - timedelta(days=2, hours=4),
                    event_type="auth_registered",
                    severity="info",
                    actor_type="user",
                    actor_id=DEMO_USER_EMAIL,
                    ip_address="127.0.0.1",
                    resource="/auth/register",
                    status="success",
                    details={"role": "engineer", "source": "system_bootstrap"},
                ),
                SecurityAuditLog(
                    timestamp=now - timedelta(days=1, hours=8),
                    event_type="auth_login_success",
                    severity="info",
                    actor_type="user",
                    actor_id=DEMO_USER_EMAIL,
                    ip_address="127.0.0.1",
                    resource="/auth/login",
                    status="success",
                    details={"role": "engineer"},
                ),
                SecurityAuditLog(
                    timestamp=now - timedelta(days=1, hours=2),
                    event_type="machine_created",
                    severity="info",
                    actor_type="user",
                    actor_id=DEMO_USER_EMAIL,
                    ip_address="127.0.0.1",
                    resource="/machines/FAN-BAY-01",
                    status="success",
                    details={"machine_identifier": "FAN-BAY-01", "machine_type": "fan"},
                ),
                SecurityAuditLog(
                    timestamp=now - timedelta(hours=14),
                    event_type="iot_api_key_invalid",
                    severity="warning",
                    actor_type="iot_device",
                    actor_id="anonymous_bridge",
                    ip_address="127.0.0.1",
                    resource="/telemetry/ingest",
                    status="failure",
                    details={"reason": "Missing device credential on probe"},
                ),
                SecurityAuditLog(
                    timestamp=now - timedelta(hours=6),
                    event_type="scenario_injected",
                    severity="info",
                    actor_type="user",
                    actor_id=DEMO_USER_EMAIL,
                    ip_address="127.0.0.1",
                    resource="/simulator/machines/FAN-BAY-01/trigger",
                    status="success",
                    details={"scenario": "normal", "machine_identifier": "FAN-BAY-01"},
                ),
            ])
            db.commit()
        if db.query(DiagnosticSnapshot).count() == 0:
            db.add(DiagnosticSnapshot(
                overall_status="Operational",
                execution_time_ms=18.4,
                results={
                    "database": {"status": "Operational", "latency_ms": 1.1},
                    "audio_preprocessing": {"status": "Operational", "latency_ms": 3.4},
                    "ml_inference": {"status": "Operational", "latency_ms": 2.1},
                    "dataset_availability": {"status": "Operational"},
                    "environment_configuration": {"status": "Operational"},
                },
                created_at=now - timedelta(hours=1),
            ))
            db.commit()
        return existing_user

    print("[INFO] Seeding initial industrial demonstration records...")

    # 1. Create Demo User
    user = User(
        email=DEMO_USER_EMAIL,
        hashed_password=get_password_hash(DEMO_USER_PASSWORD),
        full_name="Plant Operations Lead",
        role="engineer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 2. Create 4 Industrial Machines across all categories
    machines_spec = [
        {
            "id": "FAN-BAY-01",
            "name": "Primary Aeration Blower Fan #1",
            "type": "fan",
            "desc": "Heavy-duty 5-blade exhaust blower cooling manufacturing zone B.",
            "status": "normal",
        },
        {
            "id": "PUMP-LINE-02",
            "name": "Centrifugal Slurry Coolant Pump",
            "type": "pump",
            "desc": "High-pressure continuous circulation pump for heat exchanger loop.",
            "status": "warning",
        },
        {
            "id": "VALVE-CHAMBER-03",
            "name": "Pneumatic High-Pressure Solenoid Valve",
            "type": "valve",
            "desc": "Main steam shutoff and throttling actuator in boiler room 3.",
            "status": "normal",
        },
        {
            "id": "SLIDE-RAIL-04",
            "name": "Precision CNC Linear Guideway Rail",
            "type": "slide_rail",
            "desc": "Dual-axis ball-screw feed rail for multi-spindle milling center.",
            "status": "normal",
        },
    ]

    created_machines = []
    for spec in machines_spec:
        m = Machine(
            user_id=user.id,
            machine_identifier=spec["id"],
            machine_name=spec["name"],
            machine_type=spec["type"],
            description=spec["desc"],
            status=spec["status"],
        )
        db.add(m)
        created_machines.append(m)

    db.commit()
    for m in created_machines:
        db.refresh(m)

    # 3. Create realistic historical analyses for the machines over the past 7 days
    now = datetime.now(timezone.utc)
    for m in created_machines:
        for day in range(7, 0, -1):
            ts = now - timedelta(days=day, hours=random.randint(1, 10))
            if m.machine_identifier == "PUMP-LINE-02" and day <= 2:
                # Recent warning on pump
                score = round(random.uniform(55.0, 68.0), 1)
                status = "warning"
                recon_err = round(random.uniform(0.0036, 0.0042), 6)
                rec = "Elevated cavitation harmonics detected in pump acoustics. Bearing lubrication checked."
            else:
                score = round(random.uniform(22.0, 44.0), 1)
                status = "normal"
                recon_err = round(random.uniform(0.0018, 0.0028), 6)
                rec = f"Normal acoustic profile observed for {m.machine_name}."

            an = Analysis(
                machine_id=m.id,
                user_id=user.id,
                anomaly_score=score,
                threshold=0.0031,
                status=status,
                audio_quality="valid",
                model_version="cae-mimii-v1.0.0",
                recording_duration=3.0,
                recommendation=rec,
                created_at=ts,
            )
            db.add(an)
            db.commit()
            db.refresh(an)

            met = AnalysisMetric(
                analysis_id=an.id,
                reconstruction_error=recon_err,
                knn_distance=round(random.uniform(0.55, 0.82), 4),
                inference_time_ms=round(random.uniform(1.4, 2.8), 2),
                feature_metadata={"simulated_baseline": True},
            )
            db.add(met)

        # 4. Create historical telemetry points (simulated IoT sensor data)
        base_rpm = 2400.0 if m.machine_type == "fan" else 1750.0
        base_temp = 42.0
        base_vib = 18.0
        if m.machine_identifier == "PUMP-LINE-02":
            base_temp = 58.0
            base_vib = 42.0

        for h in range(12, 0, -1):
            telemetry_ts = now - timedelta(hours=h)
            telem = MachineTelemetry(
                machine_id=m.id,
                rpm=round(base_rpm + random.uniform(-25, 25), 1),
                temperature=round(base_temp + random.uniform(-1.5, 1.5), 1),
                vibration_indicator=round(base_vib + random.uniform(-2.0, 2.0), 1),
                operating_status="running",
                is_simulated=True,
                source="tinkercad_bridge",
                timestamp=telemetry_ts,
            )
            db.add(telem)

    db.commit()

    # 5. Create initial audit log records
    if db.query(SecurityAuditLog).count() == 0:
        audit_events = [
            SecurityAuditLog(
                timestamp=now - timedelta(days=2, hours=4),
                event_type="auth_registered",
                severity="info",
                actor_type="user",
                actor_id=DEMO_USER_EMAIL,
                ip_address="127.0.0.1",
                resource="/auth/register",
                status="success",
                details={"role": "engineer", "source": "system_bootstrap"},
            ),
            SecurityAuditLog(
                timestamp=now - timedelta(days=1, hours=8),
                event_type="auth_login_success",
                severity="info",
                actor_type="user",
                actor_id=DEMO_USER_EMAIL,
                ip_address="127.0.0.1",
                resource="/auth/login",
                status="success",
                details={"role": "engineer"},
            ),
            SecurityAuditLog(
                timestamp=now - timedelta(days=1, hours=2),
                event_type="machine_created",
                severity="info",
                actor_type="user",
                actor_id=DEMO_USER_EMAIL,
                ip_address="127.0.0.1",
                resource="/machines/FAN-BAY-01",
                status="success",
                details={"machine_identifier": "FAN-BAY-01", "machine_type": "fan"},
            ),
            SecurityAuditLog(
                timestamp=now - timedelta(hours=14),
                event_type="iot_api_key_invalid",
                severity="warning",
                actor_type="iot_device",
                actor_id="anonymous_bridge",
                ip_address="127.0.0.1",
                resource="/telemetry/ingest",
                status="failure",
                details={"reason": "Missing device credential on probe"},
            ),
            SecurityAuditLog(
                timestamp=now - timedelta(hours=6),
                event_type="scenario_injected",
                severity="info",
                actor_type="user",
                actor_id=DEMO_USER_EMAIL,
                ip_address="127.0.0.1",
                resource="/simulator/machines/FAN-BAY-01/trigger",
                status="success",
                details={"scenario": "normal", "machine_identifier": "FAN-BAY-01"},
            ),
            SecurityAuditLog(
                timestamp=now - timedelta(hours=2),
                event_type="report_generated",
                severity="info",
                actor_type="user",
                actor_id=DEMO_USER_EMAIL,
                ip_address="127.0.0.1",
                resource="/reports/PG-REP-20261108-DEMO",
                status="success",
                details={"report_id": "PG-REP-20261108-DEMO", "machine_identifier": "PUMP-LINE-02"},
            ),
        ]
        db.add_all(audit_events)
        db.commit()

    # 6. Create initial diagnostic snapshot record
    if db.query(DiagnosticSnapshot).count() == 0:
        db.add(DiagnosticSnapshot(
            overall_status="Operational",
            execution_time_ms=18.4,
            results={
                "database": {"status": "Operational", "latency_ms": 1.1},
                "audio_preprocessing": {"status": "Operational", "latency_ms": 3.4},
                "ml_inference": {"status": "Operational", "latency_ms": 2.1},
                "dataset_availability": {"status": "Operational"},
                "environment_configuration": {"status": "Operational"},
            },
            created_at=now - timedelta(hours=1),
        ))
        db.commit()

    print("[INFO] Seeded demo account, 4 industrial machines, and historical monitoring trends.")
    return user

