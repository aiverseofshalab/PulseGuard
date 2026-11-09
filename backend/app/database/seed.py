from datetime import datetime, timedelta, timezone
import random
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.models.machine import Machine
from backend.app.models.analysis import Analysis, AnalysisMetric, OperatorNote
from backend.app.models.telemetry import MachineTelemetry
from backend.app.core.security import get_password_hash

DEMO_USER_EMAIL = "demo@pulseguard.ai"
DEMO_USER_PASSWORD = "IndustrialDemo2026!"

def seed_demo_data_if_empty(db: Session):
    existing_user = db.query(User).filter(User.email == DEMO_USER_EMAIL).first()
    if existing_user:
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
    print("[INFO] Seeded demo account, 4 industrial machines, and historical monitoring trends.")
    return user

